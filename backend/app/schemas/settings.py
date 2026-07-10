from pydantic import BaseModel


class SettingsInfo(BaseModel):
    mistral_api_key_configured: bool
    style_examples: list[str]
    theme: str
    font_size: int
    editor_font: str
    autosave_delay: int
    default_workspace_id: str | None = None
    default_editor_mode: str
    keyboard_shortcuts: dict[str, str]


class SettingsUpdate(BaseModel):
    theme: str | None = None
    font_size: int | None = None
    editor_font: str | None = None
    autosave_delay: int | None = None
    default_workspace_id: str | None = None
    default_editor_mode: str | None = None
    keyboard_shortcuts: dict[str, str] | None = None


class MistralApiKeyUpdate(BaseModel):
    api_key: str


class StyleExamplesUpdate(BaseModel):
    examples: list[str]
