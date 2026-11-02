"""build_resources.py keeps, in a step with one group per order, only the guide's order.

Step 78 of the Silvestre ("Hasta la misión de orden 4") lists the resources of the three
Bonta orders, one group each ("Corazón valiente - Recursos"…). The guide follows
Espíritu de la salvación: its quests are the only ones the step lists (STEP_EXTRA), so
the other orders' resources go (CHOSEN_ORDER, .build/dofus/<id>.py). With one order left
its rows are no longer for some players only: they lose the group and its key suffix,
like any other item, and add up with the same item elsewhere.
Order mission 4 (Maestro de los Pergaminos) is done in step 80: MOVED takes its items
there, with only its part of an item step 78's mission 2 also needs (move_rows).
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
move_rows = build_resources.move_rows


def config(dofus_id):
    spec = importlib.util.spec_from_file_location(f"cfg_{dofus_id}", BUILD / "dofus" / f"{dofus_id}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def row(key, src, qty=1):
    label = src.removesuffix(" - Recursos")
    group = f"Orden {label}" if label != src else None
    return {"k": key, "src": src, "g": group, "a": [[key.split("@")[0], qty]]}


class KeepOrderTest(unittest.TestCase):
    ROWS = [
        row("446@orden corazon valiente", "Corazón valiente - Recursos"),
        row("537@orden ojo atento", "Ojo atento - Recursos"),
        row("519@orden espiritu de la salvacion", "Espíritu de la salvación - Recursos"),
        row("9935@orden espiritu de la salvacion", "Espíritu de la salvación - Recursos"),
    ]

    def test_keeps_only_the_chosen_order_as_plain_items(self):
        kept = keep_order(self.ROWS, "Espíritu de la salvación")
        self.assertEqual([r["k"] for r in kept], ["519", "9935"])
        self.assertEqual([r["g"] for r in kept], [None, None])

    def test_rows_of_no_order_stay(self):
        rows = [row("17965", "Recursos"), row("1", "Consumibles"), *self.ROWS]
        kept = keep_order(rows, "Ojo atento")
        self.assertEqual([r["k"] for r in kept], ["17965", "1", "537"])

    def test_an_order_row_adds_up_with_the_same_item_of_the_step(self):
        rows = [row("519", "Recursos", 3), row("519@orden ojo atento", "Ojo atento - Recursos", 4)]
        kept = keep_order(rows, "Ojo atento")
        self.assertEqual([(r["k"], r["a"]) for r in kept], [("519", [["519", 7]])])

    def test_an_order_the_page_lacks_stops_the_build(self):
        # The page renamed or dropped the order: better to stop than to list nothing
        with self.assertRaises(SystemExit):
            keep_order(self.ROWS, "Orden inventada")


class MoveRowsTest(unittest.TestCase):
    def steps(self):
        return {"78": [row("519", "Recursos", 25), row("17060", "Recursos", 5), row("14443", "Recursos")],
                "80": [row("311", "Recursos", 80)]}

    def test_moves_whole_rows_and_part_of_one(self):
        steps = move_rows(self.steps(), {"78": ("80", {"17060": "orden 4", "519": (10, "orden 4")})})
        self.assertEqual([(r["k"], r["a"][0][1]) for r in steps["78"]], [("519", 15), ("14443", 1)])
        self.assertEqual([(r["k"], r["a"][0][1]) for r in steps["80"]], [("311", 80), ("519", 10), ("17060", 5)])

    def test_a_moved_part_adds_up_with_the_same_item_of_the_step(self):
        steps = self.steps()
        steps["80"].append(row("519", "Recursos", 2))
        steps = move_rows(steps, {"78": ("80", {"519": (10, "orden 4")})})
        self.assertEqual([(r["k"], r["a"][0][1]) for r in steps["80"]], [("311", 80), ("519", 12)])

    def test_an_item_the_step_lacks_stops_the_build(self):
        with self.assertRaises(SystemExit):
            move_rows(self.steps(), {"78": ("80", {"9999": "nada"})})
        # Or less than the part to move
        with self.assertRaises(SystemExit):
            move_rows(self.steps(), {"78": ("80", {"17060": (6, "orden 4")})})


class ChosenOrderTableTest(unittest.TestCase):
    def test_silvestre_step_78_follows_espiritu_de_la_salvacion(self):
        # Step 89 (order mission 5) lists one resource with no order: nothing to choose
        self.assertEqual(config("silvestre").CHOSEN_ORDER, {"78": "Espíritu de la salvación"})

    def test_silvestre_order_mission_4_items_go_to_step_80(self):
        to, items = config("silvestre").MOVED["78"]
        self.assertEqual(to, "80")
        # Maestro de los Pergaminos: 5 Pócima de envejecimiento, 10 of the 25 Polvos mágicos
        # (the other 15 are for Aprendiz iluminado), 14 Mandrágora, Mijo and Tenca, 4 Corteza
        # de abrakno oscuro and the Cuerda de escalada
        self.assertEqual(set(items), {"17060", "519", "16389", "16456", "16469", "16154", "9935"})
        self.assertEqual(items["519"][0], 10)

    def test_hielos_chooses_no_order(self):
        self.assertEqual(config("hielos").CHOSEN_ORDER, {})


if __name__ == "__main__":
    unittest.main()
