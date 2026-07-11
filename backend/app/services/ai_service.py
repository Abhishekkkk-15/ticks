import asyncio
import json
from collections.abc import AsyncIterator

import httpx

from app.services.settings_service import get_mistral_api_key

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"
MODEL = "mistral-small-latest"
REQUEST_TIMEOUT_SECONDS = 60
MAX_RETRIES = 3


class MistralNotConfiguredError(Exception):
    pass


class MistralRateLimitError(Exception):
    pass


class MistralAPIError(Exception):
    pass


# System prompts favor accuracy over creativity, per the storage/AI
# philosophy: notes and resources are the user's actual material, not a
# jumping-off point for invention. Every prompt is explicit about staying
# faithful to the source and flagging uncertainty rather than guessing.
_FAITHFULNESS_RULE = (
    "Stay strictly faithful to the source text. Never invent facts, names, "
    "numbers, or claims that aren't in it. If something is ambiguous or "
    "missing, say so instead of guessing."
)

PROMPTS: dict[str, str] = {
    "summarize": f"Summarize the following text concisely. {_FAITHFULNESS_RULE}",
    "explain": (
        "Explain the following text in simple, plain terms, as if to someone "
        f"new to the subject. {_FAITHFULNESS_RULE}"
    ),
    "key-points": (
        "Extract the key points from the following text as a concise Markdown "
        f"bulleted list. {_FAITHFULNESS_RULE}"
    ),
    "questions": (
        "Write quiz questions (no answers) that test understanding of the "
        f"following text, as a Markdown numbered list. {_FAITHFULNESS_RULE}"
    ),
    "flashcards": (
        "Turn the following text into flashcards. Format each as "
        "'Q: ...' then 'A: ...' on the next line, separated by blank lines. "
        f"{_FAITHFULNESS_RULE}"
    ),
    "checklist": (
        "Convert the following text into an actionable Markdown checklist "
        f"(`- [ ] ...` items). {_FAITHFULNESS_RULE}"
    ),
    "table": (
        "Convert the following text into a Markdown table with sensible "
        f"columns for its content. {_FAITHFULNESS_RULE}"
    ),
    "expand": (
        "Expand the following text with more detail and explanation, without "
        f"changing its meaning. {_FAITHFULNESS_RULE}"
    ),
    "shorten": (
        "Shorten the following text as much as possible while preserving its "
        f"full meaning. {_FAITHFULNESS_RULE}"
    ),
    "examples": (
        f"Add concrete, illustrative examples to the following text. {_FAITHFULNESS_RULE}"
    ),
    "process-resource": (
        "Summarize the following external source material faithfully, "
        "preserving its key facts and structure so it can be referenced "
        f"later. {_FAITHFULNESS_RULE}"
    ),
    "format": (
        "Reformat the following text as a clean, beautiful Markdown document. "
        "Add appropriate Markdown elements such as headers, bold text, lists, task lists, and code blocks "
        "to structure it nicely. Do not summarize or expand it. Do not change the meaning. "
        "Do not include any introductory or concluding remarks. Return ONLY the reformatted Markdown content."
    ),
}

REWRITE_MODES = frozenset({"expand", "shorten", "examples", "format"})


def _style_prompt(style_examples: list[str]) -> str:
    if not style_examples:
        return f"Rewrite the following text to improve clarity and flow. {_FAITHFULNESS_RULE}"
    examples_block = "\n\n".join(f"Example {i + 1}:\n{ex}" for i, ex in enumerate(style_examples))
    return (
        "Rewrite the following text to match the writing style demonstrated "
        f"in these examples from the user (tone, sentence length, phrasing):\n\n"
        f"{examples_block}\n\n"
        f"Only match the *style* — do not copy their content. {_FAITHFULNESS_RULE}"
    )


async def _open_stream(
    client: httpx.AsyncClient, system_prompt: str, user_content: str
) -> httpx.Response:
    api_key = get_mistral_api_key()
    if not api_key:
        raise MistralNotConfiguredError("No Mistral API key configured")

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        request = client.build_request(
            "POST",
            MISTRAL_API_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "stream": True,
            },
        )
        response = await client.send(request, stream=True)

        if response.status_code == 429:
            last_error = MistralRateLimitError("Mistral API rate limit exceeded")
            await response.aclose()
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(2**attempt)
                continue
            raise last_error

        if response.status_code >= 500:
            last_error = MistralAPIError(f"Mistral API error {response.status_code}")
            await response.aclose()
            if attempt < MAX_RETRIES - 1:
                await asyncio.sleep(2**attempt)
                continue
            raise last_error

        if response.status_code >= 400:
            body = (await response.aread()).decode(errors="replace")
            await response.aclose()
            raise MistralAPIError(f"Mistral API error {response.status_code}: {body}")

        return response

    raise last_error or MistralAPIError("Mistral API request failed")


def _resolve_prompt(action: str, style_examples: list[str] | None) -> str:
    if action == "style":
        return _style_prompt(style_examples or [])
    if action in PROMPTS:
        return PROMPTS[action]
    raise ValueError(f"Unknown AI action: {action}")


async def open_action_stream(
    action: str,
    text: str,
    style_examples: list[str] | None = None,
    resource_context: str | None = None,
) -> tuple[httpx.AsyncClient, httpx.Response]:
    """Opens the Mistral connection and confirms a successful status before
    any content streams — so callers (the router) can turn connection-level
    failures (rate limit, 5xx, missing key) into a normal HTTP error
    response instead of a mid-stream one. The caller owns closing both the
    response and the client once done consuming (see iter_content_deltas).

    `resource_context`, when given, is the note's attached resources'
    fetched/summarized text (see resource_service.get_resource_context). It's
    grounding material only — the action still applies solely to `text` — so
    it's kept in a clearly separate block rather than mixed into the primary
    text, and the system prompt is told the same thing explicitly.
    """
    system_prompt = _resolve_prompt(action, style_examples)
    user_content = text
    if resource_context:
        system_prompt = (
            f"{system_prompt} The user has attached reference material below for "
            "additional context and accuracy — use it to inform your answer where "
            "relevant, but perform the task only on the primary text, not on the "
            "reference material itself."
        )
        user_content = (
            f"Primary text:\n{text}\n\n---\n"
            f"Attached reference material (context only):\n{resource_context}"
        )

    client = httpx.AsyncClient(timeout=REQUEST_TIMEOUT_SECONDS)
    try:
        response = await _open_stream(client, system_prompt, user_content)
    except Exception:
        await client.aclose()
        raise
    return client, response


async def iter_content_deltas(response: httpx.Response) -> AsyncIterator[str]:
    async for line in response.aiter_lines():
        if not line.startswith("data: "):
            continue
        payload = line[len("data: ") :]
        if payload == "[DONE]":
            break
        chunk = json.loads(payload)
        delta = chunk["choices"][0]["delta"].get("content")
        if delta:
            yield delta


async def run_action(action: str, text: str, style_examples: list[str] | None = None) -> str:
    """Non-streaming convenience wrapper — collects a full response.

    Used internally (e.g. resource processing) where there's no client to
    stream to.
    """
    client, response = await open_action_stream(action, text, style_examples)
    try:
        parts = [chunk async for chunk in iter_content_deltas(response)]
    finally:
        await response.aclose()
        await client.aclose()
    return "".join(parts)
