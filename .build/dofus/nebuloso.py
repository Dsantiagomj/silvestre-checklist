"""The Dofus Nebuloso: what the pipeline needs to know about its guide.

Torrente Arcano's 26-step guide to the Eliocalypse dimensions (Anutropía, Sramvil and
Xelorium), with the Dofus de los Vigilantes on the way, imported from its checklist page
(checklist-nebuloso-datos). Loaded by .build/dofus/__init__.py when a script runs with
--dofus nebuloso. The same sections as hielos.py; the reasons come from DofusDB
(startCriterion, objectives, rewards), checked on 2026-11-07.
"""
import re

# Torrente Arcano, where the guide and the walkthroughs of its quests live
SITE = "https://www.torrentearcano.com/"
# The checklist page the guide comes from (import_guide.py keeps it in the snapshot)
SOURCE_URL = SITE + "checklist-nebuloso-datos"
# The Dofus the guide is for: left out of the Dofus the guide hands out on the way
# (DOFUS_ROAD, build_assets_js.py), which is only the Dofus de los Vigilantes
NAME = "Dofus Nebuloso"
# The page brings 26 steps (JSON strings, not template literals) and no
# previousStepsByNewStep: there is no earlier version
STEP_COUNT = 26
PREVIOUS_REQUIRED = False


# ---------------------------------------------------------------------------
# import_guide.py
# ---------------------------------------------------------------------------
SPLIT_TIERS = {}

# Zone and effort tier by hand: the page has neither (its "indice" is empty) and there is
# no previous version to take them from. Zones by DofusDB's areas, as the guide itself
# walks them ("Empezamos Anutropía", "Pasamos a Sramvil", "Vamos a Xelorium"):
#   1–4   Llanuras de Cania: the four achievements of "Una odisea en tres dimensiones"
#         (the Dofus de los Vigilantes) start with the Vigilantes in the Caminos rocosos.
#         Debatable: each one then visits a dimension, and step 4 ends in Amakna and Sufokia.
#   5–12  Anutropía (Crisol de los afortunados, Cantera aurífera, Retiro de los eternos,
#         Palacio del Rey Nidas), up to talking to the god Anutrof.
#   13–18 Sramvil (Callejas de los canales Keleto, Cima tenebrosa, Catacombrías).
#   19–26 Xelorium (Caminos del Ayer, Futuros Inciertos, Día Presente). Step 26 starts in
#         the Pueblo de Amakna but its fight, the Pájaro del tiempo, is in the Megalito de
#         Fraktal.
# The tier is a rough estimate (the app does not use it): trivial = only talking, corto =
# one quest or advancing to a stop, medio = a dungeon or several quests, largo = a whole
# achievement with dungeons.
CANIA, ANUTROPIA, SRAMVIL, XELORIUM = "Llanuras de Cania", "Anutropía", "Sramvil", "Xelorium"
_TIERS = {
    "trivial": [12, 18, 25],
    "corto": [7, 14, 20],
    "largo": [4, 6, 10, 15, 16, 17, 21, 24, 26],
}
_TIER = {n: tier for tier, ns in _TIERS.items() for n in ns}
_ZONE = {**{n: CANIA for n in range(1, 5)},
         **{n: ANUTROPIA for n in range(5, 13)},
         **{n: SRAMVIL for n in range(13, 19)},
         **{n: XELORIUM for n in range(19, 27)}}
STEP_ZONE = {n: (_ZONE[n], _TIER.get(n, "medio")) for n in range(1, STEP_COUNT + 1)}

CLOSES = {}
UPDATES = {}

# Nothing in the page's text to rewrite.
TEXT_FIXES = {}


# ---------------------------------------------------------------------------
# import_guide_links.py
# ---------------------------------------------------------------------------
# Steps 12, 18 and 25 are only "Habla con el Dios Anutrof/Sram/Xelor.": a talk with the
# god's herald once the zone's four achievements are done, not a DofusDB quest. Torrente
# Arcano has a page for each, titled "Hablar con el dios X".
GODS = {"Anutrof": "anutrof", "Sram": "sram", "Xelor": "xelor"}
TEXT_MISSIONS = [f"Habla con el Dios {god}" for god in GODS]
MISSION_URLS = {f"Habla con el Dios {god}": SITE + f"hablar-con-el-dios-{slug}" for god, slug in GODS.items()}
EXTRA_ACHIEVEMENTS = {}


# ---------------------------------------------------------------------------
# build_assets_js.py
# ---------------------------------------------------------------------------
# Hero background, one map per theme, picked by eye:
#   dark  — the Megalito de Fraktal, where the Pájaro del tiempo is fought (step 26): a
#           clock-face pool under a violet night.
#   light — the Crisol de los afortunados, the heart of Anutropía (step 5): gold and
#           blue crystals.
HERO_MAPS = {"dark": "maps/1/148898305.jpg", "light": "maps/1/131597312.jpg"}

# Header logo: the Dofus Nebuloso item itself (8698, icon 23016).
BRAND_ICON = "items/23016.png"

# Theme switch: the Dofus de los Vigilantes, the one the guide hands out on the way (item
# 16061, icon 23020), for light, and the Dofus Nebuloso for dark. Their names go in
# themeNames of src/dofus/nebuloso/config.js.
THEME_ICONS = {"light": "items/23020.png", "dark": "items/23016.png"}

# Prerequisites from the guide's introduction (the page has no step "0"). "Cualquier
# oficio" names no job: no icon.
PREREQ_JOBS = {}

PREREQ_SPELLS = {
    "h1": ("spells/sort_12461.png", "Captura de Almas"),
}

# "Una odisea en tres dimensiones" (1187) gives the Dofus de los Vigilantes once its four
# achievements are done: "De un mundo al otro", "A las puertas de la noche", "Generaciones
# futuras" and "Las apariencias engañan" (OA=1072, 1102, 1142, 1186). No step names it,
# so the last of the four, step 4, carries the egg: achievement id -> (item id, icon, name).
MISSING_DOFUS = {1186: (16061, "items/23020.png", "Dofus de los vigilantes")}

# No prerequisites note (the Silvestre's is the Dofus Ocre): no icon.
OCRE_ICON = None


# ---------------------------------------------------------------------------
# build_quests_js.py
# ---------------------------------------------------------------------------
MISSING_OBJECTIVES = {}
MISSION_TYPOS = {}
# Quests a step needs that its text doesn't name, put first. A step that names only
# mission N of an achievement needs the ones before it (each starts with Qf= the
# previous one):
#   8: "El rey y yo", misión 4 ("Anutrof salve al rey", 1495, Qf=1494) needs missions 1
#      to 3 (1492, 1493, 1494); step 10 completes the achievement.
#   22: "El pozo del loco", misión 4 ("La verdad está oculta en un pozo", 1582, Qf=1581)
#      needs missions 1 to 3 (1579, 1580, 1581). No later step completes the achievement:
#      step 23 does mission 5, which only needs "Al filo del mañana" (Qf=1596, step 21).
STEP_EXTRA = {8: [1492, 1493, 1494], 22: [1579, 1580, 1581]}
SUBQUESTS = {}
STEP_SKIP = {}
QUEST_AFTER = {}
QUEST_BEFORE = {}
OBJECTIVE_ORDER = {}
TAKE_ONLY = {}
OPTIONAL_EXTRA = {}
IN_TEXT_ORDER = set()


# ---------------------------------------------------------------------------
# build_weights.py
# ---------------------------------------------------------------------------
LEVEL_FROM_MONSTERS = set()


# ---------------------------------------------------------------------------
# build_figures.py
# ---------------------------------------------------------------------------
MERIANA = None
DRAGON = None
CURATED = {}

# Step -> figure for the steps with no quest of their own: 12, 18 and 25 only ask to talk
# to the god of the dimension ("Habla con el Dios Anutrof"). Looks from DofusDB (npcs),
# with a scale: the bare ones do not render.
STEP_FIGURE = {
    "12": ("dios-anutrof", "Dios Anutrof", "Se habla con", "{2711|||100}"),
    "18": ("dios-sram", "Dios Sram", "Se habla con", "{2777|||100}"),
    "25": ("dios-xelor", "Dios Xelor", "Se habla con", "{2965|||100}"),
}

FIGURE_QUEST = {}


# ---------------------------------------------------------------------------
# fetch_zone_maps.py
# ---------------------------------------------------------------------------
# One landscape per zone, among the maps its quests go through: the Vigilantes' hall of
# portals in the Caminos rocosos (where steps 1–4 and most quests start), the Crisol de
# los afortunados (Anutropía), the Callejas de los canales Keleto (Sramvil) and the
# Caminos del Ayer (Xelorium).
ZONE_MAPS = {
    CANIA: 130025985,
    ANUTROPIA: 131597312,
    SRAMVIL: 137364480,
    XELORIUM: 145229323,
}


# ---------------------------------------------------------------------------
# build_resources.py
# ---------------------------------------------------------------------------
# Names the page misspells -> DofusDB's: the Píxel de kaxaco of "Energía renovable"
# (step 3, as its guide writes it) and the key of "El maleficio del cofre" (step 5), which
# step 11 already writes right.
CORRECTIONS = {"Píxel de kaxako": "Píxel de kaxaco",
               "Llave de la Fábrica del Malefíscof": "Llave de la Fábrica de Malefíscof"}
ALIASES = {}
# Rows that name no DofusDB item, with a representative icon:
#   the spell of step 5 ("Hechizos": Captura de almas), with the prerequisite's icon;
#   the "1 x Kama" of step 5: DofusDB has no kamas item (a search by prefix answers the
#   Kama enigmático), so the Bolsa de kamas icon (item 8922, icon 24243). No guide of the
#   step's quests says what it is for.
GENERIC_IMG = {"captura de almas": "spells/sort_12461.png", "kama": "items/24243.png"}

REUSABLE = set()

# The page has no step "0": the prerequisites need no items.
PREREQ_OF = {}
DUPLICATES = {}

# Rows the page puts one step early, checked against DofusDB (objectives) and the quests'
# guides on Torrente Arcano: what "El barbero de Anutropía" (step 9) hands to Wello. None of
# step 8's quests ("El rey y yo", missions 1 to 4) asks for them.
BARBERO = "El barbero de Anutropía"
MOVED = {
    "8": ("9", {"15177": BARBERO, "15178": BARBERO, "15179": BARBERO, "15180": BARBERO}),
}
EXTRA_ITEMS = {}
CHOSEN_ORDER = {}

# Nothing is listed only in case an alteration is gone.
OPTIONAL_ITEM = re.compile(r"(?!)")


# ---------------------------------------------------------------------------
# audit_resources.py
# ---------------------------------------------------------------------------
# The quest each row is for where the audit cannot tell: the guide writes another name or
# says it without a quantity. Step -> {item key: quest}.
#   5: "Cofrología" asks for "Hechizo Captura de almas (aunque no lo usarás)".
#   13: the guide of "Un ring para gobernarlos a todos" calls it "Llave de la mazmorra del
#       Ring Eskarlata".
#   19: the guide of "Anomalía temporal" writes "Aceite de girasol"; DofusDB only has the
#       Aceite de girasol salvaje.
#   26: "En busca del pájaro del tiempo" opens with "Enséñale a … 1 x Dofus de los
#       vigilantes": shown, not handed over.
MANUAL = {
    "5": {"x:captura de almas": "Cofrología"},
    "13": {"15477": "Un ring para gobernarlos a todos"},
    "19": {"389": "Anomalía temporal"},
    "26": {"16061": "En busca del pájaro del tiempo"},
}
GIVES_ITS_ITEMS = {}
