"""Audit the items each step asks for against what its quests really need.

For every step it compares the checklist (src/data/resources.json, from the
torrentearcano page) with two sources:
  - DofusDB: each objective of the step's quests that consumes items ("Entrégale",
    "Fabrica"), with the quantities DofusDB generates (need.generated). Crafted
    items are expanded through their recipes down to what you gather, which is
    what the checklist lists.
  - torrentearcano: the "Necesitarás" of each quest's own guide page.

Usage:
  python3 -I .build/audit_resources.py            all steps
  python3 -I .build/audit_resources.py 1 5-8      some steps

Reads  : src/data/{resources,quests,guides}.json, .build/data/quests.json
Caches : .build/data/ta_needs.json (guide pages), .build/data/recipes.json
Writes : .build/lists/item_quests.json when it checks every step: {step: {row key:
         [quest names]}}, the quests that use each item up (build_resources.py
         shows it with the item: "para qué misión es")
Prints, per step:
  ✓ item qty   explained by a quest (DofusDB or its guide)
  ≠ item qty   explained, but the quest asks for another quantity
  ? item qty   no quest of the step asks for it
  = item qty   the prerequisites (step 0) list the same item and quantity
  + item qty   a quest of the step consumes it and the checklist does not list it
Step 0 (the prerequisites, "0" in the arguments or with no arguments) is checked per
prerequisite against DofusDB alone: each one resolves to its quests (an achievement's,
only the numbered ones when it names them, or a single quest by name), and the items
step 0 ties to it (PREREQ_OF) are compared with what those quests consume.
"""
import html
import json
import pathlib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT.parent / "src" / "data"
DATA = ROOT / "data"
TA_CACHE = DATA / "ta_needs.json"
ITEM_QUESTS = ROOT / "lists" / "item_quests.json"
# Items asked for by a quest the step does not list, only its guide names it.
# Step -> {item key: quest}.
# Also items reviewed by hand that stay where the page puts them though their quest is
# listed in another step: the quest is split across steps.
MANUAL = {
    # "Ver a Dark Vlad y morir... o no" asks to do this one first (torrentearcano)
    "1": {"2268": "Un péndulo para guiar sus pasos", "9318": "Un péndulo para guiar sus pasos",
          "746": "Un péndulo para guiar sus pasos"},
    # The beer of "De la mano" is brewed in the tavern, after step 64 stops at its door
    # and before "Dos alientos" (step 66) lets it go on
    "66": {"1977": "De la mano", "23972": "De la mano", "23179": "De la mano", "7055": "De la mano"},
    # Order 4: "4 de ellas con cuerda de escalada (uno de ellos siendo tú)"
    "78": {"9935": "Aprendizaje: Maestro de los Pergaminos"},
    # "Muerte y renovación" needs "Santísimo poder" done, which step 80 finishes
    "80": {"311": "Muerte y renovación"},
}
RECIPES = DATA / "recipes.json"
API = "https://api.dofusdb.fr/"
# Objectives that use up items: bring (3) and craft (17). "Show" (2) gives nothing away.
CONSUMES = {3, 17}
# Quests that hand over what they then ask for: nothing to gather.
GIVES_ITS_ITEMS = {
    2502: "Empezar bien",  # tutorial of "Con bases sólidas": it gives the ring's ingredients
}
NEED_LINE = re.compile(r"(\d[\d.\s]*)\s*x\s+([^.]+?)\.", re.I)


def norm(text):
    text = unicodedata.normalize("NFD", text.lower())
    return re.sub(r"\s+", " ", "".join(c for c in text if not unicodedata.combining(c))).strip()


def fetch(url, tries=4):
    """One request at a time, with a pause: the site resets bursts of connections."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(tries):
        time.sleep(0.8 * (attempt + 1))
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read().decode("utf-8")
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return ""
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
    raise SystemExit(f"sin respuesta tras {tries} intentos: {url}")


def guide_needs(url, cache):
    """The "Necesitarás" paragraph of a quest's guide page, as plain text."""
    if url not in cache:
        page = re.sub(r"<script.*?</script>|<style.*?</style>", "", fetch(url), flags=re.S)
        text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", page)))
        m = re.search(r"Necesitar[aá]s:(.*?)(?:Recompensas|Recomendaci|Habla con)", text)
        cache[url] = m[1].strip() if m else ""
        TA_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=1))
    return cache[url]


def recipe(item, cache):
    """Ingredients of an item ([[id, qty]]), or [] when it is not crafted."""
    key = str(item)
    if key not in cache:
        data = json.loads(fetch(f"{API}recipes?resultId={item}") or "{}").get("data") or []
        cache[key] = [list(p) for p in zip(data[0]["ingredientIds"], data[0]["quantities"])] if data else []
        RECIPES.write_text(json.dumps(cache))
    return cache[key]


def consumed(quest, recipes, depth=3):
    """{item id: qty} a quest uses up. A crafted item counts as itself and as what it
    takes, since the checklist lists either (equipment as such, potions as resources)."""
    out = {}
    if quest.get("id") in GIVES_ITS_ITEMS:
        return out

    def add(item, qty, level):
        out[item] = out.get(item, 0) + qty
        if level < depth:
            for sub, q in recipe(item, recipes):
                add(sub, q * qty, level + 1)

    for st in quest.get("steps") or []:
        for o in (st or {}).get("objectives") or []:
            if not o or o.get("typeId") not in CONSUMES:
                continue
            gen = o["need"]["generated"]
            for item, qty in zip(gen["items"], gen["quantities"]):
                add(item, qty, 1)
    return out


def ingredients(keys, recipes, depth=3):
    """Everything the listed items are made of: listing the item covers its ingredients."""
    out, todo = set(), [(k, 0) for k in keys]
    while todo:
        key, level = todo.pop()
        if level >= depth or not key.isdigit():
            continue
        for sub, _ in recipe(int(key), recipes):
            out.add(str(sub))
            todo.append((str(sub), level + 1))
    return out


def api_one(collection, name, cache):
    """A DofusDB record by its Spanish name, cached alongside the build's own data."""
    key = f"{collection}:{name}"
    if key not in cache:
        q = urllib.parse.quote(name)
        data = json.loads(fetch(f"{API}{collection}?name.es={q}&$limit=1") or "{}").get("data") or []
        cache[key] = data[0] if data else None
        RECIPES.write_text(json.dumps(cache))
    return cache[key]


def prereq_quests(text, achievements, quests, cache):
    """Quest ids a prerequisite asks for: 'Logro "X", misión 1: …' takes those missions
    of X (all of them without numbers); 'misión "X"' is that quest."""
    m = re.search(r'Logro "([^"]+)"', text)
    if not m:
        name = re.search(r'misión "([^"]+)"', text)[1]
        q = quests.get(norm(name)) or api_one("quests", name, cache)
        return [q["id"]] if q else []
    wanted = [int(n) for n in re.findall(r"misi[oó]n (\d+)", text)]

    def of(ach):
        out = []
        for o in sorted([o for o in ach.get("objectives") or [] if o], key=lambda o: o.get("order", 0)):
            crit = o.get("criterion") or ""
            qf = re.search(r"Qf=(\d+)", crit)
            sub = re.search(r"OA=(\d+)", crit)
            if qf:
                out.append(int(qf[1]))
            elif sub:  # an achievement made of others ("Con bases sólidas")
                inner = achievements.get(int(sub[1])) or json.loads(fetch(f"{API}achievements/{sub[1]}") or "{}")
                out += of(inner)
            else:
                out.append(None)  # not a quest: keeps the numbering
        return out

    ach = next((a for a in achievements.values() if norm(a["name"]["es"]) == norm(m[1])), None) \
        or api_one("achievements", m[1], cache)
    ordered = of(ach) if ach else []
    picked = [ordered[n - 1] for n in wanted if 0 < n <= len(ordered)] if wanted else ordered
    return [q for q in picked if q]


def audit_prereqs(res, raw, recipes, names):
    steps_js = (SRC / "steps.js").read_text()
    block = steps_js.split("export const PREREQS_LOGROS = [", 1)[1].split("];", 1)[0]
    prereqs = re.findall(r'\{ id: "(\w+)", text: "((?:[^"\\]|\\.)*)" \}', block)
    achievements = {a["id"]: a for a in json.loads((DATA / "achievements.json").read_text())}
    by_name = {norm(q["name"]["es"]): q for q in raw.values()}
    rows = res["steps"].get("0", [])
    print("\nPrerrequisitos (DofusDB)")
    for pid, text in prereqs:
        text = json.loads(f'"{text}"')
        ids = prereq_quests(text, achievements, by_name, recipes)
        uses = {}
        for qid in ids:
            quest = raw.get(qid) or json.loads(fetch(f"{API}quests/{qid}") or "{}")
            for item, qty in consumed(quest, recipes).items():
                uses[str(item)] = uses.get(str(item), 0) + qty
        mine = [r for r in rows if r.get("p") == pid]
        label = re.sub(r"\s+", " ", text)[:70]
        print(f"  {pid} · {label} · {len(ids)} misiones")
        for r in mine:
            key, qty = r["a"][0]
            got = uses.get(key)
            mark = "✓" if got == qty else "≠" if got else "?"
            extra = "" if got == qty else f" · DofusDB: {got}" if got else " · ninguna de sus misiones lo consume"
            print(f"    {mark} {names[key]} ×{qty}{extra}")
        listed = {r["a"][0][0] for r in mine}
        covered = listed | ingredients(listed, recipes)
        for key, qty in uses.items():
            if key not in covered and key in names:
                print(f"    + {names[key]} ×{qty} · lo consumen sus misiones y no está en la lista")
        if not ids:
            print("    sin misiones en DofusDB (logro de otro tipo): nada que consumir")


def steps_arg(args):
    wanted = set()
    for a in args:
        lo, _, hi = a.partition("-")
        wanted |= set(range(int(lo), int(hi or lo) + 1))
    return sorted(wanted) or list(range(1, 101))


def main(args):
    res = json.loads((SRC / "resources.json").read_text())
    diary = json.loads((SRC / "quests.json").read_text())
    links = json.loads((SRC / "guides.json").read_text())
    guides = {**links["missions"], **links.get("quests", {})}
    raw = {q["id"]: q for q in json.loads((DATA / "quests.json").read_text())}
    ta = json.loads(TA_CACHE.read_text()) if TA_CACHE.exists() else {}
    recipes = json.loads(RECIPES.read_text()) if RECIPES.exists() else {}
    names = {k: v["name"] for k, v in res["items"].items()}
    by_name = {norm(v): k for k, v in names.items()}
    prereq = {r["k"]: r["a"][0][1] for r in res["steps"].get("0", [])}

    def explain(n):
        """What each quest of step n consumes: {item key: [(qty, quest name, source)]}."""
        why = {}
        for qid in [q for q in diary["STEP_QUESTS"].get(str(n), []) if isinstance(q, int)]:
            name = diary["QUESTS"][str(qid)]["n"]
            for item, qty in consumed(raw.get(qid, {}), recipes).items():
                why.setdefault(str(item), []).append((qty, name, "DofusDB"))
            url = guides.get(name)
            for qty, item_name in NEED_LINE.findall(guide_needs(url, ta) if url else ""):
                key = by_name.get(norm(item_name))
                if key:
                    why.setdefault(key, []).append((int(re.sub(r"\D", "", qty)), name, "guía"))
        return why

    if not args or "0" in args:
        audit_prereqs(res, raw, recipes, names)
        args = [a for a in args if a != "0"]
        if not args and "0" in sys.argv[1:]:
            return
    chosen = steps_arg(args)
    # Every step, to say where an item nobody in its own step asks for really belongs
    every = {n: explain(n) for n in range(1, 101)}

    def elsewhere(key, qty, n):
        hits = [m for m in range(max(1, n - 3), min(100, n + 3) + 1)
                if m != n and any(q == qty for q, _, _ in every[m].get(key, []))]
        return f" · lo piden las misiones del paso {', '.join(map(str, hits))}" if hits else ""

    totals = {"ok": 0, "qty": 0, "unexplained": 0, "prereq": 0, "missing": 0}
    purpose = {}
    for n in chosen:
        rows = res["steps"].get(str(n), [])
        why = every[n]
        # Para qué misión es cada objeto: las que piden esa misma cantidad, si no todas
        for row in rows:
            key, qty = row["a"][0]
            found = why.get(key, [])
            exact = [m for q, m, _ in found if q == qty]
            quests = list(dict.fromkeys(exact or [m for _, m, _ in found]))
            manual = MANUAL.get(str(n), {}).get(key)
            if manual:
                quests = [manual]
            if quests:
                purpose.setdefault(str(n), {})[row["k"]] = quests
        lines = []
        listed = set()
        for row in rows:
            key = row["a"][0][0]
            listed.add(key)
            qty = row["a"][0][1]
            label = f"{names[key]} ×{qty}" + (f" [{row['g']}]" if row.get("g") else "")
            found = why.get(key)
            manual = MANUAL.get(str(n), {}).get(key)
            if manual:
                found = [(qty, manual, "revisado a mano")]
            if prereq.get(row["k"]) == qty:
                lines.append(f"  = {label} · también en los prerrequisitos")
                totals["prereq"] += 1
            if not found:
                lines.append(f"  ? {label} · ninguna misión del paso lo pide{elsewhere(key, qty, n)}")
                totals["unexplained"] += 1
            elif any(q == qty for q, _, _ in found):
                src = next(f"{m} ({s})" for q, m, s in found if q == qty)
                lines.append(f"  ✓ {label} · {src}")
                totals["ok"] += 1
            else:
                asked = "; ".join(f"{m} pide {q} ({s})" for q, m, s in found)
                lines.append(f"  ≠ {label} · {asked}")
                totals["qty"] += 1
        covered = listed | ingredients(listed, recipes)
        for key, found in why.items():
            # Only what the checklist lists elsewhere: quest drops are left out on purpose
            if key in covered or key not in names or not any(s == "DofusDB" for _, _, s in found):
                continue
            q, m, _ = found[0]
            lines.append(f"  + {names.get(key, 'objeto ' + key)} ×{q} · {m} lo consume y no está en la lista")
            totals["missing"] += 1
        if lines:
            print(f"\nPaso {n}")
            print("\n".join(lines))
    print(f"\n{totals}")
    if chosen == list(range(1, 101)):
        ITEM_QUESTS.write_text(json.dumps(purpose, ensure_ascii=False, indent=1) + "\n")
        rows = sum(len(v) for v in purpose.values())
        print(f"item_quests.json: {rows} objetos con su misión")


if __name__ == "__main__":
    main(sys.argv[1:])
