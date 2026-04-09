"""FastAPI application entry point."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.infrastructure.database import init_db
from app.presentation.broker_router import router as broker_router
from app.presentation.transaction_router import router as transaction_router
from app.presentation.receipt_router import router as receipt_router
from app.presentation.auth_router import router as auth_router
from app.presentation.admin_router import router as admin_router
from app.presentation.converter_router import router as converter_router

logger = logging.getLogger(__name__)

# Configure logging to show INFO level
import sys
logging.basicConfig(level=logging.INFO, stream=sys.stdout, format="%(levelname)s: %(name)s - %(message)s")
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown events."""
    # Create tables on startup (non-fatal)
    try:
        await init_db()
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}. App will start anyway.")
    yield


app = FastAPI(
    title="FinLog API",
    description="Modular financial management platform",
    version="2.1.0",
    lifespan=lifespan,
)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
# Auth & Admin
app.include_router(auth_router)
app.include_router(admin_router)

# Modules
app.include_router(broker_router)
app.include_router(transaction_router)
app.include_router(receipt_router)
app.include_router(converter_router)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "2.1.0"}
