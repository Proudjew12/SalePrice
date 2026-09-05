#!/usr/bin/env python3
"""Standalone development commands for the backend folder."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import venv
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
VENV_DIR = BACKEND_DIR / ".venv"
PRODUCTION_LOCK = "requirements/production.lock"
DEVELOPMENT_LOCK = "requirements/development.lock"


def venv_python() -> Path:
    """Return the virtual-environment Python executable for this platform."""
    scripts_dir = "Scripts" if os.name == "nt" else "bin"
    executable = "python.exe" if os.name == "nt" else "python"
    return VENV_DIR / scripts_dir / executable


def run(command: list[str], *, environment: dict[str, str] | None = None) -> None:
    """Run a command from the backend directory and fail on errors."""
    print(f"+ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=BACKEND_DIR, check=True, env=environment)


def require_environment() -> Path:
    """Return the environment Python or stop with a useful message."""
    python = venv_python()
    if not python.exists():
        raise RuntimeError("Backend environment is missing. Run `python manage.py setup` first.")
    return python


def copy_environment_file() -> None:
    """Create a local .env from the committed example when needed."""
    source = BACKEND_DIR / ".env.example"
    destination = BACKEND_DIR / ".env"
    if not destination.exists():
        shutil.copy2(source, destination)
        print("Created .env from .env.example")


def application_environment() -> dict[str, str]:
    """Return an environment that exposes the standalone src-layout package."""
    environment = os.environ.copy()
    source_path = str(BACKEND_DIR / "src")
    current_python_path = environment.get("PYTHONPATH")
    environment["PYTHONPATH"] = (
        source_path
        if not current_python_path
        else os.pathsep.join((source_path, current_python_path))
    )
    return environment


def application_command(*arguments: str) -> list[str]:
    """Build a command that runs the application-owned development launcher."""
    return [str(require_environment()), "-m", "app.development", *arguments]


def setup() -> None:
    """Create the environment and install hash-locked development dependencies."""
    if not VENV_DIR.exists():
        print("Creating backend virtual environment...")
        venv.EnvBuilder(with_pip=True, clear=False).create(VENV_DIR)

    python = str(venv_python())
    run(
        [
            python,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--no-input",
            "--require-hashes",
            "-r",
            DEVELOPMENT_LOCK,
        ]
    )
    run([python, "-m", "pip", "check"])
    copy_environment_file()


def dev() -> None:
    """Run the FastAPI development server."""
    run(application_command(), environment=application_environment())


def address() -> None:
    """Print the validated development bind address as one JSON object."""
    subprocess.run(
        application_command("--address"),
        cwd=BACKEND_DIR,
        check=True,
        env=application_environment(),
    )


def check() -> None:
    """Run all backend quality gates."""
    python = str(require_environment())
    targets = ["src", "tests", "manage.py"]
    run([python, "-m", "pip", "check"])
    run([python, "-m", "ruff", "check", *targets])
    run([python, "-m", "ruff", "format", "--check", *targets])
    run([python, "-m", "mypy", *targets])
    test()


def test() -> None:
    """Run backend route, middleware, and configuration regression tests."""
    run([str(require_environment()), "-m", "pytest"], environment=application_environment())


def lock() -> None:
    """Upgrade and regenerate matching universal hash-locked dependency files with uv."""
    uv = shutil.which("uv")
    if uv is None:
        raise RuntimeError("uv is required to regenerate backend lock files.")

    (BACKEND_DIR / "requirements").mkdir(exist_ok=True)
    base_command = [
        uv,
        "pip",
        "compile",
        "pyproject.toml",
        "--universal",
        "--generate-hashes",
        "--upgrade",
        "--quiet",
        "--python-version",
        "3.12",
        "--no-annotate",
        "--custom-compile-command",
        "python manage.py lock",
    ]
    run([*base_command, "--output-file", PRODUCTION_LOCK])
    run(
        [
            *base_command,
            "--extra",
            "dev",
            "--constraint",
            PRODUCTION_LOCK,
            "--output-file",
            DEVELOPMENT_LOCK,
        ]
    )


def clean() -> None:
    """Remove backend caches and generated build output."""
    directory_names = {
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        "__pycache__",
        "build",
        "dist",
        "htmlcov",
    }
    file_suffixes = {".pyc", ".pyo"}
    removed = 0

    for path in sorted(BACKEND_DIR.rglob("*"), key=lambda item: len(item.parts), reverse=True):
        if ".venv" in path.relative_to(BACKEND_DIR).parts:
            continue
        if path.is_dir() and path.name in directory_names:
            shutil.rmtree(path)
            removed += 1
        elif path.is_file() and path.suffix in file_suffixes:
            path.unlink()
            removed += 1

    print(f"Removed {removed} backend generated path(s).")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage the standalone backend application.")
    parser.add_argument(
        "command",
        choices=("setup", "dev", "address", "check", "test", "lock", "clean"),
    )
    return parser.parse_args()


def main() -> int:
    command = parse_args().command
    commands = {
        "setup": setup,
        "dev": dev,
        "address": address,
        "check": check,
        "test": test,
        "lock": lock,
        "clean": clean,
    }

    try:
        commands[command]()
    except KeyboardInterrupt:
        return 0
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f"Backend command failed: {error}", file=sys.stderr)
        if isinstance(error, subprocess.CalledProcessError):
            return error.returncode
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
