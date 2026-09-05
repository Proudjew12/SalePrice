#!/usr/bin/env python3
"""Validate application architecture without inspecting generated dependencies."""

from __future__ import annotations

import ast
import re
import subprocess
import sys
from pathlib import Path
from typing import TYPE_CHECKING

if TYPE_CHECKING or __package__:
    from .frontend_structure_validation import (
        import_targets,
        validate_frontend_styling,
        validate_github_pages_configuration,
        validate_no_barrel_files,
        validate_web_boundaries,
    )
    from .lock_validation import validate_python_locks
else:
    from frontend_structure_validation import (
        import_targets,
        validate_frontend_styling,
        validate_github_pages_configuration,
        validate_no_barrel_files,
        validate_web_boundaries,
    )
    from lock_validation import validate_python_locks

ROOT = Path(__file__).resolve().parents[2]
SOURCE_SUFFIXES = {
    ".css",
    ".js",
    ".jsx",
    ".mjs",
    ".py",
    ".sass",
    ".scss",
    ".ts",
    ".tsx",
}
SKIP_PARTS = {
    ".git",
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    ".venv",
    "__pycache__",
    "coverage",
    "dist",
    "htmlcov",
    "node_modules",
    "playwright-report",
    "test-results",
}
MAX_SOURCE_LINES = 400

REQUIRED_PATHS = (
    ".editorconfig",
    ".gitattributes",
    ".gitignore",
    ".nvmrc",
    ".python-version",
    "AGENTS.md",
    "README.md",
    ".github/SECURITY.md",
    "package.json",
    "frontend/.npmrc",
    "frontend/.env.example",
    "frontend/.gitignore",
    "frontend/.nvmrc",
    "frontend/AGENTS.md",
    "frontend/README.md",
    "frontend/config/eslint.config.js",
    "frontend/index.html",
    "frontend/package.json",
    "frontend/package-lock.json",
    "frontend/public/favicon.svg",
    "frontend/public/robots.txt",
    "frontend/src/app/App.tsx",
    "frontend/src/app/router.tsx",
    "frontend/src/features/health",
    "frontend/src/shared/utils/classNames.ts",
    "frontend/src/styles/main.scss",
    "frontend/src/styles/_tokens.scss",
    "frontend/src/styles/_global.scss",
    "frontend/src/styles/abstracts/_variables.scss",
    "frontend/src/styles/abstracts/_functions.scss",
    "frontend/src/styles/abstracts/_mixins.scss",
    "frontend/src/main.tsx",
    "frontend/tsconfig.json",
    "frontend/config/vite.config.ts",
    "backend/.env.example",
    "backend/.gitignore",
    "backend/.python-version",
    "backend/AGENTS.md",
    "backend/README.md",
    "backend/manage.py",
    "backend/pyproject.toml",
    "backend/requirements/production.lock",
    "backend/requirements/development.lock",
    "backend/src/app/config.py",
    "backend/src/app/core/validation/__init__.py",
    "backend/src/app/core/validation/text.py",
    "backend/src/app/development.py",
    "backend/src/app/main.py",
    "backend/src/app/modules/health",
    ".agents/skills/vertical-slice/SKILL.md",
    ".github/workflows/deploy-pages.yml",
    ".github/workflows/quality.yml",
    "scripts/__init__.py",
    "scripts/bootstrap.py",
    "scripts/check.py",
    "scripts/checks/check_structure.py",
    "scripts/checks/__init__.py",
    "scripts/clean.py",
    "scripts/dev.py",
    "scripts/checks/frontend_structure_validation.py",
    "scripts/checks/lock_validation.py",
    "scripts/tests/smoke.py",
    "scripts/tests/__init__.py",
    "scripts/tests/test_clean.py",
)

SENSITIVE_KEY = re.compile(
    r"^(?:.*(?:API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CLIENT_SECRET).*)=(.*)$",
    flags=re.IGNORECASE,
)


def is_environment_example(name: str) -> bool:
    folded = name.casefold()
    return folded == ".env.example" or (folded.startswith(".env.") and folded.endswith(".example"))


def is_private_environment_file(name: str) -> bool:
    folded = name.casefold()
    return folded == ".env" or (folded.startswith(".env.") and not is_environment_example(name))


def is_generated(path: Path) -> bool:
    return any(part in SKIP_PARTS for part in path.relative_to(ROOT).parts)


def tracked_files() -> list[Path]:
    if not (ROOT / ".git").exists():
        return []

    try:
        result = subprocess.run(
            ["git", "-C", str(ROOT), "ls-files", "-z"],
            check=False,
            capture_output=True,
            text=True,
        )
    except OSError as error:
        raise RuntimeError("Could not inspect Git-tracked files") from error
    if result.returncode != 0:
        raise RuntimeError("Could not inspect Git-tracked files")

    return [ROOT / item for item in result.stdout.split("\0") if item]


def validate_application_roots(errors: list[str]) -> None:
    if (ROOT / "apps").exists():
        errors.append("Do not wrap applications in apps/: use top-level frontend/ and backend/")


def validate_required_paths(errors: list[str]) -> None:
    for relative_path in REQUIRED_PATHS:
        if not (ROOT / relative_path).exists():
            errors.append(f"Missing required path: {relative_path}")


def validate_application_separation(errors: list[str]) -> None:
    frontend_source = ROOT / "frontend" / "src"
    for path in frontend_source.rglob("*"):
        if not path.is_file() or path.suffix not in {".js", ".jsx", ".ts", ".tsx"}:
            continue
        for target in import_targets(path):
            parts = target.replace("\\", "/").split("/")
            if "backend" in parts:
                errors.append(
                    f"Frontend imports backend source in {path.relative_to(ROOT)}: {target}"
                )

    backend_paths = [ROOT / "backend" / "manage.py", ROOT / "backend" / "src"]
    for base in backend_paths:
        candidates = [base] if base.is_file() else list(base.rglob("*.py"))
        for path in candidates:
            source = path.read_text(encoding="utf-8")
            targets = python_import_targets(path, errors)
            imports_frontend = any(
                target.lstrip(".").split(".", maxsplit=1)[0] == "frontend" for target in targets
            )
            if imports_frontend:
                errors.append(f"Backend imports frontend source in {path.relative_to(ROOT)}")
            if "../frontend" in source or "..\\frontend" in source:
                errors.append(f"Backend references frontend files in {path.relative_to(ROOT)}")

    standalone_files = (
        ROOT / "frontend" / "package.json",
        ROOT / "backend" / "pyproject.toml",
        ROOT / "backend" / "manage.py",
    )
    for path in standalone_files:
        if path.exists() and "../" in path.read_text(encoding="utf-8"):
            errors.append(
                f"Standalone application configuration depends on a parent path: "
                f"{path.relative_to(ROOT)}"
            )


def validate_tracked_hygiene(errors: list[str]) -> None:
    try:
        paths = tracked_files()
    except RuntimeError as error:
        errors.append(str(error))
        return
    for path in paths:
        relative = path.relative_to(ROOT)
        if any(part in SKIP_PARTS for part in relative.parts):
            errors.append(f"Generated path is tracked by Git: {relative}")
        if is_private_environment_file(path.name):
            errors.append(f"Real environment file is tracked by Git: {relative}")


def validate_source_size(errors: list[str]) -> None:
    for path in ROOT.rglob("*"):
        if not path.is_file() or path.suffix not in SOURCE_SUFFIXES or is_generated(path):
            continue

        try:
            line_count = sum(1 for _ in path.open(encoding="utf-8"))
        except UnicodeDecodeError:
            continue

        if line_count > MAX_SOURCE_LINES:
            errors.append(
                f"Source file exceeds {MAX_SOURCE_LINES} lines: "
                f"{path.relative_to(ROOT)} ({line_count})"
            )


def python_import_targets(path: Path, errors: list[str]) -> list[str]:
    try:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    except (SyntaxError, UnicodeDecodeError) as error:
        errors.append(f"Could not parse {path.relative_to(ROOT)}: {error}")
        return []

    targets: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            targets.extend(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            prefix = "." * node.level
            if node.module is not None:
                targets.append(f"{prefix}{node.module}")
            else:
                targets.extend(f"{prefix}{alias.name}" for alias in node.names)
    return targets


def validate_backend_boundaries(errors: list[str]) -> None:
    modules_root = ROOT / "backend" / "src" / "app" / "modules"
    transport_free_files = {
        "integration.py",
        "repository.py",
        "schemas.py",
        "service.py",
    }
    outermost_files = {"integration.py", "repository.py"}

    for path in modules_root.rglob("*.py"):
        targets = python_import_targets(path, errors)
        if path.name in transport_free_files:
            for target in targets:
                if target.lstrip(".").startswith(("fastapi", "starlette")) or target.rstrip(
                    "."
                ).endswith(".router"):
                    errors.append(
                        f"Feature {path.name} imports an HTTP transport layer in "
                        f"{path.relative_to(ROOT)}: {target}"
                    )
        if path.name in outermost_files:
            for target in targets:
                normalized = target.lstrip(".")
                if normalized == "service" or normalized.endswith(".service"):
                    errors.append(
                        f"{path.name} imports the inward service layer in "
                        f"{path.relative_to(ROOT)}: {target}"
                    )


def validate_env_examples(errors: list[str]) -> None:
    for path in ROOT.rglob(".env*.example"):
        if is_generated(path):
            continue
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                continue
            match = SENSITIVE_KEY.match(stripped)
            if match is None:
                continue
            value = match.group(1).strip().strip("\"'")
            allowed_placeholders = {"", "changeme", "replace-me", "your-value-here"}
            if value.lower() not in allowed_placeholders:
                errors.append(
                    f"Possible real secret in {path.relative_to(ROOT)}:{line_number}; "
                    "leave sensitive example values empty or use an obvious placeholder"
                )


def main() -> int:
    errors: list[str] = []
    validate_application_roots(errors)
    validate_required_paths(errors)
    validate_application_separation(errors)
    validate_tracked_hygiene(errors)
    validate_source_size(errors)
    validate_no_barrel_files(ROOT, errors)
    validate_web_boundaries(ROOT, errors)
    validate_frontend_styling(ROOT, errors)
    validate_backend_boundaries(errors)
    validate_python_locks(ROOT, errors)
    validate_env_examples(errors)
    validate_github_pages_configuration(ROOT, errors)

    if errors:
        print("Structure validation failed:")
        for error in errors:
            print(f"  - {error}")
        return 1

    print("Structure validation passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
