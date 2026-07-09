from datetime import datetime

from pydantic import BaseModel


class WorkspaceCreate(BaseModel):
    name: str


class WorkspaceRename(BaseModel):
    name: str


class Workspace(BaseModel):
    id: str
    name: str
    created_at: datetime
