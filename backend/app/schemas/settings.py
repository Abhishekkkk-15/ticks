from pydantic import BaseModel


class Workflow(BaseModel):
    id: str
    name: str
    trigger: str
    scope: str = 'full_note'  # full_note | selection | clipboard | new_text
    output_mode: str = 'append'  # append | replace | review
    shortcut: str | None = None
    actions: list[str]


class SettingsInfo(BaseModel):
    mistral_api_key_configured: bool
    style_examples: list[str]
    theme: str
    font_size: int
    editor_font: str
    autosave_delay: int
    autosave_enabled: bool
    default_workspace_id: str | None = None
    default_editor_mode: str
    mini_tray_size: str
    keyboard_shortcuts: dict[str, str]
    workflows: list[Workflow]


class SettingsUpdate(BaseModel):
    theme: str | None = None
    font_size: int | None = None
    editor_font: str | None = None
    autosave_delay: int | None = None
    autosave_enabled: bool | None = None
    default_workspace_id: str | None = None
    default_editor_mode: str | None = None
    mini_tray_size: str | None = None
    keyboard_shortcuts: dict[str, str] | None = None
    workflows: list[Workflow] | None = None


class MistralApiKeyUpdate(BaseModel):
    api_key: str


class StyleExamplesUpdate(BaseModel):
    examples: list[str]
