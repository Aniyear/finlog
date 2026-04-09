"""Domain entity: User Profile."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4


@dataclass
class UserProfile:
    """Represents an application user with role-based access."""

    auth_id: UUID
    email: str
    display_name: str
    role: str = "user"  # "admin" | "user"
    is_active: bool = True
    id: UUID = field(default_factory=uuid4)
    modules: list[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if not self.email or not self.email.strip():
            raise ValueError("Email cannot be empty")
        if not self.display_name or not self.display_name.strip():
            raise ValueError("Display name cannot be empty")
        if self.role not in ("admin", "user"):
            raise ValueError(f"Invalid role: {self.role}")

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    def has_module_access(self, module_id: str) -> bool:
        """Check if user has access to a specific module."""
        return module_id in self.modules
