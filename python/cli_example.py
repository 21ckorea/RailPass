import sys
import os
import time
from datetime import datetime

# srtgo 라이브러리 경로 추가
sys.path.append(os.path.join(os.getcwd(), 'python'))

from srtgo.srt import SRT, Adult, Senior, SeatType
from srtgo.ktx import Korail, AdultPassenger, SeniorPassenger, ReserveOption

import argparse

def run_srt_reservation():
    # 0. 명령행 인자 파싱
    parser = argparse.ArgumentParser(description="RailPass SRT CLI 예매 도구")
    parser.add_argument("--id", required=True, help="SRT 멤버십 번호")
    parser.add_argument("--pw", required=True, help="SRT 비밀번호")
    parser.add_argument("--dep", default="수서", help="출발역 (기본값: 수서)")
    parser.add_argument("--arr", default="동대구", help="도착역 (기본값: 동대구)")
    parser.add_argument("--date", default=datetime.now().strftime("%Y%m%d"), help="출발 날짜 (YYYYMMDD)")
    parser.add_argument("--times", default="", help="타켓 열차 시간 (HHMM, 여러개는 쉼표 구분)")
    parser.add_argument("--seat", default="1", choices=["1", "2", "3", "4"], 
                        help="좌석 옵션 (1:일반우선, 2:일반전용, 3:특실우선, 4:특실전용)")
    parser.add_argument("--adult", type=int, default=0, help="성인 인원수 (다른 승객 설정이 없으면 기본 1명)")
    parser.add_argument("--senior", type=int, default=0, help="경로 인원수")

    args = parser.parse_args()

    # 인원수 기본값 처리: 아무것도 입력하지 않았을 때만 성인 1명
    adult_count = args.adult
    senior_count = args.senior
    if adult_count == 0 and senior_count == 0:
        adult_count = 1

    # 좌석 옵션 매핑
    seat_map = {
        "1": SeatType.GENERAL_FIRST,
        "2": SeatType.GENERAL_ONLY,
        "3": SeatType.SPECIAL_FIRST,
        "4": SeatType.SPECIAL_ONLY
    }
    selected_seat_option = seat_map[args.seat]

    # 1. SRT 객체 생성 및 로그인
    try:
        srt = SRT(args.id, args.pw, verbose=False)
    except Exception as e:
        print(f"로그인 실패: {e}")
        return
    
    # 2. 인원 설정
    passengers = []
    if adult_count > 0:
        passengers.append(Adult(adult_count))
    if senior_count > 0:
        passengers.append(Senior(senior_count))
    
    if not passengers:
        print("인원수가 0명일 수 없습니다.")
        return

    # 3. 열차 조회 및 필터링
    dep, arr, date = args.dep, args.arr, args.date
    target_times = [t.strip() for t in args.times.split(",")] if args.times else []
    
    # 시간대 설정을 위해 가장 이른 시간 추출 (조회 시작 시간으로 사용)
    start_time = "000000"
    if target_times:
        start_time = sorted(target_times)[0].ljust(6, '0')
    
    i_try = 0
    while i_try < 10000:
        i_try += 1
        try:
            # 조회 시 인원 정보를 명시적으로 전달하여 정확한 잔여석 확인
            current_trains = srt.search_train(dep, arr, date, time=start_time, available_only=False, passengers=passengers)
            
            # 타겟 시간대가 있으면 필터링, 없으면 전체 목록 사용
            available_trains = []
            if target_times:
                available_trains = [t for t in current_trains if any(t.dep_time.startswith(time_target) for time_target in target_times)]
            else:
                available_trains = current_trains

            if not available_trains:
                if target_times:
                    print(f"\r{date} {dep}->{arr} ({','.join(target_times)}) 열차를 찾을 수 없습니다. (시도: {i_try})", end="", flush=True)
                else:
                    print(f"\r{date} {dep}->{arr} 열차를 찾을 수 없습니다. (시도: {i_try})", end="", flush=True)
                time.sleep(1.2)
                continue

            for train in available_trains:
                # 잔여석 확인
                is_available = False
                if selected_seat_option in [SeatType.GENERAL_ONLY, SeatType.GENERAL_FIRST]:
                    if train.general_seat_available():
                        is_available = True
                
                if not is_available and selected_seat_option in [SeatType.SPECIAL_ONLY, SeatType.SPECIAL_FIRST]:
                    if train.special_seat_available():
                        is_available = True
                
                # '일반우선'인데 일반실이 없으면 특실 확인
                if not is_available and selected_seat_option == SeatType.GENERAL_FIRST:
                    if train.special_seat_available():
                        is_available = True
                        
                if is_available:
                    print(f"\n[{train.train_number}] 잔여석 발견! 예약 시도 중...")
                    reservation = srt.reserve(train, passengers=passengers, option=selected_seat_option)
                    
                    # 상세 정보 출력
                    print(f"\n" + "="*50)
                    print(f"🎫 🎉 예매 성공! 🎉 🎫")
                    print(f"정상적으로 예약이 완료되었습니다. 앱에서 확인해 주세요.")
                    print("-" * 50)
                    print(f"• 예약 번호  : {reservation.reservation_number}")
                    print(f"• 열차 정보  : {reservation.train_name} {reservation.train_number}")
                    print(f"• 구간 정보  : {reservation.dep_station_name} ({reservation.dep_time[:2]}:{reservation.dep_time[2:4]}) -> "
                          f"{reservation.arr_station_name} ({reservation.arr_time[:2]}:{reservation.arr_time[2:4]})")
                    print(f"• 인원 정보  : {reservation.seat_count}명")
                    
                    if reservation.tickets:
                        print(f"• 좌석 정보  : ")
                        for t in reservation.tickets:
                            # 좌석 번호와 함께 승객 유형(어른, 경로 등)을 함께 출력
                            print(f"  - {t.car}호차 {t.seat} ({t.seat_type}/{t.passenger_type})")
                            
                    if not reservation.paid and not reservation.is_waiting:
                        print(f"• 결제 기한  : {reservation.payment_date[4:6]}월 {reservation.payment_date[6:8]}일 "
                              f"{reservation.payment_time[:2]}:{reservation.payment_time[2:4]} 까지")
                    elif reservation.is_waiting:
                        print(f"• 상태 정보  : 예약 대기 (자리가 나면 자동으로 예약됩니다)")
                        
                    print("="*50 + "\n")
                    return
            
            print(f"\r모니터링 중... (시도: {i_try})", end="", flush=True)
            time.sleep(1.2)
            
        except Exception as e:
            print(f"\n오류 발생: {e}")
            time.sleep(3)

if __name__ == "__main__":
    run_srt_reservation()
