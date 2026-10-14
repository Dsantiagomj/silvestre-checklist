"""Links from the guide to Torrente Arcano's own walkthroughs.

The checklist page links each achievement it names (achievementLinks) and each
mission ("misión 2: Arak-hais, ¿dónde vais?") to a page of its own, built from
the mission title (slugifyTorrentArcano) unless missionUrlOverrides says
otherwise. This script finds the same names in the step texts, builds the same
URLs and keeps only the ones that answer, so the app never links a missing page.

Usage:
  curl -sL -A "Mozilla/5.0" -o /tmp/ta/page.html https://www.torrentearcano.com/checklist-silvestre
  python3 -I .build/import_guide_links.py /tmp/ta/page.html

Writes:
  src/data/guides.json  { achievements: { name: url }, missions: { title: url } }
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
    wanted = {t: overrides.get(t, SITE + slug(t)) for t in missions(texts) + EXTRA_MISSIONS}
    urls = sorted(set(wanted.values()) | set(achievements.values()))
    ok = {url: answers(url) for url in urls}
    out = {
        "achievements": {k: v for k, v in achievements.items() if ok[v]},
        "missions": {k: v for k, v in wanted.items() if ok[v]},
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n")
    missing = sorted(k for k, v in wanted.items() if not ok[v])
    print(f"logros: {len(out['achievements'])}/{len(achievements)}; misiones: {len(out['missions'])}/{len(wanted)}")
    if missing:
        print("misiones sin página:", "; ".join(missing))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
