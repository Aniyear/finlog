"""API routes for Authentication profile management."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.auth_middleware import get_current_user
from app.infrastructure.database import get_session
from app.infrastructure.models import UserProfileModel

router = APIRouter(prefix="/auth", tags=["Auth"])


# --- Schemas ---

class ModuleResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None

    class Config:
        from_attributes = True


class UserProfileResponse(BaseModel):
    id: UUID
    auth_id: UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    modules: list[ModuleResponse] = []
    created_at: str

    class Config:
        from_attributes = True


# --- Helpers ---

def _build_profile_response(user: UserProfileModel) -> UserProfileResponse:
    """Convert ORM model to response with modules."""
    modules = [
        ModuleResponse(
            id=ma.module.id,
            name=ma.module.name,
            description=ma.module.description,
            icon=ma.module.icon,
        )
        for ma in user.module_access
        if ma.module is not None
    ]
    return UserProfileResponse(
        id=user.id,
        auth_id=user.auth_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        modules=modules,
        created_at=user.created_at.isoformat(),
    )


# --- Endpoints ---

@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(
    user: UserProfileModel = Depends(get_current_user),
):
    """Return the authenticated user's profile with module access."""
    return _build_profile_response(user)
