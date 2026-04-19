import sys
import os
import time
from datetime import datetime

# srtgo 라이브러리 경로 추가 (필요한 경우)
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
    parser.add_argument("--times", help="선택할 열차 시간들 (쉼표 구분, 예: 1400,1530)")
    parser.add_argument("--seat", default="1", choices=["1", "2", "3", "4"], 
                        help="좌석 유형 (1: 일반실 우선, 2: 일반실만, 3: 특실 우선, 4: 특실만)")
    parser.add_argument("--adult", type=int, default=1, help="성인 인원수")
    parser.add_argument("--senior", type=int, default=0, help="경로 인원수")
    
    args = parser.parse_args()

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
    if args.adult > 0:
        passengers.append(Adult(args.adult))
    if args.senior > 0:
        passengers.append(Senior(args.senior))
    
    if not passengers:
        print("인원수가 0명일 수 없습니다.")
        return

    # 3. 열차 조회 및 필터링
    dep, arr, date = args.dep, args.arr, args.date
    target_times = args.times.split(",") if args.times else []
    
    print(f"\n[ {dep} -> {arr} ] {date} 검색 시작...")
    
    try:
        # 특정 시간이 지정된 경우 해당 시간들만 필터링하기 위해 전체 조회
        all_trains = srt.search_train(dep, arr, date, time="000000", available_only=False)
        
        if target_times:
            # 4자리(HHMM) 입력을 처리하기 위해 앞의 4자리만 비교
            selected_trains = [t for t in all_trains if t.dep_time[:4] in target_times]
            if not selected_trains:
                print(f"지정하신 시간({args.times})에 해당하는 열차를 찾을 수 없습니다.")
                return
        else:
            # 시간이 지정되지 않은 경우 인터렉티브 선택 유지
            print("\n=== 조회된 열차 목록 ===")
            for i, train in enumerate(all_trains):
                print(f"[{i}] {train}")
            selection = input("\n예약을 시도할 열차 번호를 입력하세요 (쉼표로 구분) 또는 Enter(전체): ")
            if not selection.strip():
                selected_trains = all_trains
            else:
                indices = [int(idx.strip()) for idx in selection.split(",")]
                selected_trains = [all_trains[i] for i in indices]
            
        print(f"\n총 {len(selected_trains)}개의 열차를 모니터링합니다.")
        for t in selected_trains:
            print(f" - {t.train_name} {t.train_number} ({t.dep_time[:2]}:{t.dep_time[2:4]})")
            
    except Exception as e:
        print(f"조회 중 오류 발생: {e}")
        return

    # 4. 예매 시도 루프
    i_try = 0
    selected_nos = [t.train_number for t in selected_trains]
    
    while True:
        try:
            i_try += 1
            current_trains = srt.search_train(dep, arr, date, time="000000", available_only=False)
            
            for train in current_trains:
                if train.train_number in selected_nos:
                    # 좌석 가용성 체크 (옵션에 따라)
                    is_available = False
                    if selected_seat_option == SeatType.GENERAL_FIRST:
                        is_available = train.general_seat_available() or train.special_seat_available()
                    elif selected_seat_option == SeatType.GENERAL_ONLY:
                        is_available = train.general_seat_available()
                    elif selected_seat_option == SeatType.SPECIAL_FIRST:
                        is_available = train.special_seat_available() or train.general_seat_available()
                    elif selected_seat_option == SeatType.SPECIAL_ONLY:
                        is_available = train.special_seat_available()

                    if is_available:
                        print(f"\n[{train.train_number}] 잔여석 발견! 예약 시도 중...")
                        reservation = srt.reserve(train, passengers=passengers, option=selected_seat_option)
                        print(f"🎉 예약 성공! 예약 번호: {reservation.reservation_number}")
                        return
            
            print(f"\r모니터링 중... (시도: {i_try})", end="", flush=True)
            time.sleep(1.2)
            
        except Exception as e:
            print(f"\n오류 발생: {e}")
            time.sleep(3)

if __name__ == "__main__":
    run_srt_reservation()
