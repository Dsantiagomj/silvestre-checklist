"""build_assets_js.py: the Dofus the guide hands out (DOFUS_ROAD), with the guide's own steps.

The road comes from DofusDB: each Dofus an achievement of a step rewards, on the step that
completes it. The todos guide says itself where each Dofus is obtained («Se obtiene el Dofus
X», in purple), and some come from a quest, not an achievement (the Dotruz of «Un huevo para
Zurcarák»), or on another step (the Dofus Púrpura at 44, whose green passes the Jalamut Real
that ends step 43). ROAD_STEPS (.build/dofus/<id>.py, item id -> step) puts each one there.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import sys
import types
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "build_assets_js.py"
# build_assets_js imports the big DofusDB tables through match_assets: a stand-in
sys.modules.setdefault("match_assets", types.SimpleNamespace(ACH={}, QUEST={}, lookup=lambda q, t: (None, 0)))
spec = importlib.util.spec_from_file_location("build_assets_js", SCRIPT)
build_assets_js = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_assets_js)

TYPES = {694: (23, "Dofus Púrpura", 23001), 15235: (23, "Dotruz", 23019), 1: (15, "Pan", 1)}
ACHIEVEMENTS = [{"id": 1101, "name": {"es": "Púrpura profundo"}, "rewards": [{"itemsReward": [694]}],
                 "objectives": []}]
STEPS = {"43": {"achievements": [{"id": 1101, "name": "Púrpura profundo"}]},
         "37": {"achievements": [{"id": 1101, "name": "Púrpura profundo"}],
                "quests": [{"id": 1527, "name": "Cómo perder la pluma"}]},
         "33": {"quests": [{"id": 1517, "name": "Un huevo para Zurcarák"}]}}
REPORT = [{"n": 33, "text": "Krozmos: Misión: Un huevo para Zurcarák."},
          {"n": 37, "text": "Logro \"Púrpura profundo\", hasta la misión adjunta: Cómo perder la pluma."},
          {"n": 43, "text": "Logro \"Púrpura profundo\", hasta la misión 8: El poder detrás del trono."}]


class RoadStepsTest(unittest.TestCase):
    def setUp(self):
        saved = build_assets_js.item_types, build_assets_js.ROAD_STEPS
        self.addCleanup(lambda: (setattr(build_assets_js, "item_types", saved[0]),
                                 setattr(build_assets_js, "ROAD_STEPS", saved[1])))
        build_assets_js.item_types = lambda ids: TYPES

    def road(self, pins):
        build_assets_js.ROAD_STEPS = pins
        return build_assets_js.dofus_road(ACHIEVEMENTS, {}, STEPS, REPORT)

    def test_without_pins_as_before(self):
        self.assertEqual(self.road({}), [{"name": "Dofus Púrpura", "img": "items/23001.png", "step": 43,
                                          "achievement": "Púrpura profundo"}])

    def test_a_pin_moves_a_dofus_to_its_step(self):
        self.assertEqual([(d["name"], d["step"], d["achievement"]) for d in self.road({694: 44})],
                         [("Dofus Púrpura", 44, "Púrpura profundo")])

    def test_a_pin_adds_a_dofus_of_a_quest_with_the_step_s_name(self):
        """The Dotruz is no achievement's reward: it takes the name of the step's achievement,
        or of its first quest when it has none."""
        road = self.road({15235: 37})
        self.assertIn({"name": "Dotruz", "img": "items/23019.png", "step": 37, "achievement": "Púrpura profundo"},
                      road)
        road = self.road({15235: 33})
        self.assertIn({"name": "Dotruz", "img": "items/23019.png", "step": 33,
                       "achievement": "Un huevo para Zurcarák"}, road)

    def test_the_road_stays_in_step_order(self):
        self.assertEqual([d["step"] for d in self.road({15235: 37, 694: 44})], [37, 44])


if __name__ == "__main__":
    unittest.main()
