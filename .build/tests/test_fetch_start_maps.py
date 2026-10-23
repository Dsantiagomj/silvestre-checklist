"""fetch_start_maps.py prunes only the start maps no Dofus uses.

Every Dofus shares public/img/maps/start/: building one must not delete the maps of
another. Run: python3 -I -m unittest discover -s .build/tests
"""
import importlib.util
import json
import pathlib
import tempfile
import unittest

SCRIPT = pathlib.Path(__file__).resolve().parent.parent / "fetch_start_maps.py"
spec = importlib.util.spec_from_file_location("fetch_start_maps", SCRIPT)
fetch_start_maps = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fetch_start_maps)


def figures(root, dofus_id, maps):
    """src/dofus/<id>/figures.json with one step per map (and one step without a map)."""
    folder = root / dofus_id
    folder.mkdir(parents=True)
    data = {str(n): {"m": m} for n, m in enumerate(maps, 1)}
    data[str(len(maps) + 1)] = {"f": {"name": "sin mapa"}}
    (folder / "figures.json").write_text(json.dumps(data))


class PruneTest(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.src = pathlib.Path(tmp.name) / "dofus"
        self.out = pathlib.Path(tmp.name) / "start"
        self.out.mkdir()
        figures(self.src, "silvestre", [1, 2])
        figures(self.src, "hielos", [2, 3])
        for name in ("1.jpg", "2.jpg", "3.jpg", "4.jpg"):
            (self.out / name).write_bytes(b"jpg")

    def test_maps_in_use_joins_every_dofus(self):
        self.assertEqual(fetch_start_maps.maps_in_use(self.src), {1, 2, 3})

    def test_prune_keeps_the_maps_of_the_other_dofus(self):
        removed = fetch_start_maps.prune(self.out, fetch_start_maps.maps_in_use(self.src))
        self.assertEqual(removed, ["4.jpg"])
        self.assertEqual(sorted(p.name for p in self.out.glob("*.jpg")), ["1.jpg", "2.jpg", "3.jpg"])

    def test_a_dofus_without_figures_yet_uses_no_maps(self):
        (self.src / "nuevo").mkdir()
        self.assertEqual(fetch_start_maps.maps_in_use(self.src), {1, 2, 3})


if __name__ == "__main__":
    unittest.main()
