import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.ai import AiRewriteRequest, AiTextRequest
from app.services import ai_service, resource_service, settings_service
from app.services.ai_service import (
    MistralAPIError,
    MistralNotConfiguredError,
    MistralRateLimitError,
)

logger = logging.getLogger("app")

router = APIRouter(prefix="/ai", tags=["ai"])


def _get_resource_context(workspace_id: str | None, note_id: str | None) -> str | None:
    if not workspace_id or not note_id:
        return None
    # Resource lookup is a bonus accuracy boost, not a requirement — a
    # failure here (e.g. a stale note id) must never break a basic AI action.
    try:
        return resource_service.get_resource_context(workspace_id, note_id)
    except Exception:
        logger.exception("Failed to load resource context for %s/%s", workspace_id, note_id)
        return None


async def _stream(
    action: str,
    text: str,
    style_examples: list[str] | None = None,
    workspace_id: str | None = None,
    note_id: str | None = None,
) -> StreamingResponse:
    if not text.strip():
        raise HTTPException(status_code=422, detail="Text cannot be empty")

    resource_context = _get_resource_context(workspace_id, note_id)

    try:
        client, response = await ai_service.open_action_stream(
            action, text, style_examples, resource_context
        )
    except MistralNotConfiguredError as err:
        raise HTTPException(status_code=422, detail=str(err)) from err
    except MistralRateLimitError as err:
        raise HTTPException(status_code=429, detail=str(err)) from err
    except MistralAPIError as err:
        raise HTTPException(status_code=502, detail=str(err)) from err

    async def generator():
        try:
            async for delta in ai_service.iter_content_deltas(response):
                yield delta
        finally:
            await response.aclose()
            await client.aclose()

    return StreamingResponse(generator(), media_type="text/plain")


@router.post("/summarize")
async def summarize(data: AiTextRequest) -> StreamingResponse:
    return await _stream(
        "summarize", data.text, workspace_id=data.workspace_id, note_id=data.note_id
    )


@router.post("/explain")
async def explain(data: AiTextRequest) -> StreamingResponse:
    return await _stream("explain", data.text, workspace_id=data.workspace_id, note_id=data.note_id)


@router.post("/key-points")
async def key_points(data: AiTextRequest) -> StreamingResponse:
    return await _stream(
        "key-points", data.text, workspace_id=data.workspace_id, note_id=data.note_id
    )


@router.post("/questions")
async def questions(data: AiTextRequest) -> StreamingResponse:
    return await _stream(
        "questions", data.text, workspace_id=data.workspace_id, note_id=data.note_id
    )


@router.post("/flashcards")
async def flashcards(data: AiTextRequest) -> StreamingResponse:
    return await _stream(
        "flashcards", data.text, workspace_id=data.workspace_id, note_id=data.note_id
    )


@router.post("/checklist")
async def checklist(data: AiTextRequest) -> StreamingResponse:
    return await _stream(
        "checklist", data.text, workspace_id=data.workspace_id, note_id=data.note_id
    )


@router.post("/table")
async def table(data: AiTextRequest) -> StreamingResponse:
    return await _stream("table", data.text, workspace_id=data.workspace_id, note_id=data.note_id)


@router.post("/rewrite")
async def rewrite(data: AiRewriteRequest) -> StreamingResponse:
    return await _stream(data.mode, data.text, workspace_id=data.workspace_id, note_id=data.note_id)


@router.post("/style")
async def style(data: AiTextRequest) -> StreamingResponse:
    style_examples = settings_service.get_style_examples()
    return await _stream(
        "style",
        data.text,
        style_examples,
        workspace_id=data.workspace_id,
        note_id=data.note_id,
    )
