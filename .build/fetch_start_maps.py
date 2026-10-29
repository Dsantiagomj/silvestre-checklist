"""Mirror the map each step starts on: the banner of the step uses it as its background.

Loaded from DofusDB when the banner opened, it came a second late, so the zone's
landscape showed first and the map replaced it. Here it is a local file, cropped like
the zone landscapes (the "DofusDB" mark goes with the bottom band) and scaled to the
banner's size.

Reads  : src/dofus/<dofus>/figures.json   ({step: {"m": map id, ...}})
Writes : public/img/maps/start/<map id>.jpg   800 px wide, shared by every Dofus: it deletes
         only the maps no src/dofus/*/figures.json uses
Needs  : macOS `sips` or ImageMagick for the crop and resize (imaging.py)
Run    : python3 -I .build/fetch_start_maps.py   (after build_figures.py; --dofus <id> or DOFUS,
         silvestre by default)
"""
import json
import pathlib
import sys
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
import imaging  # noqa: E402
D = dofus.CONFIG
FIGURES = dofus.SRC / "figures.json"
OUT_DIR = ROOT / "public" / "img" / "maps" / "start"
MAP_URL = "https://api.dofusdb.fr/img/maps/1/{}.jpg"
CROP_H = 830  # of 970, as in fetch_zone_maps.py
WIDTH = 800   # twice the widest banner, the hero's
QUALITY = "60"


def step_maps(figures):
    """The start map of each step of one Dofus (its figures.json)."""
    return {v["m"] for v in json.loads(figures.read_text()).values() if v.get("m")}


def maps_in_use(dofus_root):
    """The start maps of every Dofus (src/dofus/*/figures.json): they all share OUT_DIR."""
    return set().union(*(step_maps(f) for f in dofus_root.glob("*/figures.json")))


def prune(out_dir, keep):
    """Delete the maps in out_dir that no Dofus uses; the names of the deleted ones."""
    wanted = {f"{m}.jpg" for m in keep}
    removed = sorted(old.name for old in out_dir.glob("*.jpg") if old.name not in wanted)
    for name in removed:
        (out_dir / name).unlink()
    return removed


def main():
    maps = sorted(step_maps(FIGURES))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    # Only what no Dofus uses: building one keeps the maps of the others
    prune(OUT_DIR, maps_in_use(dofus.SRC.parent))
    todo = [m for m in maps if not (OUT_DIR / f"{m}.jpg").exists()]
    with tempfile.TemporaryDirectory() as tmp:
        for m in todo:
            raw = pathlib.Path(tmp) / f"{m}.jpg"
            req = urllib.request.Request(MAP_URL.format(m), headers={"User-Agent": "Mozilla/5.0"})
            raw.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            imaging.crop(raw, CROP_H, 1910)
            imaging.resize(raw, OUT_DIR / f"{m}.jpg", WIDTH, QUALITY)
            print(m)
    size = sum(f.stat().st_size for f in OUT_DIR.glob("*.jpg"))
    print(f"mapas de inicio: {len(maps)} ({len(todo)} nuevos) · {size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
