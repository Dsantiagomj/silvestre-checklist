"""Writes public/cosecha/cosecha.json: every soul «La eterna cosecha» (quest 439) asks for.

Each row is one monster, in the quest's own order: name, level, image, whether it is a
dungeon boss (with its dungeon) or an archmonster, and the subarea where it lives.
Run: python3 -I .build/build_cosecha.py
"""
import json
import pathlib
import urllib.request
from concurrent.futures import ThreadPoolExecutor

API = "https://api.dofusdb.fr"
OUT = pathlib.Path(__file__).resolve().parent.parent / "public/cosecha/cosecha.json"


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


def main():
    quest = get("/quests/439?lang=es")
    rows = []
    for step in quest["steps"]:
        for o in step["objectives"]:
            if o["className"] != "QuestObjectiveBringSoulToNpcData":
                continue
            p = o["parameters"]
            dungeons = (o.get("need") or {}).get("generated", {}).get("dungeons") or []
            rows.append({"id": p["parameter1"], "dungeon": dungeons[0] if dungeons else None})
    monsters = many("monsters", [r["id"] for r in rows])
    dungeons = many("dungeons", [r["dungeon"] for r in rows if r["dungeon"]])
    subareas = many("subareas", [m["subareas"][0] for m in monsters.values() if m.get("subareas")])
    out = []
    for r in rows:
        m = monsters[r["id"]]
        d = dungeons.get(r["dungeon"]) if r["dungeon"] else None
        sub = subareas.get(m["subareas"][0]) if m.get("subareas") else None
        out.append({
            "id": r["id"],
            "n": m["name"]["es"],
            "lv": m["grades"][-1]["level"] if m.get("grades") else None,
            "img": m.get("img"),
            "t": "boss" if d or m.get("isBoss") else "archi" if m.get("isMiniBoss") else "otro",
            "d": d["name"]["es"] if d else None,
            "z": sub["name"]["es"] if sub else None,
        })
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(len(out), {t: sum(1 for x in out if x["t"] == t) for t in ("boss", "archi", "otro")})


if __name__ == "__main__":
    main()
