import json
import shutil
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException

from app.schemas.note import Note, NoteCreate, NoteDetail, NoteListItem
from app.services.workspace_service import get_workspace_dir

METADATA_FILENAME = "notes.jsonl"
SNIPPET_LENGTH = 140


def _metadata_path(workspace_dir: Path) -> Path:
    return workspace_dir / METADATA_FILENAME


def _note_path(workspace_dir: Path, note_id: str) -> Path:
    return workspace_dir / "notes" / f"{note_id}.md"


def _read_all(workspace_dir: Path) -> list[dict]:
    path = _metadata_path(workspace_dir)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _write_all(workspace_dir: Path, entries: list[dict]) -> None:
    _metadata_path(workspace_dir).write_text("".join(json.dumps(entry) + "\n" for entry in entries))


def _sort(entries: list[dict]) -> list[dict]:
    entries = sorted(entries, key=lambda e: e["updated_at"], reverse=True)
    entries.sort(key=lambda e: e["pinned"], reverse=True)
    return entries


def _find(entries: list[dict], note_id: str) -> dict:
    # note_id is only ever looked up against this per-workspace index, which
    # only ever contains ids we generated ourselves — so an attacker-supplied
    # note_id that doesn't correspond to a real note simply 404s here, before
    # it can be used to build a filesystem path (unlike workspace_id, which
    # has no such index and needs its own slug regex check).
    for entry in entries:
        if entry["id"] == note_id:
            return entry
    raise HTTPException(status_code=404, detail="Note not found")


def _to_note(entry: dict) -> Note:
    return Note(**entry)


def _make_snippet(content: str, query: str) -> str:
    content = " ".join(content.split())
    if not content:
        return ""
    if not query:
        return content[:SNIPPET_LENGTH]

    idx = content.lower().find(query.lower())
    if idx == -1:
        return content[:SNIPPET_LENGTH]

    start = max(0, idx - SNIPPET_LENGTH // 3)
    end = min(len(content), start + SNIPPET_LENGTH)
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(content) else ""
    return f"{prefix}{content[start:end]}{suffix}"


def _to_list_item(workspace_dir: Path, entry: dict, query: str = "") -> NoteListItem:
    content = _note_path(workspace_dir, entry["id"]).read_text()
    return NoteListItem(**entry, snippet=_make_snippet(content, query))


def note_exists(workspace_id: str, note_id: str) -> bool:
    workspace_dir = get_workspace_dir(workspace_id)
    return any(e["id"] == note_id for e in _read_all(workspace_dir))


def list_notes(workspace_id: str, favorite_only: bool = False) -> list[NoteListItem]:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _sort(_read_all(workspace_dir))
    if favorite_only:
        entries = [e for e in entries if e["favorite"]]
    return [_to_list_item(workspace_dir, e) for e in entries]


def search_notes(workspace_id: str, query: str, favorite_only: bool = False) -> list[NoteListItem]:
    query = query.strip()
    if not query:
        return list_notes(workspace_id, favorite_only=favorite_only)

    workspace_dir = get_workspace_dir(workspace_id)
    lower_query = query.lower()
    matches = []
    for entry in _read_all(workspace_dir):
        if favorite_only and not entry["favorite"]:
            continue
        if lower_query in entry["title"].lower():
            matches.append(entry)
            continue
        if lower_query in _note_path(workspace_dir, entry["id"]).read_text().lower():
            matches.append(entry)

    return [_to_list_item(workspace_dir, e, query) for e in _sort(matches)]


def get_note(workspace_id: str, note_id: str) -> NoteDetail:
    workspace_dir = get_workspace_dir(workspace_id)
    entry = _find(_read_all(workspace_dir), note_id)
    content = _note_path(workspace_dir, note_id).read_text()
    return NoteDetail(**entry, content=content)


def create_note(workspace_id: str, data: NoteCreate) -> NoteDetail:
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Note title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    note_id = uuid.uuid4().hex
    now = datetime.now(UTC).isoformat()
    entry = {
        "id": note_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "favorite": False,
        "pinned": False,
    }

    entries = _read_all(workspace_dir)
    entries.append(entry)
    _write_all(workspace_dir, entries)
    _note_path(workspace_dir, note_id).write_text(data.content)

    return NoteDetail(**entry, content=data.content)


def rename_note(workspace_id: str, note_id: str, title: str) -> Note:
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Note title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, note_id)
    entry["title"] = title
    entry["updated_at"] = datetime.now(UTC).isoformat()
    _write_all(workspace_dir, entries)
    return _to_note(entry)


def update_content(workspace_id: str, note_id: str, content: str) -> Note:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, note_id)
    entry["updated_at"] = datetime.now(UTC).isoformat()
    _write_all(workspace_dir, entries)
    _note_path(workspace_dir, note_id).write_text(content)
    return _to_note(entry)


def set_flags(workspace_id: str, note_id: str, favorite: bool | None, pinned: bool | None) -> Note:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, note_id)
    if favorite is not None:
        entry["favorite"] = favorite
    if pinned is not None:
        entry["pinned"] = pinned
    _write_all(workspace_dir, entries)
    return _to_note(entry)


def duplicate_note(workspace_id: str, note_id: str) -> NoteDetail:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    source = _find(entries, note_id)
    content = _note_path(workspace_dir, note_id).read_text()

    now = datetime.now(UTC).isoformat()
    new_entry = {
        "id": uuid.uuid4().hex,
        "title": f"{source['title']} (copy)",
        "created_at": now,
        "updated_at": now,
        "favorite": False,
        "pinned": False,
    }
    entries.append(new_entry)
    _write_all(workspace_dir, entries)
    _note_path(workspace_dir, new_entry["id"]).write_text(content)

    return NoteDetail(**new_entry, content=content)


def move_note(workspace_id: str, note_id: str, target_workspace_id: str) -> Note:
    if target_workspace_id == workspace_id:
        raise HTTPException(status_code=422, detail="Note is already in that workspace")

    workspace_dir = get_workspace_dir(workspace_id)
    target_dir = get_workspace_dir(target_workspace_id)

    entries = _read_all(workspace_dir)
    entry = _find(entries, note_id)
    entries.remove(entry)

    target_entries = _read_all(target_dir)
    target_entries.append(entry)

    shutil.move(str(_note_path(workspace_dir, note_id)), str(_note_path(target_dir, note_id)))
    _write_all(workspace_dir, entries)
    _write_all(target_dir, target_entries)

    return _to_note(entry)


def delete_note(workspace_id: str, note_id: str) -> None:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, note_id)
    entries.remove(entry)
    _write_all(workspace_dir, entries)
    _note_path(workspace_dir, note_id).unlink(missing_ok=True)
