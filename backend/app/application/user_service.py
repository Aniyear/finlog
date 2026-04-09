"""Service layer for User and Module operations."""

from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.user_repository import UserRepository, ModuleRepository
from app.infrastructure.models import UserProfileModel, ModuleModel

logger = logging.getLogger(__name__)


class UserService:
    """Business logic for User management."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = UserRepository(session)
        self._module_repo = ModuleRepository(session)

    async def get_profile(self, user_id: UUID) -> UserProfileModel | None:
        """Get user profile by internal ID."""
        return await self._repo.get_by_id(user_id)

    async def get_profile_by_auth_id(self, auth_id: UUID) -> UserProfileModel | None:
        """Get user profile by Supabase auth ID."""
        return await self._repo.get_by_auth_id(auth_id)

    async def list_users(self) -> list[UserProfileModel]:
        """Return all user profiles."""
        return await self._repo.get_all()

    async def create_user(
        self,
        auth_id: UUID,
        email: str,
        display_name: str,
        role: str = "user",
        module_ids: list[str] | None = None,
    ) -> UserProfileModel:
        """Create a new user profile with optional module access."""
        user = await self._repo.create(
            auth_id=auth_id,
            email=email,
            display_name=display_name,
            role=role,
        )

        if module_ids:
            await self._repo.set_user_modules(user.id, module_ids)

        logger.info(f"Created user {email} (role={role})")
        return user

    async def update_user_modules(
        self,
        user_id: UUID,
        module_ids: list[str],
        granted_by: UUID | None = None,
    ) -> list[str]:
        """Update module access for a user."""
        result = await self._repo.set_user_modules(user_id, module_ids, granted_by)
        logger.info(f"Updated modules for user {user_id}: {module_ids}")
        return result

    async def toggle_user_active(self, user_id: UUID, is_active: bool) -> UserProfileModel | None:
        """Activate or deactivate a user."""
        user = await self._repo.update_active(user_id, is_active)
        if user:
            logger.info(f"User {user.email} {'activated' if is_active else 'deactivated'}")
        return user

    async def update_display_name(self, user_id: UUID, display_name: str) -> UserProfileModel | None:
        """Update a user's display name."""
        return await self._repo.update_display_name(user_id, display_name)

    async def get_user_modules(self, user_id: UUID) -> list[str]:
        """Get list of module IDs the user has access to."""
        return await self._repo.get_user_modules(user_id)

    async def delete_user(self, user_id: UUID) -> bool:
        """Delete a user profile."""
        return await self._repo.delete(user_id)


class ModuleService:
    """Business logic for Module management."""

    def __init__(self, session: AsyncSession) -> None:
        self._repo = ModuleRepository(session)

    async def list_modules(self) -> list[ModuleModel]:
        """Return all modules."""
        return await self._repo.get_all()

    async def list_active_modules(self) -> list[ModuleModel]:
        """Return all active modules."""
        return await self._repo.get_active()

    async def get_module(self, module_id: str) -> ModuleModel | None:
        """Get a module by ID."""
        return await self._repo.get_by_id(module_id)
