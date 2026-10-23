"""The Dofus de los Hielos: what the pipeline needs to know about its guide.

Torrente Arcano's 70-step guide to the Frigost lines, imported from its checklist page
(checklist-hielos-datos). Loaded by .build/dofus/__init__.py when a script runs with
--dofus hielos. The same sections as silvestre.py; the reasons come from DofusDB
(startCriterion, objectives) and the quests' own guides on Torrente Arcano, checked
on 2026-10-22/23.
"""
import re

# Torrente Arcano, where the guide and the walkthroughs of its quests live
SITE = "https://www.torrentearcano.com/"
# The checklist page the guide comes from (import_guide.py keeps it in the snapshot)
SOURCE_URL = SITE + "checklist-hielos-datos"
# The Dofus the guide is for: left out of the Dofus the guide hands out on the way
# (DOFUS_ROAD, build_assets_js.py). It is the only one: DOFUS_ROAD is empty
NAME = "Dofus de los Hielos"
# The page brings 70 steps and no previousStepsByNewStep: there is no earlier version
STEP_COUNT = 70
PREVIOUS_REQUIRED = False


# ---------------------------------------------------------------------------
# import_guide.py
# ---------------------------------------------------------------------------
SPLIT_TIERS = {}

# Zone and effort tier by hand: the page has neither and there is no previous version to
# take them from. Zones by where what the step asks for happens (its stop or its
# dungeon), not by its starting NPC, grouped by DofusDB's subareas: Frigost I (Burgo,
# Campos de hielo, Lago helado, Bosque de los Pinos Perdidos, Cuna de Alma), Frigost II
# (Pueblo Sepultado, Bosque Petrificado, Grieta Bú, Colmillos de Cristal, Lágrimas de
# Uronigrido, Monte Tórrido) and Frigost III (the castle of Kontatrás and its dungeons);
# the guide itself says "jefes de Frigost 3" (step 58). Debatable ones: 18 starts at the
# Castillo de Amakna and stops in the Caverna del Destino (Grieta Bú, II); 29, 45, 47 and
# 48 stay with their NPC in the Burgo (I); 49 starts there but happens in the castle (III).
# The tier is a rough estimate (the app does not use it): trivial = only talking or
# visiting, corto = one quest or advancing to a stop, medio = a dungeon or several
# quests, largo = a whole line or a long farm.
FRIGOST_I, FRIGOST_II, FRIGOST_III = "Frigost I", "Frigost II", "Frigost III"
_TIERS = {
    "trivial": [4, 5, 14, 17, 45, 69],
    "medio": [6, 13, 21, 23, 26, 30, 32, 33, 34, 35, 36, 40, 44, 49, 52, 57, 58, 60, 61, 62, 64, 65],
    "largo": [2, 8, 9, 12, 41, 54, 68],
}
_TIER = {n: tier for tier, ns in _TIERS.items() for n in ns}
_ZONE = {**{n: FRIGOST_I for n in [*range(1, 18), 19, 20, 21, 29, 45, 47, 48]},
         **{n: FRIGOST_II for n in [18, *range(22, 29), *range(30, 45), 46]},
         **{n: FRIGOST_III for n in range(49, 71)}}
STEP_ZONE = {n: (_ZONE[n], _TIER.get(n, "corto")) for n in range(1, STEP_COUNT + 1)}

# Earlier steps a step finishes that its text does not name (DofusDB confirms each):
# 13: step 8 stops at "hasta tener que pasar Morsagüino Real" ("Los cazadores"); the
#     Morsagüino is passed in 13, and step 20's "Prefiere morir en el mar" needs it (Qf=591).
# 62: "La vida de castillo" (step 50, "se actualizará sola") has the five quests of
#     "Nobleza obliga" as objectives; the last one falls with Mizz Frizz in 62.
# 66: "Los últimos supervivientes" (step 53, "se irá actualizando sola") ends with
#     "Crisis de Ex - Emma", finished in 66.
# 68: "Una friolera de revelaciones" (step 64) stops at the Conde Kontatrás, passed in 68;
#     the quests of step 69 need it finished (Qf=1327).
CLOSES = {13: [8], 62: [50], 66: [53], 68: [64]}

# Earlier steps a step updates that its marks do not say: "Al maestro, cuchillada",
# which step 58 takes before Nileza (STEP_EXTRA), goes on with Sylargh (60) and Klim
# (61); step 62 finishes it with Mizz Frizz.
UPDATES = {60: [58], 61: [58]}


# ---------------------------------------------------------------------------
# import_guide_links.py
# ---------------------------------------------------------------------------
TEXT_MISSIONS = []
MISSION_URLS = {}
EXTRA_ACHIEVEMENTS = {}


# ---------------------------------------------------------------------------
# build_assets_js.py
# ---------------------------------------------------------------------------
# Hero background, one map per theme, picked by eye:
#   dark  — the room of the Mazmorra del Conde Kontatrás where Jiva gives steps 69 and
#           70: a platform over the clouds under a violet sky.
#   light — Lago helado, where Damar fishes (step 12): turquoise ice and igloos.
HERO_MAPS = {"dark": "maps/1/112204547.jpg", "light": "maps/1/54167350.jpg"}

# Header logo: the Dofus de los Hielos item itself.
BRAND_ICON = "items/23005.png"

# Theme switch: the same eggs as the Silvestre (Dofus Marfil and Dofus Ébano) until the
# UI of this Dofus picks its own.
THEME_ICONS = {"light": "items/23011.png", "dark": "items/23007.png"}

# Prerequisites from the guide's introduction (the page has no step "0"). Jobs and
# spells use their DofusDB ids: Herrero 11, Manitas 65, Sastre 27, Joyero 16, Minero 24.
PREREQ_JOBS = {"o1": [11], "o2": [65], "o3": [27], "o4": [16], "o5": [24]}

PREREQ_SPELLS = {
    "h1": ("spells/sort_12461.png", "Captura de Almas"),
}

# "Recién puesto" (step 69) gives the Dofus de los Hielos through its quest "El dofus de
# los hielos", but DofusDB lists it as the reward of neither: achievement id -> (item id,
# icon, name), so the step shows the egg.
MISSING_DOFUS = {920: (7043, "items/23005.png", "Dofus de los hielos")}

# No prerequisites note (the Silvestre's is the Dofus Ocre): no icon.
OCRE_ICON = None


# ---------------------------------------------------------------------------
# build_quests_js.py
# ---------------------------------------------------------------------------
MISSING_OBJECTIVES = {}

# Mission names the guide misspells -> DofusDB's: step 57 "La niita de papá" (1321),
# step 35 "El SLIP está que arde" (678).
MISSION_TYPOS = {"La niita de papá": "La niñita de papá", "El SLIP está que arde": "El S.L.I.P. está que arde"}

# Quests a step needs that its text doesn't name, put first. "Al maestro, cuchillada"
# (mission 5 of "La llegada del invierno") is in no step, but "Un conde con mucho cuento"
# (step 68) and "El dofus de los hielos" (69) need it finished (Qf=1309). Its objectives
# are beating Nileza, Sylargh, Klim and Mizz Frizz: it has to be taken (André Davul,
# Jardines Invernales) before the fight with Nileza in step 58, and step 62 finishes it
# with Mizz Frizz (QUEST_AFTER puts it after that step's own quest).
STEP_EXTRA = {58: [1309], 62: [1309]}

SUBQUESTS = {}

# Quests a step names but does not do. Step 1 numbers its mission ("misión 1", the
# generic row of "Prólogo invernal") and then names the three it may be, one per
# alignment: they are that row, not quests of their own.
STEP_SKIP = {1: [710, 711, 1316]}

# Step 62: "Al maestro, cuchillada" after "La última carta", the step's own quest.
QUEST_AFTER = {1309: 1339}

QUEST_BEFORE = {}

OBJECTIVE_ORDER = {}

# Quests the guide only asks to have taken, not to do:
#   14: "Luces y sombras": "No es necesario vencerlo: solo hay que coger la misión y entrar
#       en la cueva". Nothing on the route needs it finished (no Qf=1286 in any start).
#   67: "Los caminantes blancos": "También empezarás la misión… Puedes ignorarla", but
#       "Se busca: conde Kontatrás" needs it in progress (Qa=1331).
#   69: "La gota que colma el frasco" starts here and step 70 finishes it ("puedes
#       terminar el logro «Epílogo invernal»"): step 69 is done when Jiva gives the Dofus.
TAKE_ONLY = {14: [1286], 67: [1331], 69: [1328]}

OPTIONAL_EXTRA = {}

IN_TEXT_ORDER = set()


# ---------------------------------------------------------------------------
# build_weights.py
# ---------------------------------------------------------------------------
LEVEL_FROM_MONSTERS = set()


# ---------------------------------------------------------------------------
# build_figures.py
# ---------------------------------------------------------------------------
# No curated figures yet (the UI of this Dofus picks them): each step shows the NPC that
# starts it or, without one, the boss it resolves.
MERIANA = None
DRAGON = None
CURATED = {}
STEP_FIGURE = {}

# Step 58 opens with "Al maestro, cuchillada" (STEP_EXTRA), taken from André Davul; the
# banner is the one of the step's own quest, "Más allá de la muralla" (Hazieff Tarún).
FIGURE_QUEST = {"58": 1323}


# ---------------------------------------------------------------------------
# fetch_zone_maps.py
# ---------------------------------------------------------------------------
# One landscape per zone, among the maps its quests go through: Lago helado (Damar,
# step 12), Pueblo Sepultado (Ertsevlis, step 46) and the Entrada del castillo de
# Kontatrás (steps 50–62).
ZONE_MAPS = {
    FRIGOST_I: 54167350,
    FRIGOST_II: 54172488,
    FRIGOST_III: 108922368,
}


# ---------------------------------------------------------------------------
# build_resources.py
# ---------------------------------------------------------------------------
# The 85 rows resolve by their exact name in DofusDB
CORRECTIONS = {}
ALIASES = {}

# The page's compiled list just adds everything up; nothing is listed twice that is kept
# after use, so nothing counts once.
REUSABLE = set()

# The page has no step "0": the prerequisites need no items.
PREREQ_OF = {}
DUPLICATES = {}

# Rows the page puts one step early. Step -> (step they belong to, {item: why}), checked
# against DofusDB (objectives and recipes) and the quests' guides on Torrente Arcano. Only
# where the quest is plainly in the next step; the Piedra de alma mediana (19, for 20),
# the Pandaburg (22) and the Slip ekeñín (32) stay where the page lists them.
#   8 -> 9: what "Hotel de hielo" and "La desglaciación" ask for, through their recipes.
#       Cadenas rotas and Caparazón verde (no quest on the route asks for them) stay in 8.
#   34 -> 35: what "El S.L.I.P. está que arde" asks for, and the underwear its fight with
#       the Jalamut Real is about. The Llaves del Hipogeo stay: 34 already goes in.
#   38 -> 39: "Entrégale a Nukoben Colombo: 35 x Madera de álamo temblón" (597).
#   48 -> 49: the recipe of the Velo de tristeza (14038), which "Frío... caliente... ¡que
#       te quemas!" asks to craft.
RECIPES_9 = "Hotel de hielo / La desglaciación"
SLIP = "El S.L.I.P. está que arde"
VEIL = "Frío... caliente... ¡que te quemas!"
MOVED = {
    "8": ("9", {
                 "312": RECIPES_9, "7013": RECIPES_9, "444": RECIPES_9, "11229": RECIPES_9, "11250": RECIPES_9, "11241": RECIPES_9, "447": RECIPES_9, "445": RECIPES_9,
                 "11107": RECIPES_9, "11227": RECIPES_9, "11243": RECIPES_9, "11223": RECIPES_9, "443": RECIPES_9, "11136": RECIPES_9, "11117": RECIPES_9, "11248": RECIPES_9,
                 "11120": RECIPES_9, "11254": RECIPES_9, "11257": RECIPES_9, "11238": RECIPES_9, "11222": RECIPES_9, "11224": RECIPES_9, "11230": RECIPES_9, "11247": RECIPES_9,
                 "11225": RECIPES_9, "11253": RECIPES_9, "11226": RECIPES_9, "6457": RECIPES_9, "747": RECIPES_9, "9941": RECIPES_9, "1334": RECIPES_9, "21256": RECIPES_9,
                 "11231": RECIPES_9, "11239": RECIPES_9, "2481": RECIPES_9, "391": RECIPES_9, "11242": RECIPES_9, "11240": RECIPES_9, "11228": RECIPES_9, "11251": RECIPES_9,
                 "16165": RECIPES_9, "2250": RECIPES_9, "11255": RECIPES_9, "11246": RECIPES_9, "11252": RECIPES_9, "11256": RECIPES_9, "11249": RECIPES_9, "13487": RECIPES_9,
                 "2484": RECIPES_9, "1770": RECIPES_9, "8354": RECIPES_9, "18368": RECIPES_9, "844": RECIPES_9, "2502": RECIPES_9, "2060": RECIPES_9, "2273": RECIPES_9,
    }),
    "34": ("35", {"11338": SLIP, "11339": SLIP, "11880": SLIP, "11885": SLIP, "11882": SLIP,
                  "11337": SLIP, "11889": SLIP, "13423|6812": SLIP}),
    "38": ("39", {"11107": "Un amigo que te quiere... porque algo quiere"}),
    "48": ("49", {"13919": VEIL, "13941": VEIL, "13977": VEIL, "12001": VEIL, "13929": VEIL}),
}

EXTRA_ITEMS = {}

# Nothing is listed only in case an alteration is gone.
OPTIONAL_ITEM = re.compile(r"(?!)")


# ---------------------------------------------------------------------------
# audit_resources.py
# ---------------------------------------------------------------------------
MANUAL = {}
GIVES_ITS_ITEMS = {}
