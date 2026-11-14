"""The todos guide: steps import_guide.py closes by hand (CLOSES in .build/dofus/todos.py).

Steps 158, 159 and 160 stop "hasta tener que dropear en sueños". Only the PDF's optional
incisos I and II (a note on 160) would finish them; without that branch, step 200 («Sueños
de dragón» complete) goes through the dreams and finishes them. Its text says nothing of
it, so CLOSES adds them, and steps.js has to carry them.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import json
import pathlib
import re
import sys
import types
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
ROOT = BUILD.parent


def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


TODOS = load("dofus_todos_closes", BUILD / "dofus" / "todos.py")


def import_guide_for_todos():
    """import_guide.py with the todos tables, whatever Dofus the other tests loaded."""
    saved = sys.modules.get("dofus")
    sys.modules["dofus"] = types.SimpleNamespace(
        CONFIG=TODOS, ID="todos", SRC=ROOT / "src" / "dofus" / "todos", LISTS=BUILD / "lists" / "todos")
    try:
        return load("import_guide_todos", BUILD / "import_guide.py")
    finally:
        if saved is None:
            del sys.modules["dofus"]
        else:
            sys.modules["dofus"] = saved


class DreamStopsTest(unittest.TestCase):
    DREAMS = [158, 159, 160]

    def test_step_200_closes_the_dream_stops(self):
        guide = import_guide_for_todos()
        raw = json.loads((BUILD / "lists" / "todos" / "torrentearcano.json").read_text(encoding="utf-8"))["steps"][199]
        self.assertEqual(guide.closes(200, raw), self.DREAMS)

    def test_steps_js_carries_them(self):
        text = (ROOT / "src" / "dofus" / "todos" / "steps.js").read_text(encoding="utf-8")
        line = next(line for line in text.splitlines() if line.startswith("  { n: 200,"))
        self.assertRegex(line, re.escape('closes: [158, 159, 160]'))


if __name__ == "__main__":
    unittest.main()
