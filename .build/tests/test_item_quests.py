"""audit_resources.py says what quest each item is for on the rows build_resources.py labels.

build_resources.py gives each row of the page its quests (item_quests.json, keyed by the
row key) and only then turns the crafted quest items into their ingredients, which take
the quests of the item they are for (expand_crafted). So the audit labels the page's rows,
before that expansion (build_resources.listed), not the rows of resources.json: there the
prototypes of «La desglaciación» (Silvestre, step 26) are already their ingredients, their
keys never match a row of the page and the ingredients lose their quest.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest
from unittest import mock

BUILD = pathlib.Path(__file__).resolve().parent.parent


def load(name):
    spec = importlib.util.spec_from_file_location(name, BUILD / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


build_resources = load("build_resources")
audit = load("audit_resources")

QUEST = "Recurso de misión"
# Prototype (100) = 10 ear (1) + 2 fang (2); the step also lists 3 ears for another quest
RECIPES = {"100": {"i": [[1, 10], [2, 2]], "job": "Manitas", "lvl": 100}}
TYPES = {"100": QUEST}
PAGE = {"26": [{"k": "1", "c": "recursos", "g": None, "a": [["1", 3]]},
               {"k": "100", "c": "criaturas", "g": None, "a": [["100", 1]]}]}
# What the step's quests consume (audit_resources.consumed counts a crafted item as
# itself and as what it takes): «La desglaciación» brings the prototype
WHY = {"1": [(3, "Hotel de hielo", "DofusDB"), (10, "La desglaciación", "DofusDB")],
       "2": [(2, "La desglaciación", "DofusDB")],
       "100": [(1, "La desglaciación", "DofusDB")]}


def expand(rows):
    return build_resources.expand_crafted(rows, RECIPES.get, lambda k: TYPES.get(k, "Recurso variado"),
                                          lambda k: k)


def quests(rows):
    return {r["k"]: r.get("m") for r in rows}


class ItemQuestsTest(unittest.TestCase):
    def test_the_audit_labels_the_crafted_item_the_page_lists(self):
        self.assertEqual(audit.purpose_of("26", PAGE["26"], WHY),
                         {"1": ["Hotel de hielo"], "100": ["La desglaciación"]})

    def test_its_ingredients_keep_the_quest_after_build_resources_expands_it(self):
        purpose = {"26": audit.purpose_of("26", PAGE["26"], WHY)}
        rows = expand(build_resources.with_quests(PAGE, purpose)["26"])
        self.assertEqual(quests(rows), {"1": ["Hotel de hielo", "La desglaciación"],
                                        "2": ["La desglaciación"]})

    def test_a_quest_reviewed_by_hand_wins(self):
        with mock.patch.dict(audit.MANUAL, {"26": {"100": "El recadero"}}):
            self.assertEqual(audit.purpose_of("26", PAGE["26"], WHY)["100"], ["El recadero"])

    def test_the_audit_reads_the_page_rows_build_resources_labels(self):
        items = {"1": {"name": "Oreja"}, "100": {"name": "Prototipo"}}
        with mock.patch.object(audit.build_resources, "listed", return_value=(PAGE, items, set())):
            self.assertEqual(audit.page(), (PAGE, items))



class PrereqQuestsTest(unittest.TestCase):
    def test_a_prerequisite_that_names_no_quest_has_none(self):
        """Nebuloso: "Más de 3 000 puntos de logro en el personaje (obligatorio)" asks for
        points, not for an achievement or a quest: nothing to consume."""
        self.assertEqual(audit.prereq_quests("Más de 3 000 puntos de logro en el personaje (obligatorio)",
                                             {}, {}, {}), [])

    def test_a_single_quest_is_that_quest(self):
        quests = {audit.norm("El despertar de Pandala"): {"id": 1186}}
        self.assertEqual(audit.prereq_quests('Isla de Pandala: misión "El despertar de Pandala".', {}, quests, {}),
                         [1186])


if __name__ == "__main__":
    unittest.main()
