"""Resolve each checklist step to the quests it covers, with every quest objective.

This feeds the overlay's quest view: quest name, starting NPC, level, zone,
coordinates, map, and the objectives of each quest stage.

How a step maps to quests:
  * Each achievement's objectives are an ordered list of "quest finished"
    criteria (`Qf=1905`). Sandglass numbers missions the same way: "misión 4"
    is the achievement's 4th objective.
  * "hasta (llegar a) la misión N" takes missions 1..N.
  * Explicit "misión N" references take exactly those.
  * "(Completo)" or no numbers takes the whole achievement.
  * Quests matched directly by name (kind "quest") are added as they are.
  * "Alineamiento Bontariano: Misión N" maps to the Bontarian alignment quest
    whose start criterion is `Ps=1&Pa=N-1` (side Bonta, alignment level N-1).
    The step covers the run from the previous alignment step's mission, which
    was left paused, up to N.

Reads  : .build/data/{step_assets,achievements,quests}.json
Writes : src/data/quests.json (STEP_QUESTS and QUESTS; the app loads it lazily)
Caches : .build/data/lookup_<kind>.json  (names and map positions from the API)
Run    : python3 -I .build/build_quests_js.py   (after match_assets.py)
"""
import json
import pathlib
import re
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
OUT_JSON = ROOT / "src" / "data" / "quests.json"
API = "https://api.dofusdb.fr"

KIND = {
    "QuestObjectiveFreeFormData": "free",
    "QuestObjectiveGoToNpcData": "npc",
    "QuestObjectiveBringItemToNpcData": "bring",
    "QuestObjectiveBringSoulToNpcData": "bring",
    "QuestObjectiveFightMonsterData": "fight",
    "QuestObjectiveMultiFightMonsterData": "fight",
    "QuestObjectiveFightMonstersOnMapData": "fight",
    "QuestObjectiveDiscoverMapData": "map",
    "QuestObjectiveDiscoverSubAreaData": "map",
    "QuestObjectiveCraftItemData": "craft",
}

# Placeholder kind in objective text -> API collection holding its name.
PLACEHOLDER_SOURCE = {
    "npc": "npcs", "item": "items", "monster": "monsters",
    "subarea": "subareas", "alteration": "alterations", "map": "map-positions",
}


# ---------------------------------------------------------------------------
# API lookups, cached per collection so reruns are offline
# ---------------------------------------------------------------------------
def _get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "silvestre/1.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.load(r)


def lookup(collection, ids, extract):
    """Return {id: extract(record)} for ids, fetching only what the cache lacks."""
    cache_file = DATA / f"lookup_{collection.replace('-', '_')}.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    missing = sorted({int(i) for i in ids} - {int(k) for k in cache})
    for i in range(0, len(missing), 40):
        chunk = missing[i:i + 40]
        query = "&".join(f"id[$in][]={x}" for x in chunk)
        for rec in _get(f"{API}/{collection}?$limit=50&{query}")["data"]:
            cache[str(rec["id"])] = extract(rec)
        for x in chunk:  # remember misses too, so they are not refetched forever
            cache.setdefault(str(x), None)
    if missing:
        cache_file.write_text(json.dumps(cache, ensure_ascii=False))
    return {int(k): v for k, v in cache.items() if int(k) in {int(i) for i in ids}}


def es_name(rec):
    name = rec.get("name")
    return name.get("es") if isinstance(name, dict) else name


def map_info(rec):
    return {"x": rec.get("posX"), "y": rec.get("posY"), "sa": rec.get("subAreaId"),
            "n": es_name(rec) or None}


# ---------------------------------------------------------------------------
# Step -> quests
# ---------------------------------------------------------------------------
def achievement_quests(ach):
    """The achievement's quests in mission order (1-based numbering = order + 1)."""
    out = []
    objectives = [o for o in (ach.get("objectives") or []) if o]
    for o in sorted(objectives, key=lambda o: o.get("order", 0)):
        m = re.search(r"Qf=(\d+)", o.get("criterion") or "")
        if m:
            out.append(int(m[1]))
    return out


UNTIL = re.compile(r"hasta\s+(?:llegar\s+a\s+)?la\s+misi[oó]n\s+(\d+)", re.I)
NUMBERED = re.compile(r"misi[oó]n(?:es)?\s+(\d+)", re.I)
LOGRO = re.compile(r"\blogro\b", re.I)


def missions_for(text, start):
    """Mission numbers referenced in the text segment that starts at `start`.

    The segment runs until the next "Logro" mention, so numbers are attributed to
    the achievement they follow. Returns None to mean "the whole achievement".
    """
    nxt = LOGRO.search(text, start + 1)
    segment = text[start:nxt.start() if nxt else len(text)]
    until = UNTIL.search(segment)
    if until:
        return list(range(1, int(until[1]) + 1))
    nums = [int(n) for n in NUMBERED.findall(segment)]
    return sorted(set(nums)) or None


ALIGN_STEP = re.compile(r"Alineamiento\s+Bontariano:\s*Misi[oó]n\s+(\d+)", re.I)
BONTA_CATEGORY = 9


def bonta_missions(quests):
    """Mission number -> quest id for the Bontarian alignment line."""
    out = {}
    for q in quests.values():
        crit = q.get("startCriterion") or ""
        if q.get("categoryId") != BONTA_CATEGORY or not re.search(r"(?:^|&)Ps=1(?:&|$)", crit):
            continue
        m = re.search(r"(?:^|&)Pa=(\d+)(?:&|$)", crit)
        if m:
            out[int(m[1]) + 1] = q["id"]
    return out


def step_quest_ids(step, achievements):
    text = step["text"]
    ids = []
    for a in step["assets"]:
        if a["kind"] == "quest":
            ids.append(a["id"])
        elif a["kind"] == "achievement" and a["id"] in achievements:
            ordered = achievement_quests(achievements[a["id"]])
            pos = text.find(a["matched_on"])
            wanted = missions_for(text, max(pos, 0))
            if wanted is None:
                ids += ordered
            else:
                ids += [ordered[n - 1] for n in wanted if 0 < n <= len(ordered)]
    seen, out = set(), []
    for q in ids:  # keep order, drop repeats
        if q not in seen:
            seen.add(q)
            out.append(q)
    return out


# ---------------------------------------------------------------------------
# Quest -> compact record
# ---------------------------------------------------------------------------
PLACEHOLDER = re.compile(r"\{(\w+),(\d+)(?:,[^}]*)?\}")


def main():
    report = json.loads((DATA / "step_assets.json").read_text())
    achievements = {a["id"]: a for a in json.loads((DATA / "achievements.json").read_text())}
    quests = {q["id"]: q for q in json.loads((DATA / "quests.json").read_text())}

    bonta = bonta_missions(quests)
    prev_align = 1
    step_quests = {}
    for step in report:
        ids = step_quest_ids(step, achievements)
        align = ALIGN_STEP.search(step["text"])
        if align:
            last = int(align[1])
            ids += [bonta[n] for n in range(prev_align, last + 1) if n in bonta]
            prev_align = last
        ids = [q for q in ids if q in quests]
        if ids:
            step_quests[str(step["n"])] = ids
    used = sorted({q for ids in step_quests.values() for q in ids})

    # Collect everything that needs a name or a position.
    wanted = {k: set() for k in PLACEHOLDER_SOURCE}
    start_maps, subareas = set(), set()
    for qid in used:
        q = quests[qid]
        for sp in q.get("startPosition") or []:
            if sp and sp.get("mapId"):
                start_maps.add(sp["mapId"])
            if sp and sp.get("npcId"):
                wanted["npc"].add(sp["npcId"])
        for st in [s for s in (q.get("steps") or []) if s]:
            for o in [o for o in (st.get("objectives") or []) if o]:
                for kind, pid in PLACEHOLDER.findall((o.get("text") or {}).get("es") or ""):
                    if kind in wanted:
                        wanted[kind].add(int(pid))
                m = o.get("map") or {}
                if m.get("subAreaId"):
                    subareas.add(m["subAreaId"])

    names = {k: lookup(PLACEHOLDER_SOURCE[k], ids, map_info if k == "map" else es_name)
             for k, ids in wanted.items() if ids}
    starts = lookup("map-positions", start_maps, map_info)
    subareas |= {v["sa"] for v in starts.values() if v and v.get("sa")}
    subarea_names = lookup("subareas", subareas, es_name)

    unresolved = []

    def resolve(text):
        def sub(m):
            kind, pid = m[1], int(m[2])
            value = names.get(kind, {}).get(pid)
            if kind == "map":
                value = (value or {}).get("n") or (value and f"[{value['x']},{value['y']}]")
            if not value:
                unresolved.append(m[0])
            return value or {"npc": "un PNJ", "item": "un objeto", "monster": "un monstruo"}.get(kind, "?")
        return PLACEHOLDER.sub(sub, text or "")

    out_quests = {}
    for qid in used:
        q = quests[qid]
        start = None
        for sp in q.get("startPosition") or []:
            if not sp:
                continue
            pos = starts.get(sp.get("mapId")) or {}
            start = {
                "npc": names.get("npc", {}).get(sp.get("npcId")),
                "m": sp.get("mapId") or 0,
                "x": pos.get("x"), "y": pos.get("y"),
                "a": subarea_names.get(pos.get("sa")),
            }
            break
        stages = []
        for st in [s for s in (q.get("steps") or []) if s]:
            objs = []
            for o in [o for o in (st.get("objectives") or []) if o]:
                m = o.get("map") or {}
                coords = o.get("coords") or {}
                x = m.get("posX", coords.get("x"))
                y = m.get("posY", coords.get("y"))
                obj = {"k": KIND.get(o.get("className"), "free"),
                       "t": resolve((o.get("text") or {}).get("es"))}
                if o.get("mapId"):
                    obj["m"] = o["mapId"]
                if x is not None and y is not None:  # 0 is a valid coordinate
                    obj["x"], obj["y"] = x, y
                area = subarea_names.get(m.get("subAreaId"))
                if area:
                    obj["a"] = area
                objs.append(obj)
            stages.append({"n": ((st.get("name") or {}).get("es") or "").strip(), "o": objs})
        out_quests[str(qid)] = {
            "n": q["name"]["es"],
            "lv": q.get("levelMin") or 0,
            "st": start,
            "s": stages,
        }

    payload = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(payload({"STEP_QUESTS": step_quests, "QUESTS": out_quests}) + "\n")

    objs = [o for q in out_quests.values() for s in q["s"] for o in s["o"]]
    located = [o for o in objs if o.get("m") or o.get("x") is not None]
    print(f"quests.json      : {OUT_JSON.stat().st_size // 1024} KB")
    print(f"pasos con misión : {len(step_quests)}/100")
    print(f"misiones         : {len(out_quests)}")
    print(f"objetivos        : {len(objs)} ({len(located)} con ubicación)")
    print(f"con NPC inicial  : {sum(1 for q in out_quests.values() if q['st'] and q['st'].get('npc'))}")
    print(f"marcadores sin resolver: {len(unresolved)} {sorted(set(unresolved))[:8]}")
    missing = [s["n"] for s in report if str(s["n"]) not in step_quests]
    print(f"pasos sin misión : {missing}")


if __name__ == "__main__":
    main()
