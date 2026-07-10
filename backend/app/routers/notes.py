from fastapi import APIRouter

from app.schemas.note import (
    Note,
    NoteContentUpdate,
    NoteCreate,
    NoteDetail,
    NoteFlags,
    NoteImport,
    NoteListItem,
    NoteMove,
    NoteRename,
)
from app.services import note_service

router = APIRouter(prefix="/workspaces/{workspace_id}/notes", tags=["notes"])


@router.get("", response_model=list[NoteListItem])
def list_notes(
    workspace_id: str, q: str | None = None, favorite_only: bool = False
) -> list[NoteListItem]:
    if q:
        return note_service.search_notes(workspace_id, q, favorite_only=favorite_only)
    return note_service.list_notes(workspace_id, favorite_only=favorite_only)


@router.post("", response_model=NoteDetail, status_code=201)
def create_note(workspace_id: str, data: NoteCreate) -> NoteDetail:
    return note_service.create_note(workspace_id, data)


@router.post("/import", response_model=NoteDetail, status_code=201)
def import_note(workspace_id: str, data: NoteImport) -> NoteDetail:
    create_data = NoteCreate(title=data.title, content=data.content)
    return note_service.create_note(workspace_id, create_data)


@router.get("/{note_id}", response_model=NoteDetail)
def get_note(workspace_id: str, note_id: str) -> NoteDetail:
    return note_service.get_note(workspace_id, note_id)


@router.patch("/{note_id}", response_model=Note)
def rename_note(workspace_id: str, note_id: str, data: NoteRename) -> Note:
    return note_service.rename_note(workspace_id, note_id, data.title)


@router.put("/{note_id}/content", response_model=Note)
def update_note_content(workspace_id: str, note_id: str, data: NoteContentUpdate) -> Note:
    return note_service.update_content(workspace_id, note_id, data.content)


@router.patch("/{note_id}/flags", response_model=Note)
def set_note_flags(workspace_id: str, note_id: str, data: NoteFlags) -> Note:
    return note_service.set_flags(workspace_id, note_id, data.favorite, data.pinned)


@router.post("/{note_id}/duplicate", response_model=NoteDetail, status_code=201)
def duplicate_note(workspace_id: str, note_id: str) -> NoteDetail:
    return note_service.duplicate_note(workspace_id, note_id)


@router.post("/{note_id}/move", response_model=Note)
def move_note(workspace_id: str, note_id: str, data: NoteMove) -> Note:
    return note_service.move_note(workspace_id, note_id, data.target_workspace_id)


@router.delete("/{note_id}", status_code=204)
def delete_note(workspace_id: str, note_id: str) -> None:
    note_service.delete_note(workspace_id, note_id)
