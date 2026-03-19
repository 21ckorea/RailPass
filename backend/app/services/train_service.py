from typing import List
import logging
from fastapi import HTTPException

from app.models.models import RailType, RailAccount
from app.schemas.schemas import TrainScheduleResponse
from app.core.crypto import decrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

import sys
sys.path.insert(0, "/app/srtgo")

logger = logging.getLogger("railpass.train_service")

class TrainService:
    async def search_trains(
        self, 
        db: AsyncSession,
        user_id: str,
        rail_type: RailType, 
        departure: str, 
        arrival: str, 
        date: str, 
        time: str
    ) -> List[TrainScheduleResponse]:
        # 사용자의 계정 정보 가져오기
        result = await db.execute(
            select(RailAccount).where(
                RailAccount.user_id == user_id,
                RailAccount.rail_type == rail_type
            )
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=400, detail=f"{rail_type} 계정이 설정되지 않았습니다.")

        account_id = decrypt(account.account_id)
        account_pw = decrypt(account.account_password)

        try:
            if rail_type == RailType.SRT:
                from srtgo.srt import SRT, Adult
                # SRT는 동기 세션을 사용하므로 별도 쓰레드에서 실행하거나 그냥 실행 (Worker와 동일 방식)
                # 여기서는 가벼운 검색이므로 직접 호출
                rail = SRT(account_id, account_pw, verbose=False)
                trains = rail.search_train(
                    dep=departure, 
                    arr=arrival, 
                    date=date, 
                    time=time, 
                    available_only=False
                )
                
                results = []
                for t in trains:
                    results.append(TrainScheduleResponse(
                        train_number=t.train_number,
                        train_name=t.train_name,
                        departure_time=t.dep_time,
                        arrival_time=t.arr_time,
                        general_seat_status=t.general_seat_state,
                        special_seat_status=t.special_seat_state,
                        is_available=t.seat_available()
                    ))
                return results

            else:
                from srtgo.ktx import Korail, AdultPassenger
                rail = Korail(account_id, account_pw, verbose=True)
                trains = rail.search_train(
                    dep=departure, 
                    arr=arrival, 
                    date=date, 
                    time=time, 
                    include_no_seats=True
                )
                
                results = []
                for t in trains:
                    results.append(TrainScheduleResponse(
                        train_number=t.train_no,
                        train_name=t.train_type_name,
                        departure_time=t.dep_time,
                        arrival_time=t.arr_time,
                        general_seat_status="예약가능" if t.has_general_seat() else "매진",
                        special_seat_status="예약가능" if t.has_special_seat() else "매진",
                        is_available=t.has_seat()
                    ))
                return results

        except Exception as e:
            logger.error(f"Train search error: {e}")
            raise HTTPException(status_code=500, detail=f"열차 조회 중 오류가 발생했습니다: {str(e)}")

train_service = TrainService()
