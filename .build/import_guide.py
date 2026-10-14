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
  .build/lists/torrentearcano.json  snapshot of the three structures, versioned
  src/data/steps.js                 STEPS and PREVIOUS_STEPS blocks only

Each text keeps the page's colour markers as marks: [[RED]] is where to stop
("stop"), [[GREEN]] what gets resolved ("done"). [[BLUE]] mixes several things, so
it is split by what it says (blue_kind): what the step covers ("includes"), tasks the
guide also requires ("must"), advice ("tip") and anything else ("note").
"complete" says the step asks for the whole achievement ("(Completo)", kept out
of the marks). "base" is the text without them, and "closes" lists the earlier steps whose
missions a "done" mark finishes ("se terminan las misiones de los incisos 33
y 34"); steps it only updates ("se actualiza") are left out.

Zone and effort tier are not on the page. A step that maps to a single old step
keeps that step's zone and tier; merged steps take the highest tier; steps
split out of an old one use SPLIT_TIERS.
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
STEPS_JS = ROOT / "src" / "data" / "steps.js"
SNAPSHOT = ROOT / ".build" / "lists" / "torrentearcano.json"

TIER_ORDER = ["trivial", "corto", "medio", "largo", "epico"]
# Old step 75 bundled four Selocalipsis achievements; v4 gives each its own step.
SPLIT_TIERS = {74: "largo", 75: "largo", 76: "largo", 77: "medio"}


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


def closes(n, raw):
    """Earlier steps finished by this step's "done" marks."""
    found = []
    for kind, body in MARK.findall(raw):
        if kind != "GREEN":
            continue
        for clause in re.split(r",\s*(?=(?:y\s+)?se\s)|\.\s+|\s+y\s+(?=se\s)", clean(body)):
            if re.search(r"termin|complet", clause) and not re.search(r"actualiza", clause):
                after = re.search(r"incisos?\s+(.*)", clause)
                if after:
                    found += [int(x) for x in re.findall(r"\d+", after.group(1)) if int(x) != n]
    return sorted(set(found))


def read_old_steps():
    body = STEPS_JS.read_text().split("export const STEPS = [", 1)[1].split("\n];", 1)[0]
    pattern = re.compile(r'\{ n: (\d+), zone: "(.*?)", effort: "(\w+)", text: ')
    return {int(m.group(1)): {"zone": m.group(2), "effort": m.group(3)}
            for m in pattern.finditer(body)}


def main(page):
    html = pathlib.Path(page).read_text(encoding="utf-8")
    raws = js_template_array(html, "steps")
    texts = [clean(t) for t in raws]
    resources = js_value(html, "resourcesData")
    previous = js_value(html, "previousStepsByNewStep")
    assert len(texts) == 100 and len(previous) == 100, (len(texts), len(previous))

    SNAPSHOT.write_text(json.dumps({
        "source": "https://www.torrentearcano.com/checklist-silvestre",
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
