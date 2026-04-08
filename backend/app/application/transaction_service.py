"""Service layer for Transaction operations."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.transaction_repository import TransactionRepository
from app.infrastructure.models import TransactionModel


class TransactionService:
    """Business logic for Transaction management."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = TransactionRepository(session)

    async def list_transactions(self, broker_id: UUID) -> list[TransactionModel]:
        """Return all transactions for a broker."""
        return await self._repo.get_by_broker(broker_id)

    async def create_transaction(self, data: dict) -> TransactionModel:
        """Create a new transaction with validation."""
        amount = data.get("amount")
        if amount is None or float(amount) <= 0:
            raise ValueError("Amount must be greater than 0")

        tx_type = data.get("type")
        valid_types = {"accrual", "payment", "transfer", "cash"}
        if tx_type not in valid_types:
            raise ValueError(f"Invalid transaction type: {tx_type}")

        return await self._repo.create(data)

    async def delete_transaction(self, transaction_id: UUID) -> bool:
        """Delete a transaction. Returns True if found and deleted."""
        return await self._repo.delete(transaction_id)

    async def get_debt(self, broker_id: UUID) -> Decimal:
        """
        Calculate current debt for a broker.
        Positive = debt, Negative = overpayment.
        """
        return await self._repo.calculate_debt(broker_id)
