"""build_resources.py keeps, in a step with one group per order, only the guide's order.

Step 78 of the Silvestre ("Hasta la misión de orden 4") lists the resources of the three
Bonta orders, one group each ("Corazón valiente - Recursos"…). The guide follows
Espíritu de la salvación: its quests are the only ones the step lists (STEP_EXTRA), so
the other orders' resources go (CHOSEN_ORDER, .build/dofus/<id>.py).
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = BUILD / "build_resources.py"
spec = importlib.util.spec_from_file_location("build_resources", SCRIPT)
build_resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_resources)
keep_order = build_resources.keep_order


def config(dofus_id):
    spec = importlib.util.spec_from_file_location(f"cfg_{dofus_id}", BUILD / "dofus" / f"{dofus_id}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def row(key, src):
    return {"k": key, "src": src}


class KeepOrderTest(unittest.TestCase):
    ROWS = [
        row("446@orden corazon valiente", "Corazón valiente - Recursos"),
        row("537@orden ojo atento", "Ojo atento - Recursos"),
        row("519@orden espiritu de la salvacion", "Espíritu de la salvación - Recursos"),
        row("9935@orden espiritu de la salvacion", "Espíritu de la salvación - Recursos"),
    ]

    def test_keeps_only_the_chosen_order(self):
        kept = keep_order(self.ROWS, "Espíritu de la salvación")
        self.assertEqual([r["k"] for r in kept],
                         ["519@orden espiritu de la salvacion", "9935@orden espiritu de la salvacion"])

    def test_rows_of_no_order_stay(self):
        rows = [row("17965", "Recursos"), row("1", "Consumibles"), *self.ROWS]
        kept = keep_order(rows, "Ojo atento")
        self.assertEqual([r["k"] for r in kept], ["17965", "1", "537@orden ojo atento"])

    def test_an_order_the_page_lacks_stops_the_build(self):
        # The page renamed or dropped the order: better to stop than to list nothing
        with self.assertRaises(SystemExit):
            keep_order(self.ROWS, "Orden inventada")


class ChosenOrderTableTest(unittest.TestCase):
    def test_silvestre_step_78_follows_espiritu_de_la_salvacion(self):
        # Step 89 (order mission 5) lists one resource with no order: nothing to choose
        self.assertEqual(config("silvestre").CHOSEN_ORDER, {"78": "Espíritu de la salvación"})

    def test_hielos_chooses_no_order(self):
        self.assertEqual(config("hielos").CHOSEN_ORDER, {})


if __name__ == "__main__":
    unittest.main()
