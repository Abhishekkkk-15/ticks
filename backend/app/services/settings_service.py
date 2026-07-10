import json
from typing import Any

from app.config import settings

DEFAULT_DATA: dict[str, Any] = {"mistral_api_key": None, "style_examples": []}


def _read() -> dict[str, Any]:
    if not settings.settings_path.exists():
        return dict(DEFAULT_DATA)
    data = json.loads(settings.settings_path.read_text())
    return {**DEFAULT_DATA, **data}


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
    return {
        "mistral_api_key_configured": bool(get_mistral_api_key()),
        "style_examples": get_style_examples(),
    }
