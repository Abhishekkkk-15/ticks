import json
from typing import Any

from app.config import settings

DEFAULT_DATA: dict[str, Any] = {
    "mistral_api_key": None,
    "style_examples": [],
    "theme": "dark",
    "font_size": 14,
    "editor_font": "monospace",
    "autosave_delay": 800,
    "autosave_enabled": True,
    "default_workspace_id": None,
    "default_editor_mode": "split",
    "mini_tray_size": "default",
    "keyboard_shortcuts": {
        "command_palette": "Ctrl+Shift+P",
        "global_capture": "Ctrl+Alt+Shift+C",
        "mini_tray_toggle": "Ctrl+Alt+Shift+M",
    },
    "workflows": [],
}


def _read() -> dict[str, Any]:
    if not settings.settings_path.exists():
        return dict(DEFAULT_DATA)
    try:
        data = json.loads(settings.settings_path.read_text())
    except Exception:
        data = {}
    # Make sure nested dicts like keyboard_shortcuts are also merged correctly
    merged = {**DEFAULT_DATA, **data}
    if "keyboard_shortcuts" in data and isinstance(data["keyboard_shortcuts"], dict):
        merged["keyboard_shortcuts"] = {
            **DEFAULT_DATA["keyboard_shortcuts"],
            **data["keyboard_shortcuts"],
        }
    return merged


def _write(data: dict[str, Any]) -> None:
    settings.settings_path.parent.mkdir(parents=True, exist_ok=True)
    settings.settings_path.write_text(json.dumps(data, indent=2))


def get_mistral_api_key() -> str | None:
    # settings.json (set via the UI) wins; the environment/.env value is
    # only a fallback for local dev testing with a developer's own key.
    return _read()["mistral_api_key"] or settings.mistral_api_key


def set_mistral_api_key(api_key: str) -> None:
    data = _read()
    data["mistral_api_key"] = api_key.strip() or None
    _write(data)


def get_style_examples() -> list[str]:
    return list(_read()["style_examples"])


def set_style_examples(examples: list[str]) -> list[str]:
    cleaned = [e.strip() for e in examples if e.strip()]
    data = _read()
    data["style_examples"] = cleaned
    _write(data)
    return cleaned


def get_settings_info() -> dict[str, Any]:
    data = _read()
    return {
        "mistral_api_key_configured": bool(get_mistral_api_key()),
        "style_examples": get_style_examples(),
        "theme": data["theme"],
        "font_size": data["font_size"],
        "editor_font": data["editor_font"],
        "autosave_delay": data["autosave_delay"],
        "autosave_enabled": data["autosave_enabled"],
        "default_workspace_id": data["default_workspace_id"],
        "default_editor_mode": data["default_editor_mode"],
        "mini_tray_size": data["mini_tray_size"],
        "keyboard_shortcuts": data["keyboard_shortcuts"],
        "workflows": data["workflows"],
    }


def update_settings(update_data: dict[str, Any]) -> dict[str, Any]:
    data = _read()
    for key, val in update_data.items():
        is_valid_key = key in DEFAULT_DATA and key not in (
            "mistral_api_key",
            "style_examples",
        )
        if is_valid_key:
            if key == "keyboard_shortcuts" and isinstance(val, dict):
                # Merge nested keyboard shortcuts
                data[key] = {**data.get(key, {}), **val}
            else:
                data[key] = val
    _write(data)
    return get_settings_info()
