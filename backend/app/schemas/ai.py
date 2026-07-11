from typing import Literal

from pydantic import BaseModel

RewriteMode = Literal["expand", "shorten", "examples", "format"]


class AiTextRequest(BaseModel):
    text: str
    workspace_id: str | None = None
    note_id: str | None = None


class AiRewriteRequest(BaseModel):
    text: str
    mode: RewriteMode
    workspace_id: str | None = None
    note_id: str | None = None
