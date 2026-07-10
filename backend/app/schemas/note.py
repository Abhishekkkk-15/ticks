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


class NoteFolderUpdate(BaseModel):
    # None (or "") clears the folder — the note lives at the workspace root.
    folder: str | None = None


class NoteTagsUpdate(BaseModel):
    tags: list[str]


class Note(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    favorite: bool = False
    pinned: bool = False
    # "/"-separated path, e.g. "System Design/networking" — None means the
    # workspace root. Purely organizational; doesn't affect where the note's
    # .md file lives on disk.
    folder: str | None = None
    tags: list[str] = []
    trashed: bool = False
    trashed_at: datetime | None = None
    # Bumped whenever the note is fetched for editing — powers the "Recent"
    # view. Not bumped by list/search, only by opening a specific note.
    opened_at: datetime | None = None


class NoteDetail(Note):
    content: str


class NoteListItem(Note):
    # A short content preview for the note list/search UI — centered on the
    # matched query when there's a content match, otherwise just the start
    # of the note. Empty for a brand-new empty note.
    snippet: str = ""
