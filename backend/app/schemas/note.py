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


class NoteListItem(Note):
    # A short content preview for the note list/search UI — centered on the
    # matched query when there's a content match, otherwise just the start
    # of the note. Empty for a brand-new empty note.
    snippet: str = ""
