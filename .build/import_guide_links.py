"""Links from the guide to Torrente Arcano's own walkthroughs.

The checklist page links each achievement it names (achievementLinks) and each
mission ("misión 2: Arak-hais, ¿dónde vais?") to a page of its own, built from
the mission title (slugifyTorrentArcano) unless missionUrlOverrides says
otherwise. This script finds the same names in the step texts, builds the same
URLs and keeps only the ones that answer, so the app never links a missing page.
Prerequisite achievements (PREREQS_LOGROS in steps.js) get their page too when the
sitemap has it: the card links the achievement, not the quests it asks for. A
prerequisite that is a single quest ('misión "X"') links that quest's page.
It also links every quest the diary lists (src/data/quests.json) whose page, by the
same slug, is in the site's sitemap: most have a guide the step text never names.

Usage:
  curl -sL -A "Mozilla/5.0" -o /tmp/ta/page.html https://www.torrentearcano.com/checklist-silvestre
  python3 -I .build/import_guide_links.py /tmp/ta/page.html

Writes:
  src/data/guides.json  { achievements: { name: url }, missions: { title: url },
                          quests: { title: url } }
"missions" are named in the step texts and get linked there; "quests" only in the
diary's quest list, so a short title ("Memo", "Enigma") never links ordinary words.
"""
import json
import pathlib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.request

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "data" / "guides.json"
QUESTS = ROOT / "src" / "data" / "quests.json"
STEPS_JS = ROOT / "src" / "data" / "steps.js"
SITE = "https://www.torrentearcano.com/"

# The page's own pattern (linkMissions), on the raw text instead of escaped HTML
MISSION = re.compile(
    r"(Misi[oó]n(?:\s+de\s+orden)?(?:\s+\d+)?(?:\s*\([^)]*\))?\s*:\s*[\"“]?)"
    r"([^<\n\[”\"]+?)(?=[\"”]?(?:\.|,\s*misi[oó]n|\s*\[\[|$))",
    re.I,
)


# Missions the app lists that the guide text never names: the generic class quest row
# (build_quests_js.py) links to the page that lists each class's quest.
EXTRA_MISSIONS = ["Misión de clase"]
# Missions the text names without the "misión: X" form, so MISSION misses them:
# step 100 says "Se debe hacer la misión Flovoración en algún punto de esta", step 38
# "se puede lanzar la misión La sombra del reino".
TEXT_MISSIONS = ["Flovoración", "La sombra del reino"]


def js_object(html, name):
    start = html.index(f"{name} = ") + len(name) + 3
    value, _ = json.JSONDecoder().raw_decode(html[start:])
    return value


def js_template_array(html, name):
    start = html.index(f"const {name} = [")
    end = html.index("];", start)
    return re.findall(r"`([^`]*)`", html[start:end])


def slug(text):
    """slugifyTorrentArcano: the "ñ" is dropped, not turned into "n"."""
    text = text.lower().replace("ñ", "")
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if not unicodedata.combining(c)).replace("&", "y")
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def missions(texts):
    found = set()
    for text in texts:
        for _, raw in MISSION.findall(text):
            title = re.sub(r"[.,;:]+$", "", raw.strip())
            if title and not re.match(r"hasta\b", title, re.I):
                found.add(title)
    return sorted(found)


def site_pages():
    """Every page the site lists in its sitemap (Squarespace keeps it complete)."""
    req = urllib.request.Request(SITE + "sitemap.xml", headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(4):
        time.sleep(2 * attempt)  # the site resets bursts of connections
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return set(re.findall(r"<loc>([^<]+)</loc>", res.read().decode("utf-8")))
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
    raise SystemExit("sin respuesta del sitemap")


def page_for(name, overrides, pages):
    """The quest's page in the sitemap. Besides the page's own slug, the site's pages
    sometimes drop dots and apostrophes ("el-slip-esta-que-arde", "la-ascension-de-qutan")
    or carry Squarespace's "-1" for a repeated title."""
    if name in overrides:
        return overrides[name] if overrides[name] in pages else None
    base = slug(name)
    compact = slug(re.sub(r"[.'’]", "", name))
    return next((SITE + c for c in (base, compact, base + "-1") if SITE + c in pages), None)


def prereq_names(kind):
    """What the prerequisites name: 'Logro "Turbera maldita"' or 'misión "El cementerio primitivo"'."""
    block = STEPS_JS.read_text().split("export const PREREQS_LOGROS = [", 1)[1].split("];", 1)[0]
    return re.findall(kind + r' \\"([^"\\]+)\\"', block)


def quest_names():
    """The names of the quests the diary lists, as the app shows them, and of the ones
    behind a row that depends on the alignment ("El destino", "La fatalidad"...): its
    start links each one."""
    quests = json.loads(QUESTS.read_text())["QUESTS"].values()
    alts = {name for q in quests for name, _ in (q["st"] or {}).get("ali", [])}
    return sorted({q["n"] for q in quests} | alts)


def answers(url, tries=4):
    """One request at a time, with a pause: the site resets bursts of connections."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(tries):
        time.sleep(0.6 * (attempt + 1))
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.status == 200
        except urllib.error.HTTPError as err:
            if err.code == 404:
                return False
        except (urllib.error.URLError, ConnectionError, TimeoutError):
            pass
    raise SystemExit(f"sin respuesta tras {tries} intentos: {url}")


def main(page):
    html = pathlib.Path(page).read_text(encoding="utf-8")
    texts = js_template_array(html, "steps")
    achievements = js_object(html, "achievementLinks")
    overrides = js_object(html, "missionUrlOverrides")
    wanted = {t: overrides.get(t, SITE + slug(t)) for t in missions(texts) + EXTRA_MISSIONS + TEXT_MISSIONS}
    pages = site_pages()
    for name in prereq_names("Logro"):
        url = page_for(name, {}, pages)
        if url and name not in achievements:
            achievements[name] = url
    diary_only = {}
    for name in prereq_names("misión"):
        url = page_for(name, overrides, pages)
        if url and name not in wanted:
            diary_only[name] = url
    for name in quest_names():
        url = page_for(name, overrides, pages)
        if url and name not in wanted:
            diary_only[name] = url
    urls = sorted(set(wanted.values()) | set(achievements.values()) | set(diary_only.values()))
    # The sitemap answers for most; only what it lacks is asked one by one
    ok = {url: url in pages or answers(url) for url in urls}
    out = {
        "achievements": {k: v for k, v in achievements.items() if ok[v]},
        "missions": {k: v for k, v in wanted.items() if ok[v]},
        "quests": dict(sorted(diary_only.items())),
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    missing = sorted(k for k, v in wanted.items() if not ok[v])
    print(f"logros: {len(out['achievements'])}/{len(achievements)}; misiones: {len(out['missions'])}/{len(wanted)}"
          f"; misiones solo del diario: {len(diary_only)}")
    if missing:
        print("misiones sin página:", "; ".join(missing))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
