"""API routes for Broker management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.broker_service import BrokerService
from app.application.transaction_service import TransactionService
from app.infrastructure.database import get_session

router = APIRouter(prefix="/brokers", tags=["Brokers"])


# --- Schemas ---

class BrokerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)


class BrokerResponse(BaseModel):
    id: UUID
    name: str
    created_at: str
    debt: float = 0.0

    class Config:
        from_attributes = True


# --- Endpoints ---

@router.get("", response_model=list[BrokerResponse])
async def list_brokers(session: AsyncSession = Depends(get_session)):
    """Return all brokers with their current debt."""
    service = BrokerService(session)
    tx_service = TransactionService(session)
    brokers = await service.list_brokers()

    result = []
    for b in brokers:
        debt = await tx_service.get_debt(b.id)
        result.append(
            BrokerResponse(
                id=b.id,
                name=b.name,
                created_at=b.created_at.isoformat(),
                debt=float(debt),
            )
        )
    return result


@router.post("", response_model=BrokerResponse, status_code=201)
async def create_broker(
    body: BrokerCreate,
    session: AsyncSession = Depends(get_session),
):
    """Create a new broker."""
    service = BrokerService(session)
    broker = await service.create_broker(body.name)
    return BrokerResponse(
        id=broker.id,
        name=broker.name,
        created_at=broker.created_at.isoformat(),
        debt=0.0,
    )


@router.delete("/{broker_id}", status_code=204)
async def delete_broker(
    broker_id: UUID,
    session: AsyncSession = Depends(get_session),
):
    """Delete a broker and all associated transactions."""
    service = BrokerService(session)
    deleted = await service.delete_broker(broker_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Broker not found")
