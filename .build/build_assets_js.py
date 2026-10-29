"""Turn the raw match report into the asset map the page loads, and self-host images.

Icon priority per step, most distinctive first:
  1. the item an achievement rewards (dofus eggs, relics, ingredients)
  2. the portrait of a boss named in the step
  3. the achievement's category icon (only 3 distinct, so last resort)

The items each step needs are not built here: see build_resources.py.

Reads  : .build/data/{achievements,quests}.json, .build/data/<dofus>/step_assets.json
         (lookup_jobs.json and job_images_64.tar.gz are
          fetched and cached here)
Writes : src/dofus/<dofus>/assets.json (imported statically by the app)
         public/img/**        (every image the page uses, mirrored from the CDN)
Run    : python3 -I .build/build_assets_js.py   (--dofus <id> or DOFUS; silvestre by default)
"""
import json
import pathlib
import re
import sys
import tarfile
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import dofus  # noqa: E402  (--dofus <id> or DOFUS; silvestre by default)
import imaging  # noqa: E402
D = dofus.CONFIG
OUT_JSON = dofus.SRC / "assets.json"
# Vite serves public/ at the site root, so the React app requests /img/...
IMG = ROOT / "public" / "img"
# Image base the app requests, relative to the site root.
APP_IMG_BASE = "img/"
CDN = "https://api.dofusdb.fr/img/"
HERO_MAPS = D.HERO_MAPS  # per Dofus, in .build/dofus/<id>.py
# Full-width hero art is shipped at the source width but recompressed: the raw
# maps weigh 1-1.8 MB each.
HERO_JPEG_QUALITY = 55
BRAND_ICON = D.BRAND_ICON  # per Dofus, in .build/dofus/<id>.py
THEME_ICONS = D.THEME_ICONS  # per Dofus, in .build/dofus/<id>.py
# Backup card: you store your progress in the chest (Cofre de Jorbak) and the
# treasure map (Mapa del tesoro de los miner) leads you back to it.
BACKUP_ICONS = {"chest": "items/94023.png", "map": "items/24006.png"}
# Header buttons: the Minirreloj de arena for reset (turning the hourglass over
# starts again) and the Catalejo de gobletrotter for the overlay (watching from afar).
HEADER_ICONS = {"reset": "items/15913.png", "overlay": "items/24286.png"}

from match_assets import ACH, QUEST, lookup  # noqa: E402  (loads the big tables once)

PREREQ_JOBS = D.PREREQ_JOBS  # per Dofus, in .build/dofus/<id>.py
JOB_NAMES = {2: "Leñador", 11: "Herrero", 13: "Escultor", 16: "Joyero", 24: "Minero",
             26: "Alquimista", 27: "Sastre", 28: "Campesino", 36: "Pescador", 60: "Fabricante",
             65: "Manitas", 79: "Ganadero"}
PREREQ_SPELLS = D.PREREQ_SPELLS  # per Dofus, in .build/dofus/<id>.py
# Job icon ids differ from job ids (DofusDB: img/jobs/<iconId>.jpg).
JOB_ICON = {}


def short(url):
    return url[len(CDN):] if url and url.startswith(CDN) else url


DOFUS_TYPE = 23  # DofusDB item type "Dofus": catches Domakuro, Dorigami, Dofawa...
MISSING_DOFUS = D.MISSING_DOFUS  # per Dofus, in .build/dofus/<id>.py
OCRE_ICON = D.OCRE_ICON  # per Dofus, in .build/dofus/<id>.py
# Icons of the guide's marks in the step detail: a dungeon key for where to stop,
# the trophy book for what gets done, a list for what the step includes, a legend
# book for tips and a handwritten note for the rest. "must" (a quest the guide also
# requires) uses the game's quest mark, drawn by the app.
CALL_ICONS = {"stop": "items/84228.png", "done": "achievements/273.png", "includes": "items/24041.png",
              "tip": "items/25019.png", "note": "items/24055.png"}
# Medallions of the quest route in the step detail, one game item per objective kind:
# a sealed letter to talk, a sword to fight, a bag to hand over, a compass to go
# somewhere, a hammer to craft and a magic book for anything else.
OBJ_ICONS = {"npc": "items/24065.png", "fight": "items/6009.png", "bring": "items/141012.png",
             "map": "items/126014.png", "craft": "items/7001.png", "free": "items/25007.png"}


def reward_item_ids(rewards):
    """Item ids in achievement or quest-step rewards ([id, qty] pairs or item dicts)."""
    ids = set()
    for r in rewards or []:
        for x in (r.get("itemsReward") or []) + (r.get("itemsRewardIds") or []):
            ids.add(x[0] if isinstance(x, list) else x)
        ids |= {i["id"] for i in r.get("items") or [] if isinstance(i, dict) and i.get("id")}
    return {i for i in ids if isinstance(i, int)}


def item_types(ids):
    """{id: (typeId, name, iconId)}, cached in lookup_item_types.json."""
    cache_file = DATA / "lookup_item_types.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    missing = sorted(i for i in ids if str(i) not in cache)
    for k in range(0, len(missing), 40):
        query = "&".join(f"id[$in][]={x}" for x in missing[k:k + 40])
        req = urllib.request.Request(f"https://api.dofusdb.fr/items?$limit=50&{query}",
                                     headers={"User-Agent": "silvestre/1.0"})
        with urllib.request.urlopen(req, timeout=40) as r:
            for it in json.load(r)["data"]:
                cache[str(it["id"])] = [it.get("typeId"), it["name"]["es"], it.get("iconId")]
    if missing:
        cache_file.write_text(json.dumps(cache, ensure_ascii=False))
    return {int(k): tuple(v) for k, v in cache.items()}


def dofus_road(achievements, quests, steps, report):
    """The Dofus the guide hands out before the Silvestre, in the order you get them.

    They come as achievement rewards or as rewards of the achievement's quests
    (the Dofawa of step 1), so the filter is the item type, not the name.
    A Dofus counts on the step that completes its achievement: the one marked
    "(Completo)", or the last step that mentions it. The step icon is not enough:
    step 17 shows the Dofus Esmeralda but only goes "hasta la misión 7".
    """
    text = {s["n"]: s["text"] for s in report}
    by_ach = {}
    for n, entry in steps.items():
        for a in entry.get("achievements", []):
            by_ach.setdefault(a["id"], []).append(int(n))
    found = {}
    for a in achievements:
        if a["id"] not in by_ach:
            continue
        ids = reward_item_ids(a.get("rewards"))
        if a["id"] in MISSING_DOFUS:
            ids.add(MISSING_DOFUS[a["id"]][0])
        for o in filter(None, a.get("objectives") or []):
            m = re.search(r"Qf=(\d+)", o.get("criterion") or "")
            for st in (quests.get(int(m.group(1)), {}).get("steps") or []) if m else []:
                ids |= reward_item_ids((st or {}).get("rewards"))
        ns = sorted(set(by_ach[a["id"]]))
        done = [n for n in ns if re.search(r"\(Completos?\)", text[n])]
        for i in ids:
            found.setdefault(i, ((done or ns)[-1], a["name"]["es"]))
    types = item_types(found)
    road = []
    for i, (step, ach) in found.items():
        type_id, name, icon = types.get(i, (None, "", None))
        # DofusDB writes "Dofus de los hielos": the name, whatever its capitals
        if type_id == DOFUS_TYPE and name.casefold() != D.NAME.casefold():
            road.append({"name": name, "img": f"items/{icon}.png", "step": step, "achievement": ach})
    return sorted(road, key=lambda d: (d["step"], d["name"]))


def reward_index(achievements):
    index = {aid: {"name": name, "img": img} for aid, (_, img, name) in MISSING_DOFUS.items()}
    for a in achievements:
        for reward in a.get("rewards") or []:
            for item in reward.get("items") or []:
                if item.get("iconId"):
                    index[a["id"]] = {"name": item.get("name", {}).get("es") or "",
                                      "img": f"items/{item['iconId']}.png"}
                    break
            if a["id"] in index:
                break
    return index


JOB_TARBALL = ("https://github.com/dofusdude/dofus3-main/releases/download/"
               "3.7.10.10/job_images_64.tar.gz")


def fetch_jobs():
    """Job icons. DofusDB 404s on its job images, so they come from the
    dofus3-main release tarball instead, keyed by the job's iconId."""
    cache_file = DATA / "lookup_jobs.json"
    if cache_file.exists():
        icon_ids = {int(k): v for k, v in json.loads(cache_file.read_text()).items()}
    else:
        req = urllib.request.Request("https://api.dofusdb.fr/jobs?$limit=50",
                                     headers={"User-Agent": "silvestre/1.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            icon_ids = {j["id"]: j["iconId"] for j in json.load(r)["data"]}
        cache_file.write_text(json.dumps({str(k): v for k, v in icon_ids.items()}))

    tarball = DATA / "job_images_64.tar.gz"
    if not tarball.exists():
        req = urllib.request.Request(JOB_TARBALL, headers={"User-Agent": "silvestre/1.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            tarball.write_bytes(r.read())

    wanted = {icon_ids[j] for ids in PREREQ_JOBS.values() for j in ids}
    (IMG / "jobs").mkdir(parents=True, exist_ok=True)
    with tarfile.open(tarball) as tf:
        for member in tf.getmembers():
            m = re.search(r"/(\d+)-64\.png$", member.name)
            if m and int(m[1]) in wanted and member.isfile():
                (IMG / "jobs" / f"{m[1]}.png").write_bytes(tf.extractfile(member).read())
    for job_id, icon in icon_ids.items():
        JOB_ICON[job_id] = f"jobs/{icon}.png"


# Achievement icons DofusDB gives a whole category (a book with an eye, a seal...).
# A prerequisite that asks for the whole achievement shows the trophy book instead,
# the one "Con bases sólidas" has.
CATEGORY_ICONS = {"achievements/203.png", "achievements/458.png", "achievements/459.png"}
ACHIEVEMENT_ICON = "achievements/273.png"


def prereq_icons(prereq_texts):
    """Map each prerequisite id to the icons that represent it.

    A prerequisite that asks for given missions ("misión 1: ...", even of an
    achievement) is a quest: no image, the app draws the game's quest mark.
    """
    out = {}
    for pid, text in prereq_texts.items():
        if re.search(r"\bmisi[oó]n\b", text, re.I):
            names = re.findall(r'"([^"]+)"', text)
            out[pid] = [{"img": None, "label": names[0] if names else text, "quest": True}]
            continue
        if pid in PREREQ_JOBS:
            out[pid] = [{"img": JOB_ICON[j], "label": JOB_NAMES[j]} for j in PREREQ_JOBS[pid]]
        elif pid in PREREQ_SPELLS:
            img, label = PREREQ_SPELLS[pid]
            out[pid] = [{"img": img, "label": label}]
        else:
            names = re.findall(r'"([^"]+)"', text)
            icons = []
            for raw in names:
                rec, _ = lookup(raw.rstrip(". "), ACH)
                if rec:
                    img = short(rec["img"])
                    if img in CATEGORY_ICONS and "(Completo)" in text:
                        img = ACHIEVEMENT_ICON
                    icons.append({"img": img, "label": rec["name"]["es"]})
                    continue
                rec, _ = lookup(raw.rstrip(". "), QUEST)
                if rec:
                    icons.append({"img": None, "label": rec["name"]["es"], "quest": True})
            if icons:
                out[pid] = icons
    return out


def read_prereqs():
    html = (dofus.SRC / "steps.js").read_text()
    pairs = re.findall(r'\{\s*id:\s*"([loh]\d+)",\s*text:\s*"((?:[^"\\]|\\.)*)"\s*\}', html)
    return {pid: text.replace('\\"', '"') for pid, text in pairs}


def optimize_jpeg(path, quality):
    """Recompress a JPEG in place with sips or ImageMagick (imaging.py). Call it only on a
    fresh download: recompressing an already-compressed file loses quality on every run.
    Without either tool the original stays and the build says so."""
    if not imaging.pick_tool():
        return "sin sips ni ImageMagick: se deja el original"
    imaging.recompress(path, quality)
    return f"{path.stat().st_size // 1024} KB"


def mirror(paths):
    """Download every CDN path into img/, skipping files already present."""
    def one(p):
        dest = IMG / p
        if dest.exists() and dest.stat().st_size > 0:
            return p, "cached"
        dest.parent.mkdir(parents=True, exist_ok=True)
        req = urllib.request.Request(CDN + p, headers={"User-Agent": "silvestre/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                dest.write_bytes(r.read())
            return p, "ok"
        except urllib.error.HTTPError as e:
            return p, f"HTTP {e.code}"
    with ThreadPoolExecutor(max_workers=12) as ex:
        return list(ex.map(one, sorted(paths)))


def main():
    report = json.loads((dofus.WORK / "step_assets.json").read_text())
    achievements = json.loads((DATA / "achievements.json").read_text())
    by_quest = {q["id"]: q for q in json.loads((DATA / "quests.json").read_text())}
    rewards = reward_index(achievements)
    fetch_jobs()

    steps = {}
    for step in report:
        achs, bosses, dungeons, quests = [], [], [], []
        for a in step["assets"]:
            kind = a["kind"]
            if kind == "achievement":
                achs.append({"id": a["id"], "name": a["name"], "img": short(a["img"])})
            elif kind == "quest":
                quests.append({"id": a["id"], "name": a["name"]})
            elif kind == "boss" and a["img"]:
                bosses.append({"id": a["id"], "name": a["name"], "img": short(a["img"])})
            elif kind == "dungeon":
                dungeons.append({"id": a["id"], "name": a["name"]})

        icon = None
        for a in achs:
            if a["id"] in rewards:
                r = rewards[a["id"]]
                icon = {"src": r["img"], "label": r["name"], "from": "item"}
                break
        if not icon and bosses:
            icon = {"src": bosses[0]["img"], "label": bosses[0]["name"], "from": "boss"}
        if not icon and achs:
            icon = {"src": achs[0]["img"], "label": achs[0]["name"], "from": "category"}

        entry = {k: v for k, v in {
            "icon": icon, "achievements": achs, "bosses": bosses,
            "dungeons": dungeons, "quests": quests,
        }.items() if v}
        if entry:
            steps[str(step["n"])] = entry

    prereqs = prereq_icons(read_prereqs())
    road = dofus_road(achievements, by_quest, steps, report)

    paths = set()
    for v in steps.values():
        if "icon" in v:
            paths.add(v["icon"]["src"])
        paths |= {b["img"] for b in v.get("bosses", [])}
        paths |= {a["img"] for a in v.get("achievements", [])}
    paths |= {i["img"] for icons in prereqs.values() for i in icons if i.get("img")}
    paths |= {*HERO_MAPS.values(), BRAND_ICON, *THEME_ICONS.values(), *BACKUP_ICONS.values(),
              *HEADER_ICONS.values(), OCRE_ICON, *CALL_ICONS.values(), *OBJ_ICONS.values()} - {None}
    paths |= {d["img"] for d in road}
    results = mirror({p for p in paths if not p.startswith("jobs/")})
    failed = [r for r in results if r[1] not in ("ok", "cached")]
    fresh = {p for p, status in results if status == "ok"}
    for theme, rel in HERO_MAPS.items():
        if rel in fresh:
            print(f"mapa del hero ({theme}): {optimize_jpeg(IMG / rel, HERO_JPEG_QUALITY)}")
    if failed:
        # Drop references to images that do not exist rather than ship broken <img>.
        bad = {p for p, _ in failed}
        for icons in prereqs.values():
            for i in icons:
                if i.get("img") in bad:
                    i["img"] = None

    def dump(o):
        return json.dumps(o, ensure_ascii=False, separators=(",", ":"))

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(dump({
        "DOFUS_IMG": APP_IMG_BASE,
        "HERO_BG": HERO_MAPS,
        "BRAND_ICON": BRAND_ICON,
        "THEME_ICONS": THEME_ICONS,
        "BACKUP_ICONS": BACKUP_ICONS,
        "HEADER_ICONS": HEADER_ICONS,
        "OCRE_ICON": OCRE_ICON,
        "CALL_ICONS": CALL_ICONS,
        "OBJ_ICONS": OBJ_ICONS,
        "STEP_ASSETS": steps,
        "PREREQ_ICONS": prereqs,
        "DOFUS_ROAD": road,
    }) + "\n")

    size = sum((IMG / p).stat().st_size for p in paths if (IMG / p).exists())
    print(f"assets.json     : {OUT_JSON.stat().st_size // 1024} KB")
    print(f"pasos con icono : {sum(1 for v in steps.values() if 'icon' in v)}/{D.STEP_COUNT}")
    print(f"prerrequisitos  : {len(prereqs)} con icono")
    print("dofus del camino: " + ", ".join(f"{d['name']} ({d['step']})" for d in road))
    print(f"imágenes        : {len(paths)} en public/img/ ({size // 1024} KB), fallidas {len(failed)}")
    for p, why in failed:
        print(f"   FALLA {p} {why}")


if __name__ == "__main__":
    main()
