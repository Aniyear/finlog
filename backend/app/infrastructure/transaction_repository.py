"""Repository for Transaction CRUD operations."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import TransactionModel


class TransactionRepository:
    """Handles database operations for Transaction entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_broker(self, broker_id: UUID) -> list[TransactionModel]:
        """Return all transactions for a broker, newest first."""
        result = await self._session.execute(
            select(TransactionModel)
            .where(TransactionModel.broker_id == broker_id)
            .order_by(TransactionModel.datetime.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, transaction_id: UUID) -> TransactionModel | None:
        """Return a transaction by ID or None."""
        return await self._session.get(TransactionModel, transaction_id)

    async def create(self, data: dict) -> TransactionModel:
        """Create and return a new transaction."""
        transaction = TransactionModel(**data)
        self._session.add(transaction)
        await self._session.flush()
        return transaction

    async def delete(self, transaction_id: UUID) -> bool:
        """Delete a transaction by ID. Returns True if deleted."""
        transaction = await self.get_by_id(transaction_id)
        if transaction is None:
            return False
        await self._session.delete(transaction)
        await self._session.flush()
        return True

    async def calculate_debt(self, broker_id: UUID) -> Decimal:
        """
        Calculate current debt for a broker.

        Formula: SUM(accrual) - SUM(payment + transfer + cash)
        Negative result means overpayment.
        """
        # Sum of accruals
        accrual_result = await self._session.execute(
            select(func.coalesce(func.sum(TransactionModel.amount), 0)).where(
                TransactionModel.broker_id == broker_id,
                TransactionModel.type == "accrual",
            )
        )
        total_accrual = accrual_result.scalar() or Decimal("0")

        # Sum of payments (payment + transfer + cash)
        payment_result = await self._session.execute(
            select(func.coalesce(func.sum(TransactionModel.amount), 0)).where(
                TransactionModel.broker_id == broker_id,
                TransactionModel.type.in_(["payment", "transfer", "cash"]),
            )
        )
        total_payments = payment_result.scalar() or Decimal("0")

        return Decimal(str(total_accrual)) - Decimal(str(total_payments))
