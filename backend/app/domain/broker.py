"""Domain entity: Broker (Декларант)."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from uuid import UUID, uuid4


@dataclass
class Broker:
    """Represents a declarant (broker) in the system."""

    name: str
    id: UUID = field(default_factory=uuid4)
    created_at: datetime = field(default_factory=datetime.utcnow)

    def __post_init__(self) -> None:
        if not self.name or not self.name.strip():
            raise ValueError("Broker name cannot be empty")
        self.name = self.name.strip()
