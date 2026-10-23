"""build_resources.py lists what you gather, not the quest items you craft from it.

A "Recurso de misión" with a recipe (the prototypes of «La desglaciación») cannot be
bought: the step lists its ingredients instead, through any crafted quest item in its
recipe (the bambú pieces), with the quantities multiplied and added up.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "build_resources.py"
spec = importlib.util.spec_from_file_location("build_resources", SCRIPT)
build_resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_resources)
expand_crafted = build_resources.expand_crafted

QUEST = "Recurso de misión"
# Prototype (100) = 1 piece + 10 ear + 2 fang; piece (60) = 20 wood + 1 egg
RECIPES = {
    "100": {"i": [[60, 1], [1, 10], [2, 2]], "job": "Manitas", "lvl": 100},
    "101": {"i": [[61, 1], [1, 10], [3, 2]], "job": "Manitas", "lvl": 100},
    "60": {"i": [[7013, 20], [4, 1]], "job": "Manitas", "lvl": 60},
    "61": {"i": [[7013, 20], [5, 1]], "job": "Manitas", "lvl": 60},
    "7": {"i": [[1, 1]], "job": "Herrero", "lvl": 100},
}
TYPES = {"100": QUEST, "101": QUEST, "60": QUEST, "61": QUEST, "7": "Aleación"}
NAMES = {"1": "Oreja", "2": "Colmillo", "3": "Diente", "4": "Huevo", "5": "Escama",
         "7013": "Madera de bambú"}


def recipe(key):
    return RECIPES.get(key)


def kind(key):
    return TYPES.get(key, "Recurso variado")


def name(key):
    return NAMES.get(key, key)


def row(key, qty, cat="recursos", m=None):
    out = {"k": key, "c": cat, "g": None, "a": [[key, qty]]}
    if m:
        out["m"] = m
    return out


def quantities(rows):
    return {r["k"]: r["a"][0][1] for r in rows}


class ExpandCraftedTest(unittest.TestCase):
    def expand(self, rows):
        return expand_crafted(rows, recipe, kind, name)

    def test_a_quest_item_with_a_recipe_becomes_its_base_ingredients(self):
        rows = self.expand([row("100", 1, "criaturas", ["La desglaciación"])])
        self.assertEqual(quantities(rows), {"7013": 20, "1": 10, "2": 2, "4": 1})
        self.assertTrue(all(r["c"] == "recursos" and r["g"] is None for r in rows))
        self.assertTrue(all(r["m"] == ["La desglaciación"] for r in rows))

    def test_the_same_ingredient_adds_up_across_crafted_items_and_their_quantities(self):
        rows = self.expand([row("100", 2), row("101", 1)])
        self.assertEqual(quantities(rows), {"7013": 60, "1": 30, "2": 4, "3": 2, "4": 2, "5": 1})

    def test_the_ingredients_go_where_the_crafted_items_were_most_first(self):
        rows = self.expand([row("9", 5), row("100", 1), row("8", 1)])
        self.assertEqual([r["k"] for r in rows], ["9", "7013", "1", "2", "4", "8"])

    def test_an_ingredient_already_listed_in_the_step_adds_to_that_row(self):
        rows = self.expand([row("1", 3, m=["Hotel de hielo"]), row("100", 1, m=["La desglaciación"])])
        self.assertEqual(quantities(rows), {"1": 13, "7013": 20, "2": 2, "4": 1})
        merged = rows[0]
        self.assertEqual(merged["m"], ["Hotel de hielo", "La desglaciación"])
        self.assertEqual(merged["n"], "10 para fabricar con manitas nivel 100")

    def test_the_note_says_which_job_and_level_crafts_it(self):
        rows = self.expand([row("100", 1)])
        self.assertTrue(all(r["n"] == "Para fabricar con manitas nivel 100" for r in rows))

    def test_items_you_can_buy_stay_as_they_are(self):
        rows = [row("7", 5, m=["Hotel de hielo"]), row("9", 1)]
        self.assertEqual(self.expand(rows), rows)

    def test_a_row_with_alternatives_stays_as_it_is(self):
        alt = {"k": "100|101", "c": "recursos", "g": None, "a": [["100", 1], ["101", 1]]}
        self.assertEqual(self.expand([alt]), [alt])


if __name__ == "__main__":
    unittest.main()
