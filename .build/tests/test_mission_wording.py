"""build_quests_js.py reads which missions of an achievement a step asks for.

The todos guide (Sandglass's PDF) says it in ways the Silvestre one never does:
«hasta completar la misión 2» (missions 1 and 2), «dejando pendiente únicamente la misión
7» (the whole achievement, mission 7 left at its stop), «hasta la misión adjunta: Cómo
perder la pluma» (a quest of no mission of the achievement), «hasta la misión 4 …,
misión 6» (1 to 4 and 6), and a green «Se realizan las misiones 1, 3 y 4 del logro “X”»
that adds those missions to the step.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "build_quests_js.py"
spec = importlib.util.spec_from_file_location("build_quests_js", SCRIPT)
build_quests_js = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_quests_js)
missions_for = build_quests_js.missions_for
realized = build_quests_js.realized


class UntilTest(unittest.TestCase):
    def test_hasta_la_mision_as_before(self):
        self.assertEqual(missions_for('Logro "X", hasta la misión 4: Su nombre es ninguno.', 0), [1, 2, 3, 4])

    def test_hasta_completar_la_mision(self):
        self.assertEqual(missions_for('Logro "X", hasta completar la misión 2: Hacerse el muerto.', 0), [1, 2])

    def test_hasta_la_mision_and_a_later_one(self):
        text = ('Logro "El rey y yo", hasta la misión 4: Anutrof salve al rey (Hasta tener que pasar Rey'
                ' Nidas), misión 6: El barbero de Anutropía (Hasta tener que pasar Rey Nidas).')
        self.assertEqual(missions_for(text, 0), [1, 2, 3, 4, 6])

    def test_the_next_achievement_does_not_count(self):
        text = 'Logro "X", hasta la misión 2: A. Logro "Y", misión 5: B.'
        self.assertEqual(missions_for(text, 0), [1, 2])


class PendingOnlyTest(unittest.TestCase):
    def test_dejando_pendiente_unicamente(self):
        text = 'Logro "El perforar se va a acabar", dejando pendiente únicamente la misión 7: Bailando con perforatroces'
        self.assertIsNone(missions_for(text, 0))

    def test_hasta_dejar_pendiente_unicamente(self):
        text = 'Logro "Cementerio marino", hasta dejar pendiente únicamente la misión 1: Alga y ritmo'
        self.assertIsNone(missions_for(text, 0))


class AttachedTest(unittest.TestCase):
    def test_la_mision_adjunta_is_none_of_the_achievement(self):
        text = 'Logro "Púrpura profundo", hasta la misión adjunta: Cómo perder la pluma.'
        self.assertEqual(missions_for(text, 0), [])


class RealizedTest(unittest.TestCase):
    def test_the_missions_a_green_says_are_done(self):
        marks = [["stop", "Hasta tener que pasar Toxoliat"],
                 ["done", 'Se realizan las misiones 1, 3, 4, 5, 6, 8, 9 y 10 del logro "Escupe tu veneno".']]
        self.assertEqual(realized(marks), {"Escupe tu veneno": [1, 3, 4, 5, 6, 8, 9, 10]})

    def test_with_more_after_it(self):
        marks = [["done", 'Se realizan las misiones 2, 3 y 10 del logro "Carpe Diem" y se capturan las almas'
                          ' necesarias, finalmente se terminan las misiones de los incisos 95 y 96.']]
        self.assertEqual(realized(marks), {"Carpe Diem": [2, 3, 10]})

    def test_only_greens(self):
        marks = [["note", 'Se realizan las misiones 1 y 2 del logro "X".']]
        self.assertEqual(realized(marks), {})


if __name__ == "__main__":
    unittest.main()
