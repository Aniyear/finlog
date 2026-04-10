"""API routes for Admin panel — user management and module access."""

from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
import httpx
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.auth_middleware import require_admin, get_current_user
from app.infrastructure.config import get_settings
from app.infrastructure.database import get_session
from app.infrastructure.models import UserProfileModel
from app.application.user_service import UserService, ModuleService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["Admin"])


# --- Schemas ---

class ModuleResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    icon: str | None = None
    is_active: bool = True

    class Config:
        from_attributes = True


class UserListItem(BaseModel):
    id: UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    modules: list[str] = []
    created_at: str

    class Config:
        from_attributes = True


class UserDetailResponse(BaseModel):
    id: UUID
    auth_id: UUID
    email: str
    display_name: str
    role: str
    is_active: bool
    modules: list[ModuleResponse] = []
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class UpdateModulesRequest(BaseModel):
    module_ids: list[str]


class UpdateActiveRequest(BaseModel):
    is_active: bool


class CreateUserRequest(BaseModel):
    email: str = Field(..., min_length=1)
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=1)
    role: str = "user"
    module_ids: list[str] = []


class AdminStatsResponse(BaseModel):
    total_users: int
    active_users: int
    total_modules: int


# --- Helpers ---

def _user_to_list_item(user: UserProfileModel) -> UserListItem:
    """Convert ORM model to list response."""
    modules = [ma.module_id for ma in user.module_access]
    return UserListItem(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        modules=modules,
        created_at=user.created_at.isoformat(),
    )


def _user_to_detail(user: UserProfileModel) -> UserDetailResponse:
    """Convert ORM model to detailed response."""
    modules = [
        ModuleResponse(
            id=ma.module.id,
            name=ma.module.name,
            description=ma.module.description,
            icon=ma.module.icon,
            is_active=ma.module.is_active,
        )
        for ma in user.module_access
        if ma.module is not None
    ]
    return UserDetailResponse(
        id=user.id,
        auth_id=user.auth_id,
        email=user.email,
        display_name=user.display_name,
        role=user.role,
        is_active=user.is_active,
        modules=modules,
        created_at=user.created_at.isoformat(),
        updated_at=user.updated_at.isoformat(),
    )


# --- Endpoints ---

@router.get("/stats", response_model=AdminStatsResponse)
async def get_admin_stats(
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Dashboard statistics for admin."""
    user_service = UserService(session)
    module_service = ModuleService(session)

    users = await user_service.list_users()
    modules = await module_service.list_modules()

    return AdminStatsResponse(
        total_users=len(users),
        active_users=sum(1 for u in users if u.is_active),
        total_modules=len(modules),
    )


@router.get("/users", response_model=list[UserListItem])
async def list_users(
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """List all users."""
    service = UserService(session)
    users = await service.list_users()
    return [_user_to_list_item(u) for u in users]


@router.get("/users/{user_id}", response_model=UserDetailResponse)
async def get_user_detail(
    user_id: UUID,
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Get detailed user profile."""
    service = UserService(session)
    user = await service.get_profile(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_detail(user)


@router.post("/users", response_model=UserDetailResponse, status_code=201)
async def create_user(
    body: CreateUserRequest,
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Create a new user completely via backend, without logging out the admin."""
    settings = get_settings()
    if not settings.supabase_service_key:
        raise HTTPException(
            status_code=500, detail="Need SUPABASE_SERVICE_KEY in .env to create users via Admin Panel."
        )

    # 1. Create user in Supabase Auth
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{settings.supabase_url}/auth/v1/admin/users",
            headers={
                "apikey": settings.supabase_service_key,
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "Content-Type": "application/json",
            },
            json={
                "email": body.email,
                "password": body.password,
                "email_confirm": True,
                "user_metadata": {"display_name": body.display_name},
            },
        )
        if res.status_code != 200:
            logger.error(f"Supabase auth error: {res.text}")
            raise HTTPException(status_code=400, detail="Failed to create user in Supabase Auth." + res.text)
        
        auth_data = res.json()
        auth_id = UUID(auth_data["id"])

    # 2. Create user profile in Database
    service = UserService(session)
    user = await service.create_user(
        auth_id=auth_id,
        email=body.email,
        display_name=body.display_name,
        role=body.role,
        module_ids=body.module_ids,
        is_active=True,  # Auto-activate since admin created them
    )
    await session.commit()

    # Re-fetch for full response
    user = await service.get_profile(user.id)
    return _user_to_detail(user)


@router.patch("/users/{user_id}/modules", response_model=list[str])
async def update_user_modules(
    user_id: UUID,
    body: UpdateModulesRequest,
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Update module access for a user."""
    service = UserService(session)

    user = await service.get_profile(user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    return await service.update_user_modules(
        user_id, body.module_ids, granted_by=admin.id
    )


@router.patch("/users/{user_id}/active", response_model=UserListItem)
async def toggle_user_active(
    user_id: UUID,
    body: UpdateActiveRequest,
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Activate or deactivate a user."""
    service = UserService(session)

    # Prevent admin from deactivating themselves
    if user_id == admin.id and not body.is_active:
        raise HTTPException(status_code=400, detail="Cannot deactivate yourself")

    user = await service.toggle_user_active(user_id, body.is_active)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    # Re-fetch for full data
    user = await service.get_profile(user_id)
    return _user_to_list_item(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """Delete a user profile and their auth record."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")

    service = UserService(session)
    user = await service.get_profile(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    auth_id = user.auth_id

    # 1. Delete from PostgreSQL
    deleted = await service.delete_user(user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Failed to delete user from database")
    await session.commit()
    
    # 2. Try deleting from Supabase Auth
    settings = get_settings()
    if settings.supabase_service_key:
        async with httpx.AsyncClient() as client:
            await client.delete(
                f"{settings.supabase_url}/auth/v1/admin/users/{auth_id}",
                headers={
                    "apikey": settings.supabase_service_key,
                    "Authorization": f"Bearer {settings.supabase_service_key}",
                }
            )

    logger.info(f"User {user_id} deleted by admin {admin.email}")


@router.get("/modules", response_model=list[ModuleResponse])
async def list_modules(
    admin: UserProfileModel = Depends(require_admin()),
    session: AsyncSession = Depends(get_session),
):
    """List all available modules."""
    service = ModuleService(session)
    modules = await service.list_modules()
    return [
        ModuleResponse(
            id=m.id,
            name=m.name,
            description=m.description,
            icon=m.icon,
            is_active=m.is_active,
        )
        for m in modules
    ]
