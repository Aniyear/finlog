"""Repository for Support Ticket operations."""

from __future__ import annotations
from uuid import UUID
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.infrastructure.models import SupportTicketModel, UserProfileModel

class SupportRepository:
    """Handles database operations for Support components."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, user_id: UUID, subject: str, message: str) -> SupportTicketModel:
        """Create a new support ticket."""
        ticket = SupportTicketModel(
            user_id=user_id,
            subject=subject,
            message=message,
            status="open",
        )
        self._session.add(ticket)
        await self._session.flush()
        # Reload to get user info if needed
        result = await self._session.execute(
            select(SupportTicketModel)
            .where(SupportTicketModel.id == ticket.id)
            .options(selectinload(SupportTicketModel.user))
        )
        return result.scalar_one()

    async def get_all(self, limit: int = 50) -> list[SupportTicketModel]:
        """Return all support tickets, latest first."""
        result = await self._session.execute(
            select(SupportTicketModel)
            .options(selectinload(SupportTicketModel.user))
            .order_by(desc(SupportTicketModel.created_at))
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_status(self, ticket_id: UUID, status: str) -> SupportTicketModel | None:
        """Update ticket status (open, resolved, closed)."""
        result = await self._session.execute(
            select(SupportTicketModel).where(SupportTicketModel.id == ticket_id)
        )
        ticket = result.scalar_one_or_none()
        if ticket:
            ticket.status = status
            await self._session.flush()
        return ticket
