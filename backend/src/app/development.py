from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Sequence

import uvicorn

from app.config import API_ROOT, Settings, get_settings


def address_payload(settings: Settings) -> dict[str, str | int]:
    """Return the validated bind address in a machine-readable shape."""
    return {"host": settings.host, "port": settings.port}


def run_development_server(settings: Settings) -> None:
    """Run the reload-enabled local server with validated application settings."""
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        reload_dirs=[str(API_ROOT / "src")],
    )


def parse_args(arguments: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run or inspect the backend development server.")
    parser.add_argument(
        "--address",
        action="store_true",
        help="Print the validated bind address as JSON and exit.",
    )
    return parser.parse_args(arguments)


def main(arguments: Sequence[str] | None = None) -> int:
    args = parse_args(arguments)
    settings = get_settings()
    if args.address:
        print(json.dumps(address_payload(settings), sort_keys=True))
        return 0

    run_development_server(settings)
    return 0


def run_cli(arguments: Sequence[str] | None = None) -> int:
    """Run the development command with concise configuration failures."""
    try:
        return main(arguments)
    except ValueError as error:
        print(f"Backend configuration failed: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(run_cli())
