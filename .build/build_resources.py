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
       (Silvestre) and the page's "Opcional" group (Hielos, step 65)
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
            "Almas": "almas", "Criaturas": "criaturas", "Cosméticos": "cosmeticos"}
CORRECTIONS = D.CORRECTIONS  # per Dofus, in .build/dofus/<id>.py
ALIASES = D.ALIASES  # per Dofus, in .build/dofus/<id>.py
LINE = re.compile(r"^(\d+) x (.+)$")
NOTE = re.compile(r"\s*\(([^)]*)\)\s*")
REUSABLE = D.REUSABLE  # per Dofus, in .build/dofus/<id>.py
PREREQ_OF = D.PREREQ_OF  # per Dofus, in .build/dofus/<id>.py
DUPLICATES = D.DUPLICATES  # per Dofus, in .build/dofus/<id>.py
MOVED = D.MOVED  # per Dofus, in .build/dofus/<id>.py
EXTRA = D.EXTRA_ITEMS  # per Dofus, in .build/dofus/<id>.py
OPTIONAL = D.OPTIONAL_ITEM  # per Dofus, in .build/dofus/<id>.py
# The page's group for what nothing on the route needs (Hielos, step 65: the key of the
# Forjafría de Mizz Frizz). Its rows are listed apart and left out of the totals
OPTIONAL_GROUP = "Opcional"
# DofusDB's type for items only quests use. One with a recipe cannot be bought: you
# craft it from what you gather, so the step lists that instead
QUEST_ITEM = "Recurso de misión"


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
    m = re.match(r"^(.+) - Recursos$", label)
    if m:
        return "recursos", f"Orden {m.group(1)}"
    raise SystemExit(f"categoría desconocida: {label}")


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
            section = line
            continue
        want_key = (section, " o ".join(n for _, n in parse_entry(line)))
        want[want_key] = want.get(want_key, 0) + parse_entry(line)[0][0]
    got = {}
    for rows in steps.values():
        for row in rows:
            # The elixir is out of the page's compiled list; the "Opcional" group is in it
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


def main():
    source = json.loads(SOURCE.read_text())
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    items, steps, missing = {}, {}, set()
    for n, groups in source["resources"].items():
        rows = []
        for group in groups:
            cat, label = category(group["category"])
            for text in group["items"]:
                alts, names, notes = [], [], []
                for q, raw in parse_entry(text):
                    name, note = split_note(raw)
                    if note:
                        notes.append(note)
                    hit = lookup(name, cache)
                    if hit:
                        key = str(hit["id"])
                        items[key] = item_info(hit)
                    else:
                        key = "x:" + slug(name)
                        items[key] = {"name": name, "img": None, "type": "", "lvl": 0}
                        missing.add(name)
                    alts.append([key, q])
                    names.append(name)
                row_key = "|".join(k for k, _ in alts) + (f"@{slug(label)}" if label else "")
                row = {"k": row_key, "c": cat, "g": label, "a": alts,
                       "src": group["category"], "names": names}
                if notes:
                    row["n"] = "; ".join(notes)
                if slug(names[0]) in REUSABLE:
                    row["r"] = 1
                if OPTIONAL.search(text) or group["category"] == OPTIONAL_GROUP:
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
    for n, (to, move) in MOVED.items():
        steps.setdefault(to, []).extend(row for row in steps[n] if row["k"] in move)
        steps[n] = [row for row in steps[n] if row["k"] not in move]
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
    # "m": the quests each item is for, so the app can say what it is for
    purpose = json.loads(ITEM_QUESTS.read_text()) if ITEM_QUESTS.exists() else {}
    for n, rows in steps.items():
        for row in rows:
            if purpose.get(n, {}).get(row["k"]):
                row["m"] = purpose[n][row["k"]]
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
