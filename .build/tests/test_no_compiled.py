"""build_resources.py with a guide that has no compiled list.

The todos guide comes from Sandglass's PDF, which lists no items: its snapshot has no
resources and there is no .build/lists/todos/compilado.txt to check them against. The check
says so and the build goes on, with an empty resources.json.
Run: python3 -I -m unittest discover -s .build/tests
"""
import contextlib
import importlib.util
import io
import pathlib
import tempfile
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_resources", BUILD / "build_resources.py")
build_resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_resources)


class NoCompiledTest(unittest.TestCase):
    def setUp(self):
        self.saved = build_resources.COMPILED
        self.addCleanup(setattr, build_resources, "COMPILED", self.saved)

    def test_without_the_file_the_check_is_skipped(self):
        build_resources.COMPILED = pathlib.Path(tempfile.gettempdir()) / "no-existe" / "compilado.txt"
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            build_resources.check_against_compiled({}, {})
        self.assertIn("sin compilado", out.getvalue())


if __name__ == "__main__":
    unittest.main()
