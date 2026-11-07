"""build_resources.py reads the groups the Nebuloso page adds.

checklist-nebuloso-datos lists its keys apart ("Llaves"), rows with a choice
("Alternativas": "1 x Insignia de maligilante o 30 000 kamas", one option per line), the
spell the guide needs ("Hechizos": "Captura de almas (requisito, no consumible)", with no
quantity) and the quest item of the last step ("Objeto de misión": the Dofus de los
Vigilantes). The page's compiled list adds up the first two and leaves the last two out;
the checklist does the same: they show in their step and do not count.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("build_resources", BUILD / "build_resources.py")
build_resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_resources)


class CategoryTest(unittest.TestCase):
    def test_the_new_groups_are_resources(self):
        for group in ("Llaves", "Alternativas", "Hechizos", "Objeto de misión"):
            self.assertEqual(build_resources.category(group), ("recursos", None), group)

    def test_the_old_groups_stay_as_they_were(self):
        self.assertEqual(build_resources.category("Equipables"), ("equipables", None))
        self.assertEqual(build_resources.category("Opcional"), ("recursos", "Opcional"))
        self.assertEqual(build_resources.category("Ojo atento - Recursos"), ("recursos", "Orden Ojo atento"))


class PageEntryTest(unittest.TestCase):
    def test_an_alternative_in_kamas_is_the_note(self):
        self.assertEqual(build_resources.page_entry("Alternativas", "1 x Insignia de maligilante o 30 000 kamas"),
                         ([(1, "Insignia de maligilante")], "o 30 000 kamas"))

    def test_a_spell_has_no_quantity(self):
        self.assertEqual(build_resources.page_entry("Hechizos", "Captura de almas (requisito, no consumible)"),
                         ([(1, "Captura de almas (requisito, no consumible)")], None))

    def test_alternative_items_stay_alternatives(self):
        self.assertEqual(build_resources.page_entry("Recursos", "10 x Madera de bambú o 10 x Madera de bambú oscuro"),
                         ([(10, "Madera de bambú"), (10, "Madera de bambú oscuro")], None))


class CountedTest(unittest.TestCase):
    def test_the_spell_and_the_quest_item_do_not_count(self):
        self.assertEqual(set(build_resources.NOT_COUNTED), {"Hechizos", "Objeto de misión"})

    def test_their_note_says_what_they_are(self):
        self.assertEqual(build_resources.row_note("Hechizos", ["requisito, no consumible"]),
                         "Hechizo: requisito, no consumible")
        self.assertEqual(build_resources.row_note("Objeto de misión", []), "Objeto de misión")

    def test_the_other_notes_are_the_page_s(self):
        self.assertEqual(build_resources.row_note("Recursos", ["amayiro"]), "amayiro")
        self.assertEqual(build_resources.row_note("Alternativas", ["o 30 000 kamas"]), "o 30 000 kamas")
        self.assertIsNone(build_resources.row_note("Recursos", []))


class CompiledSectionTest(unittest.TestCase):
    def test_the_alternatives_section_is_the_group(self):
        self.assertEqual(build_resources.compiled_section("Alternativas (elige una opción por línea)"), "Alternativas")

    def test_the_other_sections_keep_their_name(self):
        self.assertEqual(build_resources.compiled_section("Recursos (misión opcional)"), "Recursos (misión opcional)")
        self.assertEqual(build_resources.compiled_section("Llaves"), "Llaves")


if __name__ == "__main__":
    unittest.main()
