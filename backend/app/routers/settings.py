from fastapi import APIRouter

from app.schemas.settings import (
    MistralApiKeyUpdate,
    SettingsInfo,
    SettingsUpdate,
    StyleExamplesUpdate,
)
from app.services import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=SettingsInfo)
def get_settings() -> SettingsInfo:
    return SettingsInfo(**settings_service.get_settings_info())


@router.patch("", response_model=SettingsInfo)
def update_settings(data: SettingsUpdate) -> SettingsInfo:
    return SettingsInfo(**settings_service.update_settings(data.model_dump(exclude_unset=True)))


@router.put("/mistral-api-key", status_code=204)
def set_mistral_api_key(data: MistralApiKeyUpdate) -> None:
    settings_service.set_mistral_api_key(data.api_key)


@router.put("/style-examples", response_model=list[str])
def set_style_examples(data: StyleExamplesUpdate) -> list[str]:
    return settings_service.set_style_examples(data.examples)
