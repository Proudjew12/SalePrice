from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.config import Settings, get_settings
from app.modules.health.schemas import HealthResponse
from app.modules.health.service import build_health_response

router = APIRouter(prefix="/health", tags=["health"])
SettingsDependency = Annotated[Settings, Depends(get_settings)]


@router.get("", response_model=HealthResponse)
def get_health(settings: SettingsDependency) -> HealthResponse:
    return build_health_response(settings)
