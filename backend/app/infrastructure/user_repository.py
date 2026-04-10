"""Repository for User Profile and Module Access operations."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.infrastructure.models import (
    UserProfileModel,
    ModuleModel,
    UserModuleAccessModel,
)


class UserRepository:
    """Handles database operations for User entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_auth_id(self, auth_id: UUID) -> UserProfileModel | None:
        """Return a user profile by Supabase auth ID."""
        result = await self._session.execute(
            select(UserProfileModel)
            .where(UserProfileModel.auth_id == auth_id)
            .options(selectinload(UserProfileModel.module_access).selectinload(UserModuleAccessModel.module))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, user_id: UUID) -> UserProfileModel | None:
        """Return a user profile by internal ID."""
        result = await self._session.execute(
            select(UserProfileModel)
            .where(UserProfileModel.id == user_id)
            .options(selectinload(UserProfileModel.module_access).selectinload(UserModuleAccessModel.module))
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> UserProfileModel | None:
        """Return a user profile by email."""
        result = await self._session.execute(
            select(UserProfileModel)
            .where(UserProfileModel.email == email)
            .options(selectinload(UserProfileModel.module_access).selectinload(UserModuleAccessModel.module))
        )
        return result.scalar_one_or_none()

    async def get_all(self) -> list[UserProfileModel]:
        """Return all user profiles with their module access."""
        result = await self._session.execute(
            select(UserProfileModel)
            .order_by(UserProfileModel.created_at.desc())
            .options(selectinload(UserProfileModel.module_access).selectinload(UserModuleAccessModel.module))
        )
        return list(result.scalars().all())

    async def create(
        self,
        auth_id: UUID,
        email: str,
        display_name: str,
        role: str = "user",
        is_active: bool | None = None,
    ) -> UserProfileModel:
        """Create and return a new user profile."""
        user = UserProfileModel(
            auth_id=auth_id,
            email=email,
            display_name=display_name,
            role=role,
            module_access=[],
        )
        if is_active is not None:
            user.is_active = is_active
        self._session.add(user)
        await self._session.flush()
        return user

    async def update_role(self, user_id: UUID, role: str) -> UserProfileModel | None:
        """Update a user's role."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.role = role
        await self._session.flush()
        return user

    async def update_active(self, user_id: UUID, is_active: bool) -> UserProfileModel | None:
        """Activate or deactivate a user."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.is_active = is_active
        await self._session.flush()
        return user

    async def update_display_name(self, user_id: UUID, display_name: str) -> UserProfileModel | None:
        """Update a user's display name."""
        user = await self.get_by_id(user_id)
        if user is None:
            return None
        user.display_name = display_name
        await self._session.flush()
        return user

    async def set_user_modules(
        self, user_id: UUID, module_ids: list[str], granted_by: UUID | None = None
    ) -> list[str]:
        """Replace all module access for a user. Returns the new list of module IDs."""
        # Delete existing access
        await self._session.execute(
            delete(UserModuleAccessModel).where(
                UserModuleAccessModel.user_id == user_id
            )
        )

        # Add new access
        for module_id in module_ids:
            access = UserModuleAccessModel(
                user_id=user_id,
                module_id=module_id,
                granted_by=granted_by,
            )
            self._session.add(access)

        await self._session.flush()
        return module_ids

    async def get_user_modules(self, user_id: UUID) -> list[str]:
        """Return list of module IDs the user has access to."""
        result = await self._session.execute(
            select(UserModuleAccessModel.module_id).where(
                UserModuleAccessModel.user_id == user_id
            )
        )
        return list(result.scalars().all())

    async def delete(self, user_id: UUID) -> bool:
        """Delete a user profile by ID. Returns True if deleted."""
        user = await self.get_by_id(user_id)
        if user is None:
            return False
        # Remove related module access first (FK constraint)
        await self._session.execute(
            delete(UserModuleAccessModel).where(
                UserModuleAccessModel.user_id == user_id
            )
        )
        await self._session.delete(user)
        await self._session.flush()
        return True


class ModuleRepository:
    """Handles database operations for Module entities."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_all(self) -> list[ModuleModel]:
        """Return all modules."""
        result = await self._session.execute(
            select(ModuleModel).order_by(ModuleModel.created_at)
        )
        return list(result.scalars().all())

    async def get_by_id(self, module_id: str) -> ModuleModel | None:
        """Return a module by ID."""
        return await self._session.get(ModuleModel, module_id)

    async def get_active(self) -> list[ModuleModel]:
        """Return all active modules."""
        result = await self._session.execute(
            select(ModuleModel)
            .where(ModuleModel.is_active == True)
            .order_by(ModuleModel.created_at)
        )
        return list(result.scalars().all())
