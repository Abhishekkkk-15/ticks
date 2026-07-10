from typing import Literal

from pydantic import BaseModel

RewriteMode = Literal["expand", "shorten", "examples"]


class AiTextRequest(BaseModel):
    text: str


class AiRewriteRequest(BaseModel):
    text: str
    mode: RewriteMode
