from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.models import User, RailType
from app.schemas.schemas import (
    RailAccountRequest, RailAccountResponse,
    TelegramSettingRequest, DiscordSettingRequest,
    NotificationSettingResponse,
    CardSettingRequest, CardSettingResponse,
)
from app.services.user_service import user_service

router = APIRouter(prefix="/api/users", tags=["사용자 설정"])


# ─── Rail Accounts ────────────────────────────────────────
@router.get("/rail-accounts", response_model=List[RailAccountResponse])
async def get_rail_accounts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.get_rail_accounts(db, current_user.id)


@router.put("/rail-accounts")
async def upsert_rail_account(
    data: RailAccountRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SRT/KTX 계정 저장 (암호화)"""
    account = await user_service.upsert_rail_account(db, current_user.id, data)
    return {"message": f"{data.rail_type} 계정이 저장되었습니다", "id": str(account.id)}


@router.post("/rail-accounts/{rail_type}/verify")
async def verify_rail_account(
    rail_type: RailType,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """SRT/KTX 로그인 확인 테스트"""
    result = await user_service.verify_rail_account(db, current_user.id, rail_type)
    return {"verified": result, "message": "로그인 성공"}


# ─── Notification Settings ────────────────────────────────
@router.get("/notifications", response_model=List[NotificationSettingResponse])
async def get_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.get_notification_settings(db, current_user.id)


@router.put("/notifications/telegram")
async def upsert_telegram(
    data: TelegramSettingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """텔레그램 알림 설정"""
    await user_service.upsert_telegram(db, current_user.id, data)
    return {"message": "텔레그램 설정이 저장되었습니다"}


@router.put("/notifications/discord")
async def upsert_discord(
    data: DiscordSettingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """디스코드 웹훅 설정"""
    await user_service.upsert_discord(db, current_user.id, data)
    return {"message": "디스코드 설정이 저장되었습니다"}


# ─── Card Settings ────────────────────────────────────────
@router.get("/card")
async def get_card(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    card = await user_service.get_card_setting(db, current_user.id)
    if not card:
        return {"has_card": False}
    return {"has_card": True, "is_enabled": card.is_enabled}


@router.put("/card")
async def upsert_card(
    data: CardSettingRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """카드 정보 저장 (암호화)"""
    await user_service.upsert_card(db, current_user.id, data)
    return {"message": "카드 정보가 저장되었습니다"}
