import json
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from fastapi import HTTPException

from app.schemas.drawing import Drawing, DrawingScene
from app.services.note_service import note_exists
from app.services.workspace_service import get_workspace_dir

METADATA_FILENAME = "drawings.jsonl"
EMPTY_SCENE: dict[str, Any] = {"elements": [], "appState": {}, "files": {}}


def _metadata_path(workspace_dir: Path) -> Path:
    return workspace_dir / METADATA_FILENAME


def _scene_path(workspace_dir: Path, drawing_id: str) -> Path:
    return workspace_dir / "drawings" / f"{drawing_id}.excalidraw"


def _read_all(workspace_dir: Path) -> list[dict]:
    path = _metadata_path(workspace_dir)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _write_all(workspace_dir: Path, entries: list[dict]) -> None:
    _metadata_path(workspace_dir).write_text("".join(json.dumps(entry) + "\n" for entry in entries))


def _find(entries: list[dict], drawing_id: str) -> dict:
    # Same reasoning as note_service._find: drawing_id is only ever checked
    # against this per-workspace index, which only ever contains ids we
    # generated ourselves, so it can't be used to escape the drawings dir.
    for entry in entries:
        if entry["id"] == drawing_id:
            return entry
    raise HTTPException(status_code=404, detail="Drawing not found")


def _to_drawing(entry: dict) -> Drawing:
    return Drawing(**entry)


def _require_note(workspace_id: str, note_id: str) -> None:
    if not note_exists(workspace_id, note_id):
        raise HTTPException(status_code=404, detail="Note not found")


def list_drawings(workspace_id: str, note_id: str) -> list[Drawing]:
    _require_note(workspace_id, note_id)
    workspace_dir = get_workspace_dir(workspace_id)
    entries = [e for e in _read_all(workspace_dir) if e["note_id"] == note_id]
    entries.sort(key=lambda e: e["updated_at"], reverse=True)
    return [_to_drawing(e) for e in entries]


def get_drawing(workspace_id: str, drawing_id: str) -> DrawingScene:
    workspace_dir = get_workspace_dir(workspace_id)
    entry = _find(_read_all(workspace_dir), drawing_id)
    scene = json.loads(_scene_path(workspace_dir, drawing_id).read_text())
    return DrawingScene(**entry, scene=scene)


def create_drawing(workspace_id: str, note_id: str, title: str) -> DrawingScene:
    _require_note(workspace_id, note_id)
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Drawing title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    drawing_id = uuid.uuid4().hex
    now = datetime.now(UTC).isoformat()
    entry = {
        "id": drawing_id,
        "note_id": note_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
    }

    entries = _read_all(workspace_dir)
    entries.append(entry)
    _write_all(workspace_dir, entries)
    _scene_path(workspace_dir, drawing_id).write_text(json.dumps(EMPTY_SCENE))

    return DrawingScene(**entry, scene=EMPTY_SCENE)


def save_scene(workspace_id: str, drawing_id: str, scene: dict[str, Any]) -> Drawing:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, drawing_id)
    entry["updated_at"] = datetime.now(UTC).isoformat()
    _write_all(workspace_dir, entries)
    _scene_path(workspace_dir, drawing_id).write_text(json.dumps(scene))
    return _to_drawing(entry)


def rename_drawing(workspace_id: str, drawing_id: str, title: str) -> Drawing:
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Drawing title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, drawing_id)
    entry["title"] = title
    entry["updated_at"] = datetime.now(UTC).isoformat()
    _write_all(workspace_dir, entries)
    return _to_drawing(entry)


def delete_drawing(workspace_id: str, drawing_id: str) -> None:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, drawing_id)
    entries.remove(entry)
    _write_all(workspace_dir, entries)
    _scene_path(workspace_dir, drawing_id).unlink(missing_ok=True)
