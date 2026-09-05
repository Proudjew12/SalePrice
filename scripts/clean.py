#!/usr/bin/env python3
"""Preview or remove known generated output while preserving local project data."""

from __future__ import annotations

import argparse
import os
import shutil
from collections.abc import Sequence
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIRECTORY_NAMES = {
    ".mypy_cache",
    ".pytest_cache",
    ".ruff_cache",
    "__pycache__",
}
PROTECTED_DIRECTORY_NAMES = {".git", ".venv", "node_modules", "venv"}
GENERATED_DIRECTORIES = tuple(
    Path(path)
    for path in (
        "frontend/build",
        "frontend/coverage",
        "frontend/dist",
        "frontend/playwright-report",
        "frontend/test-results",
        "frontend/node_modules/.cache",
        "frontend/node_modules/.vite",
        "frontend/node_modules/.vite-temp",
        "backend/build",
        "backend/coverage",
        "backend/dist",
        "backend/htmlcov",
    )
)
GENERATED_DEPENDENCY_FILES = tuple(
    Path("frontend/node_modules/.tmp") / name
    for name in ("tsconfig.app.tsbuildinfo", "tsconfig.node.tsbuildinfo")
)
FILE_SUFFIXES = {".pyc", ".pyo", ".tsbuildinfo"}


def is_link_like(path: Path) -> bool:
    return path.is_symlink() or path.is_junction()


def has_link_ancestor(root: Path, path: Path) -> bool:
    return any(is_link_like(root / parent) for parent in path.relative_to(root).parents)


def raise_walk_error(error: OSError) -> None:
    raise error


def generated_paths(root: Path) -> tuple[Path, ...]:
    """Find known artifacts without traversing dependencies, env folders, or links."""
    if is_link_like(root):
        raise ValueError("Cleanup root must not be a link or junction.")
    selected: set[Path] = set()
    for relative in (*GENERATED_DIRECTORIES, *GENERATED_DEPENDENCY_FILES):
        path = root / relative
        if path.exists() and not is_link_like(path) and not has_link_ancestor(root, path):
            selected.add(path)

    for current_name, directories, files in os.walk(
        root, topdown=True, onerror=raise_walk_error, followlinks=False
    ):
        current = Path(current_name)
        kept: list[str] = []
        for name in directories:
            path = current / name
            if (
                name in PROTECTED_DIRECTORY_NAMES
                or name.casefold().startswith(".env")
                or is_link_like(path)
            ):
                continue
            if name in CACHE_DIRECTORY_NAMES or path in selected:
                selected.add(path)
            else:
                kept.append(name)
        directories[:] = kept
        for name in files:
            path = current / name
            if is_link_like(path) or name.casefold().startswith(".env"):
                continue
            if name == ".coverage" or name.startswith(".coverage.") or path.suffix in FILE_SUFFIXES:
                selected.add(path)
    return tuple(sorted(selected, key=lambda path: path.relative_to(root).as_posix()))


def clean(root: Path, *, dry_run: bool) -> int:
    paths = generated_paths(root)
    for path in paths:
        if dry_run:
            print(f"Would remove {path.relative_to(root)}")
            continue
        # Recheck before removal: a generated path may have changed since discovery.
        if is_link_like(path) or has_link_ancestor(root, path):
            raise ValueError(f"Refusing to clean a link: {path.relative_to(root)}")
        if path.is_dir():
            shutil.rmtree(path)
        else:
            path.unlink()
    action = "Would remove" if dry_run else "Removed"
    print(
        f"{action} {len(paths)} generated path(s). Dependencies and local env files are preserved."
    )
    return len(paths)


def main(arguments: Sequence[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="List generated paths without deleting."
    )
    args = parser.parse_args(arguments)
    clean(ROOT, dry_run=args.dry_run)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
