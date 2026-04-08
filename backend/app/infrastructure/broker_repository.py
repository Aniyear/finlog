"""Repository for Broker CRUD operations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.models import BrokerModel


class BrokerRepository:
    """Handles database operations for Broker entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[BrokerModel]:
        """Return all brokers ordered by creation date."""
        result = await self._session.execute(
            select(BrokerModel).order_by(BrokerModel.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, broker_id: UUID) -> BrokerModel | None:
        """Return a broker by ID or None."""
        return await self._session.get(BrokerModel, broker_id)

    async def create(self, name: str) -> BrokerModel:
        """Create and return a new broker."""
        broker = BrokerModel(name=name)
        self._session.add(broker)
        await self._session.flush()
        return broker

    async def delete(self, broker_id: UUID) -> bool:
        """Delete a broker by ID. Returns True if deleted."""
        broker = await self.get_by_id(broker_id)
        if broker is None:
            return False
        await self._session.delete(broker)
        await self._session.flush()
        return True
