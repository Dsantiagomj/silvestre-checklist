"""Writes public/cosecha/cosecha.json: every soul «La eterna cosecha» (quest 439) asks for.

Each row is one monster, in the quest's own order: name, level, image, whether it is a
dungeon boss (with its dungeon) or an archmonster, the subarea where it lives, the quest
stage that asks for it (`e`, 1-18: the 1-based index of its step in the API order of
`quest.steps`; the recommended levels are ignored) and its region (`r`, the area of its
first subarea). The embed (src/cosecha/) bundles this file.

The images are copied to public/img/cosecha/<gfx>.png (several monsters share one) and
`img` is relative to public/img/: nothing is fetched from DofusDB or Ankama at runtime.
Run: python3 -I .build/build_cosecha.py
"""
import json
import pathlib
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://api.dofusdb.fr"
ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "public/cosecha/cosecha.json"
IMG_DIR = ROOT / "public/img/cosecha"


def get(path):
    req = urllib.request.Request(f"{API}{path}", headers={"User-Agent": "silvestre-checklist"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def many(kind, ids):
    """Fetches records by id, 50 at a time."""
    ids = sorted(set(ids))
    out = {}
    for i in range(0, len(ids), 50):
        chunk = ids[i:i + 50]
        q = "&".join(f"id[$in][]={x}" for x in chunk)
        for d in get(f"/{kind}?$limit=50&lang=es&{q}")["data"]:
            out[int(d["id"])] = d
    return out


def download(url, dest):
    """Copies one image, once: an image already on disk is kept."""
    if dest.exists() and dest.stat().st_size:
        return
    req = urllib.request.Request(url, headers={"User-Agent": "silvestre-checklist"})
    with urllib.request.urlopen(req, timeout=60) as r:
        dest.write_bytes(r.read())


def local_image(url):
    """public/img/cosecha/<gfx>.png for a DofusDB monster image, relative to public/img/."""
    return f"cosecha/{url.rsplit('/', 1)[-1]}"


def main():
    quest = get("/quests/439?lang=es")
    rows = []
    for stage, step in enumerate(quest["steps"], 1):
        for o in step["objectives"]:
            if o["className"] != "QuestObjectiveBringSoulToNpcData":
                continue
            p = o["parameters"]
            dungeons = (o.get("need") or {}).get("generated", {}).get("dungeons") or []
            rows.append({"id": p["parameter1"], "dungeon": dungeons[0] if dungeons else None, "stage": stage})
    monsters = many("monsters", [r["id"] for r in rows])
    dungeons = many("dungeons", [r["dungeon"] for r in rows if r["dungeon"]])
    subareas = many("subareas", [m["subareas"][0] for m in monsters.values() if m.get("subareas")])
    areas = many("areas", [s["areaId"] for s in subareas.values()])
    IMG_DIR.mkdir(parents=True, exist_ok=True)
    urls = sorted({m["img"] for m in monsters.values() if m.get("img")})
    with ThreadPoolExecutor(8) as pool:
        list(pool.map(lambda u: download(u, ROOT / "public/img" / local_image(u)), urls))
    out = []
    for r in rows:
        m = monsters[r["id"]]
        d = dungeons.get(r["dungeon"]) if r["dungeon"] else None
        sub = subareas.get(m["subareas"][0]) if m.get("subareas") else None
        out.append({
            "id": r["id"],
            "n": m["name"]["es"],
            "lv": m["grades"][-1]["level"] if m.get("grades") else None,
            "img": local_image(m["img"]) if m.get("img") else None,
            "t": "boss" if d or m.get("isBoss") else "archi" if m.get("isMiniBoss") else "otro",
            "d": d["name"]["es"] if d else None,
            "z": sub["name"]["es"] if sub else None,
            "e": r["stage"],
            "r": areas[sub["areaId"]]["name"]["es"] if sub else None,
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(len(out), {t: sum(1 for x in out if x["t"] == t) for t in ("boss", "archi", "otro")},
          f"{len(urls)} images in {IMG_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
