from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "AI Learning Workspace API"
    version: str = "0.1.0"
    environment: str = "development"
    host: str = "127.0.0.1"
    port: int = 8000

    # The API only ever binds to localhost for this desktop app, so origin
    # checks aren't a real security boundary — "*" is fine here. Electron's
    # production build also loads the renderer over file://, which sends a
    # "null" Origin that an explicit allowlist can't match anyway.
    cors_origins: list[str] = ["*"]

    # Everything the app stores lives under here as plain files — no SQL,
    # no vector DB, per the storage philosophy.
    workspaces_root: Path = Path.home() / "AILearningWorkspace" / "workspaces"
    settings_path: Path = Path.home() / "AILearningWorkspace" / "settings.json"

    # Falls back to the environment / .env for local dev testing (e.g. a
    # developer's own key). Once the app is running, the real source of
    # truth is settings.json (see app.services.settings_service), which a
    # user sets via the UI — full Settings UI lands in Milestone 13, this
    # is a minimal stand-in for just the AI API key.
    mistral_api_key: str | None = None


settings = Settings()
settings.workspaces_root.mkdir(parents=True, exist_ok=True)
