from __future__ import annotations

from app.config import Settings
from app.modules.health.schemas import HealthResponse


def build_health_response(settings: Settings) -> HealthResponse:
    return HealthResponse(status="ok", service=settings.app_name, version=settings.version)
