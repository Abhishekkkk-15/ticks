from fastapi import APIRouter

from app.schemas.note import (
    Note,
    NoteContentUpdate,
    NoteCreate,
    NoteDetail,
    NoteFlags,
    NoteFolderUpdate,
    NoteImport,
    NoteListItem,
    NoteMove,
    NoteRename,
    NoteTagsUpdate,
)
from app.services import note_service

router = APIRouter(prefix="/workspaces/{workspace_id}/notes", tags=["notes"])

# Workspace-wide lookups (distinct folders/tags in use) — not scoped to a
# single note, so they live on their own router instead of under /notes.
meta_router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["notes"])


@router.get("", response_model=list[NoteListItem])
def list_notes(
    workspace_id: str,
    q: str | None = None,
    favorite_only: bool = False,
    pinned_only: bool = False,
) -> list[NoteListItem]:
    if q:
        return note_service.search_notes(
            workspace_id, q, favorite_only=favorite_only, pinned_only=pinned_only
        )
    return note_service.list_notes(
        workspace_id, favorite_only=favorite_only, pinned_only=pinned_only
    )


@router.post("", response_model=NoteDetail, status_code=201)
def create_note(workspace_id: str, data: NoteCreate) -> NoteDetail:
    return note_service.create_note(workspace_id, data)


@router.post("/import", response_model=NoteDetail, status_code=201)
def import_note(workspace_id: str, data: NoteImport) -> NoteDetail:
    create_data = NoteCreate(title=data.title, content=data.content)
    return note_service.create_note(workspace_id, create_data)


# Static sub-paths ("recent", "trash") must be declared before the dynamic
# "/{note_id}" route below, or FastAPI would try to match them as a note id.
@router.get("/recent", response_model=list[NoteListItem])
def list_recent_notes(workspace_id: str) -> list[NoteListItem]:
    return note_service.list_recent(workspace_id)


@router.get("/trash", response_model=list[NoteListItem])
def list_trash(workspace_id: str) -> list[NoteListItem]:
    return note_service.list_trash(workspace_id)


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


@router.patch("/{note_id}/folder", response_model=Note)
def set_note_folder(workspace_id: str, note_id: str, data: NoteFolderUpdate) -> Note:
    return note_service.set_folder(workspace_id, note_id, data.folder)


@router.patch("/{note_id}/tags", response_model=Note)
def set_note_tags(workspace_id: str, note_id: str, data: NoteTagsUpdate) -> Note:
    return note_service.set_tags(workspace_id, note_id, data.tags)


@router.post("/{note_id}/duplicate", response_model=NoteDetail, status_code=201)
def duplicate_note(workspace_id: str, note_id: str) -> NoteDetail:
    return note_service.duplicate_note(workspace_id, note_id)


@router.post("/{note_id}/move", response_model=Note)
def move_note(workspace_id: str, note_id: str, data: NoteMove) -> Note:
    return note_service.move_note(workspace_id, note_id, data.target_workspace_id)


@router.post("/{note_id}/restore", response_model=Note)
def restore_note(workspace_id: str, note_id: str) -> Note:
    return note_service.restore_note(workspace_id, note_id)


@router.delete("/{note_id}/permanent", status_code=204)
def purge_note(workspace_id: str, note_id: str) -> None:
    note_service.purge_note(workspace_id, note_id)


@router.delete("/{note_id}", status_code=204)
def delete_note(workspace_id: str, note_id: str) -> None:
    # Soft delete — moves the note to Trash rather than removing it.
    # Permanent removal is DELETE /{note_id}/permanent.
    note_service.trash_note(workspace_id, note_id)


@meta_router.get("/folders", response_model=list[str])
def list_workspace_folders(workspace_id: str) -> list[str]:
    return note_service.list_folders(workspace_id)


@meta_router.get("/tags", response_model=list[str])
def list_workspace_tags(workspace_id: str) -> list[str]:
    return note_service.list_tags(workspace_id)
