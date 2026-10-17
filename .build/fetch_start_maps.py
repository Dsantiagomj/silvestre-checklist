"""Mirror the map each step starts on: the banner of the step uses it as its background.

Loaded from DofusDB when the banner opened, it came a second late, so the zone's
landscape showed first and the map replaced it. Here it is a local file, cropped like
the zone landscapes (the "DofusDB" mark goes with the bottom band) and scaled to the
banner's size.

Reads  : src/data/figures.json   ({step: {"m": map id, ...}})
Writes : public/img/maps/start/<map id>.jpg   800 px wide
Needs  : macOS `sips` for the crop and resize
Run    : python3 -I .build/fetch_start_maps.py   (after build_figures.py)
"""
import json
import pathlib
import subprocess
import tempfile
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIGURES = ROOT / "src" / "data" / "figures.json"
OUT_DIR = ROOT / "public" / "img" / "maps" / "start"
MAP_URL = "https://api.dofusdb.fr/img/maps/1/{}.jpg"
CROP_H = 830  # of 970, as in fetch_zone_maps.py
WIDTH = 800   # twice the widest banner, the hero's
QUALITY = "60"


def sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def main():
    maps = sorted({v["m"] for v in json.loads(FIGURES.read_text()).values() if v.get("m")})
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    wanted = {f"{m}.jpg" for m in maps}
    for old in OUT_DIR.glob("*.jpg"):
        if old.name not in wanted:
            old.unlink()
    todo = [m for m in maps if not (OUT_DIR / f"{m}.jpg").exists()]
    with tempfile.TemporaryDirectory() as tmp:
        for m in todo:
            raw = pathlib.Path(tmp) / f"{m}.jpg"
            req = urllib.request.Request(MAP_URL.format(m), headers={"User-Agent": "Mozilla/5.0"})
            raw.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            sips("-c", str(CROP_H), "1910", str(raw))
            sips("--resampleWidth", str(WIDTH), "-s", "formatOptions", QUALITY, str(raw),
                 "--out", str(OUT_DIR / f"{m}.jpg"))
            print(m)
    size = sum(f.stat().st_size for f in OUT_DIR.glob("*.jpg"))
    print(f"mapas de inicio: {len(maps)} ({len(todo)} nuevos) · {size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
