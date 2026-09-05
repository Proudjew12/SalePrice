from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def isolated_settings(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    """Keep tests independent of the developer's local application environment."""
    for name in tuple(os.environ):
        if name.startswith("APP_"):
            monkeypatch.delenv(name)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def settings() -> Settings:
    return Settings(
        app_name="Test API",
        environment="test",
        version="1.2.3",
        host="127.0.0.1",
        port=8000,
        log_level="INFO",
        cors_origins=("https://frontend.example.com",),
    )


@pytest.fixture
def app(settings: Settings) -> FastAPI:
    return create_app(settings)


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    # Route tests do not need to change the process-wide logging configuration in lifespan.
    client = TestClient(app)
    yield client
    client.close()
