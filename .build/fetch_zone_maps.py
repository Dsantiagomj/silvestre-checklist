"""Mirror one landscape per zone: the step board uses them as the zone's picture.

Each map was picked by hand among the maps the zone's quests go through
(outdoor, recognisable, not a dark interior). DofusDB renders carry a
"DofusDB" mark in the bottom right corner, so the image is cropped top and
bottom before scaling down.

Writes : public/img/zones/<slug>.jpg     960 px wide, for the step detail header
         public/img/zones/<slug>-s.jpg   200 px wide, for seals and list rows
         src/dofus/<dofus>/zones.json    { zone: { map, img, thumb } }
Needs  : macOS `sips` for the crop and resize
Run    : python3 -I .build/fetch_zone_maps.py   (--dofus <id> or DOFUS; silvestre by default)
"""
import json
import pathlib
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
D = dofus.CONFIG
OUT_DIR = ROOT / "public" / "img" / "zones"
OUT_JSON = dofus.SRC / "zones.json"
MAP_URL = "https://api.dofusdb.fr/img/maps/1/{}.jpg"

ZONE_MAPS = D.ZONE_MAPS  # per Dofus, in .build/dofus/<id>.py
CROP_H = 830  # of 970: drops the watermark band at the bottom, centred
SIZES = {"": 960, "-s": 200}


def slug(name):
    plain = unicodedata.normalize("NFD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", plain.lower()).strip("-")


def sips(*args):
    subprocess.run(["sips", *args], check=True, capture_output=True)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = {}
    with tempfile.TemporaryDirectory() as tmp:
        for zone, map_id in ZONE_MAPS.items():
            raw = pathlib.Path(tmp) / f"{map_id}.jpg"
            req = urllib.request.Request(MAP_URL.format(map_id), headers={"User-Agent": "Mozilla/5.0"})
            raw.write_bytes(urllib.request.urlopen(req, timeout=60).read())
            sips("-c", str(CROP_H), "1910", str(raw))
            name = slug(zone)
            for suffix, width in SIZES.items():
                dest = OUT_DIR / f"{name}{suffix}.jpg"
                sips("--resampleWidth", str(width), "-s", "formatOptions", "72", str(raw), "--out", str(dest))
            out[zone] = {"map": map_id, "img": f"zones/{name}.jpg", "thumb": f"zones/{name}-s.jpg"}
            print(f"{zone}: {map_id}")
    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")


if __name__ == "__main__":
    main()
