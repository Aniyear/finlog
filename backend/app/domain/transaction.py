"""Domain entity: Transaction (Операция)."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4


class TransactionType(str, enum.Enum):
    """Types of financial transactions."""

    ACCRUAL = "accrual"
    PAYMENT = "payment"
    TRANSFER = "transfer"
    CASH = "cash"


class TransactionSource(str, enum.Enum):
    """Source of the transaction data."""

    MANUAL = "manual"
    RECEIPT = "receipt"


@dataclass
class Transaction:
    """Represents a financial transaction linked to a broker."""

    broker_id: UUID
    type: TransactionType
    amount: Decimal
    datetime: datetime

    # Optional fields
    id: UUID = field(default_factory=uuid4)
    receipt_number: Optional[str] = None
    party_from: Optional[str] = None
    party_to: Optional[str] = None
    party_identifier: Optional[str] = None
    kbk: Optional[str] = None
    knp: Optional[str] = None
    comment: Optional[str] = None
    source: TransactionSource = TransactionSource.MANUAL
    raw_text: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if self.amount <= 0:
            raise ValueError("Transaction amount must be greater than 0")

    @property
    def affects_debt(self) -> Decimal:
        """Return signed amount: positive for accrual, negative for others."""
        if self.type == TransactionType.ACCRUAL:
            return self.amount
        return -self.amount
