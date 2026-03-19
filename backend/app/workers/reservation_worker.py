"""
RailPass 예매 워커 - 실제 SRT/KTX 예매를 실행하는 핵심 모듈
기존 srtgo Python 코드를 재활용
"""
import json
import logging
import sys
import os
import time
from datetime import datetime, timedelta
from random import gammavariate

import redis

logger = logging.getLogger("railpass.reservation_worker")

# srtgo 경로
sys.path.insert(0, "/app/srtgo")

# 예매 간격 설정 (기존 srtgo와 동일)
RESERVE_INTERVAL_SHAPE = 4
RESERVE_INTERVAL_SCALE = 0.25
RESERVE_INTERVAL_MIN = 0.25

DB_URL = None  # 동기 DB 연결을 위해 런타임에 설정


def _get_db_connection():
    """동기 PostgreSQL 연결"""
    import psycopg2
    return psycopg2.connect(
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", "5432")),
        dbname=os.getenv("POSTGRES_DB", "railpass"),
        user=os.getenv("POSTGRES_USER", "railpass_user"),
        password=os.getenv("POSTGRES_PASSWORD", "railpass_password"),
    )


def _get_account_info(user_id: str, rail_type: str):
    """DB에서 암호화된 계정 정보 조회 및 복호화"""
    from app.core.crypto import decrypt
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT account_id, account_password FROM rail_accounts WHERE user_id=%s AND rail_type=%s",
            (user_id, rail_type),
        )
        row = cur.fetchone()
        if not row:
            raise Exception(f"{rail_type} 계정 정보가 없습니다")
        return decrypt(row[0]), decrypt(row[1])
    finally:
        conn.close()


def _get_notification_settings(user_id: str):
    """알림 설정 조회"""
    from app.core.crypto import decrypt
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT type, telegram_token, telegram_chat_id, discord_webhook_url, is_enabled "
            "FROM notification_settings WHERE user_id=%s AND is_enabled=TRUE",
            (user_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


def _get_card_info(user_id: str):
    """카드 정보 조회"""
    from app.core.crypto import decrypt
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT card_number, card_password, birthday, expire_date, is_enabled "
            "FROM card_settings WHERE user_id=%s",
            (user_id,),
        )
        row = cur.fetchone()
        if not row or not row[4]:
            return None
        return {
            "number": decrypt(row[0]),
            "password": decrypt(row[1]),
            "birthday": decrypt(row[2]),
            "expire": decrypt(row[3]),
        }
    finally:
        conn.close()


def _update_job_db(job_id: str, status: str, try_count: int, elapsed: int, error: str = None):
    """DB의 예매 작업 상태 업데이트"""
    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE reservation_jobs SET status=%s, try_count=%s, elapsed_seconds=%s, error_message=%s, updated_at=NOW() WHERE id=%s",
            (status.upper(), try_count, elapsed, error, job_id),
        )
        conn.commit()
    finally:
        conn.close()


def _save_result(job_id: str, reservation, rail_type: str):
    """예매 결과 DB 저장"""
    conn = _get_db_connection()
    try:
        import uuid
        cur = conn.cursor()

        # 결과 파싱 (SRT/KTX에 따라 구조 다름)
        result_data = {
            "reservation_number": getattr(reservation, "reservation_number", None)
                                  or getattr(reservation, "rsv_id", str(reservation)),
            "raw_response": str(reservation),
        }

        if hasattr(reservation, "trains") and reservation.trains:
            train = reservation.trains[0]
            result_data["departure_station"] = getattr(train, "dep_station_name", None)
            result_data["arrival_station"] = getattr(train, "arr_station_name", None)
            result_data["departure_time"] = getattr(train, "dep_time", None)
            result_data["arrival_time"] = getattr(train, "arr_time", None)

        cur.execute(
            """INSERT INTO reservation_results
               (id, job_id, reservation_number, departure_station, arrival_station,
                departure_time, arrival_time, raw_response)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (job_id) DO NOTHING""",
            (
                str(uuid.uuid4()),
                job_id,
                result_data.get("reservation_number"),
                result_data.get("departure_station"),
                result_data.get("arrival_station"),
                result_data.get("departure_time"),
                result_data.get("arrival_time"),
                json.dumps({"raw": result_data.get("raw_response")}),
            ),
        )
        conn.commit()
    finally:
        conn.close()


def _send_notifications(user_id: str, message: str):
    """텔레그램/디스코드 알림 발송"""
    import asyncio
    from app.core.crypto import decrypt

    conn = _get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT type, telegram_token, telegram_chat_id, discord_webhook_url FROM notification_settings WHERE user_id=%s AND is_enabled=TRUE",
            (user_id,),
        )
        rows = cur.fetchall()
    finally:
        conn.close()

    for row in rows:
        ntype, tg_token, tg_chat, dc_url = row
        ntype_lower = ntype.lower()
        try:
            if ntype_lower == "telegram" and tg_token:
                import telegram
                token = decrypt(tg_token)
                chat_id = tg_chat

                async def _send_tg():
                    bot = telegram.Bot(token=token)
                    async with bot:
                        await bot.send_message(chat_id=chat_id, text=message)

                asyncio.run(_send_tg())

            elif ntype_lower == "discord" and dc_url:
                import requests
                webhook_url = decrypt(dc_url)
                requests.post(webhook_url, json={"content": message}, timeout=10)
        except Exception as e:
            logger.error(f"알림 발송 오류: {e}")


def _update_redis_status(r: redis.Redis, job_id: str, status: str, try_count: int, elapsed: int, message: str = "", result=None):
    data = {
        "job_id": job_id,
        "status": status,
        "try_count": try_count,
        "elapsed_seconds": elapsed,
        "message": message,
    }
    if result:
        data["result"] = result
    raw = json.dumps(data, ensure_ascii=False)
    r.set(f"railpass:status:{job_id}", raw, ex=86400)
    r.publish(f"railpass:ws:{job_id}", raw)


def _sleep():
    time.sleep(
        gammavariate(RESERVE_INTERVAL_SHAPE, RESERVE_INTERVAL_SCALE) + RESERVE_INTERVAL_MIN
    )


def _build_passengers(passengers_data: dict, is_srt: bool):
    """승객 객체 리스트 생성"""
    if is_srt:
        from srtgo.srt import Adult, Child, Senior, Disability1To3, Disability4To6
        cls_map = {
            "adult": Adult, "child": Child, "senior": Senior,
            "disability1to3": Disability1To3, "disability4to6": Disability4To6,
        }
    else:
        from srtgo.ktx import AdultPassenger, ChildPassenger, SeniorPassenger, Disability1To3Passenger, Disability4To6Passenger
        cls_map = {
            "adult": AdultPassenger, "child": ChildPassenger, "senior": SeniorPassenger,
            "disability1to3": Disability1To3Passenger, "disability4to6": Disability4To6Passenger,
        }

    passengers = []
    for key, cls in cls_map.items():
        count = passengers_data.get(key, 0)
        if count > 0:
            passengers.append(cls(count))
    return passengers


def _get_seat_type_enum(seat_type_str: str, is_srt: bool):
    if is_srt:
        from srtgo.srt import SeatType
        return getattr(SeatType, seat_type_str)
    else:
        from srtgo.ktx import ReserveOption
        return getattr(ReserveOption, seat_type_str)


def _is_seat_available(train, seat_type, rail_type: str) -> bool:
    if rail_type == "SRT":
        from srtgo.srt import SeatType
        if not train.seat_available():
            return train.reserve_standby_available()
        if seat_type in [SeatType.GENERAL_FIRST, SeatType.SPECIAL_FIRST]:
            return train.seat_available()
        if seat_type == SeatType.GENERAL_ONLY:
            return train.general_seat_available()
        return train.special_seat_available()
    else:
        from srtgo.ktx import ReserveOption
        if not train.has_seat():
            return train.has_waiting_list()
        if seat_type in [ReserveOption.GENERAL_FIRST, ReserveOption.SPECIAL_FIRST]:
            return train.has_seat()
        if seat_type == ReserveOption.GENERAL_ONLY:
            return train.has_general_seat()
        return train.has_special_seat()


def run_reservation(r: redis.Redis, job_data: dict):
    """예매 실행 메인 함수"""
    job_id = job_data["job_id"]
    user_id = job_data["user_id"]
    rail_type = job_data["rail_type"]  # "SRT" or "KTX"
    is_srt = rail_type == "SRT"

    logger.info(f"예매 시작: {rail_type} {job_data['departure_station']} → {job_data['arrival_station']} ({job_data['travel_date']})")

    # 계정 정보 조회
    account_id, account_pass = _get_account_info(user_id, rail_type)

    # 로그인
    if is_srt:
        from srtgo.srt import SRT, SRTError, SRTNetFunnelError
        rail = SRT(account_id, account_pass)
    else:
        from srtgo.ktx import Korail, KorailError
        rail = Korail(account_id, account_pass)

    # DB 상태 업데이트
    _update_job_db(job_id, "RUNNING", 0, 0)
    _update_redis_status(r, job_id, "RUNNING", 0, 0, "예매 시작")

    # 승객 정보 구성
    passengers = _build_passengers(job_data["passengers"], is_srt)
    total_count = sum(p.count for p in passengers)
    seat_type = _get_seat_type_enum(job_data["seat_type"], is_srt)

    # 카드 정보
    card_info = _get_card_info(user_id)

    # 검색 파라미터
    time_slots = job_data["time_slots"]  # 여러 시간대
    dep = job_data["departure_station"]
    arr = job_data["arrival_station"]
    date = job_data["travel_date"]
    auto_pay = job_data.get("auto_pay", False)

    # 예매 루프
    i_try = 0
    start_time = time.time()

    while True:
        # 취소 신호 체크
        if r.exists(f"railpass:cancel:{job_id}"):
            logger.info(f"취소 요청: {job_id}")
            _update_job_db(job_id, "CANCELLED", i_try, int(time.time() - start_time))
            _update_redis_status(r, job_id, "CANCELLED", i_try, int(time.time() - start_time), "사용자에 의해 취소됨")
            return

        i_try += 1
        elapsed = int(time.time() - start_time)

        # 1분마다 DB 업데이트, 항상 Redis 업데이트
        if i_try % 30 == 0:
            _update_job_db(job_id, "RUNNING", i_try, elapsed)
        _update_redis_status(r, job_id, "RUNNING", i_try, elapsed, f"예매 대기 중... {i_try}회 시도")

        try:
            # 각 시간대에 대해 열차 검색
            for time_slot in time_slots:
                try:
                    if is_srt:
                        trains = rail.search_train(
                            dep=dep, arr=arr, date=date, time=time_slot,
                            passengers=[type(passengers[0])(total_count)],
                            available_only=False,
                        )
                    else:
                        trains = rail.search_train(
                            dep=dep, arr=arr, date=date, time=time_slot,
                            passengers=[type(passengers[0])(total_count)],
                            include_no_seats=True,
                        )

                    for train in trains:
                        # 사용자 선택 열차가 있는 경우 필터링
                        train_no = str(getattr(train, "train_number", getattr(train, "train_no", "")))
                        if job_data.get("train_numbers") and train_no not in job_data["train_numbers"]:
                            continue

                        if _is_seat_available(train, seat_type, rail_type):
                            # 상세 정보 추출
                            train_no = str(getattr(train, "train_number", getattr(train, "train_no", "N/A")))
                            dep_time_raw = getattr(train, "dep_time", "")
                            arr_time_raw = getattr(train, "arr_time", "")
                            dep_time_fmt = f"{dep_time_raw[:2]}:{dep_time_raw[2:4]}" if len(dep_time_raw) >= 4 else "N/A"
                            arr_time_fmt = f"{arr_time_raw[:2]}:{arr_time_raw[2:4]}" if len(arr_time_raw) >= 4 else "N/A"

                            # 예매 시도!
                            reservation = rail.reserve(train, passengers=passengers, option=seat_type)
                            
                            msg = (
                                f"🎫 🎉 예매 성공!\n"
                                f"━━━━━━━━━━━━━━━\n"
                                f"▶ {rail_type}: {dep} → {arr}\n"
                                f"▶ 날짜: {date}\n"
                                f"▶ 열차: {train_no}호 ({dep_time_fmt} ~ {arr_time_fmt})\n"
                                f"▶ 예약번호: {getattr(reservation, 'reservation_number', '확인 필요')}"
                            )

                            # 자동결제
                            if auto_pay and card_info and not getattr(reservation, "is_waiting", False):
                                try:
                                    birthday = card_info["birthday"]
                                    rail.pay_with_card(
                                        reservation,
                                        card_info["number"],
                                        card_info["password"],
                                        birthday,
                                        card_info["expire"],
                                        0,
                                        "J" if len(birthday) == 6 else "S",
                                    )
                                    msg += "\n💳 카드 결제 완료"
                                except Exception as pe:
                                    logger.error(f"카드 결제 실패: {pe}")
                                    msg += f"\n⚠️ 카드 결제 실패: {pe}"

                            # DB 결과 저장
                            _save_result(job_id, reservation, rail_type)
                            _update_job_db(job_id, "SUCCESS", i_try, elapsed)
                            _update_redis_status(
                                r, job_id, "SUCCESS", i_try, elapsed, msg,
                                result={"reservation_number": str(getattr(reservation, "reservation_number", "N/A"))}
                            )

                            # 알림 발송
                            _send_notifications(user_id, msg)
                            logger.info(f"예매 성공: {job_id}")
                            return

                except Exception as train_err:
                    logger.debug(f"시간대 {time_slot} 오류: {train_err}")
                    continue

            _sleep()

        except Exception as ex:
            err_str = str(ex)
            msg = getattr(ex, "msg", err_str)

            # SRT 오류 처리
            if is_srt:
                if "정상적인 경로로 접근" in msg or "NetFunnel" in type(ex).__name__:
                    rail.clear() if hasattr(rail, "clear") else None
                elif "로그인 후 사용" in msg:
                    rail = SRT(account_id, account_pass)
                elif "잔여석없음" in msg or "사용자가 많아" in msg:
                    pass  # 정상 상황, 재시도
                else:
                    logger.warning(f"SRT 예외: {msg}")
            # KTX 오류 처리
            else:
                if "Need to Login" in msg:
                    rail = Korail(account_id, account_pass)
                elif "Sold out" in msg or "잔여석없음" in msg:
                    pass  # 정상 상황, 재시도
                else:
                    logger.warning(f"KTX 예외: {msg}")

            _sleep()
