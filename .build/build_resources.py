"""Build the items each step needs from Sandglass's own resource lists.

torrentearcano lists, per step, only what you have to gather: base resources,
equipment, consumables, souls and creatures. Crafted intermediates and quest
drops are already left out. Step "0" holds what the prerequisites need.

Reads  : .build/lists/torrentearcano.json (written by import_guide.py)
Checks : .build/lists/compilado.txt, the page's own compiled list
Writes : src/data/resources.json and the item images in public/img/items/
Run    : python3 -I .build/build_resources.py

resources.json:
  items: {key: {name, img, type, lvl}}   key = DofusDB id, or "x:<slug>" if unknown
  steps: {step: [row]}                    row = {k, c, g, a}
    k  row key (what "conseguido" is stored under)
    c  category: recursos | consumibles | equipables | almas | criaturas | cosmeticos
    g  group label for rows only some players need, or null
    a  alternatives: [[item key, qty], ...]; usually just one
    p  in step 0 only: the prerequisite (steps.js id) the item is spent on
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
from build_assets_js import mirror  # noqa: E402

SOURCE = ROOT / "lists" / "torrentearcano.json"
COMPILED = ROOT / "lists" / "compilado.txt"
CACHE = ROOT / "data" / "item_lookup_cache.json"
OUT = ROOT.parent / "src" / "data" / "resources.json"
API = "https://api.dofusdb.fr/"

CATEGORY = {"Recursos": "recursos", "Consumibles": "consumibles", "Equipables": "equipables",
            "Almas": "almas", "Criaturas": "criaturas", "Cosméticos": "cosmeticos"}
# Mistakes in the page's lists, confirmed by players. Applied to the per-step data
# and to the compiled list alike, so the check still compares like with like.
CORRECTIONS = {
    "Hoja de kalipto": "Flor de kalipto",   # no such leaf exists; the guide means the flower
}
# Names that differ from DofusDB's Spanish name
ALIASES = {
    "jalabola dedicada a bonta": 26059,     # "Jalabola dedicada de Bonta"
    "jalabola dedicada a brakmar": 26061,   # "Jalabola dedicada de Brakmar"
    "pocima sesamobolizante": 10204,        # "Pócima de sesamobolizante"
}
LINE = re.compile(r"^(\d+) x (.+)$")
NOTE = re.compile(r"\s*\(([^)]*)\)\s*")
# Same rules as the page's compiled list (buildCompiledResourcesData): these are kept
# after use, so two steps asking for one still need just one.
REUSABLE = {"mazorrasombrero", "varita pitusa", "piedra de alma mediana",
            "calzoncillo de repuesto de capitan chafer"}
# The page lists what the prerequisites need without saying which one asks for it.
# Item -> prerequisite id (PREREQS_LOGROS in steps.js), from the objectives of each
# prerequisite's quests in DofusDB (need.generated.items). Casco and Alas de madera
# are for the cannon to the island of Moon in "Ida sin vuelta" (Pan Koko Mío): it only
# asks to carry them, so DofusDB has no objective for them; torrentearcano's guide to
# that quest says so. Completing the prerequisite counts its items as spent.
PREREQ_OF = {
    "399": "l4", "429": "l4", "1002": "l4", "2551": "l4",      # El gran Guarrok
    "2553": "l4", "2617": "l4", "2618": "l4", "8759": "l4",
    "1019": "l8", "1021": "l8",                                 # Pan Koko Mío
    "7904": "l6",                                               # El cementerio primitivo
    "421": "l11", "885": "l11",                                 # El despertar de Pandala
    "1455": "l7", "1456": "l7", "1457": "l7", "1458": "l7",     # Intrusión en el territorio wabbit
}
# Rows the page lists twice. Step -> {item: why}. Dropped after the check against the
# compiled list, which counts them twice too. Checked against each quest's guide on
# torrentearcano and DofusDB's objectives and recipes.
DUPLICATES = {
    # "El receptáculo de los dofus" asks to do the quest that opens Pandala: that is
    # "El despertar de Pandala", already prerequisite l11. Its "Suero contra la
    # pandrista" takes 50 Ortiga and 5 Lana de jalatín negro, listed in step 0 for l11.
    "1": {"421": "prerrequisito l11", "885": "prerrequisito l11"},
}
# Rows the page leaves out: what an optional prerequisite asks for. Step -> [(category,
# label shown with the item, prerequisite id, item name, qty)]. "Escaeroplano de alta
# velocidad" (Altos vuelos, optional) takes the upgraded hat and wings (DofusDB's
# objectives and torrentearcano's guide to that quest), not the plain ones.
EXTRA = {
    "0": [("Equipables", "Opcional · Altos vuelos", "l10", "Casco mejorado", 1),
          ("Equipables", "Opcional · Altos vuelos", "l10", "Alas de madera mejoradas", 1)],
}
# Only needed if the alteration is gone: listed in its step, left out of totals.
OPTIONAL = re.compile(r"elixir de los barquerontes.*no es necesario", re.I)


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
            if row.get("x"):
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
                        items[key] = {"name": hit["name"],
                                      "img": f"items/{hit['iconId']}.png" if hit["iconId"] else None,
                                      "type": hit["type"] or "", "lvl": hit["lvl"] or 0}
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
                if OPTIONAL.search(text):
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
            items[key] = {"name": hit["name"], "img": f"items/{hit['iconId']}.png" if hit["iconId"] else None,
                          "type": hit["type"] or "", "lvl": hit["lvl"] or 0}
            steps[n].append({"k": f"{key}@{slug(label)}", "c": category(group)[0], "g": label,
                             "a": [[key, qty]], "p": prereq})
            print(f"paso {n}: con {hit['name']} ×{qty} ({label})")
    CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))

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
