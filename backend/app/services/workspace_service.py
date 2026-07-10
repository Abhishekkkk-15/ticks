import json
import re
import shutil
from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException

from app.config import settings
from app.schemas.workspace import Workspace, WorkspaceCreate

WORKSPACE_SUBDIRS = ("notes", "drawings", "resources", "assets/images")
CONFIG_FILENAME = "config.json"
_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return slug or "workspace"


def _unique_slug(base_slug: str) -> str:
    slug = base_slug
    counter = 2
    while (settings.workspaces_root / slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


def get_workspace_dir(workspace_id: str) -> Path:
    # workspace_id comes straight from the URL path, and gets joined onto a
    # real filesystem path below — reject anything that isn't a plain slug
    # before it can be used to escape workspaces_root (e.g. "../../etc").
    if not _SLUG_PATTERN.match(workspace_id):
        raise HTTPException(status_code=404, detail="Workspace not found")

    workspace_dir = settings.workspaces_root / workspace_id
    if not workspace_dir.is_dir() or not (workspace_dir / CONFIG_FILENAME).exists():
        raise HTTPException(status_code=404, detail="Workspace not found")

    return workspace_dir


def _read_config(workspace_dir: Path) -> dict:
    return json.loads((workspace_dir / CONFIG_FILENAME).read_text())


def _write_config(workspace_dir: Path, config: dict) -> None:
    (workspace_dir / CONFIG_FILENAME).write_text(json.dumps(config, indent=2))


def list_workspaces() -> list[Workspace]:
    root = settings.workspaces_root
    if not root.exists():
        return []

    workspaces = []
    for entry in sorted(root.iterdir()):
        config_path = entry / CONFIG_FILENAME
        if not entry.is_dir() or not config_path.exists():
            continue
        try:
            config = _read_config(entry)
            workspaces.append(
                Workspace(id=entry.name, name=config["name"], created_at=config["created_at"])
            )
        except (json.JSONDecodeError, KeyError):
            continue

    return workspaces


def create_workspace(data: WorkspaceCreate) -> Workspace:
    name = data.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Workspace name cannot be empty")

    slug = _unique_slug(_slugify(name))
    workspace_dir = settings.workspaces_root / slug

    for subdir in WORKSPACE_SUBDIRS:
        (workspace_dir / subdir).mkdir(parents=True, exist_ok=True)

    created_at = datetime.now(UTC)
    _write_config(workspace_dir, {"name": name, "created_at": created_at.isoformat()})

    return Workspace(id=slug, name=name, created_at=created_at)


def rename_workspace(workspace_id: str, name: str) -> Workspace:
    name = name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Workspace name cannot be empty")

    workspace_dir = get_workspace_dir(workspace_id)
    config = _read_config(workspace_dir)
    config["name"] = name
    _write_config(workspace_dir, config)

    return Workspace(id=workspace_id, name=name, created_at=config["created_at"])


def delete_workspace(workspace_id: str) -> None:
    workspace_dir = get_workspace_dir(workspace_id)
    shutil.rmtree(workspace_dir)
