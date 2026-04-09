"""Support Router for user feedback and admin ticket management."""

from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.infrastructure.auth_middleware import get_current_user, require_admin
from app.infrastructure.models import UserProfileModel
from app.infrastructure.support_repository import SupportRepository
from app.infrastructure.telegram_service import TelegramService

router = APIRouter(prefix="/support", tags=["Support"])

class SupportMessageCreate(BaseModel):
    subject: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)

@router.post("/message")
async def create_support_message(
    data: SupportMessageCreate,
    user: UserProfileModel = Depends(get_current_user),
    db: AsyncSession = Depends(get_session),
):
    """Users submit a support request."""
    repo = SupportRepository(db)
    ticket = await repo.create(
        user_id=user.id,
        subject=data.subject,
        message=data.message,
    )
    
    # Notify Admin via Telegram
    tg = TelegramService()
    await tg.notify_new_ticket(
        user_email=user.email,
        user_name=user.display_name,
        subject=data.subject,
        message=data.message,
    )
    
    return {"status": "ok", "ticket_id": str(ticket.id)}

@router.get("/tickets")
async def get_support_tickets(
    user: UserProfileModel = Depends(require_admin()),
    db: AsyncSession = Depends(get_session),
):
    """Admin views all support tickets."""
    repo = SupportRepository(db)
    tickets = await repo.get_all()
    
    return [
        {
            "id": str(t.id),
            "user_email": t.user.email,
            "user_name": t.user.display_name,
            "subject": t.subject,
            "message": t.message,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
        }
        for t in tickets
    ]

@router.patch("/tickets/{ticket_id}/status")
async def update_ticket_status(
    ticket_id: Any,
    status: str,
    user: UserProfileModel = Depends(require_admin()),
    db: AsyncSession = Depends(get_session),
):
    """Admin updates ticket status."""
    repo = SupportRepository(db)
    ticket = await repo.update_status(ticket_id, status)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"status": "ok"}
