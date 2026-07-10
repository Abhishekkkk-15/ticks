from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ResourceType = Literal["website", "blog", "doc", "pdf", "markdown", "file"]
ResourceStatus = Literal["queued", "reading", "processing", "completed", "failed"]


class ResourceCreate(BaseModel):
    type: ResourceType
    source: str
    title: str


class Resource(BaseModel):
    id: str
    note_id: str
    type: ResourceType
    source: str
    title: str
    status: ResourceStatus
    error: str | None = None
    created_at: datetime
    updated_at: datetime
