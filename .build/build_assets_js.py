"""Turn the raw match report into the asset map the page loads, and self-host images.

Icon priority per step, most distinctive first:
  1. the item an achievement rewards (dofus eggs, relics, ingredients)
  2. the portrait of a boss named in the step
  3. the achievement's category icon (only 3 distinct, so last resort)

The items each step needs are not built here: see build_resources.py.

Reads  : .build/data/{step_assets,achievements,quests}.json
         (lookup_jobs.json and job_images_64.tar.gz are
          fetched and cached here)
Writes : src/data/assets.json (imported statically by the app)
         public/img/**        (every image the page uses, mirrored from the CDN)
Run    : python3 -I .build/build_assets_js.py
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
OUT_JSON = ROOT / "src" / "data" / "assets.json"
# Vite serves public/ at the site root, so the React app requests /img/...
IMG = ROOT / "public" / "img"
# Image base the app requests, relative to the site root.
APP_IMG_BASE = "img/"
CDN = "https://api.dofusdb.fr/img/"
# Hero background, one map per theme, picked by eye:
#   dark  — Refugio Silvestre: snowy fir forest at dusk; it even shares the name.
#   light — Mazmorra de los Escarahojas: a sunny forest that reads well without a veil.
HERO_MAPS = {"dark": "maps/1/223350028.jpg", "light": "maps/1/88080387.jpg"}
# Full-width hero art is shipped at the source width but recompressed: the raw
# maps weigh 1-1.8 MB each.
HERO_JPEG_QUALITY = 55
# Header logo: the Dofus Silvestre item itself.
BRAND_ICON = "items/23036.png"
# Theme switch: Dofus Marfil (light) and Dofus Ébano (dark), the rewards of the
# guide's "Blanco marfil" and "Negro ébano" achievements.
THEME_ICONS = {"light": "items/23011.png", "dark": "items/23007.png"}
# Backup card: you store your progress in the chest (Cofre de Jorbak) and the
# treasure map (Mapa del tesoro de los miner) leads you back to it.
BACKUP_ICONS = {"chest": "items/94023.png", "map": "items/24006.png"}
# Header buttons: the Minirreloj de arena for reset (turning the hourglass over
# starts again) and the Catalejo de gobletrotter for the overlay (watching from afar).
HEADER_ICONS = {"reset": "items/15913.png", "overlay": "items/24286.png"}
# Hero counters: the laurel-wreathed Dofus of the achievements panel for
# prerequisites, and the Mochila de recolector for the items to gather.
HERO_ICONS = {"prereqs": "achievements/458.png", "items": "items/81028.png"}

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from match_assets import ACH, QUEST, lookup  # noqa: E402  (loads the big tables once)

# Prerequisites from the guide. Achievements and quests resolve by name; jobs and
# spells use their DofusDB ids, checked by hand on 2026-10-13.
PREREQ_JOBS = {
    "o1": [60, 13], "o2": [79], "o3": [65], "o4": [24, 26], "o5": [28],
    "o6": [28, 26, 2, 36],
}
JOB_NAMES = {2: "Leñador", 13: "Escultor", 24: "Minero", 26: "Alquimista",
             28: "Campesino", 36: "Pescador", 60: "Fabricante", 65: "Manitas",
             79: "Ganadero"}
PREREQ_SPELLS = {
    "h1": ("spells/sort_12461.png", "Captura de Almas"),
    "h2": ("spells/sort_11763.png", "Llamilla"),
    "h3": ("spells/sort_11775.png", "Zanahowia Sabwosa"),
}
# Job icon ids differ from job ids (DofusDB: img/jobs/<iconId>.jpg).
JOB_ICON = {}


def short(url):
    return url[len(CDN):] if url and url.startswith(CDN) else url


def dofus_road(achievements, steps, report):
    """The Dofus the guide hands out before the Silvestre, in the order you get them.

    A Dofus is obtained on the step that completes its achievement: the one marked
    "(Completo)", or the last step that mentions it. The step icon is not enough:
    step 17 shows the Dofus Esmeralda but only goes "hasta la misión 7".
    """
    text = {s["n"]: s["text"] for s in report}
    by_ach = {}
    for n, entry in steps.items():
        for a in entry.get("achievements", []):
            by_ach.setdefault(a["id"], []).append(int(n))
    road = []
    for a in achievements:
        if a["id"] not in by_ach:
            continue
        for reward in a.get("rewards") or []:
            for item in reward.get("items") or []:
                name = (item.get("name") or {}).get("es", "")
                if not name.startswith("Dofus") or name == "Dofus Silvestre":
                    continue
                ns = sorted(set(by_ach[a["id"]]))
                done = [n for n in ns if re.search(r"\(Completos?\)", text[n])]
                road.append({"name": name, "img": f"items/{item['iconId']}.png",
                             "step": (done or ns)[-1], "achievement": a["name"]["es"]})
    return sorted(road, key=lambda d: d["step"])


def reward_index(achievements):
    index = {}
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


def prereq_icons(prereq_texts):
    """Map each prerequisite id to the icons that represent it."""
    out = {}
    for pid, text in prereq_texts.items():
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
                    icons.append({"img": short(rec["img"]), "label": rec["name"]["es"]})
                    continue
                rec, _ = lookup(raw.rstrip(". "), QUEST)
                if rec:
                    icons.append({"img": None, "label": rec["name"]["es"], "quest": True})
            if icons:
                out[pid] = icons
    return out


def read_prereqs():
    html = (ROOT / "src" / "data" / "steps.js").read_text()
    pairs = re.findall(r'\{\s*id:\s*"([loh]\d+)",\s*text:\s*"((?:[^"\\]|\\.)*)"\s*\}', html)
    return {pid: text.replace('\\"', '"') for pid, text in pairs}


def optimize_jpeg(path, quality):
    """Recompress a JPEG in place with macOS sips. Call it only on a fresh download:
    recompressing an already-compressed file loses quality on every run.
    Without sips (not macOS) the original stays and the build says so."""
    if not shutil.which("sips"):
        return "sin sips: se deja el original"
    subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(quality),
                    str(path), "--out", str(path)], check=True, capture_output=True)
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
    report = json.loads((DATA / "step_assets.json").read_text())
    achievements = json.loads((DATA / "achievements.json").read_text())
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
    road = dofus_road(achievements, steps, report)

    paths = set()
    for v in steps.values():
        if "icon" in v:
            paths.add(v["icon"]["src"])
        paths |= {b["img"] for b in v.get("bosses", [])}
        paths |= {a["img"] for a in v.get("achievements", [])}
    paths |= {i["img"] for icons in prereqs.values() for i in icons if i.get("img")}
    paths |= {*HERO_MAPS.values(), BRAND_ICON, *THEME_ICONS.values(), *BACKUP_ICONS.values(),
              *HEADER_ICONS.values(), *HERO_ICONS.values()}
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
        "HERO_ICONS": HERO_ICONS,
        "STEP_ASSETS": steps,
        "PREREQ_ICONS": prereqs,
        "DOFUS_ROAD": road,
    }) + "\n")

    size = sum((IMG / p).stat().st_size for p in paths if (IMG / p).exists())
    print(f"assets.json     : {OUT_JSON.stat().st_size // 1024} KB")
    print(f"pasos con icono : {sum(1 for v in steps.values() if 'icon' in v)}/100")
    print(f"prerrequisitos  : {len(prereqs)} con icono")
    print("dofus del camino: " + ", ".join(f"{d['name']} ({d['step']})" for d in road))
    print(f"imágenes        : {len(paths)} en public/img/ ({size // 1024} KB), fallidas {len(failed)}")
    for p, why in failed:
        print(f"   FALLA {p} {why}")


if __name__ == "__main__":
    main()
