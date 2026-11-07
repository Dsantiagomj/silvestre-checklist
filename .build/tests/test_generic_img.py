"""build_resources.py gives a generic row of the page an image of its own.

Some rows of the page name no DofusDB item: "30 x Recursos recolectables de los reinos
de tinta y papel" (Silvestre, step 66) is any gatherable resource of those realms. They
stay "x:<slug>", so their progress never merges with a real item's, but they no longer
show a bare "?": GENERIC_IMG (.build/dofus/<id>.py) gives each the icon of a
representative item, mirrored into public/img/ like every other item.
Names that only differ from DofusDB's go through ALIASES and become the real item.
Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import pathlib
import unittest

BUILD = pathlib.Path(__file__).resolve().parent.parent
PUBLIC_IMG = BUILD.parent / "public" / "img"
SCRIPT = BUILD / "build_resources.py"
spec = importlib.util.spec_from_file_location("build_resources", SCRIPT)
build_resources = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build_resources)
unknown_item = build_resources.unknown_item

TINTA_Y_PAPEL = "Recursos recolectables de los reinos de tinta y papel"


def config(dofus_id):
    spec = importlib.util.spec_from_file_location(f"cfg_{dofus_id}", BUILD / "dofus" / f"{dofus_id}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class UnknownItemTest(unittest.TestCase):
    def test_a_generic_row_gets_its_representative_icon(self):
        key, item = unknown_item(TINTA_Y_PAPEL, {"recursos recolectables de los reinos de tinta y papel":
                                                 "items/164832.png"})
        # The key stays generic: marking it never marks the Tulipán de papel
        self.assertEqual(key, "x:recursos recolectables de los reinos de tinta y papel")
        self.assertEqual(item, {"name": TINTA_Y_PAPEL, "img": "items/164832.png", "type": "", "lvl": 0})

    def test_a_generic_name_is_never_looked_up(self):
        """Nebuloso: DofusDB has no "Kama" item and a prefix search would answer "Kama
        enigmático"; a name GENERIC_IMG lists stays generic, whatever DofusDB says."""
        def find(name, cache):
            raise AssertionError(f"looked up {name}")
        self.assertIsNone(build_resources.find_item("Kama", {}, {"kama": "items/24243.png"}, find))

    def test_any_other_name_is_looked_up(self):
        self.assertEqual(build_resources.find_item("Patata", {}, {}, lambda name, cache: {"id": 537}), {"id": 537})

    def test_any_other_unknown_name_stays_without_image(self):
        key, item = unknown_item("Objeto inventado", {})
        self.assertEqual(key, "x:objeto inventado")
        self.assertIsNone(item["img"])


class GenericImgTableTest(unittest.TestCase):
    def test_silvestre_step_66_shows_a_flower_of_the_reino_de_papel(self):
        # Tulipán de papel (23824), harvested in the Reino de Papel (subarea 957)
        self.assertEqual(config("silvestre").GENERIC_IMG,
                         {"recursos recolectables de los reinos de tinta y papel": "items/164832.png"})

    def test_hielos_has_no_generic_rows(self):
        self.assertEqual(config("hielos").GENERIC_IMG, {})

    def test_every_icon_is_self_hosted(self):
        for dofus_id in ("silvestre", "hielos"):
            for name, img in config(dofus_id).GENERIC_IMG.items():
                self.assertTrue((PUBLIC_IMG / img).is_file(), f"{dofus_id}: {name} -> {img}")


class EsenciaDeCilTest(unittest.TestCase):
    def test_the_guide_name_points_at_the_esencia_del_cil(self):
        # Step 60: "1 x Esencia de cil o 1 x Esencia de silvespíritu"; DofusDB calls it
        # "Esencia del Cil" (14693), the essence of the Cil dungeon guardian
        self.assertEqual(config("silvestre").ALIASES.get("esencia de cil"), 14693)

    def test_it_keeps_the_quest_it_is_for(self):
        # The quest's guide writes "1 x Esencia de Cil", which no longer matches the
        # item's name: audit_resources.py takes the quest from MANUAL instead
        self.assertEqual(config("silvestre").MANUAL.get("60"), {"14693": "El último de nosotros"})


if __name__ == "__main__":
    unittest.main()
