"""Cleanup must remove generated files without touching dependencies or user data."""

from __future__ import annotations

import contextlib
import io
import tempfile
import unittest
from pathlib import Path

from scripts.clean import clean, generated_paths


def write_file(root: Path, relative: str) -> Path:
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("fixture", encoding="utf-8")
    return path


class CleanTests(unittest.TestCase):
    def test_generated_output_removed_and_local_data_preserved(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            generated = [
                write_file(root, relative)
                for relative in (
                    "frontend/dist/assets/app.js",
                    "frontend/coverage/index.html",
                    "frontend/playwright-report/index.html",
                    "frontend/node_modules/.vite/deps.json",
                    "frontend/node_modules/.vite-temp/config.js",
                    "frontend/node_modules/.cache/cached-file",
                    "frontend/node_modules/.tmp/tsconfig.app.tsbuildinfo",
                    "backend/.mypy_cache/types.json",
                    "backend/.pytest_cache/results.json",
                    "backend/.ruff_cache/results.json",
                    "backend/src/app/__pycache__/main.pyc",
                    "backend/src/app/old.pyc",
                    "backend/.coverage",
                    "backend/.coverage.worker",
                    "scripts/__pycache__/clean.pyc",
                )
            ]
            preserved = [
                write_file(root, relative)
                for relative in (
                    "frontend/node_modules/react/index.js",
                    "frontend/node_modules/react/build/index.js",
                    "frontend/node_modules/react/.cache/local",
                    "frontend/node_modules/.tmp/user-file",
                    "frontend/.env",
                    "frontend/.env.example",
                    "backend/.env.production",
                    "backend/.ENV/secrets.pyc",
                    "backend/.venv/lib/__pycache__/site.pyc",
                    "backend/venv/lib/__pycache__/site.pyc",
                    ".git/objects/data.pyc",
                    "backend/user.log",
                    "backend/user.tmp",
                    "backend/uploads/dist/image.png",
                    "frontend/src/build/index.ts",
                )
            ]
            with contextlib.redirect_stdout(io.StringIO()):
                removed = clean(root, dry_run=False)
            self.assertGreater(removed, 0)
            for path in generated:
                self.assertFalse(path.exists(), str(path))
            for path in preserved:
                self.assertEqual(path.read_text(encoding="utf-8"), "fixture", str(path))
            self.assertEqual(generated_paths(root), ())

    def test_dry_run_lists_paths_without_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            artifact = write_file(root, "frontend/dist/index.html")
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                count = clean(root, dry_run=True)
            self.assertEqual(count, 1)
            self.assertIn("Would remove frontend/dist", output.getvalue())
            self.assertEqual(artifact.read_text(encoding="utf-8"), "fixture")

    def test_symlinks_and_their_targets_survive(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            root = workspace / "project"
            root.mkdir()
            external = workspace / "external"
            artifact = write_file(external, "__pycache__/keep.pyc")
            linked_frontend = root / "frontend"
            linked_frontend.symlink_to(external, target_is_directory=True)
            linked_cache = root / "__pycache__"
            linked_cache.symlink_to(external / "__pycache__", target_is_directory=True)
            linked_file = root / "linked.pyc"
            linked_file.symlink_to(artifact)
            nested_link = root / "backend/.ruff_cache/external"
            nested_link.parent.mkdir(parents=True)
            nested_link.symlink_to(external, target_is_directory=True)
            with contextlib.redirect_stdout(io.StringIO()):
                count = clean(root, dry_run=False)
            self.assertEqual(count, 1)
            self.assertTrue(linked_frontend.is_symlink())
            self.assertTrue(linked_cache.is_symlink())
            self.assertTrue(linked_file.is_symlink())
            self.assertEqual(artifact.read_text(encoding="utf-8"), "fixture")
            self.assertFalse(nested_link.parent.exists())

    def test_dependency_symlink_is_never_used_to_discover_caches(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            root = workspace / "project"
            (root / "frontend").mkdir(parents=True)
            dependencies = workspace / "installed"
            artifact = write_file(dependencies, ".vite/deps.json")
            (root / "frontend/node_modules").symlink_to(dependencies, target_is_directory=True)
            self.assertEqual(generated_paths(root), ())
            self.assertEqual(artifact.read_text(encoding="utf-8"), "fixture")

    def test_symlink_root_is_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            workspace = Path(directory)
            external = workspace / "external"
            artifact = write_file(external, "__pycache__/keep.pyc")
            root = workspace / "project"
            root.symlink_to(external, target_is_directory=True)
            with self.assertRaisesRegex(ValueError, "must not be a link"):
                clean(root, dry_run=False)
            self.assertEqual(artifact.read_text(encoding="utf-8"), "fixture")


if __name__ == "__main__":
    unittest.main()
