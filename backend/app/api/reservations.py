from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import json
import asyncio

import redis.asyncio as aioredis

from app.core.database import get_db, AsyncSessionLocal
from app.api.deps import get_current_user
from app.models.models import User
from app.schemas.schemas import ReservationJobRequest, ReservationJobResponse, TrainSearchRequest, TrainScheduleResponse
from app.services.reservation_service import reservation_service
from app.services.train_service import train_service
from app.core.config import settings
from app.core.security import decode_token

router = APIRouter(prefix="/api/reservations", tags=["예매 관리"])


@router.post("/search", response_model=List[TrainScheduleResponse])
async def search_trains(
    data: TrainSearchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """열차 시간표 조회 (약 10개 내외)"""
    return await train_service.search_trains(
        db, str(current_user.id), data.rail_type, data.departure_station, data.arrival_station, data.travel_date, data.time
    )


@router.post("", response_model=ReservationJobResponse, status_code=201)
async def create_reservation(
    data: ReservationJobRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """예매 작업 생성 및 큐 등록"""
    job = await reservation_service.create_job(db, current_user.id, data)
    return job


@router.get("", response_model=List[ReservationJobResponse])
async def get_reservations(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """내 예매 목록 조회"""
    return await reservation_service.get_jobs(db, current_user.id)


@router.get("/{job_id}", response_model=ReservationJobResponse)
async def get_reservation(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """특정 예매 상세 조회"""
    return await reservation_service.get_job(db, current_user.id, job_id)


@router.delete("/{job_id}")
async def delete_reservation(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """예매 작업 삭제 (진행 중이면 취소 후 삭제)"""
    await reservation_service.delete_job(db, current_user.id, job_id)
    return {"message": "예매 작업이 삭제되었습니다", "id": str(job_id)}


@router.post("/{job_id}/pay")
async def pay_reservation(
    job_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """미결제 예매 카드 결제"""
    redis = await reservation_service.get_redis()
    await redis.lpush("railpass:pay", json.dumps({"job_id": str(job_id), "user_id": str(current_user.id)}))
    return {"message": "결제 요청이 접수되었습니다"}


# ─── WebSocket 실시간 상태 ─────────────────────────────────────
@router.websocket("/ws/{job_id}")
async def reservation_websocket(websocket: WebSocket, job_id: str):
    """예매 실시간 상태 스트리밍 (WebSocket)"""
    try:
        await websocket.accept()
        print(f"WebSocket connection accepted: {job_id}")

        # 토큰 인증
        token = websocket.query_params.get("token")
        if not token:
            print(f"WebSocket auth failed: Missing token for {job_id}")
            await websocket.close(code=4001, reason="인증 토큰이 필요합니다")
            return

        payload = decode_token(token)
        if not payload or payload.get("type") != "access":
            print(f"WebSocket auth failed: Invalid token for {job_id}")
            await websocket.close(code=4001, reason="유효하지 않은 토큰입니다")
            return

        redis_client = await aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.subscribe(f"railpass:ws:{job_id}")
        print(f"WebSocket subscribed to railpass:ws:{job_id}")

        # 현재 상태 즉시 전송
        current = await redis_client.get(f"railpass:status:{job_id}")
        if current:
            await websocket.send_text(current)

        # 실시간 메시지 수신 (listen() 대신 get_message() 루프로 더 정밀한 제어)
        while True:
            message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
            if message:
                await websocket.send_text(message["data"])
                try:
                    data = json.loads(message["data"])
                    # 상태가 완료인 경우 루프 종료
                    if data.get("status", "").upper() in ("SUCCESS", "FAILED", "CANCELLED"):
                        print(f"WebSocket job completed: {job_id} with status {data.get('status')}")
                        break
                except:
                    pass
            
            # 클라이언트 연결 종료 감지
            try:
                # 비차단 방식으로 수신 시도하여 중단 확인
                await asyncio.wait_for(websocket.receive_text(), timeout=0.01)
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                print(f"WebSocket disconnected by client: {job_id}")
                break

    except Exception as e:
        print(f"WebSocket error for {job_id}: {e}")
    finally:
        try:
            if 'pubsub' in locals():
                await pubsub.unsubscribe(f"railpass:ws:{job_id}")
            if 'redis_client' in locals():
                await redis_client.aclose()
        except:
            pass
