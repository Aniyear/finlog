"""Service layer for Broker operations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.broker_repository import BrokerRepository
from app.infrastructure.models import BrokerModel


class BrokerService:
    """Business logic for Broker management."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = BrokerRepository(session)

    async def list_brokers(self) -> list[BrokerModel]:
        """Return all brokers."""
        return await self._repo.get_all()

    async def create_broker(self, name: str) -> BrokerModel:
        """Create a new broker with validation."""
        if not name or not name.strip():
            raise ValueError("Broker name cannot be empty")
        return await self._repo.create(name.strip())

    async def delete_broker(self, broker_id: UUID) -> bool:
        """Delete a broker. Returns True if found and deleted."""
        return await self._repo.delete(broker_id)
