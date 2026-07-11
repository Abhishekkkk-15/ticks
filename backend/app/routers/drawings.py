from fastapi import APIRouter

from app.schemas.drawing import (
    Drawing,
    DrawingCreate,
    DrawingRename,
    DrawingScene,
    DrawingSceneUpdate,
)
from app.services import drawing_service

router = APIRouter(prefix="/workspaces/{workspace_id}/notes/{note_id}/drawings", tags=["drawings"])


@router.get("", response_model=list[Drawing])
def list_drawings(workspace_id: str, note_id: str) -> list[Drawing]:
    return drawing_service.list_drawings(workspace_id, note_id)


@router.post("", response_model=DrawingScene, status_code=201)
def create_drawing(workspace_id: str, note_id: str, data: DrawingCreate) -> DrawingScene:
    return drawing_service.create_drawing(workspace_id, note_id, data.title)


@router.get("/{drawing_id}", response_model=DrawingScene)
def get_drawing(workspace_id: str, note_id: str, drawing_id: str) -> DrawingScene:
    return drawing_service.get_drawing(workspace_id, drawing_id)


@router.put("/{drawing_id}/scene", response_model=Drawing)
def save_scene(
    workspace_id: str, note_id: str, drawing_id: str, data: DrawingSceneUpdate
) -> Drawing:
    return drawing_service.save_scene(workspace_id, drawing_id, data.scene)


@router.patch("/{drawing_id}", response_model=Drawing)
def rename_drawing(
    workspace_id: str, note_id: str, drawing_id: str, data: DrawingRename
) -> Drawing:
    return drawing_service.rename_drawing(workspace_id, drawing_id, data.title)


@router.delete("/{drawing_id}", status_code=204)
def delete_drawing(workspace_id: str, note_id: str, drawing_id: str) -> None:
    drawing_service.delete_drawing(workspace_id, drawing_id)


# Workspace-level drawings (the "Whiteboard" tab) — no note_id in the path.
# get/save/rename/delete are id-only in the service layer already, so these
# just delegate straight through; list/create pass note_id=None to select
# only workspace-level entries instead of a specific note's.
workspace_router = APIRouter(prefix="/workspaces/{workspace_id}/drawings", tags=["drawings"])


@workspace_router.get("", response_model=list[Drawing])
def list_workspace_drawings(workspace_id: str) -> list[Drawing]:
    return drawing_service.list_drawings(workspace_id, None)


@workspace_router.post("", response_model=DrawingScene, status_code=201)
def create_workspace_drawing(workspace_id: str, data: DrawingCreate) -> DrawingScene:
    return drawing_service.create_drawing(workspace_id, None, data.title)


@workspace_router.get("/{drawing_id}", response_model=DrawingScene)
def get_workspace_drawing(workspace_id: str, drawing_id: str) -> DrawingScene:
    return drawing_service.get_drawing(workspace_id, drawing_id)


@workspace_router.put("/{drawing_id}/scene", response_model=Drawing)
def save_workspace_drawing_scene(
    workspace_id: str, drawing_id: str, data: DrawingSceneUpdate
) -> Drawing:
    return drawing_service.save_scene(workspace_id, drawing_id, data.scene)


@workspace_router.patch("/{drawing_id}", response_model=Drawing)
def rename_workspace_drawing(workspace_id: str, drawing_id: str, data: DrawingRename) -> Drawing:
    return drawing_service.rename_drawing(workspace_id, drawing_id, data.title)


@workspace_router.delete("/{drawing_id}", status_code=204)
def delete_workspace_drawing(workspace_id: str, drawing_id: str) -> None:
    drawing_service.delete_drawing(workspace_id, drawing_id)
