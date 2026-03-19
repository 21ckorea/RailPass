from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from typing import List
import uuid
import json

import redis.asyncio as aioredis

from app.models.models import ReservationJob, ReservationResult, JobStatus, RailAccount
from app.schemas.schemas import ReservationJobRequest, WSJobUpdate
from app.core.config import settings
from app.core.crypto import decrypt


class ReservationService:
    def __init__(self):
        self._redis: aioredis.Redis = None

    async def get_redis(self) -> aioredis.Redis:
        if self._redis is None:
            self._redis = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        return self._redis

    async def create_job(
        self, db: AsyncSession, user_id: uuid.UUID, data: ReservationJobRequest
    ) -> ReservationJob:
        # 계정 정보 확인
        result = await db.execute(
            select(RailAccount).where(
                RailAccount.user_id == user_id,
                RailAccount.rail_type == data.rail_type,
            )
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"{data.rail_type} 계정 정보가 없습니다. 먼저 계정을 설정해주세요.",
            )

        job = ReservationJob(
            user_id=user_id,
            rail_type=data.rail_type,
            departure_station=data.departure_station,
            arrival_station=data.arrival_station,
            travel_date=data.travel_date,
            time_slots=data.time_slots,
            train_numbers=data.train_numbers,
            seat_type=data.seat_type,
            passengers=data.passengers.model_dump(),
            auto_pay=data.auto_pay,
            status=JobStatus.PENDING,
        )
        db.add(job)
        await db.flush()

        # Redis 큐에 작업 추가
        redis = await self.get_redis()
        job_data = {
            "job_id": str(job.id),
            "user_id": str(user_id),
            "rail_type": data.rail_type.value,
            "departure_station": data.departure_station,
            "arrival_station": data.arrival_station,
            "travel_date": data.travel_date,
            "time_slots": data.time_slots,
            "train_numbers": data.train_numbers,
            "seat_type": data.seat_type.value,
            "passengers": data.passengers.model_dump(),
            "auto_pay": data.auto_pay,
        }
        await redis.lpush("railpass:jobs", json.dumps(job_data))
        await db.flush()
        return await self.get_job(db, user_id, job.id)

    async def get_jobs(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> List[ReservationJob]:
        result = await db.execute(
            select(ReservationJob)
            .where(ReservationJob.user_id == user_id)
            .options(selectinload(ReservationJob.result))
            .order_by(desc(ReservationJob.created_at))
        )
        return result.scalars().all()

    async def get_job(
        self, db: AsyncSession, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> ReservationJob:
        result = await db.execute(
            select(ReservationJob)
            .where(
                ReservationJob.id == job_id,
                ReservationJob.user_id == user_id,
            )
            .options(selectinload(ReservationJob.result))
        )
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status_code=404, detail="예매 작업을 찾을 수 없습니다")
        return job

    async def cancel_job(
        self, db: AsyncSession, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> ReservationJob:
        job = await self.get_job(db, user_id, job_id)

        if job.status not in (JobStatus.PENDING, JobStatus.RUNNING):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="취소할 수 없는 상태입니다",
            )

        job.status = JobStatus.CANCELLED
        await db.flush()

        # Redis에 취소 신호
        redis = await self.get_redis()
        await redis.set(f"railpass:cancel:{job_id}", "1", ex=3600)

        return job

    async def delete_job(
        self, db: AsyncSession, user_id: uuid.UUID, job_id: uuid.UUID
    ) -> bool:
        job = await self.get_job(db, user_id, job_id)

        # 진행 중이라면 취소 신호 보냄
        if job.status in (JobStatus.PENDING, JobStatus.RUNNING):
            redis = await self.get_redis()
            await redis.set(f"railpass:cancel:{job_id}", "1", ex=3600)

        await db.delete(job)
        await db.flush()
        return True

    async def get_job_status(self, job_id: str) -> dict:
        """Redis에서 실시간 상태 조회"""
        redis = await self.get_redis()
        data = await redis.get(f"railpass:status:{job_id}")
        return json.loads(data) if data else {}


reservation_service = ReservationService()
