"""Import Sandglass's guide from the torrentearcano checklist page.

The page (https://www.torrentearcano.com/checklist-silvestre) embeds its data in
an inline script: the 100 step texts, the resources each step needs
(resourcesData, step "0" being the prerequisites) and previousStepsByNewStep,
the table the page itself uses to carry progress over from the previous
version of the guide.

Usage:
  curl -sL -A "Mozilla/5.0" -o /tmp/ta/page.html https://www.torrentearcano.com/checklist-silvestre
  python3 -I .build/import_guide.py /tmp/ta/page.html

Writes:
  .build/lists/<dofus>/torrentearcano.json  snapshot of the three structures, versioned
  src/dofus/<dofus>/steps.js                STEPS and PREVIOUS_STEPS blocks only

--dofus <id> (or DOFUS) picks the Dofus, silvestre by default: its source page, step
count and hand-written tables come from .build/dofus/<id>.py.

Each text keeps the page's colour markers as marks: [[RED]] is where to stop
("stop"), [[GREEN]] what gets resolved ("done"). [[BLUE]] mixes several things, so
it is split by what it says (blue_kind): what the step covers ("includes"), tasks the
guide also requires ("must"), advice ("tip") and anything else ("note").
"complete" says the step asks for the whole achievement ("(Completo)", kept out
of the marks). "base" is the text without them, and "closes" lists the earlier steps whose
missions a "done" mark finishes ("se terminan las misiones de los incisos 33
y 34"); steps it only updates ("se actualiza la misión del inciso 53") go in
"updates" instead: the guide picks their mission up there without finishing it. Blue
marks count too, but only when they say it outright ("se termina la misión del inciso
92", "se actualiza la misión del inciso 84", in step 93's notes): advice that names a
step in passing ("un recurso necesario para terminar la misión del inciso 63") does
not. Nor does a step's optional mission ("se termina la misión opcional del inciso 7"):
the step is done without it. CLOSES adds by hand what a step finishes and its text does
not say (step 87 finishes step 73's mission), and UPDATES what it picks up (step 81's
reminder about step 63).

Zone and effort tier are not on the page. A step that maps to a single old step
keeps that step's zone and tier; merged steps take the highest tier; steps
split out of an old one use SPLIT_TIERS.
"""
import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
D = dofus.CONFIG

STEPS_JS = dofus.SRC / "steps.js"
SNAPSHOT = dofus.LISTS / "torrentearcano.json"

TIER_ORDER = ["trivial", "corto", "medio", "largo", "epico"]
SPLIT_TIERS = D.SPLIT_TIERS  # per Dofus, in .build/dofus/<id>.py


def js_value(html, name):
    """Parse the JSON literal assigned to a top-level const."""
    start = html.index(f"{name} = ") + len(name) + 3
    value, _ = json.JSONDecoder().raw_decode(html[start:])
    return value


def js_template_array(html, name):
    """The steps are an array of template literals, not JSON."""
    start = html.index(f"const {name} = [")
    end = html.index("];", start)
    return re.findall(r"`([^`]*)`", html[start:end])


def clean(text):
    """Same form as the existing steps: no colour markers, straight quotes, one line."""
    text = re.sub(r"\[\[/?[A-Z]+\]\]", "", text)
    text = text.replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", text).strip()


MARK_KINDS = {"RED": "stop", "GREEN": "done", "BLUE": "note"}
BLUE_KINDS = [
    ("includes", re.compile(r"\bincluye\b", re.I)),
    ("must", re.compile(r"^(?:en este punto )?se debe\b|^requiere\b", re.I)),
    ("tip", re.compile(r"\bse recomienda\b|^se pueden?\b|\bse pueden? encadenar\b|^(?:se )?aprovecha|^recordatorio\b", re.I)),
]


def blue_kind(text):
    """The first kind whose pattern the text matches; "note" when none does."""
    return next((kind for kind, pattern in BLUE_KINDS if pattern.search(text)), "note")
MARK = re.compile(r"\[\[(RED|GREEN|BLUE)\]\]([\s\S]*?)\[\[/\1\]\]")


def closing_paren(text):
    """Index of the ")" that closes the "(" at position 0, or -1."""
    depth = 0
    for i, c in enumerate(text):
        depth += {"(": 1, ")": -1}.get(c, 0)
        if depth == 0:
            return i
    return -1


COMPLETE = re.compile(r"^\(?Completos?\)?\s*", re.I)


def unwrap(text):
    if text.startswith("(") and closing_paren(text) == len(text) - 1:
        text = text[1:-1].strip()
    return text


def mark_text(raw):
    """A mark on its own: no leading punctuation, no wrapping parentheses and no
    "(Completo)", which is a property of the step (see complete), not advice."""
    text = unwrap(COMPLETE.sub("", unwrap(clean(raw).lstrip(".,; "))))
    return text[:1].upper() + text[1:]


def complete(raw):
    """The step asks for the whole achievement: "(Completo)" in any of its marks."""
    return any(COMPLETE.match(unwrap(clean(body).lstrip(".,; "))) for _, body in MARK.findall(raw))


def marks(raw):
    """In page order; step 43 repeats the same stop for two missions, kept once."""
    out = []
    for kind, body in MARK.findall(raw):
        text = mark_text(body)
        mark = [blue_kind(text) if kind == "BLUE" else MARK_KINDS[kind], text]
        if mark[1] and mark not in out:
            out.append(mark)
    return out


def base(raw):
    text = clean(MARK.sub(" ", raw))
    return re.sub(r"\s+([.,;:])", r"\1", text).strip()


CLAUSE = re.compile(r",\s*(?=(?:y\s+)?se\s)|\.\s+|\s+y\s+(?=se\s)")


# In a blue mark, only a clause that is the statement itself
STATED = re.compile(r"^\(?se\s+(?:terminan?|completan?|actualizan?)\s+las?\s+misi[oó]n(?:es)?\s+de(?:l|\s+los)\s+incisos?\b", re.I)


def clauses(raw):
    """The clauses of the step's "done" marks, and the ones of its blue marks that state
    what the step finishes or updates."""
    for kind, body in MARK.findall(raw):
        if kind == "GREEN":
            yield from CLAUSE.split(clean(body))
        elif kind == "BLUE":
            yield from (c for c in CLAUSE.split(clean(body)) if STATED.match(c))


CLOSES = D.CLOSES  # per Dofus, in .build/dofus/<id>.py


def closes(n, raw):
    """Earlier steps finished by this step's marks (not their optional missions), and
    the ones CLOSES adds."""
    found = list(CLOSES.get(n, []))
    for clause in clauses(raw):
        if re.search(r"termin|complet", clause) and not re.search(r"actualiza|opcional", clause):
            after = re.search(r"incisos?\s+(.*)", clause)
            if after:
                found += [int(x) for x in re.findall(r"\d+", after.group(1)) if int(x) != n]
    return sorted(set(found))


UPDATES = D.UPDATES  # per Dofus, in .build/dofus/<id>.py


def updates(n, raw):
    """Earlier steps whose mission this step's marks update without finishing, and the
    ones UPDATES adds."""
    found = list(UPDATES.get(n, []))
    for clause in clauses(raw):
        after = re.search(r"actualiza\s+la\s+misi[oó]n\b.*?\bincisos?\s+(.*)", clause)
        if after:
            found += [int(x) for x in re.findall(r"\d+", after.group(1)) if int(x) != n]
    return sorted(set(found))


def read_old_steps():
    body = STEPS_JS.read_text().split("export const STEPS = [", 1)[1].split("\n];", 1)[0]
    pattern = re.compile(r'\{ n: (\d+), zone: "(.*?)", effort: "(\w+)", text: ')
    return {int(m.group(1)): {"zone": m.group(2), "effort": m.group(3)}
            for m in pattern.finditer(body)}


# What the old checklist's inline script defines. Without them the page is not that
# checklist (a 404, a password page, or the page with our app's snippet).
PAGE_MARKERS = {"steps": "const steps = [", "resourcesData": "resourcesData = ",
                "previousStepsByNewStep": "previousStepsByNewStep = "}


def read_page(html):
    """The page's steps, resources and previous-version table, checked before anything is
    written: a page without the checklist's data stops the import with a clear message
    and leaves the Dofus's data and the snapshot as they were. A Dofus whose page has no
    previous version (PREVIOUS_REQUIRED false) maps each step to itself."""
    needed = {name: marker for name, marker in PAGE_MARKERS.items()
              if D.PREVIOUS_REQUIRED or name != "previousStepsByNewStep"}
    missing = [name for name, marker in needed.items() if marker not in html]
    if missing:
        raise SystemExit(f"la página no trae los datos del checklist clásico (falta {', '.join(missing)}): "
                         "no se importa nada")
    try:
        raws = js_template_array(html, "steps")
        resources = js_value(html, "resourcesData")
        previous = (js_value(html, "previousStepsByNewStep") if PAGE_MARKERS["previousStepsByNewStep"] in html
                    else [[n] for n in range(1, len(raws) + 1)])
    except ValueError as e:
        raise SystemExit(f"los datos del checklist clásico no se pueden leer ({e}): no se importa nada")
    count = D.STEP_COUNT
    if len(raws) != count or len(previous) != count or not all(t.strip() for t in raws):
        raise SystemExit(f"se esperaban {count} pasos con texto y llegaron {len(raws)} pasos "
                         f"y {len(previous)} filas de previousStepsByNewStep: no se importa nada")
    return raws, resources, previous


def main(page):
    html = pathlib.Path(page).read_text(encoding="utf-8")
    raws, resources, previous = read_page(html)
    texts = [clean(t) for t in raws]

    SNAPSHOT.write_text(json.dumps({
        "source": D.SOURCE_URL,
        "steps": raws,
        "resources": resources,
        "previousStepsByNewStep": previous,
    }, ensure_ascii=False, indent=1) + "\n")

    old = read_old_steps()
    # Re-running on an already imported steps.js keeps each step's own zone and tier
    imported = "export const PREVIOUS_STEPS" in STEPS_JS.read_text()
    split_from = {}
    for n, prev in enumerate(previous, 1):
        for p in prev:
            split_from.setdefault(p, []).append(n)

    lines = []
    for n, (text, raw, prev) in enumerate(zip(texts, raws, previous), 1):
        if imported:
            zone, effort = old[n]["zone"], old[n]["effort"]
        elif n in SPLIT_TIERS:
            zone, effort = old[prev[0]]["zone"], SPLIT_TIERS[n]
        elif len(prev) == 1 and len(split_from[prev[0]]) > 1:
            raise SystemExit(f"step {n} comes from a split step: add it to SPLIT_TIERS")
        else:
            zone = old[prev[0]]["zone"]
            effort = max((old[p]["effort"] for p in prev), key=TIER_ORDER.index)
        extra = ""
        if complete(raw):
            extra += ", complete: true"
        if marks(raw):
            extra += f", base: {json.dumps(base(raw), ensure_ascii=False)}"
            extra += f", marks: {json.dumps(marks(raw), ensure_ascii=False)}"
        if closes(n, raw):
            extra += f", closes: {json.dumps(closes(n, raw))}"
        if updates(n, raw):
            extra += f", updates: {json.dumps(updates(n, raw))}"
        lines.append(f"  {{ n: {n}, zone: {json.dumps(zone, ensure_ascii=False)}, "
                     f"effort: \"{effort}\", text: {json.dumps(text, ensure_ascii=False)}{extra} }},")

    src = STEPS_JS.read_text()
    head, rest = src.split("export const STEPS = [\n", 1)
    _, tail = rest.split("\n];", 1)
    tail = re.sub(r"\n// Paso nuevo -> pasos de la versión anterior.*?\];\n", "", tail, flags=re.S)
    prev_block = ("\n// Paso nuevo -> pasos de la versión anterior de la guía (previousStepsByNewStep\n"
                  "// de torrentearcano). Sirve para migrar el progreso guardado.\n"
                  f"export const PREVIOUS_STEPS = {json.dumps(previous)};\n")
    STEPS_JS.write_text(head + "export const STEPS = [\n" + "\n".join(lines) + "\n];" + prev_block + tail)
    changed = [n for n, p in enumerate(previous, 1) if p != [n]]
    print(f"pasos: {len(texts)}; renumerados o fusionados: {changed}")
    print(f"pasos con recursos: {len([k for k in resources if k != '0'])}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    sys.exit(main(sys.argv[1]))
