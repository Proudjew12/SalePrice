#!/usr/bin/env python3
"""Install both standalone applications and create safe environment files."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"


def run(command: list[str], *, cwd: Path) -> None:
    print(f"+ {' '.join(command)}", flush=True)
    subprocess.run(command, cwd=cwd, check=True)


def copy_env_example(directory: Path) -> None:
    source = directory / ".env.example"
    target = directory / ".env"
    if not target.exists():
        shutil.copy2(source, target)
        print(f"Created {target.relative_to(ROOT)} from .env.example")


def main() -> int:
    run([sys.executable, "manage.py", "setup"], cwd=BACKEND_DIR)

    npm = "npm.cmd" if os.name == "nt" else "npm"
    install_command = (
        [npm, "ci"] if (FRONTEND_DIR / "package-lock.json").exists() else [npm, "install"]
    )
    run(install_command, cwd=FRONTEND_DIR)
    run([npm, "run", "test:install"], cwd=FRONTEND_DIR)
    copy_env_example(FRONTEND_DIR)

    print("\nSetup complete. Run: npm run dev")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as error:
        print(f"Setup failed with exit code {error.returncode}.", file=sys.stderr)
        raise SystemExit(error.returncode) from error
