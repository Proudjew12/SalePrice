"""Validate exact Python dependency pins against generated hash locks."""

from __future__ import annotations

import re
import tomllib
from pathlib import Path

DIRECT_DEPENDENCY = re.compile(r"^([A-Za-z0-9_.-]+)(?:\[[^]]+\])?==([^;\s]+)(?:\s*;.*)?$")
LOCK_ENTRY = re.compile(r"^([A-Za-z0-9_.-]+)==([^;\s\\]+)", flags=re.MULTILINE)


def normalize_package_name(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def direct_dependency_versions(values: list[str], source: str, errors: list[str]) -> dict[str, str]:
    versions: dict[str, str] = {}
    for value in values:
        match = DIRECT_DEPENDENCY.fullmatch(value.strip())
        if match is None:
            errors.append(f"{source} dependency must use an exact == pin: {value}")
            continue
        versions[normalize_package_name(match.group(1))] = match.group(2)
    return versions


def lock_versions(root: Path, path: Path, errors: list[str]) -> dict[str, str]:
    if not path.exists():
        return {}

    source = path.read_text(encoding="utf-8")
    matches = list(LOCK_ENTRY.finditer(source))
    versions: dict[str, str] = {}
    for match in matches:
        name = normalize_package_name(match.group(1))
        if name in versions:
            errors.append(f"Duplicate lock entry in {path.relative_to(root)}: {name}")
        versions[name] = match.group(2)

    if not versions:
        errors.append(f"No dependency entries found in {path.relative_to(root)}")

    for index, match in enumerate(matches):
        block_end = matches[index + 1].start() if index + 1 < len(matches) else len(source)
        if "--hash=sha256:" not in source[match.start() : block_end]:
            errors.append(
                f"Lock entry has no SHA-256 hash in {path.relative_to(root)}: {match.group(1)}"
            )
    return versions


def validate_python_locks(root: Path, errors: list[str]) -> None:
    backend_root = root / "backend"
    try:
        pyproject = tomllib.loads((backend_root / "pyproject.toml").read_text(encoding="utf-8"))
    except (OSError, tomllib.TOMLDecodeError) as error:
        errors.append(f"Could not read backend/pyproject.toml: {error}")
        return

    project = pyproject.get("project", {})
    runtime_values = project.get("dependencies", [])
    optional = project.get("optional-dependencies", {})
    dev_values = optional.get("dev", [])

    if not isinstance(runtime_values, list) or not all(
        isinstance(item, str) for item in runtime_values
    ):
        errors.append("project.dependencies must be a list of strings in backend/pyproject.toml")
        return
    if not isinstance(dev_values, list) or not all(isinstance(item, str) for item in dev_values):
        errors.append("project.optional-dependencies.dev must be a list of strings")
        return

    runtime_direct = direct_dependency_versions(runtime_values, "Runtime", errors)
    dev_direct = direct_dependency_versions(dev_values, "Development", errors)
    runtime_lock = lock_versions(root, backend_root / "requirements/production.lock", errors)
    dev_lock = lock_versions(root, backend_root / "requirements/development.lock", errors)

    for name, version in runtime_direct.items():
        if runtime_lock.get(name) != version:
            errors.append(
                f"Runtime lock does not match pyproject pin for {name}: "
                f"expected {version}, found {runtime_lock.get(name)}"
            )
        if dev_lock.get(name) != version:
            errors.append(f"Development lock does not include runtime pin for {name}=={version}")

    for name, version in dev_direct.items():
        if dev_lock.get(name) != version:
            errors.append(
                f"Development lock does not match pyproject pin for {name}: "
                f"expected {version}, found {dev_lock.get(name)}"
            )

    for name, version in runtime_lock.items():
        if dev_lock.get(name) != version:
            errors.append(f"Development lock must contain runtime entry {name}=={version}")
