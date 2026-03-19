from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.models.models import User, RailAccount, NotificationSetting, CardSetting, RailType, NotificationType
from app.schemas.schemas import (
    RailAccountRequest, TelegramSettingRequest, DiscordSettingRequest, CardSettingRequest
)
from app.core.crypto import encrypt, decrypt


class UserService:
    # ─── Rail Accounts ─────────────────────────────────────────
    async def upsert_rail_account(
        self, db: AsyncSession, user_id: uuid.UUID, data: RailAccountRequest
    ) -> RailAccount:
        result = await db.execute(
            select(RailAccount).where(
                RailAccount.user_id == user_id,
                RailAccount.rail_type == data.rail_type,
            )
        )
        account = result.scalar_one_or_none()

        if account:
            account.account_id = encrypt(data.account_id)
            account.account_password = encrypt(data.account_password)
            account.is_verified = False
        else:
            account = RailAccount(
                user_id=user_id,
                rail_type=data.rail_type,
                account_id=encrypt(data.account_id),
                account_password=encrypt(data.account_password),
            )
            db.add(account)

        await db.flush()
        # 응답 시 계정 ID 마스킹
        account._display_id = data.account_id[:3] + "***"
        return account

    async def get_rail_accounts(self, db: AsyncSession, user_id: uuid.UUID):
        result = await db.execute(
            select(RailAccount).where(RailAccount.user_id == user_id)
        )
        accounts = result.scalars().all()
        # 복호화 후 마스킹
        for acc in accounts:
            plain = decrypt(acc.account_id)
            acc.account_id = plain[:3] + "***" if len(plain) > 3 else "***"
        return accounts

    async def verify_rail_account(
        self, db: AsyncSession, user_id: uuid.UUID, rail_type: RailType
    ) -> bool:
        """SRT/KTX 로그인 테스트"""
        result = await db.execute(
            select(RailAccount).where(
                RailAccount.user_id == user_id,
                RailAccount.rail_type == rail_type,
            )
        )
        account = result.scalar_one_or_none()
        if not account:
            raise HTTPException(status_code=404, detail="계정 정보가 없습니다")

        plain_id = decrypt(account.account_id)
        plain_pass = decrypt(account.account_password)

        try:
            import sys
            sys.path.insert(0, "/app/srtgo")
            if rail_type == RailType.SRT:
                from srtgo.srt import SRT
                SRT(plain_id, plain_pass)
            else:
                from srtgo.ktx import Korail
                Korail(plain_id, plain_pass)
            account.is_verified = True
            await db.flush()
            return True
        except Exception as e:
            account.is_verified = False
            await db.flush()
            raise HTTPException(status_code=400, detail=f"로그인 실패: {str(e)}")

    # ─── Notification Settings ─────────────────────────────────
    async def upsert_telegram(
        self, db: AsyncSession, user_id: uuid.UUID, data: TelegramSettingRequest
    ) -> NotificationSetting:
        result = await db.execute(
            select(NotificationSetting).where(
                NotificationSetting.user_id == user_id,
                NotificationSetting.type == NotificationType.TELEGRAM,
            )
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.telegram_token = encrypt(data.token)
            setting.telegram_chat_id = data.chat_id
            setting.is_enabled = True
        else:
            setting = NotificationSetting(
                user_id=user_id,
                type=NotificationType.TELEGRAM,
                telegram_token=encrypt(data.token),
                telegram_chat_id=data.chat_id,
                is_enabled=True,
            )
            db.add(setting)

        await db.flush()
        return setting

    async def upsert_discord(
        self, db: AsyncSession, user_id: uuid.UUID, data: DiscordSettingRequest
    ) -> NotificationSetting:
        result = await db.execute(
            select(NotificationSetting).where(
                NotificationSetting.user_id == user_id,
                NotificationSetting.type == NotificationType.DISCORD,
            )
        )
        setting = result.scalar_one_or_none()

        if setting:
            setting.discord_webhook_url = encrypt(data.webhook_url)
            setting.is_enabled = True
        else:
            setting = NotificationSetting(
                user_id=user_id,
                type=NotificationType.DISCORD,
                discord_webhook_url=encrypt(data.webhook_url),
                is_enabled=True,
            )
            db.add(setting)

        await db.flush()
        await db.flush()
        return setting

    async def get_notification_settings(self, db: AsyncSession, user_id: uuid.UUID):
        result = await db.execute(
            select(NotificationSetting).where(NotificationSetting.user_id == user_id)
        )
        settings = result.scalars().all()
        # 마스킹 처리된 객체 리스트 반환 (DB 반영 방지를 위해 세션에서 분리하거나 Dict 변환 권장)
        # 여기서는 단순 조회를 위해 스키마 변환 시점에 맡기는 것이 안전함
        return settings

    # ─── Card Settings ─────────────────────────────────────────
    async def upsert_card(
        self, db: AsyncSession, user_id: uuid.UUID, data: CardSettingRequest
    ) -> CardSetting:
        result = await db.execute(
            select(CardSetting).where(CardSetting.user_id == user_id)
        )
        card = result.scalar_one_or_none()

        if card:
            card.card_number = encrypt(data.card_number)
            card.card_password = encrypt(data.card_password)
            card.birthday = encrypt(data.birthday)
            card.expire_date = encrypt(data.expire_date)
            card.is_enabled = True
        else:
            card = CardSetting(
                user_id=user_id,
                card_number=encrypt(data.card_number),
                card_password=encrypt(data.card_password),
                birthday=encrypt(data.birthday),
                expire_date=encrypt(data.expire_date),
                is_enabled=True,
            )
            db.add(card)

        await db.flush()
        # 마스킹 번호 추가
        plain_num = data.card_number.replace("-", "")
        card._masked_number = plain_num[:4] + "-****-****-" + plain_num[-4:]
        return card

    async def get_card_setting(self, db: AsyncSession, user_id: uuid.UUID):
        result = await db.execute(
            select(CardSetting).where(CardSetting.user_id == user_id)
        )
        return result.scalar_one_or_none()


user_service = UserService()
