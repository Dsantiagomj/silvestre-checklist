"""The step banner: the map the step starts on and the figure that stands for it.

The figure, in order of preference (the Dofus egg a step gives is chosen in the app,
from DOFUS_ROAD, before any of these):
  1. A curated figure for the achievement: the primordial dragon of its Dofus, the
     Selocalipsis horseman or Draconiros, Silvosse for the Silvestre line.
     The primordial lines that Meriana starts keep Meriana: she is the face of those.
  2. The NPC that starts the step's first quest (rendered from its look); for a quest
     with no start, the first NPC it sends you to. A first quest whose NPC depends on
     the class (step 7) shows none.
  STEP_FIGURE sets the figure by hand where there is nothing better (step 7).
  FIGURE_QUEST picks the quest that stands for a step that opens with quests it only
  needs (its map too).
  3. Nothing: the app falls back to the boss the step resolves.

Figures are rendered by Ankama's look renderer and mirrored into public/img/npcs/.
The map is the start map of the step's first quest that has one (DofusDB map image).

Reads  : src/data/{quests,plans}.json, .build/data/quests.json
Writes : src/data/figures.json, public/img/npcs/*.png
Caches : .build/data/lookup_npc_looks.json
Run    : python3 -I .build/build_figures.py   (after build_quests_js.py)
"""
import json
import pathlib
import time
import urllib.request

ROOT = pathlib.Path(__file__).parent.parent
DATA = ROOT / ".build" / "data"
OUT = ROOT / "src" / "data" / "figures.json"
IMG_DIR = ROOT / "public" / "img" / "npcs"
API = "https://api.dofusdb.fr"
RENDER = "https://static.ankama.com/dofus/renderer/look/{}/full/1/300_300-10.png"
MERIANA = 2205

# Achievement -> (key, name, label, look). Looks are the ones the renderer draws: the
# newest dragon looks (99xx) time out there, so the dragons use their earlier ones.
DRAGON = "Dragón primordial"
CURATED = {
    "Verde esmeralda": ("aerafal", "Aerafal", DRAGON, "{3773}"),
    "Púrpura profundo": ("ignemikhal", "Ignemikhal", DRAGON, "{3774}"),
    "Azul turquesa": ("aguabrial", "Aguabrial", DRAGON, "{3233}"),
    "Ocre de ámbar": ("terrakurial", "Terrakurial", DRAGON, "{6891|||250}"),
    "Negro ébano": ("grugalorasalar", "Grugalorasalar", DRAGON, "{5136|||300}"),
    "Blanco marfil": ("dardondakal", "Dardondakal", DRAGON, "{4210}"),
    "La guerra interminable": ("guerra", "Guerra", "Jinete del Selocalipsis", "{5585|||150}"),
    "Prisioneros del mar": ("servidumbre", "Servidumbre", "Jinete del Selocalipsis", "{5598|||120}"),
    "Juicio final": ("miseria", "Miseria", "Jinete del Selocalipsis", "{5596|||150}"),
    "Vivir así es morir de corrupción": ("corrupcion", "Corrupción", "Jinete del Selocalipsis", "{5542|||120}"),
    "Selocalipsis: Resonancia": ("draconiros", "Draconiros", "Selocalipsis", "{5471|||300}"),
    "Selocalipsis: Resiliencia": ("draconiros", "Draconiros", "Selocalipsis", "{5471|||300}"),
    "Selocalipsis: Reminiscencia": ("draconiros", "Draconiros", "Selocalipsis", "{5471|||300}"),
    "Futuro abierto": ("draconiros", "Draconiros", "Selocalipsis", "{5471|||300}"),
    "El árbol que esconde el bosque": ("silvosse", "Silvosse", "Dofus Silvestre", "{6626|||130}"),
}


# Step -> figure for a step with nothing better: step 7's quest is given by the NPC of
# your class, but in it you talk to the goddess Feca.
STEP_FIGURE = {
    "7": ("diosa-feca", "Diosa Feca", "La cólera de los dioses", "{4841}"),
}


# Step -> the quest whose start stands for the step, where the step opens with quests
# it only needs (STEP_EXTRA in build_quests_js.py) and the banner is the step's own: the
# Frigost lines after their "Abono de peaje" dungeon, and the order quest 5 after
# Bonta mission 100.
FIGURE_QUEST = {"31": 592, "40": 593, "52": 595, "83": 2010, "86": 1910, "89": 1917}


def _get(url, raw=False, tries=4):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read() if raw else json.load(r)
        except OSError:
            if attempt == tries - 1:
                raise
            time.sleep(2 + attempt * 3)


def npc_looks(ids):
    cache_file = DATA / "lookup_npc_looks.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}
    missing = sorted({i for i in ids if str(i) not in cache})
    for i in range(0, len(missing), 40):
        chunk = missing[i:i + 40]
        query = "&".join(f"id[$in][]={x}" for x in chunk)
        for rec in _get(f"{API}/npcs?$limit=50&{query}")["data"]:
            cache[str(rec["id"])] = rec.get("look")
        for x in chunk:
            cache.setdefault(str(x), None)
        time.sleep(0.5)
    if missing:
        cache_file.write_text(json.dumps(cache, ensure_ascii=False))
    return {int(k): v for k, v in cache.items()}


def render(key, look):
    """Mirror the renderer's PNG for a look; returns the path under public/img/."""
    path = IMG_DIR / f"{key}.png"
    if not path.exists():
        path.write_bytes(_get(RENDER.format(look.encode().hex()), raw=True))
        time.sleep(0.5)
    return f"npcs/{key}.png"


def main():
    app = json.loads((ROOT / "src" / "data" / "quests.json").read_text())
    plans = json.loads((ROOT / "src" / "data" / "plans.json").read_text())
    raw = {q["id"]: q for q in json.loads((DATA / "quests.json").read_text())}
    IMG_DIR.mkdir(parents=True, exist_ok=True)

    def start_of(qid):
        """Where the quest starts: {mapId, npcId}, {"cls": True} if it depends on the
        class, or just {npcId} when it starts on its own with "go see NPC"."""
        q = raw.get(qid) or {}
        positions = [sp for sp in q.get("startPosition") or [] if sp and sp.get("mapId")]
        if len(positions) > 1 and "PG=" in (q.get("startCriterion") or ""):
            return {"cls": True}
        if positions:
            return positions[0]
        first = next((o for st in q.get("steps") or [] if st for o in st.get("objectives") or [] if o), None)
        if first and first.get("className") == "QuestObjectiveGoToNpcData":
            return {"npcId": (first.get("parameters") or {}).get("parameter0")}
        return None

    starts = {}
    for n, ids in app["STEP_QUESTS"].items():
        if n in FIGURE_QUEST:
            ids = ids[ids.index(FIGURE_QUEST[n]):]
        found = [sp for sp in (start_of(q) for q in ids if q != "clase") if sp]
        # A first quest that depends on the class has no one NPC or map: none is shown
        if found and not found[0].get("cls"):
            starts[n] = found[0]
    looks = npc_looks({sp["npcId"] for sp in starts.values() if sp.get("npcId")})

    out = {}
    for n in map(str, range(1, 101)):
        sp = starts.get(n)
        npc = sp and sp.get("npcId")
        figure = None
        if n in STEP_FIGURE:
            key, name, label, look = STEP_FIGURE[n]
            figure = {"img": render(key, look), "name": name, "as": label}
        for entry in plans.get(n, []):
            pick = not figure and entry["t"] == "a" and CURATED.get(entry["name"])
            if pick and not (pick[2] == DRAGON and npc == MERIANA):
                key, name, label, look = pick
                figure = {"img": render(key, look), "name": name, "as": label}
                break
        if not figure and npc and looks.get(npc):
            quest = app["QUESTS"][str(next(q for q in app["STEP_QUESTS"][n] if start_of(q) == sp))]
            name = (quest.get("st") or {}).get("npc")
            if name:
                figure = {"img": render(f"npc-{npc}", looks[npc]), "name": name, "as": "Inicia el paso"}
        entry = {}
        if sp and sp.get("mapId"):
            entry["m"] = sp["mapId"]
        if figure:
            entry["f"] = figure
        if entry:
            out[n] = entry

    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"figures.json : {len(out)} pasos, {sum('m' in e for e in out.values())} con mapa, "
          f"{sum('f' in e for e in out.values())} con figura")


if __name__ == "__main__":
    main()
