import asyncio
import html
import json
import logging
import re
import shutil
import urllib.error
import urllib.request
import uuid
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException

from app.schemas.resource import Resource, ResourceCreate, ResourceType
from app.services import ai_service
from app.services.note_service import note_exists
from app.services.workspace_service import get_workspace_dir

logger = logging.getLogger("app")

METADATA_FILENAME = "resources.jsonl"
FETCH_TIMEOUT_SECONDS = 10
TAG_PATTERN = re.compile(r"<[^>]+>")
WHITESPACE_PATTERN = re.compile(r"[ \t]+")


def _metadata_path(workspace_dir: Path) -> Path:
    return workspace_dir / METADATA_FILENAME


def _resource_dir(workspace_dir: Path, resource_id: str) -> Path:
    return workspace_dir / "resources" / resource_id


def _read_all(workspace_dir: Path) -> list[dict]:
    path = _metadata_path(workspace_dir)
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text().splitlines() if line.strip()]


def _write_all(workspace_dir: Path, entries: list[dict]) -> None:
    _metadata_path(workspace_dir).write_text("".join(json.dumps(entry) + "\n" for entry in entries))


def _find(entries: list[dict], resource_id: str) -> dict:
    # Same reasoning as note_service._find: resource_id is only ever checked
    # against this per-workspace index, which only ever contains ids we
    # generated ourselves, so it can't be used to escape the resources dir.
    for entry in entries:
        if entry["id"] == resource_id:
            return entry
    raise HTTPException(status_code=404, detail="Resource not found")


def _to_resource(entry: dict) -> Resource:
    return Resource(**entry)


def _require_note(workspace_id: str, note_id: str) -> None:
    if not note_exists(workspace_id, note_id):
        raise HTTPException(status_code=404, detail="Note not found")


def list_resources(workspace_id: str, note_id: str) -> list[Resource]:
    _require_note(workspace_id, note_id)
    workspace_dir = get_workspace_dir(workspace_id)
    entries = [e for e in _read_all(workspace_dir) if e["note_id"] == note_id]
    entries.sort(key=lambda e: e["created_at"])
    return [_to_resource(e) for e in entries]


def create_url_resource(workspace_id: str, note_id: str, data: ResourceCreate) -> Resource:
    _require_note(workspace_id, note_id)
    title = data.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Resource title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    resource_id = uuid.uuid4().hex
    now = datetime.now(UTC).isoformat()
    entry = {
        "id": resource_id,
        "note_id": note_id,
        "type": data.type,
        "source": data.source,
        "title": title,
        "status": "queued",
        "error": None,
        "created_at": now,
        "updated_at": now,
    }

    entries = _read_all(workspace_dir)
    entries.append(entry)
    _write_all(workspace_dir, entries)
    _resource_dir(workspace_dir, resource_id).mkdir(parents=True, exist_ok=True)

    return _to_resource(entry)


def create_file_resource(
    workspace_id: str,
    note_id: str,
    resource_type: ResourceType,
    title: str,
    filename: str,
    data: bytes,
) -> Resource:
    _require_note(workspace_id, note_id)
    title = title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Resource title cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    resource_id = uuid.uuid4().hex
    now = datetime.now(UTC).isoformat()
    entry = {
        "id": resource_id,
        "note_id": note_id,
        "type": resource_type,
        "source": filename,
        "title": title,
        "status": "completed",
        "error": None,
        "created_at": now,
        "updated_at": now,
    }

    entries = _read_all(workspace_dir)
    entries.append(entry)
    _write_all(workspace_dir, entries)

    resource_dir = _resource_dir(workspace_dir, resource_id)
    resource_dir.mkdir(parents=True, exist_ok=True)
    suffix = Path(filename).suffix
    (resource_dir / f"original{suffix}").write_bytes(data)

    return _to_resource(entry)


def delete_resource(workspace_id: str, resource_id: str) -> None:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, resource_id)
    entries.remove(entry)
    _write_all(workspace_dir, entries)
    shutil.rmtree(_resource_dir(workspace_dir, resource_id), ignore_errors=True)


def _set_status(workspace_id: str, resource_id: str, status: str, error: str | None = None) -> None:
    workspace_dir = get_workspace_dir(workspace_id)
    entries = _read_all(workspace_dir)
    entry = _find(entries, resource_id)
    entry["status"] = status
    entry["error"] = error
    entry["updated_at"] = datetime.now(UTC).isoformat()
    _write_all(workspace_dir, entries)


def _fetch_and_extract(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "AILearningWorkspace/0.1"})
    with urllib.request.urlopen(request, timeout=FETCH_TIMEOUT_SECONDS) as response:  # noqa: S310
        charset = response.headers.get_content_charset() or "utf-8"
        raw = response.read().decode(charset, errors="replace")
        content_type = response.headers.get_content_type()

    if content_type == "text/html":
        text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", " ", raw)
        text = TAG_PATTERN.sub(" ", text)
        text = html.unescape(text)
        text = WHITESPACE_PATTERN.sub(" ", text)
        text = "\n".join(line.strip() for line in text.splitlines() if line.strip())
        return text

    return raw


async def process_resource(workspace_id: str, resource_id: str) -> None:
    # Reading = fetching the raw response; processing = stripping it to
    # plain text, then (Milestone 12) asking the AI for a faithful summary.
    workspace_dir = get_workspace_dir(workspace_id)
    entry = _find(_read_all(workspace_dir), resource_id)
    url = entry["source"]

    _set_status(workspace_id, resource_id, "reading")
    try:
        _set_status(workspace_id, resource_id, "processing")
        text = await asyncio.to_thread(_fetch_and_extract, url)
    except (urllib.error.URLError, TimeoutError, ValueError) as err:
        _set_status(workspace_id, resource_id, "failed", error=str(err))
        return

    resource_dir = _resource_dir(workspace_dir, resource_id)
    (resource_dir / "content.txt").write_text(text)

    # A summary is a bonus on top of the raw fetched content — if the AI
    # call fails (no API key configured, rate limited, etc.) the resource
    # is still fully usable via its raw content, so this doesn't fail the
    # whole resource.
    try:
        summary = await ai_service.run_action("process-resource", text)
        (resource_dir / "summary.txt").write_text(summary)
    except Exception:
        logger.exception("AI summary failed for resource %s", resource_id)

    _set_status(workspace_id, resource_id, "completed")
