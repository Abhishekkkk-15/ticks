from datetime import datetime
from typing import Any

from pydantic import BaseModel


class DrawingCreate(BaseModel):
    title: str


class DrawingRename(BaseModel):
    title: str


class DrawingSceneUpdate(BaseModel):
    scene: dict[str, Any]


class Drawing(BaseModel):
    id: str
    note_id: str | None = None
    title: str
    created_at: datetime
    updated_at: datetime


class DrawingScene(Drawing):
    scene: dict[str, Any]
