"""Build the items each step needs from Sandglass's own resource lists.

torrentearcano lists, per step, only what you have to gather: base resources,
equipment, consumables, souls and creatures. Crafted intermediates and quest
drops are already left out. Step "0" holds what the prerequisites need.
Where it lists a crafted quest item instead (the prototypes of «La desglaciación»,
Silvestre step 26), the step gets its ingredients: see expand_crafted.

Reads  : .build/lists/<dofus>/torrentearcano.json (written by import_guide.py)
Checks : .build/lists/<dofus>/compilado.txt, the page's own compiled list
Caches : .build/data/item_lookup_cache.json (items by name), .build/data/crafts.json
         (the recipes of crafted quest items and their ingredients, by id)
Writes : src/dofus/<dofus>/resources.json and the item images in public/img/items/
Run    : python3 -I .build/build_resources.py   (--dofus <id> or DOFUS; silvestre by default)

resources.json:
  items: {key: {name, img, type, lvl}}   key = DofusDB id, or "x:<slug>" if unknown
  steps: {step: [row]}                    row = {k, c, g, a}
    k  row key (what "conseguido" is stored under)
    c  category: recursos | consumibles | equipables | almas | criaturas | cosmeticos
    g  group label for rows only some players need, or null
    a  alternatives: [[item key, qty], ...]; usually just one
    p  in step 0 only: the prerequisite (steps.js id) the item is spent on
    m  the quests that use it up (from .build/lists/<dofus>/item_quests.json), if known
    n  a note: the page's own ("(amayiro)"), or what crafts it ("Para fabricar con
       manitas nivel 100") when the row comes from a crafted quest item
    x  listed in its step but left out of the totals: the Elixir de los barquerontes
       (Silvestre), the page's "Opcional" group (Hielos, step 65) and its "Hechizos" and
       "Objeto de misión" groups (Nebuloso, steps 5 and 26)
"""
import json
import pathlib
import re
import sys
import unicodedata
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
D = dofus.CONFIG

SOURCE = dofus.LISTS / "torrentearcano.json"
COMPILED = dofus.LISTS / "compilado.txt"
# The quests that use each item up, per step (written by audit_resources.py)
ITEM_QUESTS = dofus.LISTS / "item_quests.json"
CACHE = ROOT / "data" / "item_lookup_cache.json"
CRAFTS = ROOT / "data" / "crafts.json"
OUT = dofus.SRC / "resources.json"
API = "https://api.dofusdb.fr/"

CATEGORY = {"Recursos": "recursos", "Consumibles": "consumibles", "Equipables": "equipables",
            "Almas": "almas", "Criaturas": "criaturas", "Cosméticos": "cosmeticos",
            # The Nebuloso's groups (see NOT_COUNTED and page_entry): the keys are resources
            # like the Hielos ones, which its page lists under "Recursos"
            "Llaves": "recursos", "Alternativas": "recursos", "Hechizos": "recursos",
            "Objeto de misión": "recursos"}
CORRECTIONS = D.CORRECTIONS  # per Dofus, in .build/dofus/<id>.py
ALIASES = D.ALIASES  # per Dofus, in .build/dofus/<id>.py
GENERIC_IMG = D.GENERIC_IMG  # per Dofus, in .build/dofus/<id>.py
LINE = re.compile(r"^(\d+) x (.+)$")
NOTE = re.compile(r"\s*\(([^)]*)\)\s*")
REUSABLE = D.REUSABLE  # per Dofus, in .build/dofus/<id>.py
PREREQ_OF = D.PREREQ_OF  # per Dofus, in .build/dofus/<id>.py
DUPLICATES = D.DUPLICATES  # per Dofus, in .build/dofus/<id>.py
MOVED = D.MOVED  # per Dofus, in .build/dofus/<id>.py
EXTRA = D.EXTRA_ITEMS  # per Dofus, in .build/dofus/<id>.py
CHOSEN_ORDER = D.CHOSEN_ORDER  # per Dofus, in .build/dofus/<id>.py
OPTIONAL = D.OPTIONAL_ITEM  # per Dofus, in .build/dofus/<id>.py
# The page's group for what nothing on the route needs (Hielos, step 65: the key of the
# Forjafría de Mizz Frizz). Its rows are listed apart and left out of the totals
OPTIONAL_GROUP = "Opcional"
# DofusDB's type for items only quests use. One with a recipe cannot be bought: you
# craft it from what you gather, so the step lists that instead
QUEST_ITEM = "Recurso de misión"
# The page's group of one order's resources ("Ojo atento - Recursos")
ORDER_GROUP = re.compile(r"^(.+) - Recursos$")
# Groups the page shows in their step and leaves out of its compiled list (Nebuloso): the
# spell the guide needs, which is not spent, and the quest item of the last step, the Dofus
# de los Vigilantes, which the guide itself hands out. Group -> what the row's note says it is
NOT_COUNTED = {"Hechizos": "Hechizo", "Objeto de misión": "Objeto de misión"}
# A row's choice paid in kamas: "1 x Insignia de maligilante o 30 000 kamas" (Nebuloso,
# "Alternativas"). The item is the row and the kamas its note: DofusDB has no kamas item
KAMAS = re.compile(r" o (\d[\d ]*) kamas$")
# The compiled list's section for a group, where it has a name of its own
COMPILED_SECTIONS = {"Alternativas (elige una opción por línea)": "Alternativas"}


def slug(name):
    """DofusDB slugs are lowercase, accent-free and keep spaces."""
    s = unicodedata.normalize("NFKD", name.replace("’", "'")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s.lower()).strip()


def category(label):
    """"Recursos (misión opcional)" and "Ojo atento - Recursos" are resources for a subset of players."""
    if label in CATEGORY:
        return CATEGORY[label], None
    if label == "Recursos (misión opcional)":
        return "recursos", "Misión opcional"
    if label == OPTIONAL_GROUP:
        return "recursos", "Opcional"
    m = ORDER_GROUP.match(label)
    if m:
        return "recursos", f"Orden {m.group(1)}"
    raise SystemExit(f"categoría desconocida: {label}")


def add_row(rows, row):
    """rows with row added: to the row of the same key if there is one (one item, no
    alternatives), as a new row otherwise."""
    same = next((r for r in rows if r["k"] == row["k"]), None)
    if not same:
        return rows + [row]
    if len(same["a"]) != 1 or len(row["a"]) != 1:
        raise SystemExit(f"no se pueden sumar dos filas con alternativas: {row['k']}")
    same["a"] = [[same["a"][0][0], same["a"][0][1] + row["a"][0][1]]]
    return rows


def keep_order(rows, order):
    """A step's rows without the other orders' groups, where the guide follows one order
    (CHOSEN_ORDER). The chosen order's rows are for every player now: they lose the group
    and its key suffix, and add up with the same item of the step. Rows of no order stay.
    Rows still carry the page's group ("src"). Stops the build if the page has no group of
    that order: it renamed or dropped it."""
    def of(row):
        m = ORDER_GROUP.match(row["src"])
        return m.group(1) if m else None

    if not any(of(row) == order for row in rows):
        raise SystemExit(f"el paso no tiene recursos de la orden {order}")
    out = []
    for row in rows:
        if of(row) is None:
            out = add_row(out, row)
        elif of(row) == order:
            out = add_row(out, {**row, "k": row["k"].split("@")[0], "g": None})
    return out


def move_rows(steps, moved):
    """steps with the rows MOVED takes elsewhere: from -> (to, {key: why}) moves the whole
    row, {key: (qty, why)} only that many (the rest stays). A moved row adds up with the
    same item of its new step. Stops the build if the row is not there, or has less."""
    steps = {n: [dict(r) for r in rows] for n, rows in steps.items()}
    for n, (to, move) in moved.items():
        missing = set(move) - {r["k"] for r in steps[n]}
        if missing:
            raise SystemExit(f"paso {n}: no tiene {', '.join(sorted(missing))} que llevar al paso {to}")
        # In the step's order, as the page lists them
        for row in [r for r in steps[n] if r["k"] in move]:
            what = move[row["k"]]
            qty = what[0] if isinstance(what, tuple) else None
            if qty and (len(row["a"]) != 1 or row["a"][0][1] <= qty):
                raise SystemExit(f"paso {n}: no hay más de {qty} de {row['k']} que llevar al paso {to}")
            if qty:
                row["a"] = [[row["a"][0][0], row["a"][0][1] - qty]]
                part = {**row, "a": [[row["a"][0][0], qty]]}
            else:
                steps[n].remove(row)
                part = row
            steps[to] = add_row(steps.get(to, []), part)
    return steps


def parse_entry(text):
    """"10 x Madera de bambú o 10 x Madera de bambú oscuro" -> [(10, name), (10, name)]."""
    alts = []
    for part in re.split(r" o (?=\d+ x )", text.strip()):
        m = LINE.match(part.strip())
        if not m:
            raise SystemExit(f"línea no reconocida: {text}")
        name = m.group(2).strip()
        alts.append((int(m.group(1)), CORRECTIONS.get(name, name)))
    return alts


def page_entry(group, text):
    """parse_entry for a line of any group, and the note it carries: a spell has no
    quantity ("Captura de almas (requisito, no consumible)", one) and a choice in kamas
    ("… o 30 000 kamas") is the note, not an item."""
    note = None
    kamas = KAMAS.search(text)
    if kamas:
        text, note = text[:kamas.start()], kamas.group(0).strip()
    if group in NOT_COUNTED and not LINE.match(text.strip()):
        text = "1 x " + text
    return parse_entry(text), note


def row_note(group, notes):
    """The row's note: the page's own ones ("amayiro") and, in a group left out of the
    totals, what the row is ("Hechizo: requisito, no consumible"). None without either."""
    text = "; ".join(notes)
    what = NOT_COUNTED.get(group)
    if what:
        return f"{what}: {text}" if text else what
    return text or None


def compiled_section(line):
    """The page group a section of the compiled list adds up."""
    return COMPILED_SECTIONS.get(line, line)


def split_note(name):
    """"Carne rancia (amayiro)" -> ("Carne rancia", "amayiro")."""
    notes = NOTE.findall(name)
    return NOTE.sub(" ", name).strip(), "; ".join(notes)


def get(path, params):
    url = API + path + ("?" + urllib.parse.urlencode(params, safe="[]$^") if params else "")
    req = urllib.request.Request(url, headers={"User-Agent": "silvestre/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def lookup(name, cache):
    key = slug(name)
    if cache.get(key) or (key in cache and key not in ALIASES):
        return cache[key]
    if key in ALIASES:
        hits = [get(f"items/{ALIASES[key]}", {})]
    else:
        hits = get("items", {"slug.es": key, "$limit": 5})["data"]
        if not hits:
            hits = get("items", {"slug.es[$regex]": "^" + re.escape(key), "$limit": 5})["data"]
    found = None
    if hits:
        i = hits[0]
        found = {"id": i["id"], "name": i["name"]["es"], "iconId": i.get("iconId"),
                 "type": ((i.get("type") or {}).get("name") or {}).get("es"),
                 "lvl": i.get("level")}
    cache[key] = found
    return found


def find_item(name, cache, generic=GENERIC_IMG, find=lookup):
    """The DofusDB item of a row's name, or None. A generic row (GENERIC_IMG) is never
    looked up: it names no item, and a prefix search would answer one that only starts
    the same ("Kama" -> "Kama enigmático", Nebuloso)."""
    return None if slug(name) in generic else find(name, cache)


def unknown_item(name, generic=GENERIC_IMG):
    """(key, item) of a name DofusDB lacks: "x:<slug>", with the icon of a representative
    item when the row is a generic one (GENERIC_IMG), else none."""
    key = slug(name)
    return "x:" + key, {"name": name, "img": generic.get(key), "type": "", "lvl": 0}


def item_info(hit):
    return {"name": hit["name"], "img": f"items/{hit['iconId']}.png" if hit["iconId"] else None,
            "type": hit["type"] or "", "lvl": hit["lvl"] or 0}


def craft_recipe(key, crafts):
    """{"i": [[id, qty]], "job", "lvl"} of an item, or None when it is not crafted."""
    if key not in crafts["recipes"]:
        data = get("recipes", {"resultId": key})["data"]
        crafts["recipes"][key] = {
            "i": [list(p) for p in zip(data[0]["ingredientIds"], data[0]["quantities"])],
            "job": data[0]["job"]["name"]["es"], "lvl": data[0]["resultLevel"],
        } if data else None
    return crafts["recipes"][key]


def item_by_id(key, crafts):
    if key not in crafts["items"]:
        i = get(f"items/{key}", {})
        crafts["items"][key] = item_info({"name": i["name"]["es"], "iconId": i.get("iconId"),
                                          "type": ((i.get("type") or {}).get("name") or {}).get("es"),
                                          "lvl": i.get("level")})
    return crafts["items"][key]


def expand_crafted(rows, recipe, kind, name):
    """A step's rows with each crafted quest item (kind QUEST_ITEM, with a recipe)
    replaced by what it is made of, through the crafted quest items of its recipe too:
    quantities multiplied, and added up per ingredient. An ingredient the step already
    lists adds to that row; the others go where the first crafted item was, most first.
    Each says what crafts it (the job and level of the item it is for). recipe(key) ->
    {"i", "job", "lvl"} or None, kind(key) -> type name, name(key) -> item name."""
    def crafted(key):
        return kind(key) == QUEST_ITEM and recipe(key)

    total, need, quests = {}, {}, {}

    def add(key, qty, req, m):
        if crafted(key):
            for sub, q in recipe(key)["i"]:
                add(str(sub), q * qty, req, m)
            return
        total[key] = total.get(key, 0) + qty
        need.setdefault(key, [])
        if req not in need[key]:
            need[key].append(req)
        quests.setdefault(key, [])
        quests[key] += [q for q in m if q not in quests[key]]

    out, at = [], None
    for row in rows:
        key, qty = row["a"][0]
        if len(row["a"]) == 1 and not row.get("r") and crafted(key):
            rec = recipe(key)
            req = (rec["job"].lower(), rec["lvl"])
            for sub, q in rec["i"]:
                add(str(sub), q * qty, req, row.get("m") or [])
            at = len(out) if at is None else at
            continue
        out.append(dict(row))
    if at is None:
        return rows

    def why(key):
        return "fabricar con " + " y ".join(f"{job} nivel {lvl}" for job, lvl in need[key])

    def merge_m(row, key):
        m = list(row.get("m") or [])
        m += [q for q in quests[key] if q not in m]
        if m:
            row["m"] = m

    new = []
    for key in sorted(total, key=lambda k: (-total[k], slug(name(k)))):
        same = next((r for r in out if r["k"] == key and len(r["a"]) == 1 and not r.get("g")), None)
        if same:
            same["a"] = [[key, same["a"][0][1] + total[key]]]
            note = f"{total[key]} para {why(key)}"
            same["n"] = f"{same['n']}; {note}" if same.get("n") else note
            merge_m(same, key)
            continue
        row = {"k": key, "c": "recursos", "g": None, "a": [[key, total[key]]], "n": f"Para {why(key)}"}
        merge_m(row, key)
        new.append(row)
    return out[:at] + new + out[at:]


def check_against_compiled(steps, items):
    """The page's compiled list must equal the sum of every step (prerequisites included)."""
    want = {}
    section = None
    for raw in COMPILED.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line:
            continue
        if not LINE.match(line):
            section = compiled_section(line)
            continue
        alts, _ = page_entry(section, line)
        want_key = (section, " o ".join(n for _, n in alts))
        want[want_key] = want.get(want_key, 0) + alts[0][0]
    got = {}
    for rows in steps.values():
        for row in rows:
            # The elixir, the spell and the quest item are out of the page's compiled list;
            # the "Opcional" group is in it
            if row.get("x") and row["src"] != OPTIONAL_GROUP:
                continue
            # The page counts the alternative underwear as the first option only
            names = row["names"][:1] if slug(row["names"][0]) == "calzoncillo de jefe bwork" else row["names"]
            key = (row["src"], " o ".join(names))
            q = row["a"][0][1]
            got[key] = max(got.get(key, 0), q) if row.get("r") else got.get(key, 0) + q
    diff = {k: (want.get(k), got.get(k)) for k in set(want) | set(got) if want.get(k) != got.get(k)}
    for (sec, name), (w, g) in sorted(diff.items(), key=lambda kv: kv[0][1]):
        print(f"  ≠ {sec} · {name}: lista {w} · pasos {g}")
    print(f"comparado con el compilado: {len(want) - len(diff)}/{len(want)} filas iguales")


def with_quests(steps, purpose):
    """steps with each row's "m", the quests item_quests.json gives its key in its step.
    On the page's rows (listed), before expand_crafted passes a crafted item's quests to
    its ingredients: audit_resources.py labels those same rows."""
    steps = {n: [dict(r) for r in rows] for n, rows in steps.items()}
    for n, rows in steps.items():
        for row in rows:
            if purpose.get(n, {}).get(row["k"]):
                row["m"] = purpose[n][row["k"]]
    return steps


def listed():
    """(steps, items, missing): the page's rows per step, as the checklist keeps them (one
    order, moved, without duplicates, with the extra items) but with the crafted quest items
    still as such, every item they name and the names DofusDB does not know.
    audit_resources.py labels these same rows."""
    source = json.loads(SOURCE.read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    items, steps, missing = {}, {}, set()
    for n, groups in source["resources"].items():
        rows = []
        for group in groups:
            cat, label = category(group["category"])
            for text in group["items"]:
                alts, names, notes = [], [], []
                entry, kamas = page_entry(group["category"], text)
                for q, raw in entry:
                    name, note = split_note(raw)
                    if note:
                        notes.append(note)
                    hit = find_item(name, cache)
                    if hit:
                        key = str(hit["id"])
                        items[key] = item_info(hit)
                    else:
                        key, items[key] = unknown_item(name)
                        if not items[key]["img"]:
                            missing.add(name)
                    alts.append([key, q])
                    names.append(name)
                if kamas:
                    notes.append(kamas)
                row_key = "|".join(k for k, _ in alts) + (f"@{slug(label)}" if label else "")
                row = {"k": row_key, "c": cat, "g": label, "a": alts,
                       "src": group["category"], "names": names}
                if row_note(group["category"], notes):
                    row["n"] = row_note(group["category"], notes)
                if slug(names[0]) in REUSABLE:
                    row["r"] = 1
                if OPTIONAL.search(text) or group["category"] in (OPTIONAL_GROUP, *NOT_COUNTED):
                    row["x"] = 1
                if n == "0":
                    row["p"] = PREREQ_OF.get(alts[0][0])
                    if not row["p"]:
                        print(f"aviso: {names[0]} no tiene prerrequisito en PREREQ_OF")
                rows.append(row)
        steps[n] = rows
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))

    check_against_compiled(steps, items)
    # After the check: the page's compiled list counts every order
    for n, order in CHOSEN_ORDER.items():
        steps[n] = keep_order(steps[n], order)
        print(f"paso {n}: solo los recursos de la orden {order}, sin grupo")
    steps = move_rows(steps, MOVED)
    for n, (to, move) in MOVED.items():
        # A row with alternatives ("13423|6812") is named by its first item
        print(f"paso {n} → {to}: {', '.join(items[k.split('|')[0]]['name'] for k in move)}")
    steps = {n: rows for n, rows in steps.items() if rows}
    for n, drop in DUPLICATES.items():
        steps[n] = [row for row in steps[n] if row["k"] not in drop]
        print(f"paso {n}: sin {', '.join(f'{items[k]["name"]} ({why})' for k, why in drop.items())}")
    for rows in steps.values():
        for row in rows:
            del row["src"], row["names"]
    for n, extra in EXTRA.items():
        for group, label, prereq, name, qty in extra:
            hit = lookup(name, cache)
            if not hit:
                raise SystemExit(f"no está en DofusDB: {name}")
            key = str(hit["id"])
            items[key] = item_info(hit)
            steps[n].append({"k": f"{key}@{slug(label)}", "c": category(group)[0], "g": label,
                             "a": [[key, qty]], "p": prereq})
            print(f"paso {n}: con {hit['name']} ×{qty} ({label})")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return steps, items, missing


def main():
    steps, items, missing = listed()
    # "m": the quests each item is for, so the app can say what it is for
    purpose = json.loads(ITEM_QUESTS.read_text()) if ITEM_QUESTS.exists() else {}
    steps = with_quests(steps, purpose)
    # The crafted quest items, by their ingredients (after the check: the page counts them)
    crafts = json.loads(CRAFTS.read_text()) if CRAFTS.exists() else {"recipes": {}, "items": {}}

    def info(key):
        if key not in items:
            items[key] = item_by_id(key, crafts)
        return items[key]

    for n, rows in steps.items():
        expanded = expand_crafted(rows, lambda k: craft_recipe(k, crafts),
                                  lambda k: info(k)["type"], lambda k: info(k)["name"])
        if expanded is not rows:
            kept = {r["k"] for r in expanded}
            gone = [items[r["k"]]["name"] for r in rows if r["k"] not in kept]
            print(f"paso {n}: {', '.join(gone)} → sus ingredientes")
            steps[n] = expanded
    CRAFTS.write_text(json.dumps(crafts, ensure_ascii=False, indent=1, sort_keys=True))
    # Only what some row lists: the crafted quest items are gone, the bambú pieces never came
    used = {k for rows in steps.values() for row in rows for k, _ in row["a"]}
    items = {k: v for k, v in items.items() if k in used}

    # Imported here: build_assets_js loads the big .build/data tables, which the tests
    # (and CI) don't have
    from build_assets_js import mirror
    results = mirror({it["img"] for it in items.values() if it["img"]})
    failed = {p for p, status in results if status not in ("ok", "cached")}
    for it in items.values():
        if it["img"] in failed:
            it["img"] = None

    OUT.write_text(json.dumps({"items": items, "steps": steps}, ensure_ascii=False,
                              separators=(",", ":")) + "\n")
    rows = sum(len(r) for r in steps.values())
    print(f"resources.json  : {OUT.stat().st_size // 1024} KB · {len(items)} objetos · "
          f"{rows} filas en {len(steps)} pasos")
    print(f"sin imagen      : {sorted(missing)}; descargas fallidas: {sorted(failed)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
