from datetime import datetime

from pydantic import BaseModel


class NoteCreate(BaseModel):
    title: str
    content: str = ""


class NoteImport(BaseModel):
    title: str
    content: str


class NoteRename(BaseModel):
    title: str


class NoteContentUpdate(BaseModel):
    content: str


class NoteFlags(BaseModel):
    favorite: bool | None = None
    pinned: bool | None = None


class NoteMove(BaseModel):
    target_workspace_id: str


class Note(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    favorite: bool = False
    pinned: bool = False


class NoteDetail(Note):
    content: str
