from pydantic import BaseModel


class SettingsInfo(BaseModel):
    mistral_api_key_configured: bool
    style_examples: list[str]


class MistralApiKeyUpdate(BaseModel):
    api_key: str


class StyleExamplesUpdate(BaseModel):
    examples: list[str]
