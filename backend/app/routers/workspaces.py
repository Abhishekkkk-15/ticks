from fastapi import APIRouter

from app.schemas.workspace import Workspace, WorkspaceCreate, WorkspaceRename
from app.services import workspace_service

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=list[Workspace])
def list_workspaces() -> list[Workspace]:
    return workspace_service.list_workspaces()


@router.post("", response_model=Workspace, status_code=201)
def create_workspace(data: WorkspaceCreate) -> Workspace:
    return workspace_service.create_workspace(data)


@router.patch("/{workspace_id}", response_model=Workspace)
def rename_workspace(workspace_id: str, data: WorkspaceRename) -> Workspace:
    return workspace_service.rename_workspace(workspace_id, data.name)


@router.delete("/{workspace_id}", status_code=204)
def delete_workspace(workspace_id: str) -> None:
    workspace_service.delete_workspace(workspace_id)
