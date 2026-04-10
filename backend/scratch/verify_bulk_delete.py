import asyncio
import uuid
from app.infrastructure.database import get_session
from app.infrastructure.models import TransactionModel, BrokerModel
from app.application.transaction_service import TransactionService
from sqlalchemy import select, delete

async def verify_bulk_delete():
    async for session in get_session():
        # 1. Ensure we have a broker
        res = await session.execute(select(BrokerModel).limit(1))
        broker = res.scalar()
        if not broker:
            print("No broker found, skipping.")
            return

        service = TransactionService(session)
        
        # 2. Create 3 test transactions
        txs = await service.create_many_transactions([
            {"broker_id": broker.id, "type": "payment", "amount": 100, "datetime": "2026-04-10T10:00:00"},
            {"broker_id": broker.id, "type": "payment", "amount": 200, "datetime": "2026-04-10T11:00:00"},
            {"broker_id": broker.id, "type": "payment", "amount": 300, "datetime": "2026-04-10T12:00:00"},
        ])
        
        tx_ids = [t.id for t in txs]
        print(f"Created 3 transactions: {tx_ids}")
        
        # 3. Bulk delete 2 of them
        to_delete = tx_ids[:2]
        await service.delete_transactions_bulk(to_delete)
        print(f"Deleted 2 transactions: {to_delete}")
        
        # 4. Verify count
        res = await session.execute(select(TransactionModel).where(TransactionModel.id.in_(tx_ids)))
        remaining = res.scalars().all()
        print(f"Remaining transactions: {[r.id for r in remaining]}")
        
        if len(remaining) == 1 and remaining[0].id == tx_ids[2]:
            print("✅ SUCCESS: Bulk delete works correctly.")
        else:
            print("❌ FAILURE: Incorrect count or items remaining.")
            
        # Cleanup the last one
        await session.execute(delete(TransactionModel).where(TransactionModel.id == tx_ids[2]))
        break

if __name__ == "__main__":
    asyncio.run(verify_bulk_delete())
