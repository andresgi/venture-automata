"""Offline adapter and scaffolding checks; no agent sessions or network access."""

import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("renderer", ROOT / "scripts/render-adapters.py")
renderer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(renderer)


class AdapterTests(unittest.TestCase):
    def test_native_modes_are_isolated_and_equivalent(self):
        output = renderer.render(ROOT, renderer.HARNESSES)
        roles = json.loads((ROOT / "adapters/roles.json").read_text())
        for name, role in roles.items():
            body = renderer.instructions(ROOT, role)
            toml = output[".codex/agents/" + name + ".toml"].decode()
            prompt = json.loads(toml.split("developer_instructions = ", 1)[1])
            self.assertIn(body, prompt)
            if not role.get("legacy"):
                self.assertEqual(prompt.count("\n## Mode: "), 1)
                for harness in ("claude", "opencode"):
                    native = output["." + harness + "/agents/" + name + ".md"].decode()
                    self.assertIn(body, native)
                    self.assertNotIn("{{instructions}}", native)
            else:
                self.assertNotIn(".claude/agents/" + name + ".md", output)
                self.assertNotIn(".opencode/agents/" + name + ".md", output)

    def test_idempotency_and_stale_check(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            renderer.install(ROOT, target, renderer.HARNESSES)
            before = {str(p.relative_to(target)): p.read_bytes() for p in target.rglob("*") if p.is_file()}
            renderer.install(ROOT, target, renderer.HARNESSES)
            after = {str(p.relative_to(target)): p.read_bytes() for p in target.rglob("*") if p.is_file()}
            self.assertEqual(before, after)
            renderer.install(ROOT, target, renderer.HARNESSES, check=True)
            path = target / ".claude/agents/developer.md"
            path.write_text(path.read_text() + "\nLocal change\n")
            with self.assertRaisesRegex(ValueError, "Out of date"):
                renderer.install(ROOT, target, renderer.HARNESSES, check=True)
            with self.assertRaisesRegex(ValueError, "Locally modified"):
                renderer.install(ROOT, target, renderer.HARNESSES)
            self.assertTrue(path.read_text().endswith("Local change\n"))

    def test_conflict_is_detected_before_any_output_is_written(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            path = target / ".codex/agents/developer.toml"
            path.parent.mkdir(parents=True)
            path.write_text("user-owned file\n")
            with self.assertRaisesRegex(ValueError, "unmanaged"):
                renderer.install(ROOT, target, renderer.HARNESSES)
            self.assertFalse((target / ".claude").exists())
            self.assertEqual(path.read_text(), "user-owned file\n")

    def test_symlink_output_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            other = target / "other.txt"
            other.write_text("preserve\n")
            (target / "CLAUDE.md").symlink_to(other)
            with self.assertRaisesRegex(ValueError, "symlink"):
                renderer.install(ROOT, target, ("claude",))
            self.assertEqual(other.read_text(), "preserve\n")

    def test_preflight_never_writes(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            renderer.install(ROOT, target, renderer.HARNESSES, preflight=True)
            self.assertEqual(list(target.iterdir()), [])
            path = target / "CLAUDE.md"
            path.write_text("local instructions\n")
            with self.assertRaisesRegex(ValueError, "unmanaged"):
                renderer.install(ROOT, target, renderer.HARNESSES, preflight=True)
            self.assertEqual(list(target.iterdir()), [path])

    def test_runtime_settings_and_custom_agents_are_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory)
            paths = [".claude/settings.json", "opencode.jsonc", ".codex/config.toml",
                     ".claude/agents/my-specialist.md"]
            for name in paths:
                path = target / name
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text("user-owned\n")
            renderer.install(ROOT, target, renderer.HARNESSES)
            for name in paths:
                self.assertEqual((target / name).read_text(), "user-owned\n")

    def test_standalone_scaffold_with_spaces(self):
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "venture with spaces"
            result = subprocess.run(["bash", str(ROOT / "scripts/new-project.sh"),
                                     "adapter-test", "--path", str(target)],
                                    capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Adapter Test", (target / "config/PROJECT.md").read_text())
            self.assertTrue((target / "agents/qa.md").exists())
            self.assertTrue((target / ".gitignore").exists())
            for harness in ("claude", "opencode"):
                for role in ("product-manager", "product-critic", "product-researcher"):
                    path = "." + harness + "/agents/" + role + ".md"
                    self.assertEqual((target / path).read_bytes(), (ROOT / path).read_bytes())
            # It must remain reproducible after separation from its source checkout.
            result = subprocess.run(["python3", str(target / "scripts/render-adapters.py"), "--check"],
                                    cwd=target, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            result = subprocess.run(["bash", str(ROOT / "scripts/new-project.sh"),
                                     "adapter-test", "--path", str(target)],
                                    capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("Refusing to overwrite", result.stderr)


if __name__ == "__main__":
    unittest.main()
