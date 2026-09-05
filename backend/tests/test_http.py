from __future__ import annotations

import logging
from dataclasses import replace
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.config import Settings
from app.core.errors import AppError
from app.core.request_context import get_request_id
from app.main import create_app


def test_health_returns_application_metadata(client: TestClient) -> None:
    response = client.get("/api/health", headers={"X-Request-ID": "health-123"})

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "Test API", "version": "1.2.3"}
    assert response.headers["X-Request-ID"] == "health-123"


@pytest.mark.parametrize("request_id", [None, "", "bad id", "a" * 129, "bad\tvalue"])
def test_unsafe_or_missing_request_id_is_replaced(
    client: TestClient, request_id: str | None
) -> None:
    headers = {} if request_id is None else {"X-Request-ID": request_id}
    response = client.get("/api/health", headers=headers)

    assert response.status_code == 200
    assert UUID(response.headers["X-Request-ID"]).version == 4
    assert response.headers["X-Request-ID"] != request_id


def test_request_context_is_isolated_between_requests(app: FastAPI, client: TestClient) -> None:
    @app.get("/context")
    async def context() -> dict[str, str]:
        return {"request_id": get_request_id()}

    first = client.get("/context", headers={"X-Request-ID": "first"})
    second = client.get("/context")

    assert first.json() == {"request_id": "first"}
    assert second.json() == {"request_id": second.headers["X-Request-ID"]}
    assert second.headers["X-Request-ID"] != "first"
    assert get_request_id() == "-"


def test_unknown_route_keeps_request_id(client: TestClient) -> None:
    response = client.get("/missing", headers={"X-Request-ID": "missing-123"})

    assert response.status_code == 404
    assert response.headers["X-Request-ID"] == "missing-123"


def test_domain_errors_keep_explicit_status_and_safe_details(
    app: FastAPI, client: TestClient
) -> None:
    @app.get("/conflict")
    async def conflict() -> None:
        raise AppError(409, "already_exists", "The resource already exists.", {"retryable": False})

    response = client.get("/conflict", headers={"X-Request-ID": "conflict-123"})

    assert response.status_code == 409
    assert response.json() == {
        "error": {
            "code": "already_exists",
            "message": "The resource already exists.",
            "details": {"retryable": False},
        }
    }
    assert response.headers["X-Request-ID"] == "conflict-123"


def test_unexpected_error_hides_exception_and_preserves_server_traceback(
    app: FastAPI, client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    sensitive_detail = "private-provider-value"

    @app.get("/failure")
    async def failure() -> None:
        raise RuntimeError(sensitive_detail)

    with caplog.at_level(logging.ERROR, logger="app.core.errors"):
        response = client.get("/failure", headers={"X-Request-ID": "failure-123"})

    assert response.status_code == 500
    assert response.json() == {
        "error": {"code": "internal_error", "message": "An unexpected error occurred."}
    }
    assert response.headers["X-Request-ID"] == "failure-123"
    assert sensitive_detail not in response.text
    assert sensitive_detail not in caplog.text
    assert "RuntimeError" in caplog.text
    assert "test_http.py" in caplog.text
    assert "failure-123" in caplog.text


def test_cors_applies_to_unexpected_errors(app: FastAPI, client: TestClient) -> None:
    @app.get("/failure")
    async def failure() -> None:
        raise RuntimeError("provider failure")

    response = client.get("/failure", headers={"Origin": "https://frontend.example.com"})

    assert response.status_code == 500
    assert response.headers["Access-Control-Allow-Origin"] == "https://frontend.example.com"
    assert "X-Request-ID" in response.headers


def test_cors_allows_only_configured_origins(client: TestClient) -> None:
    allowed = client.get("/api/health", headers={"Origin": "https://frontend.example.com"})
    denied = client.get("/api/health", headers={"Origin": "https://untrusted.example.com"})

    assert allowed.headers["Access-Control-Allow-Origin"] == "https://frontend.example.com"
    assert "Access-Control-Allow-Origin" not in denied.headers


def test_preflight_keeps_request_id(client: TestClient) -> None:
    response = client.options(
        "/api/health",
        headers={
            "Origin": "https://frontend.example.com",
            "Access-Control-Request-Method": "GET",
            "X-Request-ID": "preflight-123",
        },
    )

    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "https://frontend.example.com"
    assert response.headers["X-Request-ID"] == "preflight-123"


@pytest.mark.parametrize("path", ["/docs", "/redoc", "/openapi.json"])
def test_production_disables_documentation(settings: Settings, path: str) -> None:
    client = TestClient(create_app(replace(settings, environment="production")))
    try:
        assert client.get(path).status_code == 404
        assert client.get("/api/health").status_code == 200
    finally:
        client.close()


def test_development_exposes_live_openapi(client: TestClient) -> None:
    response = client.get("/openapi.json")

    assert response.status_code == 200
    assert "/api/health" in response.json()["paths"]
