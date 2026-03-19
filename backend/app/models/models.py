import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Boolean, Integer, DateTime, ForeignKey, Text, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.core.database import Base


class RailType(str, enum.Enum):
    SRT = "SRT"
    KTX = "KTX"


class NotificationType(str, enum.Enum):
    TELEGRAM = "telegram"
    DISCORD = "discord"


class SeatTypeEnum(str, enum.Enum):
    GENERAL_FIRST = "GENERAL_FIRST"
    GENERAL_ONLY = "GENERAL_ONLY"
    SPECIAL_FIRST = "SPECIAL_FIRST"
    SPECIAL_ONLY = "SPECIAL_ONLY"


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    rail_accounts = relationship("RailAccount", back_populates="user", cascade="all, delete-orphan")
    notification_settings = relationship("NotificationSetting", back_populates="user", cascade="all, delete-orphan")
    card_setting = relationship("CardSetting", back_populates="user", uselist=False, cascade="all, delete-orphan")
    reservation_jobs = relationship("ReservationJob", back_populates="user", cascade="all, delete-orphan")


class RailAccount(Base):
    __tablename__ = "rail_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rail_type = Column(SAEnum(RailType), nullable=False)
    account_id = Column(String(500), nullable=False)        # 암호화 저장
    account_password = Column(String(500), nullable=False)  # 암호화 저장
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="rail_accounts")


class NotificationSetting(Base):
    __tablename__ = "notification_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(SAEnum(NotificationType), nullable=False)
    # Telegram
    telegram_token = Column(String(500))           # 암호화 저장
    telegram_chat_id = Column(String(100))
    # Discord
    discord_webhook_url = Column(String(1000))     # 암호화 저장
    is_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="notification_settings")


class CardSetting(Base):
    __tablename__ = "card_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    card_number = Column(String(500))       # 암호화 저장
    card_password = Column(String(500))     # 암호화 저장
    birthday = Column(String(500))          # 암호화 저장
    expire_date = Column(String(500))       # 암호화 저장
    is_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="card_setting")


class ReservationJob(Base):
    __tablename__ = "reservation_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rail_type = Column(SAEnum(RailType), nullable=False)
    departure_station = Column(String(50), nullable=False)
    arrival_station = Column(String(50), nullable=False)
    travel_date = Column(String(8), nullable=False)   # YYYYMMDD
    time_slots = Column(JSON, nullable=False)          # ["060000", "070000", ...]
    train_numbers = Column(JSON)                       # ["313", "315", ...]
    seat_type = Column(SAEnum(SeatTypeEnum), nullable=False, default=SeatTypeEnum.GENERAL_FIRST)
    passengers = Column(JSON, nullable=False)          # {"adult": 2, "child": 0, ...}
    auto_pay = Column(Boolean, default=False)
    status = Column(SAEnum(JobStatus), nullable=False, default=JobStatus.PENDING)
    try_count = Column(Integer, default=0)
    elapsed_seconds = Column(Integer, default=0)
    error_message = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="reservation_jobs")
    result = relationship("ReservationResult", back_populates="job", uselist=False, cascade="all, delete-orphan")


class ReservationResult(Base):
    __tablename__ = "reservation_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    job_id = Column(UUID(as_uuid=True), ForeignKey("reservation_jobs.id"), nullable=False, unique=True)
    reservation_number = Column(String(50))
    train_id = Column(String(50))
    departure_station = Column(String(50))
    arrival_station = Column(String(50))
    departure_time = Column(String(20))
    arrival_time = Column(String(20))
    seat_info = Column(JSON)
    total_price = Column(Integer)
    is_paid = Column(Boolean, default=False)
    payment_info = Column(JSON)
    raw_response = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    job = relationship("ReservationJob", back_populates="result")
