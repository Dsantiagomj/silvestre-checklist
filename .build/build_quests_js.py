"""Resolve each checklist step to the quests it covers, with every quest objective.

This feeds the overlay's quest view: quest name, starting NPC, level, zone,
coordinates, map, and the objectives of each quest stage.

How a step maps to quests:
  * Each achievement's objectives are an ordered list of "quest finished"
    criteria (`Qf=1905`). Sandglass numbers missions the same way: "misión 4"
    is the achievement's 4th objective.
  * "hasta (llegar a) la misión N" takes missions 1..N.
  * Explicit "misión N" references take exactly those.
  * "misión: Nombre", with no number, takes the mission of that name.
  * "(Completo)" or no numbers takes the whole achievement.
  * Quests matched directly by name (kind "quest") are added as they are.
  * Each quest of a step has a kind (STEP_QUEST_KINDS, only the ones that are not
    mandatory): "optional" when the guide says "misión N (opcional pero útil)", and
    "take" for the ones it only asks to have taken (TAKE_ONLY).
  * A quest that starts inside another one the same step lists, and fulfils its
    objectives, is its child (PARENT: parent -> [objective index, children]).
  * What a quest needs finished before it can start (its startCriterion, through
    every quest it needs in turn) is PREREQS: quest -> [route quests]. Finishing a
    quest finishes those; the app counts no other quest done by being behind it.
  * "Alineamiento Bontariano: Misión N" maps to the Bontarian alignment quest
    whose start criterion is `Ps=1&Pa=N-1` (side Bonta, alignment level N-1).
    The step covers the run from the previous alignment step's mission, which
    was left paused, up to N.

Reads  : .build/data/{achievements,quests}.json, .build/data/<dofus>/step_assets.json
Writes : src/dofus/<dofus>/quests.json (STEP_QUESTS, STEP_GROUPS, STEP_QUEST_KINDS, PARENT,
         QUESTS and PREREQS; the app loads it lazily)
Caches : .build/data/lookup_<kind>.json  (names and map positions from the API)
Run    : python3 -I .build/build_quests_js.py   (after match_assets.py; --dofus <id> or DOFUS,
         silvestre by default)
"""
import json
import pathlib
import re
import sys
import unicodedata
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
D = dofus.CONFIG
OUT_JSON = dofus.SRC / "quests.json"
# What each step asks for, as the step card draws it (small, loaded with the page)
OUT_PLANS = dofus.SRC / "plans.json"
ASSETS_JSON = dofus.SRC / "assets.json"
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


MISSING_OBJECTIVES = D.MISSING_OBJECTIVES  # per Dofus, in .build/dofus/<id>.py

STEP_EXTRA = D.STEP_EXTRA  # per Dofus, in .build/dofus/<id>.py

SUBQUESTS = D.SUBQUESTS  # per Dofus, in .build/dofus/<id>.py

STEP_SKIP = D.STEP_SKIP  # per Dofus, in .build/dofus/<id>.py


QUEST_AFTER = D.QUEST_AFTER  # per Dofus, in .build/dofus/<id>.py

QUEST_BEFORE = D.QUEST_BEFORE  # per Dofus, in .build/dofus/<id>.py


def after_requirements(ids):
    """The step's quests with each one of QUEST_AFTER right after the one it needs, and
    each one of QUEST_BEFORE right before the one that needs it."""
    out = list(ids)
    for q, first in QUEST_AFTER.items():
        if q in out and first in out and out.index(q) < out.index(first):
            out.remove(q)
            out.insert(out.index(first) + 1, q)
    for q, then in QUEST_BEFORE.items():
        if q in out and then in out and out.index(q) != out.index(then) - 1:
            out.remove(q)
            out.insert(out.index(then), q)
    return out


OBJECTIVE_ORDER = D.OBJECTIVE_ORDER  # per Dofus, in .build/dofus/<id>.py

# An objective any of several quests completes is no single quest: it becomes one
# generic row instead of the first match. The one per class in "Un ciudadano modelo"
# (objective 5371) is CLASS_QUEST; any other gets "alt:<achievement>:<objective>"
# ("Prólogo invernal" in "Un alma helada", one quest per alignment).
CLASS_QUEST = "clase"
CLASS_OBJECTIVE = 5371


def alt_id(ach, objective):
    return CLASS_QUEST if objective["id"] == CLASS_OBJECTIVE else f"alt:{ach['id']}:{objective['id']}"


def is_alt(q):
    return isinstance(q, str) and q.startswith("alt:")


def alternatives_of(ach):
    """{alt id: (objective name, [quest ids])} for the achievement's generic rows."""
    out = {}
    for o in [o for o in (ach.get("objectives") or []) if o]:
        alternatives = re.findall(r"Qf=(\d+)", o.get("criterion") or "")
        if len(alternatives) > 1 and o["id"] != CLASS_OBJECTIVE:
            out[alt_id(ach, o)] = ((o.get("name") or {}).get("es") or "", [int(q) for q in alternatives])
    return out


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
        out.append(alt_id(ach, o) if len(alternatives) > 1 else int(alternatives[0]) if alternatives else None)
    return out


UNTIL = re.compile(r"hasta\s+(?:llegar\s+a\s+)?la\s+misi[oó]n\s+(\d+)", re.I)
# "misión 4", "misión 4: Nombre" or, with no number, "misión: Birk, hija de Bork." (step 83)
MENTION = re.compile(r"misi[oó]n(?:es)?(?:\s+(\d+))?(\s*:\s*\"?)?", re.I)
# Names the guide misspells, as DofusDB writes them (per Dofus, in .build/dofus/<id>.py)
MISSION_TYPOS = D.MISSION_TYPOS
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


TAKE_ONLY = D.TAKE_ONLY  # per Dofus, in .build/dofus/<id>.py

OPTIONAL_EXTRA = D.OPTIONAL_EXTRA  # per Dofus, in .build/dofus/<id>.py


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
    for q in OPTIONAL_EXTRA.get(step["n"], []):
        if q in ids:
            kinds[str(q)] = "optional"
    return kinds


IN_TEXT_ORDER = D.IN_TEXT_ORDER  # per Dofus, in .build/dofus/<id>.py


def plain(text):
    """Lowercase words without accents or punctuation: "Frío… caliente…" and DofusDB's
    "Frío... caliente..." read the same, and so do "El SLIP" and "El S.L.I.P."."""
    text = "".join(c for c in unicodedata.normalize("NFD", text.lower()) if not unicodedata.combining(c))
    return " ".join(re.sub(r"[^a-z0-9 ]+", "", re.sub(r"[\s\-–—:,;!¡?¿«»\"“”]+", " ", text)).split())


def named_mission(after, names):
    """The number of the mission whose name `after` starts with (the longest, so "Mel" does
    not take "Mel odiosa"), or None."""
    said = plain(after) + " "
    hits = [(len(plain(name)), i + 1) for i, name in enumerate(names)
            if name and plain(name) and said.startswith(plain(name) + " ")]
    return max(hits)[1] if hits else None


def missions_for(text, start, names=(), in_text_order=False):
    """Mission numbers referenced in the text segment that starts at `start`.

    The segment runs until the next "Logro" mention, so numbers are attributed to
    the achievement they follow. "misión N: Nombre" is the mission of that name among
    `names` (the achievement's, in order) when the guide's number is off (the Hielos one
    counts "Los supervivientes de Frigost" one short from its 8th mission), and N when no
    name matches (a misspelt one). With no number, "misión: Nombre" is the mission of
    that name. Returns None to mean "the whole achievement".
    """
    nxt = LOGRO.search(text, start + 1)
    segment = text[start:nxt.start() if nxt else len(text)]
    for wrong, right in MISSION_TYPOS.items():
        segment = segment.replace(wrong, right)
    until = UNTIL.search(segment)
    if until:
        return list(range(1, int(until[1]) + 1))
    nums, named = [], []
    for m in MENTION.finditer(segment):
        by_name = named_mission(segment[m.end():], names) if m[2] else None
        if m[1]:
            nums.append(by_name or int(m[1]))
        elif by_name:
            named.append(by_name)
    # Mentions by name alone count only where the guide numbers none (step 1 of Hielos
    # numbers its mission and then names the three it may be)
    nums = nums or named
    if in_text_order:
        return list(dict.fromkeys(nums)) or None
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
    src = (dofus.SRC / "steps.js").read_text()
    out = {}
    for line in src.split("export const STEPS = [", 1)[1].split("\n];", 1)[0].splitlines():
        n = re.search(r"\{ n: (\d+),", line)
        if not n:
            continue
        base = re.search(r', base: ("(?:[^"\\]|\\.)*")', line)
        marks = re.search(r", marks: (\[.*?\]\])", line)
        out[int(n[1])] = (json.loads(base[1]) if base else None, json.loads(marks[1]) if marks else [])
    return out


def step_quest_ids(step, achievements, marks, quests):
    """The step's quests in play order: achievements a note says the step includes
    (they are its requirements, so they come first), the achievement it is about (from
    the base text, never from a note), then missions a note names by number ("Logro X,
    misión 2"), then quests matched by name, then the ones the step only has taken."""
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
                names = [quests[q]["name"]["es"] if q in quests else None for q in ordered]
                wanted = missions_for(base, pos, names, step["n"] in IN_TEXT_ORDER)
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
    taken = TAKE_ONLY.get(step["n"], [])
    ids = [q for q in in_order(included) + in_order(main) + extra + named + taken if q]
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
        alts = alternatives_of(ach)
        names = [("Misión de clase" if q == CLASS_QUEST else alts[q][0] if is_alt(q) else quests[q]["name"]["es"])
                 if q in quests or isinstance(q, str) else None for q in ordered]
        nxt = LOGRO.search(base, pos + 1)
        segment = base[pos:nxt.start() if nxt else len(base)]
        wanted = missions_for(base, pos, names)
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
def alignment(criterion):
    """The alignment a quest asks for in its startCriterion (Ps = alignment), or None."""
    parts = set((criterion or "").split("&"))
    if "Ps=1" in parts:
        return "Bonta"
    if "Ps=2" in parts:
        return "Brakmar"
    if {"Ps!1", "Ps!2"} <= parts:
        return "sin alineamiento o neutral"
    return None


def or_list(items):
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " o " + items[-1]


def merged_text(texts):
    """One text for objectives that only differ in a name: "Entrégale a A, B o C: 1 x X"."""
    if len(set(texts)) == 1:
        return texts[0]
    pre = 0
    while all(len(t) > pre for t in texts) and len({t[pre] for t in texts}) == 1:
        pre += 1
    pre = texts[0].rfind(" ", 0, pre) + 1  # whole words
    suf = 0
    while all(len(t) - pre > suf for t in texts) and len({t[-1 - suf] for t in texts}) == 1:
        suf += 1
    while suf and texts[0][len(texts[0]) - suf].isalnum():  # whole words
        suf -= 1
    middles = list(dict.fromkeys(t[pre:len(t) - suf] for t in texts))
    return texts[0][:pre] + or_list(middles) + texts[0][len(texts[0]) - suf:]


def alt_record(name, records, criteria):
    """The generic row for an objective any of several quests completes. Where the
    quests have the same objectives (the three of "Prólogo invernal" only change who
    gets the item), it keeps them, merging the ones that differ; otherwise one
    objective names the quests. If the quests go by alignment, its start says so."""
    labels = [alignment(c) for c in criteria]
    start = {"ali": [[r["n"], label] for r, label in zip(records, labels)]} if all(labels) else None
    flat = [[o for stage in r["s"] for o in stage["o"]] for r in records]
    if len({len(f) for f in flat}) == 1:
        objs = []
        for same in zip(*flat):
            obj = {"k": same[0]["k"], "t": merged_text([o["t"] for o in same])}
            for key in ("m", "x", "y", "a"):  # the place only if it is the same in all
                if key in same[0] and all(o.get(key) == same[0][key] for o in same):
                    obj[key] = same[0][key]
            objs.append(obj)
    else:
        objs = [{"k": "free", "t": "Haz una de estas misiones: " + or_list([r["n"] for r in records])}]
    return {"n": name, "lv": min(r["lv"] for r in records), "st": start, "s": [{"n": "", "o": objs}]}

PLACEHOLDER = re.compile(r"\{(\w+),(\d+)(?:,[^}]*)?\}")


def objective_ids(quest):
    """The quest's objective ids in the order the app shows them (OBJECTIVE_ORDER)."""
    out = []
    for j, st in enumerate([s for s in (quest.get("steps") or []) if s]):
        ids = [o["id"] for o in (st.get("objectives") or []) if o]
        order = OBJECTIVE_ORDER.get((quest["id"], j))
        out += [ids[i] for i in order] if order else ids
    return out


def parents(step_quests, quests):
    """Quests that start inside another one of the same step and fulfil its objectives:
    {parent: [[objective index, [children]], ...]}. DofusDB says it in the child's start:
    "Qa=1786&Qo>11555" (parent 1786 in progress, past its objective 11555: the child
    starts at the next one), "Qa=1909&Qo=13095" (at that objective), "Qo=18502" (the
    objective's quest is the parent) or just "Qa=2406" (from the start). A start with an
    alternative ("|") is no child: "La sombra del reino" can also start once "Esto parece
    el Sur" is finished. Only pairs that some step lists together. A quest the step only
    asks to have taken (TAKE_ONLY) is nobody's mother there: "Se busca: conde Kontatrás"
    needs "Los caminantes blancos" in progress (Qa=1331), both in step 67 of the Hielos,
    but it is done on its own and the other is never done on the route."""
    found = {}
    for n, ids in step_quests.items():
        listed = [q for q in ids if isinstance(q, int)]
        taken = set(TAKE_ONLY.get(int(n), []))
        for child in listed:
            crit = quests[child].get("startCriterion") or ""
            if "|" in crit:
                continue
            parts = [p.strip("()") for p in crit.split("&")]
            qa = next((int(p[3:]) for p in parts if re.fullmatch(r"Qa=\d+", p)), None)
            qo = next((re.fullmatch(r"Qo([=>])(\d+)", p) for p in parts if re.fullmatch(r"Qo[=>]\d+", p)), None)
            for parent in listed:
                if parent == child or parent in taken or (qa and parent != qa):
                    continue
                if qo:
                    objs = objective_ids(quests[parent])
                    if int(qo[2]) not in objs:
                        continue
                    at = objs.index(int(qo[2])) + (qo[1] == ">")
                elif qa:
                    at = 0
                else:
                    continue
                kids = found.setdefault(parent, {}).setdefault(at, [])
                if child not in kids:
                    kids.append(child)
    return {p: [[at, kids] for at, kids in sorted(by.items())] for p, by in sorted(found.items())}


CRITERION_TOKEN = re.compile(r"[()&|]|[^()&|]+")
FINISHED = re.compile(r"Qf=(\d+)|QF>(\d+),0")


def finished_required(criterion, token_of):
    """The quests a start criterion needs finished: `Qf=X` and `QF>X,0` (finished at
    least once). `Qa=` only needs it active and counts for nothing. An "|" needs only
    what every one of its branches needs (the intersection), so "(Qa=1523&Qo>8635)|Qf=1523"
    needs nothing. token_of maps a quest id to the id it counts as (a class quest is
    "clase"), so an "|" of class quests needs "clase". "&" binds tighter than "|"."""
    tokens = CRITERION_TOKEN.findall(criterion or "")
    pos = 0

    def atom():
        nonlocal pos
        tok = tokens[pos]
        pos += 1
        if tok == "(":
            out = either()
            pos += 1  # ")"
            return out
        m = FINISHED.fullmatch(tok.strip())
        return {token_of(int(m[1] or m[2]))} if m else set()

    def both():
        nonlocal pos
        out = atom()
        while pos < len(tokens) and tokens[pos] == "&":
            pos += 1
            out |= atom()
        return out

    def either():
        nonlocal pos
        out = both()
        while pos < len(tokens) and tokens[pos] == "|":
            pos += 1
            out &= both()
        return out

    return either() if tokens else set()


def prerequisites(step_quests, quests, alts, class_quests):
    """Every route row -> the route rows it needs finished before it can start, the
    transitive closure of its start criterion (finished_required) through every quest,
    on the route or not. A generic row ("clase", "alt:...") needs what all of its
    quests need, and a quest that needs one of them needs the row. Only rows with
    something to need: {row: [rows]}, numbers first in order, then the generic ones."""
    route = {q for ids in step_quests.values() for q in ids}
    groups = {k: v for k, v in alts.items() if k in route}
    if "clase" in route:
        groups["clase"] = class_quests
    token = {q: k for k, ids in groups.items() for q in ids}
    token_of = lambda q: token.get(q, q)
    memo, busy = {}, set()

    def closure(row):
        if row in memo:
            return memo[row]
        if row in busy:  # a loop in the data: what is behind it is already counted
            return set()
        busy.add(row)
        if row in groups:
            direct = set.intersection(*[closure(q) for q in groups[row]])
        else:
            direct = finished_required((quests.get(row) or {}).get("startCriterion"), token_of)
        out = set(direct)
        for d in direct:
            out |= closure(d)
        out.discard(row)
        busy.discard(row)
        memo[row] = out
        return out

    order = lambda r: (isinstance(r, str), r if isinstance(r, str) else int(r))
    out = {}
    for row in sorted(route, key=order):
        need = sorted(closure(row) & route, key=order)
        if need:
            out[str(row)] = need
    return out


def main():
    report = json.loads((dofus.WORK / "step_assets.json").read_text())
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
        ids = step_quest_ids(step, achievements, marks, quests)
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
        given = {g for q in ids for g in SUBQUESTS.get(q, [])}
        ids = [x for q in ids if q not in given for x in [q] + SUBQUESTS.get(q, [])]
        ids = after_requirements([q for q in ids if q not in STEP_SKIP.get(step["n"], [])])
        ids = [q for q in ids if q in quests or isinstance(q, str)]
        if ids:
            step_quests[str(step["n"])] = ids
            kinds = step_kinds(step, plan, achievements, ids)
            if kinds:
                step_kinds_out[str(step["n"])] = kinds
    used = sorted({q for ids in step_quests.values() for q in ids if isinstance(q, int)})
    step_groups = quest_groups(step_quests, achievements, images)
    # The generic rows the steps list, and the quests behind them (for their objectives)
    alts = {k: v for a in achievements.values() for k, v in alternatives_of(a).items()}
    used_alts = sorted({q for ids in step_quests.values() for q in ids if is_alt(q)})
    behind = sorted({q for k in used_alts for q in alts[k][1]})

    # Collect everything that needs a name or a position.
    wanted = {k: set() for k in PLACEHOLDER_SOURCE}
    start_maps, subareas = set(), set()
    for qid in used + behind:
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

    def record(qid):
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
        for j, st in enumerate([s for s in (q.get("steps") or []) if s]):
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
            order = OBJECTIVE_ORDER.get((qid, j))
            if order:
                assert sorted(order) == list(range(len(objs))), (qid, j, len(objs))
                objs = [objs[i] for i in order]
            stages.append({"n": ((st.get("name") or {}).get("es") or "").strip(), "o": objs})
        return {
            "n": q["name"]["es"],
            "lv": q.get("levelMin") or 0,
            "st": start,
            "s": stages,
        }

    out_quests = {str(qid): record(qid) for qid in used}
    for aid in used_alts:
        out_quests[aid] = alt_record(alts[aid][0], [record(q) for q in alts[aid][1]],
                                     [quests[q].get("startCriterion") for q in alts[aid][1]])

    # La misión de clase: la da el representante de tu clase tras "Consejo de clase"
    out_quests[CLASS_QUEST] = {
        "n": "Misión de clase",
        "lv": 20,
        "st": None,
        "s": [{"n": "", "o": [{"k": "npc", "t": "Habla con el representante de tu clase: te da la misión de tu clase"}]}],
    }

    payload = lambda o: json.dumps(o, ensure_ascii=False, separators=(",", ":"))
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    parent = parents(step_quests, quests)
    class_quests = [int(q) for a in achievements.values() for o in (a.get("objectives") or [])
                    if o and o["id"] == CLASS_OBJECTIVE for q in re.findall(r"Qf=(\d+)", o.get("criterion") or "")]
    prereqs = prerequisites(step_quests, quests, {k: v[1] for k, v in alts.items()}, class_quests)
    OUT_JSON.write_text(payload({"STEP_QUESTS": step_quests, "STEP_GROUPS": step_groups,
                                    "STEP_QUEST_KINDS": step_kinds_out, "PARENT": parent,
                                    "QUESTS": out_quests, "PREREQS": prereqs}) + "\n")
    OUT_PLANS.write_text(payload(plans) + "\n")

    objs = [o for q in out_quests.values() for s in q["s"] for o in s["o"]]
    located = [o for o in objs if o.get("m") or o.get("x") is not None]
    print(f"quests.json      : {OUT_JSON.stat().st_size // 1024} KB")
    print(f"plans.json       : {OUT_PLANS.stat().st_size // 1024} KB, {len(plans)} pasos con tarjeta")
    print(f"pasos con misión : {len(step_quests)}/{D.STEP_COUNT}")
    print(f"pasos agrupados  : {len(step_groups)} (misiones de varios logros)")
    print(f"no obligatorias  : {step_kinds_out}")
    print(f"misiones madre   : {len(parent)} ({sum(len(k) for v in parent.values() for _, k in v)} hijas)")
    print(f"prerrequisitos   : {len(prereqs)} filas ({sum(len(v) for v in prereqs.values())} en total)")
    print(f"misiones         : {len(out_quests)}")
    print(f"objetivos        : {len(objs)} ({len(located)} con ubicación)")
    print(f"con NPC inicial  : {sum(1 for q in out_quests.values() if q['st'] and q['st'].get('npc'))}")
    print(f"marcadores sin resolver: {len(unresolved)} {sorted(set(unresolved))[:8]}")
    missing = [s["n"] for s in report if str(s["n"]) not in step_quests]
    print(f"pasos sin misión : {missing}")


if __name__ == "__main__":
    main()
