from __future__ import annotations

import pytest

from app.config import Settings


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("APP_NAME", " "),
        ("APP_NAME", "x" * 101),
        ("APP_VERSION", "invalid\nversion"),
        ("APP_ENV", "staging"),
        ("APP_LOG_LEVEL", "TRACE"),
        ("APP_PORT", "abc"),
        ("APP_PORT", "0"),
        ("APP_PORT", "65536"),
        ("APP_HOST", "https://localhost"),
        ("APP_HOST", "bad host"),
        ("APP_CORS_ORIGINS", "*"),
        ("APP_CORS_ORIGINS", "https://user:password@example.com"),
        ("APP_CORS_ORIGINS", "https://example.com/private"),
        ("APP_CORS_ORIGINS", "https://example.com?query=yes"),
        ("APP_CORS_ORIGINS", "https://example.com#fragment"),
        ("APP_CORS_ORIGINS", "https://example.com:0"),
        ("APP_CORS_ORIGINS", "[123]"),
        ("APP_CORS_ORIGINS", "[invalid"),
        ("APP_CORS_ORIGINS", ",".join("https://example.com" for _ in range(33))),
    ],
)
def test_invalid_environment_is_rejected(
    monkeypatch: pytest.MonkeyPatch, name: str, value: str
) -> None:
    monkeypatch.setenv(name, value)

    with pytest.raises(ValueError):
        Settings.from_environment()


def test_settings_normalizes_valid_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_NAME", " Test API ")
    monkeypatch.setenv("APP_ENV", " TEST ")
    monkeypatch.setenv("APP_HOST", "[::1]")
    monkeypatch.setenv("APP_PORT", "8123")
    monkeypatch.setenv("APP_LOG_LEVEL", " debug ")
    monkeypatch.setenv("APP_CORS_ORIGINS", '["HTTPS://Example.COM:443/", "http://[::1]:5173"]')

    settings = Settings.from_environment()

    assert settings.app_name == "Test API"
    assert settings.environment == "test"
    assert settings.host == "::1"
    assert settings.port == 8123
    assert settings.log_level == "DEBUG"
    assert settings.cors_origins == ("https://example.com", "http://[::1]:5173")


def test_production_requires_explicit_cors_setting(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")

    with pytest.raises(ValueError, match="APP_CORS_ORIGINS must be set explicitly"):
        Settings.from_environment()


def test_production_accepts_explicitly_disabled_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("APP_CORS_ORIGINS", "")

    settings = Settings.from_environment()

    assert settings.is_production
    assert settings.cors_origins == ()
