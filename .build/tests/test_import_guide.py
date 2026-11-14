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

    def test_completo_alone(self):
        """Nebuloso: «[[BLUE]]Completo.[[/BLUE]]» is the whole mark, so it leaves no note."""
        raw = "Logro “De un mundo a otro”. [[BLUE]]Completo.[[/BLUE]]"
        self.assertTrue(import_guide.complete(raw))
        self.assertEqual(import_guide.marks(raw), [])


class StepsArrayTest(unittest.TestCase):
    """The page's steps: template literals (Silvestre, Hielos) or JSON strings (Nebuloso)."""

    def test_template_literals(self):
        html = "const steps = [\n    `Logro “A”. [[BLUE]]Completo.[[/BLUE]]`,\n    `Logro “B”, misión: C.`\n];\n"
        self.assertEqual(import_guide.js_string_array(html, "steps"),
                         ["Logro “A”. [[BLUE]]Completo.[[/BLUE]]", "Logro “B”, misión: C."])

    def test_json_strings(self):
        html = ('const steps = [\n    "Logro “A”. [[BLUE]]Completo.[[/BLUE]]",\n'
                '    "Logro “B”, misión: En busca del \\"pájaro\\"; fin."\n];\n\n  const resourcesData = {};')
        self.assertEqual(import_guide.js_string_array(html, "steps"),
                         ["Logro “A”. [[BLUE]]Completo.[[/BLUE]]", 'Logro “B”, misión: En busca del "pájaro"; fin.'])

    def test_an_empty_array(self):
        self.assertEqual(import_guide.js_string_array("const steps = [];", "steps"), [])

    def test_the_links_read_them_the_same(self):
        """import_guide_links.py finds the names in the same steps, in either form."""
        spec = importlib.util.spec_from_file_location("import_guide_links", SCRIPT.parent / "import_guide_links.py")
        links = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(links)
        html = 'const steps = [\n    "Logro “El sueño de otro mundo”, misión: En busca del pájaro del tiempo."\n];'
        self.assertEqual(links.missions(links.js_string_array(html, "steps")), ["En busca del pájaro del tiempo"])


class TranscriptionTest(unittest.TestCase):
    """A guide with no data page (todos, from Sandglass's PDF) comes as a transcription in
    the snapshot's own form: a .json with the steps, the same colour markers and no
    previous version. read_source reads it like a page and keeps its other keys."""

    def write(self, data):
        import json
        import tempfile
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump(data, tmp, ensure_ascii=False)
        tmp.close()
        self.addCleanup(pathlib.Path(tmp.name).unlink)
        return tmp.name

    def steps(self, count):
        return [f"Logro “L{n}”. [[BLUE]](Completo)[[/BLUE]]" for n in range(1, count + 1)]

    def test_reads_the_steps_of_a_json_transcription(self):
        steps = self.steps(import_guide.D.STEP_COUNT)
        raws, resources, previous, extra = import_guide.read_source(
            self.write({"steps": steps, "aparte": {"160": "I. …"}}))
        self.assertEqual(raws, steps)
        self.assertEqual(resources, {})
        self.assertEqual(previous, [[n] for n in range(1, len(steps) + 1)])
        self.assertEqual(extra, {"aparte": {"160": "I. …"}})

    def test_a_transcription_short_of_steps_stops(self):
        with self.assertRaises(SystemExit):
            import_guide.read_source(self.write({"steps": self.steps(3)}))

    def test_a_page_has_nothing_extra(self):
        steps = self.steps(import_guide.D.STEP_COUNT)
        html = ("const steps = [\n" + ",\n".join(f"`{t}`" for t in steps) + "\n];\n"
                "const resourcesData = {};\nconst previousStepsByNewStep = "
                + str([[n] for n in range(1, len(steps) + 1)]) + ";\n")
        tmp = self.write({})
        pathlib.Path(tmp).with_suffix(".html").write_text(html, encoding="utf-8")
        self.addCleanup(pathlib.Path(tmp).with_suffix(".html").unlink)
        raws, resources, previous, extra = import_guide.read_source(pathlib.Path(tmp).with_suffix(".html"))
        self.assertEqual((raws, resources, extra), (steps, {}, {}))


class LinksWithoutPageTest(unittest.TestCase):
    """With no data page there are no achievementLinks: import_guide_links.py takes the
    achievements the steps name ("Logro “A”, “B”") and looks their pages up in the sitemap."""

    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location("import_guide_links", SCRIPT.parent / "import_guide_links.py")
        cls.links = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.links)

    def test_the_achievements_the_steps_name(self):
        texts = ["Astrub: Logro “La gran biblioteca”, “Mercenario de acero”. [[BLUE]](Completo)[[/BLUE]]",
                 "Isla de Frigost: Logro: “Jugar a los médicos”, misión 1: Los monólogos de la vacuna.",
                 "Misiones de mundo: Logro “Azul turquesa”, misión 2: “Extinción de los fuegos”, misión 3: X.",
                 "Logro “Cuestión de equilibrio”, misión 4: “Tres corazones, un rey”. [[BLUE]](Esta misión incluye"
                 " hacer las misiones de Dimensiones divinas: Logro “La tajada Rhoarim”, misión 1: Y)[[/BLUE]]"]
        self.assertEqual(self.links.achievement_names(texts),
                         ["Azul turquesa", "Cuestión de equilibrio", "Jugar a los médicos", "La gran biblioteca",
                          "La tajada Rhoarim", "Mercenario de acero"])

    def test_a_transcription_brings_no_links(self):
        import json
        import tempfile
        tmp = tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8")
        json.dump({"steps": ["Logro “A”, misión: B."]}, tmp, ensure_ascii=False)
        tmp.close()
        self.addCleanup(pathlib.Path(tmp.name).unlink)
        self.assertEqual(self.links.read_links_source(tmp.name), (["Logro “A”, misión: B."], None, {}))

    def test_a_page_brings_its_links(self):
        import tempfile
        html = ('const steps = [\n    "Logro “A”."\n];\nconst achievementLinks = {"A": "https://x/a"};\n'
                'const missionUrlOverrides = {"B": "https://x/b"};\n')
        tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
        tmp.write(html)
        tmp.close()
        self.addCleanup(pathlib.Path(tmp.name).unlink)
        self.assertEqual(self.links.read_links_source(tmp.name),
                         (["Logro “A”."], {"A": "https://x/a"}, {"B": "https://x/b"}))


if __name__ == "__main__":
    unittest.main()
