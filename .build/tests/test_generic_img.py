"""build_resources.py gives a generic row of the page an image of its own.

Some rows of the page name no DofusDB item: "30 x Recursos recolectables de los reinos
de tinta y papel" (Silvestre, step 66) is any gatherable resource of those realms. They
stay "x:<slug>", so their progress never merges with a real item's, but they no longer
show a bare "?": GENERIC_IMG (.build/dofus/<id>.py) gives each the icon of a
representative item, mirrored into public/img/ like every other item.
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


if __name__ == "__main__":
    unittest.main()
