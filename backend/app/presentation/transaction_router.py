"""API routes for Transaction management."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.transaction_service import TransactionService
from app.infrastructure.database import get_session
from app.infrastructure.auth_middleware import require_module
from app.infrastructure.models import UserProfileModel as AuthUserModel

router = APIRouter(tags=["Transactions"])


# --- Schemas ---

class TransactionCreate(BaseModel):
    broker_id: UUID
    type: str = Field(..., pattern="^(accrual|payment|transfer|cash)$")
    amount: float = Field(..., gt=0)
    datetime: datetime
    receipt_number: Optional[str] = None
    party_from: Optional[str] = None
    party_to: Optional[str] = None
    party_identifier: Optional[str] = None
    kbk: Optional[str] = None
    knp: Optional[str] = None
    comment: Optional[str] = None
    source: str = "manual"
    raw_text: Optional[str] = None


class TransactionResponse(BaseModel):
    id: UUID
    broker_id: UUID
    type: str
    amount: float
    datetime: str
    receipt_number: Optional[str] = None
    party_from: Optional[str] = None
    party_to: Optional[str] = None
    party_identifier: Optional[str] = None
    kbk: Optional[str] = None
    knp: Optional[str] = None
    comment: Optional[str] = None
    source: str
    raw_text: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


class DebtResponse(BaseModel):
    broker_id: UUID
    debt: float
    is_overpayment: bool


# --- Endpoints ---

@router.get("/brokers/{broker_id}/transactions", response_model=list[TransactionResponse])
async def list_transactions(
    broker_id: UUID,
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Return all transactions for a broker."""
    service = TransactionService(session)
    transactions = await service.list_transactions(broker_id)
    return [
        TransactionResponse(
            id=t.id,
            broker_id=t.broker_id,
            type=t.type,
            amount=float(t.amount),
            datetime=t.datetime.isoformat(),
            receipt_number=t.receipt_number,
            party_from=t.party_from,
            party_to=t.party_to,
            party_identifier=t.party_identifier,
            kbk=t.kbk,
            knp=t.knp,
            comment=t.comment,
            source=t.source,
            raw_text=t.raw_text,
            created_at=t.created_at.isoformat(),
        )
        for t in transactions
    ]


@router.get("/brokers/{broker_id}/debt", response_model=DebtResponse)
async def get_debt(
    broker_id: UUID,
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Return current debt for a broker."""
    service = TransactionService(session)
    debt = await service.get_debt(broker_id)
    return DebtResponse(
        broker_id=broker_id,
        debt=float(debt),
        is_overpayment=float(debt) < 0,
    )


@router.post("/transactions", response_model=TransactionResponse, status_code=201)
async def create_transaction(
    body: TransactionCreate,
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Create a new transaction."""
    service = TransactionService(session)
    data = body.model_dump()
    transaction = await service.create_transaction(data)
    return TransactionResponse(
        id=transaction.id,
        broker_id=transaction.broker_id,
        type=transaction.type,
        amount=float(transaction.amount),
        datetime=transaction.datetime.isoformat(),
        receipt_number=transaction.receipt_number,
        party_from=transaction.party_from,
        party_to=transaction.party_to,
        party_identifier=transaction.party_identifier,
        kbk=transaction.kbk,
        knp=transaction.knp,
        comment=transaction.comment,
        source=transaction.source,
        raw_text=transaction.raw_text,
        created_at=transaction.created_at.isoformat(),
    )


@router.post("/transactions/bulk", response_model=list[TransactionResponse], status_code=201)
async def create_transactions_bulk(
    body: list[TransactionCreate],
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Create multiple transactions in bulk."""
    service = TransactionService(session)
    transactions = await service.create_many_transactions([b.model_dump() for b in body])
    return [
        TransactionResponse(
            id=t.id,
            broker_id=t.broker_id,
            type=t.type,
            amount=float(t.amount),
            datetime=t.datetime.isoformat(),
            receipt_number=t.receipt_number,
            party_from=t.party_from,
            party_to=t.party_to,
            party_identifier=t.party_identifier,
            kbk=t.kbk,
            knp=t.knp,
            comment=t.comment,
            source=t.source,
            raw_text=t.raw_text,
            created_at=t.created_at.isoformat(),
        )
        for t in transactions
    ]


@router.delete("/transactions/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: UUID,
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Delete a transaction."""
    service = TransactionService(session)
    deleted = await service.delete_transaction(transaction_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Transaction not found")


@router.get("/brokers/{broker_id}/export")
async def export_transactions_excel(
    broker_id: UUID,
    auth_user: AuthUserModel = Depends(require_module("debt_management")),
    session: AsyncSession = Depends(get_session),
):
    """Export all transactions for a broker to an Excel file."""
    # Fetch broker name for a better filename
    from app.infrastructure.broker_repository import BrokerRepository
    import urllib.parse
    
    broker_repo = BrokerRepository(session)
    broker = await broker_repo.get_by_id(broker_id)
    
    if not broker:
        raise HTTPException(status_code=404, detail="Broker not found")

    service = TransactionService(session)
    excel_bytes = await service.export_broker_transactions_to_excel(broker_id)
    
    # Safe filename with broker name
    safe_name = "".join([c if c.isalnum() or c in " _-" else "_" for c in broker.name])
    filename = f"otchet_{safe_name}.xlsx"
    encoded_filename = urllib.parse.quote(filename)
    
    headers = {
        "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}"
    }
    return Response(content=excel_bytes, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers=headers)
