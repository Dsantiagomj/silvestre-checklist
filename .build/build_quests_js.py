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
  * Each quest of a step has a kind (STEP_QUEST_KINDS, only the ones that are not
    mandatory): "optional" when the guide says "misión N (opcional pero útil)", and
    "take" for the ones it only asks to have taken (TAKE_ONLY).
  * "Alineamiento Bontariano: Misión N" maps to the Bontarian alignment quest
    whose start criterion is `Ps=1&Pa=N-1` (side Bonta, alignment level N-1).
    The step covers the run from the previous alignment step's mission, which
    was left paused, up to N.

Reads  : .build/data/{step_assets,achievements,quests}.json
Writes : src/data/quests.json (STEP_QUESTS, STEP_GROUPS, STEP_QUEST_KINDS and QUESTS;
         the app loads it lazily)
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
# What each step asks for, as the step card draws it (small, loaded with the page)
OUT_PLANS = ROOT / "src" / "data" / "plans.json"
ASSETS_JSON = ROOT / "src" / "data" / "assets.json"
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
# Achievements DofusDB has no objectives for: achievement id -> its quests in order.
# "El fin de la eternidad" (step 79) is the achievement for finishing "La eterna cosecha".
MISSING_OBJECTIVES = {565: [439]}

# Quests a step needs that its text doesn't name, put first. Step 78 is "hasta la misión
# de orden 4": the four order quests of Espíritu de la salvación, each one requiring the
# previous (startCriterion Qf=). Step 80's "Alma máster" requires "La última piedra",
# mission 1 of "Cuatro de seis", which can only start after step 79. Step 89 is the
# order quest 5 of the same line, which requires the 4th (need.quests). Step 12's
# "Espionaje industrial" requires "El maleficio del cofre" (after "Cofrología" and
# "Tesorfanato") and "Las grandes galerías" (startCriterion Qf=).
STEP_EXTRA = {12: [1504, 1505, 1506, 1507], 78: [434, 111, 121, 423], 80: [1782], 89: [1917]}

# An objective any of several quests completes (one per class in "Un ciudadano
# modelo") is no single quest: it becomes one generic row instead of the first match.
CLASS_QUEST = "clase"


def achievement_quests(ach):
    """The achievement's objectives in order, as quest ids (None if not a quest).

    Sandglass numbers missions by their place among all the objectives: in "Seis de
    seis" the first eleven are other achievements, so "misión 13" is the 13th objective.
    """
    if ach["id"] in MISSING_OBJECTIVES:
        return list(MISSING_OBJECTIVES[ach["id"]])
    out = []
    objectives = [o for o in (ach.get("objectives") or []) if o]
    for o in sorted(objectives, key=lambda o: o.get("order", 0)):
        alternatives = re.findall(r"Qf=(\d+)", o.get("criterion") or "")
        out.append(CLASS_QUEST if len(alternatives) > 1 else int(alternatives[0]) if alternatives else None)
    return out


UNTIL = re.compile(r"hasta\s+(?:llegar\s+a\s+)?la\s+misi[oó]n\s+(\d+)", re.I)
NUMBERED = re.compile(r"misi[oó]n(?:es)?\s+(\d+)", re.I)
LOGRO = re.compile(r"\blogro\b", re.I)
INCLUDES = re.compile(r"\bincluye\b", re.I)


OPTIONAL = re.compile(r"misi[oó]n\s+(\d+)\s+\(opcional pero útil\)", re.I)


def optional_missions(text, matched_on):
    """Mission numbers the guide calls "misión N (opcional pero útil)" for the achievement
    named at `matched_on`. Only the full step text says it: the base text drops it."""
    pos = text.find(matched_on)
    if pos < 0:
        return []
    nxt = LOGRO.search(text, pos + 1)
    return [int(n) for n in OPTIONAL.findall(text[pos:nxt.start() if nxt else len(text)])]


# Quests the guide only asks to have taken, not to do. Step 28: "En este punto se debe
# tomar la misión de la Isla de Frigost: Logro "La cantera de hielo", misión 4: Luces y
# sombras. No es necesario hacerla, solo tenerla tomada." Its wording is unique, so it
# is listed by hand instead of parsed.
TAKE_ONLY = {28: [1286]}


def step_kinds(step, plan, achievements, ids):
    """{quest id: kind} for the step's quests that are not mandatory."""
    kinds = {}
    for entry in plan:
        for k in entry.get("opt", []):
            ordered = achievement_quests(achievements[entry["id"]])
            if 0 < k <= len(ordered) and ordered[k - 1] in ids:
                kinds[str(ordered[k - 1])] = "optional"
    for q in TAKE_ONLY.get(step["n"], []):
        if q in ids:
            kinds[str(q)] = "take"
    return kinds


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


def read_marks():
    """Each step's base text and marks (steps.js, written by import_guide.py)."""
    src = (ROOT / "src" / "data" / "steps.js").read_text()
    out = {}
    for line in src.split("export const STEPS = [", 1)[1].split("\n];", 1)[0].splitlines():
        n = re.search(r"\{ n: (\d+),", line)
        if not n:
            continue
        base = re.search(r', base: ("(?:[^"\\]|\\.)*")', line)
        marks = re.search(r", marks: (\[.*?\]\])", line)
        out[int(n[1])] = (json.loads(base[1]) if base else None, json.loads(marks[1]) if marks else [])
    return out


def step_quest_ids(step, achievements, marks):
    """The step's quests in play order: achievements a note says the step includes
    (they are its requirements, so they come first), the achievement it is about (from
    the base text, never from a note), then missions a note names by number ("Logro X,
    misión 2"), then quests matched by name."""
    base, notes = marks.get(step["n"], (None, []))
    base = base or step["text"]
    included, main, extra, named = [], [], [], []
    for a in step["assets"]:
        if a["kind"] == "quest":
            named.append(a["id"])
        elif a["kind"] == "achievement" and a["id"] in achievements:
            ordered = achievement_quests(achievements[a["id"]])
            pick = lambda wanted: [ordered[n - 1] for n in wanted if 0 < n <= len(ordered)]
            pos = base.find(a["matched_on"])
            if pos >= 0:
                wanted = missions_for(base, pos)
                main.append((pos, ordered if wanted is None else pick(wanted)))
                continue
            # Only in a note: the missions it names, or the whole achievement when the
            # note says the step includes it ("Este paso incluye también el logro X").
            # Otherwise it is context ("necesaria para el logro Cuatro de seis", "antes
            # de hacer el logro…") and not part of the step.
            for _, note in notes:
                at = note.find(a["matched_on"])
                if at < 0:
                    continue
                wanted = missions_for(note, at)
                if wanted:
                    extra += pick(wanted)
                elif INCLUDES.search(note[:at]):
                    included.append((at, ordered))
    # Varios logros en un paso: en el orden en que los nombra la guía
    in_order = lambda found: [q for _, qs in sorted(found, key=lambda m: m[0]) for q in qs]
    ids = [q for q in in_order(included) + in_order(main) + extra + named if q]
    seen, out = set(), []
    for q in ids:  # keep order, drop repeats
        if q not in seen:
            seen.add(q)
            out.append(q)
    return out


def step_plan(step, achievements, marks, quests, images):
    """The step card: each achievement the base text names, in order, with all its
    objectives (quest names, None for objectives that aren't quests) and which of them
    the step asks for: "all", "upto" (missions 1..N) or "some" (the numbered ones).
    An alignment step ("Alineamiento Bontariano: Misión 29") is {"t": "align", "n": 29}.
    """
    base, _ = marks.get(step["n"], (None, []))
    base = base or step["text"]
    align = ALIGN_STEP.search(base)
    if align:
        return [{"t": "align", "n": int(align[1])}]
    found = []
    for a in step["assets"]:
        if a["kind"] != "achievement" or a["id"] not in achievements:
            continue
        pos = base.find(a["matched_on"])
        if pos < 0:
            continue
        ach = achievements[a["id"]]
        ordered = achievement_quests(ach)
        names = [("Misión de clase" if q == CLASS_QUEST else quests[q]["name"]["es"]) if q in quests or q == CLASS_QUEST
                 else None for q in ordered]
        nxt = LOGRO.search(base, pos + 1)
        segment = base[pos:nxt.start() if nxt else len(base)]
        wanted = missions_for(base, pos)
        mode = "all" if wanted is None else "upto" if UNTIL.search(segment) else "some"
        entry = {"t": "a", "id": a["id"], "name": ach["name"]["es"], "img": images.get(a["id"]),
                 "m": names, "mode": mode, "on": wanted or []}
        # Las opcionales: el diario las nombra en la nota y quests.json les da su tipo
        opt = optional_missions(step["text"], a["matched_on"])
        if opt:
            entry["opt"] = opt
        found.append((pos, entry))
    return [entry for _, entry in sorted(found, key=lambda f: f[0])]


# The group for quests of no achievement, in a step that mixes them with one's own
OUTSIDE = {"id": 0, "name": {"es": "Fuera del logro"}}


def achievement_img(ach, images):
    """The achievement's icon: the one the step assets use or, for an achievement the
    step text never names, its DofusDB icon when it is already mirrored."""
    if ach is OUTSIDE:
        return None
    if ach["id"] in images:
        return images[ach["id"]]
    img = f"achievements/{ach.get('iconId')}.png"
    return img if (ROOT / "public" / "img" / img).exists() else None


def quest_groups(step_quests, achievements, images):
    """Steps whose quests come from more than one achievement -> [[name, img, count], ...]
    in quest order. Each quest goes to the achievement holding the most quests of the
    step; a quest in none goes to OUTSIDE when the step has an achievement's quests,
    and the class quest joins the group before it (or after it, if it comes first).
    Steps with a single group are left out.
    """
    holders = {}
    for ach in achievements.values():
        for q in achievement_quests(ach):
            if q is not None and q != CLASS_QUEST:
                holders.setdefault(q, []).append(ach)
    out = {}
    for n, ids in step_quests.items():
        weight = {}
        for q in ids:
            for ach in holders.get(q, []):
                weight[ach["id"]] = weight.get(ach["id"], 0) + 1
        owner = [max(holders[q], key=lambda a: weight[a["id"]]) if q in holders else None for q in ids]
        # In a step that mixes an achievement's quests with quests of none (the 21 and
        # "Cómo perder la pluma"), those go in a group of their own
        if any(owner):
            owner = [OUTSIDE if o is None and isinstance(q, int) else o for o, q in zip(owner, ids)]
        for i in range(len(owner)):  # orphans join the previous group...
            if owner[i] is None and i and owner[i - 1]:
                owner[i] = owner[i - 1]
        for i in reversed(range(len(owner))):  # ...or the next one
            if owner[i] is None and i + 1 < len(owner):
                owner[i] = owner[i + 1]
        groups = []
        for ach in owner:
            if groups and ach is not None and groups[-1][3] == ach["id"]:
                groups[-1][2] += 1
            elif ach is not None:
                groups.append([ach["name"]["es"], achievement_img(ach, images), 1, ach["id"]])
        if len(groups) > 1:
            out[n] = [g[:3] for g in groups]
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
    assets = json.loads(ASSETS_JSON.read_text())["STEP_ASSETS"]
    images = {x["id"]: x["img"] for v in assets.values() for x in v.get("achievements", [])}
    plans = {}
    marks = read_marks()
    prev_align = 1
    step_quests, step_kinds_out = {}, {}
    for step in report:
        plan = step_plan(step, achievements, marks, quests, images)
        if plan:
            plans[str(step["n"])] = plan
        ids = step_quest_ids(step, achievements, marks)
        align = ALIGN_STEP.search(step["text"])
        if align:
            last = int(align[1])
            ids += [bonta[n] for n in range(prev_align, last + 1) if n in bonta]
            # La tarjeta dice desde qué misión del alineamiento se sigue
            for entry in plans.get(str(step["n"]), []):
                if entry["t"] == "align":
                    entry["from"] = prev_align
            prev_align = last
        ids = STEP_EXTRA.get(step["n"], []) + [q for q in ids if q not in STEP_EXTRA.get(step["n"], [])]
        ids = [q for q in ids if q in quests or q == CLASS_QUEST]
        if ids:
            step_quests[str(step["n"])] = ids
            kinds = step_kinds(step, plan, achievements, ids)
            if kinds:
                step_kinds_out[str(step["n"])] = kinds
    used = sorted({q for ids in step_quests.values() for q in ids if q != CLASS_QUEST})
    step_groups = quest_groups(step_quests, achievements, images)

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
        positions = [sp for sp in q.get("startPosition") or [] if sp]
        if len(positions) > 1 and "PG=" in (q.get("startCriterion") or ""):
            # One start per class (PG = class): the NPC depends on the player's class
            positions, start = [], {"cls": True}
        elif not positions:
            # No start: it starts on its own; the first NPC to go see stands in for it
            first = next((o for st in q.get("steps") or [] if st for o in st.get("objectives") or [] if o), None)
            if first and first.get("className") == "QuestObjectiveGoToNpcData":
                npc = names.get("npc", {}).get((first.get("parameters") or {}).get("parameter0"))
                if npc:
                    start = {"npc": npc, "m": 0, "x": None, "y": None, "a": None}
        for sp in positions:
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

    # La misión de clase: la da el representante de tu clase tras "Consejo de clase"
    out_quests[CLASS_QUEST] = {
        "n": "Misión de clase",
        "lv": 20,
        "st": None,
        "s": [{"n": "", "o": [{"k": "npc", "t": "Habla con el representante de tu clase: te da la misión de tu clase"}]}],
    }

    payload = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(payload({"STEP_QUESTS": step_quests, "STEP_GROUPS": step_groups,
                                    "STEP_QUEST_KINDS": step_kinds_out, "QUESTS": out_quests}) + "\n")
    OUT_PLANS.write_text(payload(plans) + "\n")

    objs = [o for q in out_quests.values() for s in q["s"] for o in s["o"]]
    located = [o for o in objs if o.get("m") or o.get("x") is not None]
    print(f"quests.json      : {OUT_JSON.stat().st_size // 1024} KB")
    print(f"plans.json       : {OUT_PLANS.stat().st_size // 1024} KB, {len(plans)} pasos con tarjeta")
    print(f"pasos con misión : {len(step_quests)}/100")
    print(f"pasos agrupados  : {len(step_groups)} (misiones de varios logros)")
    print(f"no obligatorias  : {step_kinds_out}")
    print(f"misiones         : {len(out_quests)}")
    print(f"objetivos        : {len(objs)} ({len(located)} con ubicación)")
    print(f"con NPC inicial  : {sum(1 for q in out_quests.values() if q['st'] and q['st'].get('npc'))}")
    print(f"marcadores sin resolver: {len(unresolved)} {sorted(set(unresolved))[:8]}")
    missing = [s["n"] for s in report if str(s["n"]) not in step_quests]
    print(f"pasos sin misión : {missing}")


if __name__ == "__main__":
    main()
