from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

from app.models.models import RailType, NotificationType, SeatTypeEnum, JobStatus


# ─── Auth ──────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── User ──────────────────────────────────────────────────────
class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Rail Accounts ─────────────────────────────────────────────
class RailAccountRequest(BaseModel):
    rail_type: RailType
    account_id: str
    account_password: str


class RailAccountResponse(BaseModel):
    id: uuid.UUID
    rail_type: RailType
    account_id: str          # 마스킹 처리된 값
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Notification Settings ─────────────────────────────────────
class TelegramSettingRequest(BaseModel):
    token: str
    chat_id: str


class DiscordSettingRequest(BaseModel):
    webhook_url: str


class NotificationSettingResponse(BaseModel):
    id: uuid.UUID
    type: NotificationType
    is_enabled: bool
    telegram_chat_id: Optional[str] = None
    discord_webhook_url: Optional[str] = None  # 마스킹 처리

    class Config:
        from_attributes = True


# ─── Card Setting ──────────────────────────────────────────────
class CardSettingRequest(BaseModel):
    card_number: str
    card_password: str
    birthday: str
    expire_date: str


class CardSettingResponse(BaseModel):
    id: uuid.UUID
    is_enabled: bool
    card_number_masked: Optional[str] = None  # 마스킹 처리

    class Config:
        from_attributes = True


# ─── Reservation Jobs ──────────────────────────────────────────
class PassengersInput(BaseModel):
    adult: int = 1
    child: int = 0
    senior: int = 0
    disability1to3: int = 0
    disability4to6: int = 0

    @field_validator("adult", "child", "senior", "disability1to3", "disability4to6")
    @classmethod
    def non_negative(cls, v):
        if v < 0:
            raise ValueError("승객수는 0 이상이어야 합니다")
        return v


class ReservationJobRequest(BaseModel):
    rail_type: RailType
    departure_station: str
    arrival_station: str
    travel_date: str           # YYYYMMDD
    time_slots: List[str]      # ["060000", "070000", ...]
    train_numbers: Optional[List[str]] = None # 특정 열차 번호 선택 ["313", "315", ...]
    seat_type: SeatTypeEnum = SeatTypeEnum.GENERAL_FIRST
    passengers: PassengersInput
    auto_pay: bool = False

    @field_validator("travel_date")
    @classmethod
    def validate_date(cls, v):
        if len(v) != 8 or not v.isdigit():
            raise ValueError("날짜 형식은 YYYYMMDD이어야 합니다")
        return v

    @field_validator("time_slots")
    @classmethod
    def validate_time_slots(cls, v):
        if not v:
            raise ValueError("시간대를 하나 이상 선택해야 합니다")
        return v


class ReservationResultResponse(BaseModel):
    id: uuid.UUID
    reservation_number: Optional[str] = None
    train_id: Optional[str] = None
    departure_station: Optional[str] = None
    arrival_station: Optional[str] = None
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    seat_info: Optional[Dict[str, Any]] = None
    total_price: Optional[int] = None
    is_paid: Optional[bool] = False

    class Config:
        from_attributes = True


class ReservationJobResponse(BaseModel):
    id: uuid.UUID
    rail_type: RailType
    departure_station: str
    arrival_station: str
    travel_date: str
    time_slots: List[str]
    train_numbers: Optional[List[str]] = None
    seat_type: SeatTypeEnum
    passengers: Dict[str, Any]
    auto_pay: bool
    status: JobStatus
    try_count: int
    elapsed_seconds: int
    error_message: Optional[str] = None
    result: Optional[ReservationResultResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── Train Search ─────────────────────────────────────────────
class TrainSearchRequest(BaseModel):
    rail_type: RailType
    departure_station: str
    arrival_station: str
    travel_date: str           # YYYYMMDD
    time: str                  # HHMMSS


class TrainScheduleResponse(BaseModel):
    train_number: str
    train_name: str
    departure_time: str
    arrival_time: str
    general_seat_status: str
    special_seat_status: str
    is_available: bool


# ─── WebSocket 메시지 ───────────────────────────────────────────
class WSJobUpdate(BaseModel):
    job_id: str
    status: JobStatus
    try_count: int
    elapsed_seconds: int
    message: Optional[str] = None
    result: Optional[ReservationResultResponse] = None
