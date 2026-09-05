#!/usr/bin/env python3
"""Run all repository, backend, and frontend quality gates."""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def backend_python() -> Path:
    configured = os.getenv("BACKEND_PYTHON") or os.getenv("API_PYTHON")
    if configured:
        return Path(configured).expanduser().resolve()
    scripts_dir = "Scripts" if os.name == "nt" else "bin"
    executable = "python.exe" if os.name == "nt" else "python"
    return BACKEND_DIR / ".venv" / scripts_dir / executable


def run(command: list[str], *, cwd: Path = ROOT) -> None:
    print(f"\n+ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def main() -> int:
    python = backend_python()
    if not python.exists():
        print(
            "Backend virtual environment is missing. Run `npm run setup` first.",
            file=sys.stderr,
        )
        return 2
    if not (FRONTEND_DIR / "node_modules").exists():
        print(
            "Frontend dependencies are missing. Run `npm run setup` first.",
            file=sys.stderr,
        )
        return 2

    npm = "npm.cmd" if os.name == "nt" else "npm"

    run([sys.executable, str(ROOT / "scripts/checks/check_structure.py")])
    run([sys.executable, "manage.py", "check"], cwd=BACKEND_DIR)

    root_targets = ["../scripts"]
    run([str(python), "-m", "ruff", "check", *root_targets], cwd=BACKEND_DIR)
    run([str(python), "-m", "ruff", "format", "--check", *root_targets], cwd=BACKEND_DIR)
    run([str(python), "-m", "mypy", *root_targets], cwd=BACKEND_DIR)

    run(
        [
            sys.executable,
            "-m",
            "unittest",
            "discover",
            "-s",
            "scripts/tests",
            "-p",
            "test_*.py",
        ]
    )

    run([npm, "run", "check"], cwd=FRONTEND_DIR)
    run([npm, "test"], cwd=FRONTEND_DIR)
    print("\nAll repository checks passed.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"\nCheck failed with exit code {error.returncode}.", file=sys.stderr)
        raise SystemExit(error.returncode) from error
