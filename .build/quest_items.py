"""The items each step needs, for a guide whose page lists none (todos).

Sandglass's PDF for the Rush de todos los Dofus lists no items. build_resources.py
builds its list here, step by step, from two sources:
  - A step that repeats a Silvestre step (SAME_AS in .build/dofus/todos.py) takes Torre's
    rows for it from src/dofus/silvestre/resources.json: the page's list, already fixed by
    hand there (CORRECTIONS, MOVED, DUPLICATES, REUSABLE…). FROM_SILVESTRE says which
    Silvestre steps a step takes rows from, and only for which quests when the two steps
    do not cover the same ones.
  - Any other step takes them from its quests in DofusDB (.build/data/quests.json): what
    each objective hands in ("Entrégale", typeId 3: the item and quantity in parameter1
    and parameter2) and what it crafts ("Fabrica", typeId 17: parameter0 and parameter1).
    The Silvestre's rules: a quest item (DofusDB's category 3, "Misiones de mundo", a
    follower, or a "Recurso de misión") with no recipe drops on the way and is not listed;
    one with a recipe, and anything a quest asks to craft, is listed by what it is made of,
    down through the quest items in its recipe, as build_resources.expand_crafted does; what
    the step crafts and then hands in or crafts with counts once.
A quest the guide splits across steps ("hasta tener que pasar X", "hasta la misión N")
gives each step only its part: from where the previous step that lists it left it up to
where this one leaves it (ITEM_STOPS, an index into its objectives as the app shows them,
OBJECTIVE_ORDER applied). Without a stop the step finishes it, and later steps that list
it get nothing of it. A quest a step only takes (STEP_QUEST_KINDS "take") does nothing
there.
"""
import copy

# DofusDB's type for items only quests use (as in build_resources.py)
QUEST_ITEM = "Recurso de misión"
BRING, CRAFT = 3, 17

# DofusDB's categories of item types (item-types, categoryId)
EQUIPMENT, CONSUMABLE, RESOURCE, QUEST, HIDDEN, COSMETIC = 0, 1, 2, 3, 4, 5
# Types the Silvestre's page files apart from their category (src/dofus/silvestre/resources.json):
# mounts and pets are creatures, like the paddock fuel; soul stones and souls are souls
CREATURES = {"Dragopavo", "Mulagua", "Vueloceronte", "Mascota", "Mascotura", "Carburante de cercados"}
SOULS = {"Piedra de alma", "Piedra de alma llena", "Alma de guardián de mazmorra", "Alma de archimonstruo"}


def quest_only(type_name, type_cat):
    """Only quests give it: a quest item (category 3, named after its zone, "Misiones de
    mundo"), a follower (category 4, "Personaje seguidor") or a "Recurso de misión"."""
    return type_cat in (QUEST, HIDDEN) or type_name == QUEST_ITEM


def category(type_name, type_cat):
    """The checklist's category of an item of that type and DofusDB category."""
    if type_name in CREATURES:
        return "criaturas"
    if type_name in SOULS:
        return "almas"
    return {EQUIPMENT: "equipables", CONSUMABLE: "consumibles", COSMETIC: "cosmeticos"}.get(type_cat, "recursos")


def flat_objectives(quest, order):
    """The quest's objectives in one list, stage after stage, without the empty ones and in
    the order the app shows them: order is OBJECTIVE_ORDER, (quest, stage) -> new order. The
    indexes match the app's (build_quests_js.objective_ids), so a stop means the same here."""
    out = []
    for j, stage in enumerate([s for s in (quest.get("steps") or []) if s]):
        objs = [o for o in (stage.get("objectives") or []) if o]
        perm = order.get((quest["id"], j))
        out += [objs[i] for i in perm] if perm else objs
    return out


def portions(step_quests, until, taken):
    """{(step, quest): (start, end) or None}: which objectives of each quest each step that
    lists it does. Steps go in number order; a step goes from where the quest was left up to
    until[(step, quest)] or, without it, to the end (end None): then the quest is finished
    and later steps get None. A pair in taken (only taken there) gets None and moves
    nothing. Entries that are not quest ids ("clase", "alt:…") are skipped."""
    at, out = {}, {}
    for n in sorted(step_quests, key=int):
        for q in step_quests[n]:
            if not isinstance(q, int):
                continue
            key = (int(n), q)
            pos = at.get(q, 0)
            if key in taken or pos is None:
                out[key] = None
                continue
            end = until.get(key)
            out[key] = (pos, end)
            at[q] = end
    return out


def _add(rows, row):
    """rows with row added to the row of the same key: quantities, quests and what crafts it
    added up ("_for": [(job, level)], "_made": how many of it are for crafting)."""
    same = next((r for r in rows if r["k"] == row["k"]), None)
    if not same:
        rows.append(row)
        return
    same["a"] = [[same["a"][0][0], same["a"][0][1] + row["a"][0][1]]]
    mine = same.get("m") or []
    same["m"] = mine + [m for m in row.get("m") or [] if m not in mine]
    if row.get("_made"):
        same["_made"] = same.get("_made", 0) + row["_made"]
        same["_for"] = same.get("_for", []) + [r for r in row["_for"] if r not in same.get("_for", [])]


def ingredients(key, qty, kind, recipe, cat, made, seen=()):
    """[(item, qty, (job, level))]: what crafting qty of key takes, down through the quest
    items of its recipe that have one. What the step crafted before (made) is not made
    again; a quest item with no recipe drops on the way."""
    rec = recipe(key)
    out = []
    for sub, q in rec["i"]:
        sub = str(sub)
        if sub in made:
            continue
        if quest_only(kind(sub), cat(kind(sub))):
            if recipe(sub) and sub not in seen:
                out += ingredients(sub, q * qty, kind, recipe, cat, made, seen + (key,))
            continue
        out.append((sub, q * qty, (rec["job"], rec["lvl"])))
    return out


def quest_rows(quest, objs, start, end, kind, recipe, cat, made):
    """The rows one quest gives a step: what objs[start:end] hand in and craft. kind(key) is
    the DofusDB type name of an item, recipe(key) its recipe or None, cat(type name) the
    DofusDB category of that type; made holds what the step has crafted so far, and gets
    what this quest crafts. A row is {k, c, g, a, m}; one that is for crafting something
    carries "_for" and "_made" until finish() turns them into its note."""
    crafted = {str(o["parameters"]["parameter0"]) for o in objs if o.get("typeId") == CRAFT}
    rows = []
    name = quest["name"]["es"]

    def add(key, qty, need=None):
        row = {"k": key, "c": category(kind(key), cat(kind(key))), "g": None, "a": [[key, qty]], "m": [name]}
        if need:
            row["_made"], row["_for"] = qty, [need]
        _add(rows, row)

    for o in objs[start:end]:
        p = o.get("parameters") or {}
        if o.get("typeId") == CRAFT:
            key, qty = str(p["parameter0"]), p["parameter1"]
            if recipe(key):
                for sub, q, need in ingredients(key, qty, kind, recipe, cat, made):
                    add(sub, q, need)
            else:
                add(key, qty)
            made.add(key)
        elif o.get("typeId") == BRING:
            key, qty = str(p["parameter1"]), p["parameter2"]
            # Crafted by the quest or earlier in the step: the craft is the row
            if key in crafted or key in made:
                continue
            if not quest_only(kind(key), cat(kind(key))):
                add(key, qty)
            # A quest item: what it is made of, or nothing if it drops on the way
            elif recipe(key):
                for sub, q, need in ingredients(key, qty, kind, recipe, cat, made):
                    add(sub, q, need)
    return rows


def finish(rows):
    """The rows with what crafts them as their note, as expand_crafted writes it: "Para
    fabricar con manitas nivel 100", or "10 para fabricar con …" when the step also asks
    for the item itself. "Base" is no job: "Para fabricar"."""
    out = []
    for row in rows:
        row = dict(row)
        made, need = row.pop("_made", 0), row.pop("_for", [])
        if need:
            jobs = " y ".join(f"{job.lower()} nivel {lvl}" for job, lvl in need if job != "Base")
            why = "fabricar con " + jobs if jobs else "fabricar"
            row["n"] = f"Para {why}" if made == row["a"][0][1] else f"{made} para {why}"
        out.append(row)
    return out


def silvestre_rows(sources, silvestre):
    """Copies of the Silvestre's rows a step takes. sources is {Silvestre step: None (all of
    its rows) or [selectors]}: a selector is a quest name, which takes the rows that are only
    for selected quests (a row for two quests goes where both are done), or an item key,
    which takes that row (one the page ties to no quest)."""
    rows = []
    for s, wanted in sources.items():
        for row in silvestre["steps"].get(str(s), []):
            m = set(row.get("m") or [])
            if wanted is None or row["k"] in wanted or (m and m <= set(wanted)):
                rows.append(copy.deepcopy(row))
    return rows


def derive(step_quests, raw, order, until, taken, sources, only, silvestre, kind, recipe, cat):
    """{step: rows} for every step that needs something. step_quests is STEP_QUESTS, raw the
    DofusDB quests by id, order OBJECTIVE_ORDER, until ITEM_STOPS, taken the (step, quest)
    pairs only taken, sources FROM_SILVESTRE (step -> {Silvestre step: selectors or None}),
    only the steps whose rows all come from there (the ones that repeat a Silvestre step).
    The quests a step takes from the Silvestre give no rows of their own, but still count
    for where the next step that lists them starts."""
    parts = portions(step_quests, until, taken)
    out = {}
    for n in sorted(step_quests, key=int):
        step = int(n)
        src = sources.get(step) or {}
        covered = {name for q in src.values() if q for name in q}
        rows = silvestre_rows(src, silvestre)
        made = set()
        for q in step_quests[n]:
            part = parts.get((step, q)) if isinstance(q, int) else None
            if part is None or q not in raw or step in only or raw[q]["name"]["es"] in covered:
                continue
            for row in quest_rows(raw[q], flat_objectives(raw[q], order), *part, kind, recipe, cat, made):
                _add(rows, row)
        if rows:
            out[step] = finish(rows)
    return out
