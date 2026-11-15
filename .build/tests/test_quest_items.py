"""quest_items.py: the items a step needs, from what its quests consume in DofusDB.

For a guide whose page lists no items (todos: Sandglass's PDF has none), each step takes
its rows from two places. A step that repeats a Silvestre step takes Torre's rows for it.
Any other step takes them from its quests' objectives: what they hand in ("Entrégale",
typeId 3) and what they craft ("Fabrica", typeId 17), with the ids and quantities of the
objective's parameters. A quest the guide splits across steps gives each step only its
part, up to where that step leaves it; nothing is listed twice.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "quest_items.py"
spec = importlib.util.spec_from_file_location("quest_items", SCRIPT)
quest_items = importlib.util.module_from_spec(spec)
spec.loader.exec_module(quest_items)

QUEST = quest_items.QUEST_ITEM
TYPES = {"1": "Cereal", "2": "Pócima", "3": QUEST, "4": QUEST, "5": "Sombrero", "6": "Dragopavo",
         "7": "Pan", "8": "Piedra preciosa", "9": "Misiones de mundo", "10": "Misiones de mundo",
         "11": "Piedra de alma", "12": "Personaje seguidor", "13": "Misiones de mundo"}
# The DofusDB category of each type (item-types: 0 equipment, 1 consumables, 2 resources,
# 3 quest items, 4 hidden ones such as followers, 5 cosmetics)
CATS = {"Cereal": 2, "Pócima": 1, QUEST: 2, "Sombrero": 0, "Dragopavo": 0, "Pan": 1, "Piedra preciosa": 2,
        "Misiones de mundo": 3, "Piedra de alma": 1, "Personaje seguidor": 4, "Recurso variado": 2}
RECIPES = {"4": {"i": [[1, 3], [8, 1]], "job": "Alquimista", "lvl": 10},
           "7": {"i": [[1, 2]], "job": "Panadero", "lvl": 1},
           "9": {"i": [[1, 1], [10, 1]], "job": "Base", "lvl": 20},
           "13": {"i": [[7, 1], [8, 1], [4, 1]], "job": "Manitas", "lvl": 50}}


def kind(key):
    return TYPES.get(key, "Recurso variado")


def recipe(key):
    return RECIPES.get(key)


def cat(type_name):
    return CATS[type_name]


def bring(item, qty):
    return {"typeId": 3, "parameters": {"parameter0": 99, "parameter1": item, "parameter2": qty}}


def craft(item, qty):
    return {"typeId": 17, "parameters": {"parameter0": item, "parameter1": qty}}


def talk():
    return {"typeId": 1, "parameters": {"parameter0": 99}}


def quest(qid, *stages):
    return {"id": qid, "name": {"es": f"Misión {qid}"},
            "steps": [{"objectives": list(objs)} for objs in stages]}


class FlatObjectivesTest(unittest.TestCase):
    def test_every_stage_in_order_without_the_empty_ones(self):
        q = quest(1, [talk(), None, bring(1, 2)], [bring(2, 1)])
        self.assertEqual([o["typeId"] for o in quest_items.flat_objectives(q, {})], [1, 3, 3])

    def test_a_stage_in_the_order_the_app_shows_it(self):
        # OBJECTIVE_ORDER: (quest, stage) -> new order, as build_quests_js.py applies it
        q = quest(1, [talk()], [bring(1, 1), bring(2, 1), bring(5, 1)])
        objs = quest_items.flat_objectives(q, {(1, 1): [2, 0, 1]})
        self.assertEqual([o["parameters"].get("parameter1") for o in objs], [None, 5, 1, 2])


class PortionsTest(unittest.TestCase):
    def test_a_quest_in_one_step_is_done_there_whole(self):
        self.assertEqual(quest_items.portions({4: [10]}, {}, set()), {(4, 10): (0, None)})

    def test_a_stop_leaves_the_rest_to_the_next_step_that_lists_it(self):
        got = quest_items.portions({4: [10], 9: [10]}, {(4, 10): 3}, set())
        self.assertEqual(got, {(4, 10): (0, 3), (9, 10): (3, None)})

    def test_once_finished_later_steps_get_nothing_of_it(self):
        got = quest_items.portions({35: [10], 36: [10, 11], 43: [10, 11]}, {(36, 11): 2}, set())
        self.assertEqual(got[(36, 10)], None)
        self.assertEqual(got[(43, 10)], None)
        self.assertEqual(got[(43, 11)], (2, None))

    def test_a_quest_only_taken_does_nothing_in_that_step(self):
        got = quest_items.portions({56: [439], 127: [439]}, {}, {(56, 439)})
        self.assertEqual(got, {(56, 439): None, (127, 439): (0, None)})

    def test_steps_go_in_number_order_whatever_order_they_come_in(self):
        got = quest_items.portions({"9": [10], "4": [10]}, {(4, 10): 1}, set())
        self.assertEqual(got, {(4, 10): (0, 1), (9, 10): (1, None)})


class QuestRowsTest(unittest.TestCase):
    def rows(self, q, start=0, end=None, made=None):
        rows = quest_items.quest_rows(q, quest_items.flat_objectives(q, {}), start, end, kind, recipe, cat,
                                      set() if made is None else made)
        return quest_items.finish(rows)

    def test_what_it_hands_in_with_the_ids_and_quantities_of_the_objective(self):
        rows = self.rows(quest(7, [talk(), bring(1, 10), bring(5, 1)]))
        self.assertEqual(rows, [{"k": "1", "c": "recursos", "g": None, "a": [["1", 10]], "m": ["Misión 7"]},
                                {"k": "5", "c": "equipables", "g": None, "a": [["5", 1]], "m": ["Misión 7"]}])

    def test_the_same_item_twice_is_one_row(self):
        rows = self.rows(quest(7, [bring(6, 1), bring(6, 1)], [bring(6, 1)]))
        self.assertEqual([(r["k"], r["c"], r["a"]) for r in rows], [("6", "criaturas", [["6", 3]])])

    def test_only_its_part_of_the_quest(self):
        q = quest(7, [bring(1, 10), talk()], [bring(2, 1)])
        self.assertEqual([r["k"] for r in self.rows(q, 0, 2)], ["1"])
        self.assertEqual([r["k"] for r in self.rows(q, 2)], ["2"])

    def test_a_quest_item_dropped_on_the_way_is_not_gathered(self):
        # A "Recurso de misión", a quest item of DofusDB's category 3 (named after its zone,
        # "Misiones de mundo") and a follower (category 4) with no recipe
        self.assertEqual(self.rows(quest(7, [bring(3, 5), bring(10, 1), bring(12, 1)])), [])

    def test_a_quest_item_with_a_recipe_is_what_it_is_made_of(self):
        rows = self.rows(quest(7, [bring(4, 2)]))
        self.assertEqual([(r["k"], r["a"], r["n"]) for r in rows],
                         [("1", [["1", 6]], "Para fabricar con alquimista nivel 10"),
                          ("8", [["8", 2]], "Para fabricar con alquimista nivel 10")])

    def test_its_quest_items_dropped_on_the_way_are_left_out_and_no_job_says_no_job(self):
        # Recipe 9 = 1 Cereal + 1 quest item dropped in the quest; "Base" is no job
        rows = self.rows(quest(7, [bring(9, 10)]))
        self.assertEqual([(r["k"], r["a"], r["n"]) for r in rows], [("1", [["1", 10]], "Para fabricar")])

    def test_what_it_crafts_is_what_it_is_made_of(self):
        rows = self.rows(quest(7, [craft(7, 3)]))
        self.assertEqual([(r["k"], r["a"], r["n"]) for r in rows], [("1", [["1", 6]], "Para fabricar con panadero nivel 1")])

    def test_what_it_crafts_and_then_hands_in_counts_once(self):
        q = quest(7, [craft(7, 1), talk()], [bring(7, 1)])
        self.assertEqual([(r["k"], r["a"]) for r in self.rows(q)], [("1", [["1", 2]])])
        self.assertEqual(self.rows(q, 1), [])

    def test_what_the_step_crafted_before_is_not_made_again(self):
        # Recipe 13 takes the bread (7) crafted by an earlier objective, and a quest item (4)
        # with its own recipe, which goes down to what it is made of
        rows = self.rows(quest(7, [craft(7, 1), craft(13, 1)]))
        self.assertEqual({r["k"]: r["a"][0][1] for r in rows}, {"1": 5, "8": 2})
        self.assertEqual(self.rows(quest(8, [craft(13, 1)]), made={"7"})[0]["a"], [["8", 2]])

    def test_an_item_both_brought_and_crafted_from_says_how_many_are_for_crafting(self):
        rows = self.rows(quest(7, [bring(1, 4), craft(7, 1)]))
        self.assertEqual([(r["a"], r["n"]) for r in rows], [([["1", 6]], "2 para fabricar con panadero nivel 1")])

    def test_categories_follow_the_item_type(self):
        rows = self.rows(quest(7, [bring(2, 1), bring(8, 1), bring(5, 1), bring(6, 1), bring(11, 1)]))
        self.assertEqual([r["c"] for r in rows], ["consumibles", "recursos", "equipables", "criaturas", "almas"])


class SilvestreRowsTest(unittest.TestCase):
    SILVESTRE = {"steps": {"61": [
        {"k": "384", "c": "recursos", "g": None, "a": [["384", 5]], "m": ["Memo"]},
        {"k": "289", "c": "recursos", "g": None, "a": [["289", 35]], "m": ["Espíritu", "La memoria"]},
        {"k": "77", "c": "recursos", "g": None, "a": [["77", 1]]},
        {"k": "78", "c": "recursos", "g": None, "a": [["78", 1]]}]}}

    def keys(self, sources):
        return [r["k"] for r in quest_items.silvestre_rows(sources, self.SILVESTRE)]

    def test_every_row_of_the_step_it_repeats(self):
        self.assertEqual(self.keys({61: None}), ["384", "289", "77", "78"])

    def test_only_the_rows_of_the_quests_it_does(self):
        # A row for two quests goes only where both are done; a row of no quest, by its key
        self.assertEqual(self.keys({61: ["Memo", "La memoria", "78"]}), ["384", "78"])
        self.assertEqual(self.keys({61: ["Espíritu", "La memoria"]}), ["289"])

    def test_the_rows_are_copies(self):
        rows = quest_items.silvestre_rows({61: None}, self.SILVESTRE)
        rows[0]["a"][0][1] = 99
        self.assertEqual(self.SILVESTRE["steps"]["61"][0]["a"], [["384", 5]])


class DeriveTest(unittest.TestCase):
    RAW = {10: quest(10, [bring(1, 4), talk()], [bring(8, 1)]), 11: quest(11, [craft(7, 2)]),
           12: quest(12, [bring(5, 1)])}
    SILVESTRE = {"steps": {"20": [{"k": "5", "c": "equipables", "g": None, "a": [["5", 1]], "m": ["Misión 12"]}]}}

    def derive(self, step_quests, until=None, sources=None, only=()):
        got = quest_items.derive(step_quests, self.RAW, {}, until or {}, set(), sources or {}, set(only),
                                 self.SILVESTRE, kind, recipe, cat)
        return {n: [(r["k"], r["a"][0][1]) for r in rows] for n, rows in got.items()}

    def test_a_step_that_repeats_the_silvestre_takes_its_rows_and_not_its_quests(self):
        got = self.derive({3: [10], 4: [11]}, sources={3: {20: None}}, only={3})
        self.assertEqual(got, {3: [("5", 1)], 4: [("1", 4)]})

    def test_its_quests_still_count_for_where_the_others_start(self):
        # Step 3 (Silvestre's) leaves quest 10 at objective 2: step 9 takes only the rest
        got = self.derive({3: [10], 9: [10]}, until={(3, 10): 2}, sources={3: {20: None}}, only={3})
        self.assertEqual(got[9], [("8", 1)])

    def test_the_quests_it_takes_from_the_silvestre_are_not_derived_again(self):
        got = self.derive({5: [10, 12]}, sources={5: {20: ["Misión 12"]}})
        self.assertEqual(got, {5: [("5", 1), ("1", 4), ("8", 1)]})

    def test_what_one_quest_crafts_is_not_made_again_by_the_next_one(self):
        raw = {**self.RAW, 13: quest(13, [craft(13, 1)])}
        got = quest_items.derive({6: [11, 13]}, raw, {}, {}, set(), {}, set(), self.SILVESTRE, kind, recipe, cat)
        self.assertEqual({r["k"]: r["a"][0][1] for r in got[6]}, {"1": 7, "8": 2})

    def test_steps_with_nothing_to_gather_are_left_out(self):
        self.assertNotIn(5, self.derive({5: ["clase", "alt:607:1"]}))
        self.assertNotIn(9, self.derive({3: [10], 9: [10]}))


class FourCategoriesTest(unittest.TestCase):
    """The rush lists resources, consumables, cosmetics and equipment only: a soul or a
    creature (as the Silvestre's page files them) goes by its DofusDB category, and a quest
    item copied from the Silvestre is not listed."""

    def row(self, c, *keys):
        return {"k": keys[0], "c": c, "g": None, "a": [[k, 1] for k in keys]}

    def four(self, steps):
        return quest_items.four_categories(steps, kind, cat)

    def test_souls_and_creatures_go_by_their_dofusdb_category(self):
        got = self.four({"7": [self.row("almas", "11"), self.row("criaturas", "6"), self.row("recursos", "1")]})
        self.assertEqual([(r["k"], r["c"]) for r in got["7"]], [("11", "consumibles"), ("6", "equipables"), ("1", "recursos")])

    def test_a_row_already_in_one_of_the_four_keeps_its_category(self):
        # Torre files some consumables (DofusDB) under resources: that stays
        got = self.four({"7": [self.row("recursos", "7")]})
        self.assertEqual(got["7"][0]["c"], "recursos")

    def test_quest_items_are_left_out_and_a_step_left_empty_goes(self):
        got = self.four({"7": [self.row("recursos", "9"), self.row("recursos", "1")], "8": [self.row("recursos", "12")]})
        self.assertEqual([r["k"] for r in got["7"]], ["1"])
        self.assertNotIn("8", got)

    def test_an_alternative_that_is_a_quest_item_is_dropped_from_its_row(self):
        got = self.four({"7": [self.row("recursos", "9", "8")]})
        self.assertEqual(got["7"][0]["a"], [["8", 1]])
        self.assertEqual(got["7"][0]["k"], "8")

    def test_a_row_that_keeps_all_its_alternatives_keeps_its_key(self):
        rows = [{"k": "1|8", "c": "recursos", "g": None, "a": [["1", 2], ["8", 1]]},
                {"k": "7@mision opcional", "c": "consumibles", "g": "Misión opcional", "a": [["7", 1]]}]
        self.assertEqual([r["k"] for r in self.four({"7": rows})["7"]], ["1|8", "7@mision opcional"])

    def test_a_row_that_loses_an_alternative_is_keyed_by_what_is_left(self):
        rows = [{"k": "9|8@mision opcional", "c": "recursos", "g": "Misión opcional", "a": [["9", 1], ["8", 1]]}]
        self.assertEqual(self.four({"7": rows})["7"][0]["k"], "8@mision opcional")

    def test_an_item_with_no_known_type_keeps_its_row(self):
        got = self.four({"7": [{"k": "x:reinos", "c": "recursos", "g": None, "a": [["x:reinos", 1]]}]})
        self.assertEqual(got["7"][0]["c"], "recursos")


if __name__ == "__main__":
    unittest.main()
