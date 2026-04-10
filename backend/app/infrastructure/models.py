"""SQLAlchemy ORM models."""

from __future__ import annotations

import uuid
import datetime as dt
from datetime import timezone, timedelta

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.database import Base

# Default timezone for the application (UTC+5)
APP_TZ = timezone(timedelta(hours=5))

def get_now_tz():
    return dt.datetime.now(APP_TZ)



class BrokerModel(Base):
    """ORM model for the brokers table."""

    __tablename__ = "brokers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )

    transactions: Mapped[list["TransactionModel"]] = relationship(
        back_populates="broker", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Broker(id={self.id}, name={self.name!r})>"


class TransactionModel(Base):
    """ORM model for the transactions table."""

    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_transactions_amount_positive"),
        CheckConstraint(
            "type IN ('accrual', 'payment', 'transfer', 'cash')",
            name="ck_transactions_type_valid",
        ),
        CheckConstraint(
            "source IN ('manual', 'receipt')",
            name="ck_transactions_source_valid",
        ),
        Index("idx_transactions_broker_id", "broker_id"),
        Index("idx_transactions_type", "type"),
        Index("idx_transactions_datetime", "datetime"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    broker_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("brokers.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(15, 2), nullable=False)
    datetime: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    receipt_number: Mapped[str | None] = mapped_column(Text)
    party_from: Mapped[str | None] = mapped_column(Text)
    party_to: Mapped[str | None] = mapped_column(Text)
    party_identifier: Mapped[str | None] = mapped_column(Text)
    kbk: Mapped[str | None] = mapped_column(Text)
    knp: Mapped[str | None] = mapped_column(Text)
    comment: Mapped[str | None] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(20), default="manual")
    raw_text: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )

    broker: Mapped["BrokerModel"] = relationship(back_populates="transactions")

    def __repr__(self) -> str:
        return f"<Transaction(id={self.id}, type={self.type}, amount={self.amount})>"


class ModuleModel(Base):
    """ORM model for the modules table."""

    __tablename__ = "modules"

    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    icon: Mapped[str | None] = mapped_column(String(10))
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )

    def __repr__(self) -> str:
        return f"<Module(id={self.id!r}, name={self.name!r})>"


class UserProfileModel(Base):
    """ORM model for the user_profiles table."""

    __tablename__ = "user_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    auth_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), unique=True, nullable=False
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False, default="user")
    is_active: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz, onupdate=get_now_tz
    )

    module_access: Mapped[list["UserModuleAccessModel"]] = relationship(
        back_populates="user", cascade="all, delete-orphan", foreign_keys="[UserModuleAccessModel.user_id]"
    )

    def __repr__(self) -> str:
        return f"<UserProfile(id={self.id}, email={self.email!r}, role={self.role!r})>"


class UserModuleAccessModel(Base):
    """ORM model for the user_module_access table."""

    __tablename__ = "user_module_access"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    )
    module_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("modules.id", ondelete="CASCADE"),
        primary_key=True,
    )
    granted_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )
    granted_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id"),
        nullable=True,
    )

    user: Mapped["UserProfileModel"] = relationship(
        back_populates="module_access", foreign_keys=[user_id]
    )
    module: Mapped["ModuleModel"] = relationship()

    def __repr__(self) -> str:
        return f"<UserModuleAccess(user={self.user_id}, module={self.module_id!r})>"


class SupportTicketModel(Base):
    """ORM model for the support_tickets table."""

    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_profiles.id", ondelete="CASCADE"),
        nullable=False,
    )
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="open")  # open, resolved, closed
    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), default=get_now_tz
    )

    user: Mapped["UserProfileModel"] = relationship()

    def __repr__(self) -> str:
        return f"<SupportTicket(id={self.id}, user={self.user_id}, status={self.status})>"
