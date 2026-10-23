"""import_guide.py reads what each step finishes and updates, in either guide's words.

Silvestre's guide says «inciso»; the Hielos one says «etapa» and sometimes leaves out
«las misiones de» («Se terminan las etapas 3 y 6»). Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "import_guide.py"
spec = importlib.util.spec_from_file_location("import_guide", SCRIPT)
import_guide = importlib.util.module_from_spec(spec)
spec.loader.exec_module(import_guide)


def green(text):
    return f"Logro “X”, misión 1. [[GREEN]]{text}[[/GREEN]]"


class InciseTest(unittest.TestCase):
    """Silvestre's wording keeps working."""

    def test_closes_the_incisos_it_names(self):
        raw = green("Se pasa Nelwynn y se terminan las misiones de los incisos 33 y 34.")
        self.assertEqual(import_guide.closes(35, raw), [33, 34])

    def test_updates_the_inciso_of_the_mission(self):
        raw = green("Se termina la misión del inciso 52 y se actualiza la misión del inciso 53.")
        self.assertEqual(import_guide.closes(54, raw), [52])
        self.assertEqual(import_guide.updates(54, raw), [53])


class EtapaTest(unittest.TestCase):
    """«etapa(s)» means the same as «inciso(s)»."""

    def test_closes_the_etapas_without_las_misiones_de(self):
        raw = green("Se pasa la mazmorra del Jalamut Real y se terminan las etapas 3 y 6.")
        self.assertEqual(import_guide.closes(6, raw), [3])

    def test_closes_with_se_completan(self):
        raw = green("Se pasa la mazmorra de Ben Ripata y se completan las etapas 19 y 21.")
        self.assertEqual(import_guide.closes(21, raw), [19])

    def test_closes_la_mision_de_la_etapa(self):
        raw = green("Farmea los smielodones. Se termina la misión de la etapa 7.")
        self.assertEqual(import_guide.closes(9, raw), [7])

    def test_updates_la_etapa(self):
        raw = green("Farmea todos los monstruos. Se terminan las etapas 52 y 54 y se actualiza la etapa 49.")
        self.assertEqual(import_guide.closes(54, raw), [52])
        self.assertEqual(import_guide.updates(54, raw), [49])

    def test_updates_only_the_etapas_it_lists(self):
        """«—…de Frigost 3—» is no step: only the numbers right after «etapa» count."""
        raw = green("Se pasa la mazmorra de Nileza. Se actualiza la etapa 55 —Nileza te pedirá el drop"
                    " de los demás jefes de Frigost 3— y se termina la etapa 58.")
        self.assertEqual(import_guide.updates(58, raw), [55])
        self.assertEqual(import_guide.closes(58, raw), [])

    def test_a_step_that_updates_itself_until_a_dungeon(self):
        """Step 12: it updates its own mission «hasta que te pida pasar la mazmorra del…»."""
        raw = green("Farmea la grasa de güino. Se terminan las misiones de las etapas 9, 10 y 11 y se"
                    " actualiza la etapa 12 hasta que te pida pasar la mazmorra del Morsagüino Real.")
        self.assertEqual(import_guide.closes(12, raw), [9, 10, 11])
        self.assertEqual(import_guide.updates(12, raw), [])

    def test_termina_and_actualiza_in_one_clause(self):
        """Step 41: «termina … y actualiza …» at once, with no «se» before either verb."""
        raw = green("Farmea todo lo necesario, termina las misiones de las etapas 38, 40 y 41 y"
                    " actualiza la etapa 36.")
        self.assertEqual(import_guide.closes(41, raw), [38, 40])
        self.assertEqual(import_guide.updates(41, raw), [36])

    def test_a_blue_mark_that_states_it(self):
        raw = "Logro “X”. [[BLUE]]Se termina la misión de la etapa 4.[[/BLUE]]"
        self.assertEqual(import_guide.closes(5, raw), [4])


class CompleteTest(unittest.TestCase):
    def test_completo_followed_by_a_sentence(self):
        """«Completo. Las primeras…»: the note starts at the sentence, not at its full stop."""
        raw = "Logro “Frío al cubo”. [[BLUE]]Completo. Las primeras 2 misiones se hacen mientras haces la etapa 1.[[/BLUE]]"
        self.assertTrue(import_guide.complete(raw))
        self.assertEqual(import_guide.marks(raw),
                         [["note", "Las primeras 2 misiones se hacen mientras haces la etapa 1."]])


if __name__ == "__main__":
    unittest.main()
