"""Match the Dofus's steps against DofusDB achievements, quests, dungeons and bosses.

Reads  : src/dofus/<dofus>/steps.js (STEPS array), .build/data/*.json
Writes : .build/data/<dofus>/step_assets.json  — one entry per step with its resolved assets
         (--dofus <id> or DOFUS; silvestre by default)
Run    : python3 -I .build/match_assets.py
"""
import json
import pathlib
import re
import sys
import unicodedata
from difflib import SequenceMatcher

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
D = dofus.CONFIG
STEP_ASSETS = dofus.WORK / "step_assets.json"
CDN = "https://api.dofusdb.fr"

FUZZY_FLOOR = 0.85
BOSS_MIN_LEN = 3  # "Cil" is a real boss name


def deaccent(s):
    return "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]+", " ", s)).strip()


def load_steps():
    html = (dofus.SRC / "steps.js").read_text()
    body = html.split("const STEPS = [", 1)[1].split("\n];", 1)[0]
    # The text is a JSON string; base, marks, closes… may follow it on the same line
    pattern = re.compile(
        r'\{\s*n:\s*(\d+),\s*zone:\s*"(.*?)",\s*effort:\s*"(\w+)",\s*text:\s*("(?:[^"\\]|\\.)*")'
    )
    steps = []
    for line in body.splitlines():
        m = pattern.search(line)
        if m:
            steps.append({
                "n": int(m[1]),
                "zone": m[2],
                "effort": m[3],
                "text": json.loads(m[4]),
            })
    return steps


def index_by_es(rows, key=lambda r: r["name"]["es"]):
    out = {}
    for r in rows:
        try:
            n = norm(key(r))
        except (KeyError, TypeError):
            continue
        if n:
            out.setdefault(n, r)
    return out


achievements = json.loads((DATA / "achievements.json").read_text())
bosses = json.loads((DATA / "bosses.json").read_text())
dungeons = json.loads((DATA / "dungeons.json").read_text())
quests = json.loads((DATA / "quests.json").read_text())

ACH = index_by_es(achievements)
QUEST = index_by_es(quests)
DUNGEON = index_by_es(dungeons)
BOSS_BY_ID = {b["id"]: b for b in bosses}
BOSS = index_by_es(bosses)


def lookup(query, table):
    """Exact match, then a conservative fuzzy fallback."""
    q = norm(query)
    if not q:
        return None, 0.0
    if q in table:
        return table[q], 1.0
    best, score = None, 0.0
    for k, v in table.items():
        r = SequenceMatcher(None, q, k).ratio()
        if r > score:
            best, score = v, r
    return (best, round(score, 2)) if score >= FUZZY_FLOOR else (None, 0.0)


# Candidate names inside a step's text.
QUOTED = re.compile(r'["«]([^"«»]{3,80})["»]')
MISSION = re.compile(r"[Mm]isi[oó]n(?:es)?\s*:\s*([^.;\n(]{4,80})")
# Several in a row, "Misión: La pesca de Mel, Misión: Mel odiosa, …" (step 29): one
# MISSION match takes them all, so it is split at each "Misión:"
NEXT_MISSION = re.compile(r",?\s*[Mm]isi[oó]n(?:es)?\s*:\s*")
# A quest the guide requires without the colon: "Se debe hacer la misión Flovoración en
# algún punto de esta" (step 100). Only "se debe hacer": "se puede lanzar la misión La
# sombra del reino" (step 38) is optional and stays out
MUST_MISSION = re.compile(r"[Ss]e debe hacer la misi[oó]n\s+([^:.;\n(]{4,80})")
DUNGEON_WORD = re.compile(r"mazmorra\s+([^,.;\n(]{3,60})", re.I)


def assets_for(step):
    text = step["text"]
    found, seen = [], set()

    def add(kind, rec, raw, score, img):
        key = (kind, rec["id"])
        if key in seen:
            return
        seen.add(key)
        found.append({
            "kind": kind,
            "id": rec["id"],
            "name": rec["name"]["es"],
            "matched_on": raw.strip(),
            "score": score,
            "img": img,
        })

    # 1. Quoted names: achievements first, then quests.
    for raw in QUOTED.findall(text):
        cleaned = raw.rstrip(". ")
        rec, score = lookup(cleaned, ACH)
        if rec:
            add("achievement", rec, raw, score, rec["img"])
            continue
        rec, score = lookup(cleaned, QUEST)
        if rec:
            add("quest", rec, raw, score, None)

    # 2. Unquoted "Misión: X" names.
    for raw in [r for m in MISSION.findall(text) for r in NEXT_MISSION.split(m)]:
        parts = [p for p in raw.split(",") if p.strip()]
        candidates = [raw] + [",".join(parts[:i]) for i in range(len(parts), 0, -1)]
        for cand in candidates:
            rec, score = lookup(cand, QUEST)
            if rec:
                add("quest", rec, cand, score, None)
                break

    # 2b. "Se debe hacer la misión X …": the longest run of words that names a quest
    for raw in MUST_MISSION.findall(text):
        words = raw.split()
        for i in range(len(words), 0, -1):
            rec, score = lookup(" ".join(words[:i]), QUEST)
            if rec and score == 1.0:
                add("quest", rec, " ".join(words[:i]), score, None)
                break

    # 3. Dungeons, plus the boss sprite they resolve to.
    for raw in DUNGEON_WORD.findall(text):
        rec, score = lookup(raw, DUNGEON)
        if rec:
            boss = BOSS_BY_ID.get((rec.get("bosses") or [None])[0])
            add("dungeon", rec, raw, score, boss["img"] if boss else None)

    # 4. Boss names mentioned anywhere (long names only, to avoid false hits).
    flat = deaccent(text)
    for key, boss in BOSS.items():
        if len(key) < BOSS_MIN_LEN:
            continue
        pattern = rf"\b{re.escape(deaccent(boss['name']['es']))}\b"
        m = re.search(pattern, flat, re.IGNORECASE)
        if m and m.group(0)[0].isupper():
            add("boss", boss, m.group(0), 1.0, boss["img"])

    return found


def main():
    steps = load_steps()
    report = [{**s, "assets": assets_for(s)} for s in steps]
    STEP_ASSETS.parent.mkdir(parents=True, exist_ok=True)
    STEP_ASSETS.write_text(
        json.dumps(report, ensure_ascii=False, indent=1)
    )

    with_img = [r for r in report if any(a["img"] for a in r["assets"])]
    with_any = [r for r in report if r["assets"]]
    kinds = {}
    for r in report:
        for a in r["assets"]:
            kinds[a["kind"]] = kinds.get(a["kind"], 0) + 1

    print(f"pasos           : {len(steps)}")
    print(f"con algún match : {len(with_any)} ({len(with_any) * 100 // len(steps)}%)")
    print(f"con imagen      : {len(with_img)} ({len(with_img) * 100 // len(steps)}%)")
    print(f"assets por tipo : {kinds}")
    missing = [r for r in report if not r["assets"]]
    if missing:
        print("\n-- sin ningún match --")
        for r in missing:
            print(f'  {r["n"]:3} [{r["zone"]}] {r["text"][:95]}')
    no_img = [r for r in with_any if not any(a["img"] for a in r["assets"])]
    if no_img:
        print("\n-- match sin imagen (solo quest) --")
        for r in no_img:
            print(f'  {r["n"]:3} {[a["name"] for a in r["assets"]]}')


if __name__ == "__main__":
    main()
