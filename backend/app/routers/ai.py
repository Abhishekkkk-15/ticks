from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.schemas.ai import AiRewriteRequest, AiTextRequest
from app.services import ai_service, settings_service
from app.services.ai_service import (
    MistralAPIError,
    MistralNotConfiguredError,
    MistralRateLimitError,
)

router = APIRouter(prefix="/ai", tags=["ai"])


async def _stream(
    action: str, text: str, style_examples: list[str] | None = None
) -> StreamingResponse:
    if not text.strip():
        raise HTTPException(status_code=422, detail="Text cannot be empty")

    try:
        client, response = await ai_service.open_action_stream(action, text, style_examples)
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
    return await _stream("summarize", data.text)


@router.post("/explain")
async def explain(data: AiTextRequest) -> StreamingResponse:
    return await _stream("explain", data.text)


@router.post("/key-points")
async def key_points(data: AiTextRequest) -> StreamingResponse:
    return await _stream("key-points", data.text)


@router.post("/questions")
async def questions(data: AiTextRequest) -> StreamingResponse:
    return await _stream("questions", data.text)


@router.post("/flashcards")
async def flashcards(data: AiTextRequest) -> StreamingResponse:
    return await _stream("flashcards", data.text)


@router.post("/checklist")
async def checklist(data: AiTextRequest) -> StreamingResponse:
    return await _stream("checklist", data.text)


@router.post("/table")
async def table(data: AiTextRequest) -> StreamingResponse:
    return await _stream("table", data.text)


@router.post("/rewrite")
async def rewrite(data: AiRewriteRequest) -> StreamingResponse:
    return await _stream(data.mode, data.text)


@router.post("/style")
async def style(data: AiTextRequest) -> StreamingResponse:
    style_examples = settings_service.get_style_examples()
    return await _stream("style", data.text, style_examples)
