"""Weigh each checklist step by the level of the quests it covers.

How the progress percentage is weighted:
  * Every quest is worth 100 points times a difficulty multiplier: its level / 100
    (level 2 -> x0.02, level 20 -> x0.2, level 200 -> x2), so it is worth `level` points.
  * A quest that appears in several steps has its points split equally between them,
    so nothing counts twice.
  * A step's weight is the sum of its quests' shares. A step with no quests would weigh
    nothing: it gets the weight of one level-1 quest so marking it still counts.

Level source: the guide page on Torrente Arcano when it states one ("Nivel mínimo N"
under "Prerrequisitos"); otherwise DofusDB's `levelMin` (`lv` in quests.json).

Reads  : src/data/{quests,guides}.json
Writes : src/data/weights.json ({step number: weight})
Caches : .build/data/ta_levels.json  ({url: {"level": n | null, "pre": text}})
Run    : python3 -I .build/build_weights.py   (after build_quests_js.py)
"""
import html
import json
import pathlib
import re
import subprocess
import sys
import time
import unicodedata

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
QUESTS_JSON = ROOT / "src" / "data" / "quests.json"
GUIDES_JSON = ROOT / "src" / "data" / "guides.json"
OUT_JSON = ROOT / "src" / "data" / "weights.json"
TA_CACHE = DATA / "ta_levels.json"
MIN_WEIGHT = 1  # one level-1 quest


def norm(s):
    s = unicodedata.normalize("NFD", s)
    return "".join(c for c in s if not unicodedata.combining(c)).lower().strip()


# ---------------------------------------------------------------------------
# Torrente Arcano: one page at a time (the site resets bursts of connections)
# ---------------------------------------------------------------------------
def fetch(url, tries=8):
    """The page's HTML ("" if it does not exist, None if it never answered).

    With curl: the site resets Python's own TLS connections. A reset takes ~15 s to
    show up, so the handshake gets a short timeout and is simply retried.
    """
    for attempt in range(tries):
        r = subprocess.run(["curl", "-sS", "-L", "--http1.1", "--compressed", "-A", "Mozilla/5.0",
                            "--connect-timeout", "6", "--max-time", "40",
                            "-w", "\n%{http_code}", url], capture_output=True)
        body, _, code = r.stdout.decode("utf-8", "replace").rpartition("\n")
        if r.returncode == 0 and code == "404":
            return ""
        if r.returncode == 0 and code == "200":
            return body
        time.sleep(1 + attempt)
    return None


def page_text(raw):
    raw = re.sub(r"<script.*?</script>|<style.*?</style>", " ", raw, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", raw)))


LEVEL = re.compile(r"Nivel\s+(?:m[ií]nimo|recomendado)\s*:?\s*(\d+)", re.I)


def prerequisites(text):
    """The "Prerrequisitos: ..." line of the page, up to what the quest needs."""
    i = text.find("Prerrequisitos")
    if i < 0:
        return ""
    end = min([j for j in (text.find("Necesitarás", i), text.find("Recompensas", i)) if j > 0] or [i + 300])
    return text[i:end].strip()[:300]


def ta_levels(urls):
    cache = json.loads(TA_CACHE.read_text()) if TA_CACHE.exists() else {}
    todo = [u for u in urls if u not in cache]
    for k, url in enumerate(todo, 1):
        raw = fetch(url)
        if raw is None:
            print(f"  ! sin respuesta: {url}", file=sys.stderr)
            continue
        pre = prerequisites(page_text(raw))
        m = LEVEL.search(pre)
        cache[url] = {"level": int(m[1]) if m else None, "pre": pre}
        # Se guarda en cada página: si se corta, la siguiente vuelta sigue donde iba
        TA_CACHE.write_text(json.dumps(cache, ensure_ascii=False, indent=0))
        print(f"  {k}/{len(todo)} {url} -> {cache[url]['level']}", file=sys.stderr, flush=True)
        time.sleep(0.8)
    return cache


# ---------------------------------------------------------------------------
# Weights
# ---------------------------------------------------------------------------
def main():
    data = json.loads(QUESTS_JSON.read_text())
    step_quests = {int(n): list(dict.fromkeys(qs)) for n, qs in data["STEP_QUESTS"].items()}
    quests = data["QUESTS"]
    guides = json.loads(GUIDES_JSON.read_text())
    by_name = {norm(k): v for k, v in {**guides.get("quests", {}), **guides["missions"]}.items()}

    used = {str(q) for qs in step_quests.values() for q in qs}
    url_of = {q: by_name.get(norm(quests[q]["n"])) for q in used}
    cache = ta_levels(sorted({u for u in url_of.values() if u}))

    level, source = {}, {}
    for q in used:
        ta = (cache.get(url_of[q]) or {}).get("level") if url_of[q] else None
        level[q], source[q] = (ta, "ta") if ta else (quests[q]["lv"] or 1, "dofusdb")

    shared = {}
    for qs in step_quests.values():
        for q in qs:
            shared[str(q)] = shared.get(str(q), 0) + 1

    weights = {}
    for n in sorted(step_quests):
        w = sum(level[str(q)] / shared[str(q)] for q in step_quests[n])
        weights[str(n)] = round(max(w, MIN_WEIGHT), 3)
    OUT_JSON.write_text(json.dumps(weights, indent=0) + "\n")

    # Report
    ta = [q for q in used if source[q] == "ta"]
    print(f"misiones: {len(used)} · nivel de Torrente Arcano: {len(ta)} · de DofusDB: {len(used) - len(ta)}")
    diffs = sorted(((level[q] - quests[q]["lv"], q) for q in ta if level[q] != quests[q]["lv"]),
                   key=lambda d: -abs(d[0]))
    print(f"distintas de DofusDB: {len(diffs)}")
    for d, q in diffs[:15]:
        print(f"  {quests[q]['n']}: TA {level[q]} · DofusDB {quests[q]['lv']} ({d:+d})")
    no_level = [q for q in used if url_of[q] and source[q] == "dofusdb"]
    print(f"con guía pero sin nivel en la página: {len(no_level)}")
    print(f"sin guía: {sum(1 for q in used if not url_of[q])}")
    total = sum(weights.values())
    print(f"peso total: {total:.1f}")


if __name__ == "__main__":
    main()
