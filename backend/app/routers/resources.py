import asyncio

from fastapi import APIRouter, File, Form, UploadFile

from app.schemas.resource import Resource, ResourceCreate, ResourceType
from app.services import resource_service

router = APIRouter(
    prefix="/workspaces/{workspace_id}/notes/{note_id}/resources", tags=["resources"]
)


@router.get("", response_model=list[Resource])
def list_resources(workspace_id: str, note_id: str) -> list[Resource]:
    return resource_service.list_resources(workspace_id, note_id)


@router.post("", response_model=Resource, status_code=201)
async def create_resource(workspace_id: str, note_id: str, data: ResourceCreate) -> Resource:
    resource = resource_service.create_url_resource(workspace_id, note_id, data)
    asyncio.create_task(resource_service.process_resource(workspace_id, resource.id))
    return resource


@router.post("/upload", response_model=Resource, status_code=201)
async def upload_resource(
    workspace_id: str,
    note_id: str,
    type: ResourceType = Form(...),  # noqa: A002, B008
    title: str = Form(...),  # noqa: B008
    file: UploadFile = File(...),  # noqa: B008
) -> Resource:
    data = await file.read()
    filename = file.filename or title
    return resource_service.create_file_resource(workspace_id, note_id, type, title, filename, data)


@router.delete("/{resource_id}", status_code=204)
def delete_resource(workspace_id: str, note_id: str, resource_id: str) -> None:
    resource_service.delete_resource(workspace_id, resource_id)
