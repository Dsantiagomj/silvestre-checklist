"""import_guide.py corrects a step's text where the guide does not fit the order it follows.

The page's steps 77, 78 and 80 are written for any of the three Bonta orders. The guide
follows Espíritu de la salvación (CHOSEN_ORDER): its order mission 3 stops at Roble
Blando, and order mission 4 needs mission 3 finished (QF>121), so it goes to step 80,
where Roble Blando and Ugah are passed. TEXT_FIXES (.build/dofus/<id>.py) rewrites those
passages of the page's text, marks included, before the step is written.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import json
import pathlib
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("import_guide", BUILD / "import_guide.py")
import_guide = importlib.util.module_from_spec(spec)
spec.loader.exec_module(import_guide)
fix_texts = import_guide.fix_texts


def config(dofus_id):
    spec = importlib.util.spec_from_file_location(f"cfg_{dofus_id}", BUILD / "dofus" / f"{dofus_id}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class FixTextsTest(unittest.TestCase):
    RAWS = ["Paso uno. [[RED]](Hasta tener que pasar A)[[/RED]]", "Paso dos."]

    def test_replaces_each_passage_of_its_step(self):
        fixed = fix_texts(self.RAWS, {1: [("pasar A", "pasar B"), ("Paso uno.", "Paso 1.")]})
        self.assertEqual(fixed, ["Paso 1. [[RED]](Hasta tener que pasar B)[[/RED]]", "Paso dos."])

    def test_leaves_the_page_list_as_it_was(self):
        fix_texts(self.RAWS, {1: [("pasar A", "pasar B")]})
        self.assertEqual(self.RAWS[0], "Paso uno. [[RED]](Hasta tener que pasar A)[[/RED]]")

    def test_a_passage_the_page_no_longer_has_stops_the_import(self):
        # The page changed that text: the fix has to be reviewed, not skipped
        with self.assertRaises(SystemExit):
            fix_texts(self.RAWS, {2: [("pasar A", "pasar B")]})


class SilvestreFixesTest(unittest.TestCase):
    """The Silvestre's fixes apply to the page snapshot and give the marks the app shows."""

    @classmethod
    def setUpClass(cls):
        raws = json.loads((BUILD / "lists" / "silvestre" / "torrentearcano.json").read_text())["steps"]
        cls.raws = fix_texts(raws, config("silvestre").TEXT_FIXES)

    def step(self, n):
        raw = self.raws[n - 1]
        return import_guide.base(raw), import_guide.marks(raw), import_guide.closes(n, raw)

    def test_step_78_goes_up_to_order_mission_3_and_stops_at_roble_blando(self):
        base, marks, _ = self.step(78)
        self.assertEqual(base, "Alineamiento: Hasta la misión de orden 3.")
        self.assertEqual(marks[0], ["stop", "Hasta tener que pasar Roble Blando"])
        self.assertEqual(marks[1][0], "note")
        self.assertIn("inciso 80", marks[1][1])
        self.assertNotIn("Si se escoge", marks[1][1])

    def test_step_77_stops_at_roble_blando_passed_in_step_80(self):
        _, marks, _ = self.step(77)
        self.assertEqual(marks[0][0], "stop")
        self.assertTrue(marks[0][1].startswith("Hasta tener que pasar Roble Blando con el ídolo del dios Sadida"))
        self.assertIn("inciso 80", marks[0][1])
        self.assertNotIn("según la orden", marks[0][1])

    def test_step_80_does_order_mission_4_and_still_closes_77_and_78(self):
        _, marks, closes = self.step(80)
        kinds = [k for k, _ in marks]
        self.assertEqual(kinds, ["stop", "note", "done"])
        self.assertIn("misión de orden 4", marks[1][1])
        self.assertEqual(closes, [77, 78])

    def test_hielos_fixes_nothing(self):
        self.assertEqual(config("hielos").TEXT_FIXES, {})


if __name__ == "__main__":
    unittest.main()
