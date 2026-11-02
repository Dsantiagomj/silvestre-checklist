"""build_quests_js.py writes COMPLETED_BY: the quests that complete themselves.

Some quests have no quest link in DofusDB (their objectives are free text, «Descubre
Frigost…»), yet the game marks them finished once a set of other quests is done. The
list is hand-written in .build/lists/completed_by.json, shared by every Dofus; each
quests.json keeps the ones on its route, with all their quests (on the route or not).
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "build_quests_js.py"
spec = importlib.util.spec_from_file_location("build_quests_js", SCRIPT)
build_quests_js = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_quests_js)
completed_by = build_quests_js.completed_by
read_completed_by = build_quests_js.read_completed_by


class CompletedByTest(unittest.TestCase):
    def test_keeps_the_ones_on_the_route_with_every_quest(self):
        table = {649: [612, 613, 614, 615], 650: [577, 578], 1325: [1319, 1320]}
        # 612 and 615 are on the route, 613 and 614 are not: all four stay
        route = {"2": [612], "4": [615], "5": [649], "9": ["alt:554:2751", 1319]}
        self.assertEqual(completed_by(route, table), {"649": [612, 613, 614, 615]})

    def test_keys_as_text_in_numeric_order(self):
        table = {1325: [1319], 649: [612], 650: [577]}
        route = {"1": [1325, 650, 649]}
        self.assertEqual(list(completed_by(route, table)), ["649", "650", "1325"])

    def test_nothing_on_the_route_gives_an_empty_table(self):
        self.assertEqual(completed_by({"1": [612, 613]}, {649: [612, 613]}), {})

    def test_the_shared_list(self):
        table = read_completed_by()
        self.assertEqual(table[649], [612, 613, 614, 615])
        self.assertEqual(table[650], [577, 578, 628, 629, 579])
        self.assertEqual(table[651], [589, 590, 591, 592, 593, 594, 595])
        self.assertEqual(table[652], list(range(556, 566)))
        self.assertEqual(table[1330], [596, 597, 598])
        self.assertEqual(table[1325], [1319, 1320, 1321, 1322, 1323, 1324])
        # 653 completes with dungeons, not quests
        self.assertNotIn(653, table)
        self.assertEqual(len(table), 6)


if __name__ == "__main__":
    unittest.main()
