"""The Dofus Silvestre: what the pipeline needs to know about its guide.

Sandglass's 100-step guide, imported from Torrente Arcano's classic checklist. Loaded
by .build/dofus/__init__.py when a script runs with --dofus silvestre (the default).
Each section holds the tables one script used to define itself, with their reasons:
they are about this guide's steps, quests and items, not about how the script works.
"""
import re

# Torrente Arcano, where the guide and the walkthroughs of its quests live
SITE = "https://www.torrentearcano.com/"
# The checklist page the guide comes from (import_guide.py keeps it in the snapshot)
SOURCE_URL = SITE + "checklist-silvestre"
# The Dofus the guide is for: left out of the Dofus the guide hands out on the way
# (DOFUS_ROAD, build_assets_js.py)
NAME = "Dofus Silvestre"
# How many steps the page must bring, and whether it must bring previousStepsByNewStep
# (the table that carries progress over from the previous version of the guide)
STEP_COUNT = 100
PREVIOUS_REQUIRED = True


# ---------------------------------------------------------------------------
# import_guide.py
# ---------------------------------------------------------------------------
# Old step 75 bundled four Selocalipsis achievements; v4 gives each its own step.
SPLIT_TIERS = {74: "largo", 75: "largo", 76: "largo", 77: "medio"}

# Zone and effort tier by hand (step -> (zone, tier)): none, every step keeps the ones of
# the previous version of the guide
STEP_ZONE = {}

# Earlier steps a step finishes that its text does not name. Step 87 finishes "Las
# cuatro voluntades", which step 73 leaves at its 2nd objective: its quests need
# "Toma de conciencia", which needs it finished.
CLOSES = {87: [73]}

# Earlier steps a step updates that its marks do not state outright. Step 81's note is
# a reminder: "en la sala 3 de Golosotrón se obtiene un recurso necesario para terminar
# la misión del inciso 63". Golosotrón is passed in 81, so step 63 is picked up there.
UPDATES = {81: [63]}


# ---------------------------------------------------------------------------
# import_guide_links.py
# ---------------------------------------------------------------------------
# Missions the text names without the "misión: X" form, so MISSION misses them:
# step 100 says "Se debe hacer la misión Flovoración en algún punto de esta", step 38
# "se puede lanzar la misión La sombra del reino".
TEXT_MISSIONS = ["Flovoración", "La sombra del reino"]

# Our own missionUrlOverrides, for names the guide misspells: step 92 writes "Los tótems
# de Maimame", and the page is the one of "Los tótems de Maimane".
MISSION_URLS = {"Los tótems de Maimame": SITE + "los-totems-de-maimane"}

# Achievements the text names that achievementLinks lacks: step 1 "incluye también el logro
# "En marcha hacia la aventura" y el logro "Un ciudadano modelo"". Both pages answer;
# "Respuestas para todo", a quest of the first one, has none.
EXTRA_ACHIEVEMENTS = {"En marcha hacia la aventura": SITE + "en-marcha-hacia-la-aventura",
                      "Un ciudadano modelo": SITE + "un-ciudadano-modelo"}


# ---------------------------------------------------------------------------
# build_assets_js.py
# ---------------------------------------------------------------------------
# Hero background, one map per theme, picked by eye:
#   dark  — Refugio Silvestre: snowy fir forest at dusk; it even shares the name.
#   light — Mazmorra de los Escarahojas: a sunny forest that reads well without a veil.
HERO_MAPS = {"dark": "maps/1/223350028.jpg", "light": "maps/1/88080387.jpg"}

# Header logo: the Dofus Silvestre item itself.
BRAND_ICON = "items/23036.png"

# Theme switch: Dofus Marfil (light) and Dofus Ébano (dark), the rewards of the
# guide's "Blanco marfil" and "Negro ébano" achievements.
THEME_ICONS = {"light": "items/23011.png", "dark": "items/23007.png"}

# Prerequisites from the guide. Achievements and quests resolve by name; jobs and
# spells use their DofusDB ids, checked by hand on 2026-10-13.
PREREQ_JOBS = {
    "o1": [60, 13], "o2": [79], "o3": [65], "o4": [24, 26], "o5": [28],
    "o6": [28, 26, 2, 36],
}

PREREQ_SPELLS = {
    "h1": ("spells/sort_12461.png", "Captura de Almas"),
    "h2": ("spells/sort_11763.png", "Llamilla"),
    "h3": ("spells/sort_11775.png", "Zanahowia Sabwosa"),
}

# Dofus DofusDB lists as no reward at all: achievement id -> (item id, icon, name).
# "El fin de la eternidad" (step 79) is the achievement for finishing "La eterna
# cosecha", the long quest that gives the Dofus Ocre; DofusDB has neither its
# objectives nor its reward.
MISSING_DOFUS = {
    565: (7754, "items/23012.png", "Dofus Ocre"),
    # The Piñata de pino comes from a side quest (Grunob, then Goblepino) that opens
    # once "El secreto de los dofus: Prólogo" is done; the guide counts it there.
    5222: (27803, "items/23035.png", "Piñata de pino"),
}

# The prerequisites note recommends starting it early: it shows the egg.
OCRE_ICON = "items/23012.png"


# ---------------------------------------------------------------------------
# build_quests_js.py
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Step -> quests
# ---------------------------------------------------------------------------
# Achievements DofusDB has no objectives for: achievement id -> its quests in order.
# "El fin de la eternidad" (step 79) is the achievement for finishing "La eterna cosecha".
MISSING_OBJECTIVES = {565: [439]}

# Quests a step needs that its text doesn't name, put first. Step 78 is "hasta la misión
# de orden 4": the four order quests of Espíritu de la salvación, each one requiring the
# previous (startCriterion Qf=). Step 80's "Alma máster" requires "La última piedra",
# mission 1 of "Cuatro de seis", which can only start after step 79. Step 89 is the
# order quest 5 of the same line, which requires the 4th (need.quests) and alignment
# level 100 (Pa>99): before it goes Bonta mission 100, "El exorcista" (Pa=99&Qf=1901),
# since step 85 stops at mission 99. Step 12's
# "Espionaje industrial" requires "El maleficio del cofre" (after "Cofrología" and
# "Tesorfanato") and "Las grandes galerías" (startCriterion Qf=). Step 83's "Birk, hija de Bork" requires
# "Llama, amigo y entra", mission 1 of "Allá bajo la montaña" (Qf=2010).
# "Abono de peaje" is in no step, but the Frigost lines ask for its quests (Qf=), each
# one the run of a dungeon: each goes in the step of the first quest that asks for it.
# 31: "Prefiere morir en el mar" asks for "Antimonárquico" and "Las joyas de la corona";
# 40: "Calefacción a bajo coste", for "Duerme y tendrás un pastel"; 52: "Quién saca
# beneficio del jalamut", for "Lavandería automática", and "Almacén de avituallamiento",
# for "Hace fresco, pero no importa"; 83: "Llama, amigo y entra", for "Canozzirujana";
# 86: "La guardia muere, pero no se rinde", for "Allá arriba, en el pico helado...".
# They ask for nothing among themselves, so "Allá en la montaña..." stays out.
# Step 87's two quests need "Toma de conciencia" taken (Qa=2138), and it needs "Las
# cuatro voluntades" finished (Qf=2122), which step 73 leaves at its 2nd objective: 87
# finishes it (it closes 73, CLOSES in import_guide.py) and takes the other (TAKE_ONLY),
# done in step 91.
# Step 33's "La razón del más fuerte" needs "La eterna cosecha" in progress or finished
# ((Qa=439|Qf=439)): 33 takes it (TAKE_ONLY), right before (QUEST_BEFORE); step 79 finishes
# it. Step 38's red says "La sombra del reino" can be started during mission 3 ((Qa=1656
# &Qo>9997)) and done any time before step 80; step 81's "La sombra de lo que era" needs
# it finished (Qf=1665). 38 does it, right after "Esto parece el Sur" (QUEST_AFTER).
STEP_EXTRA = {12: [1504, 1505, 1506, 1507], 31: [619, 620], 33: [439], 38: [1665], 40: [621], 52: [622, 623],
              78: [434, 111, 121, 423], 80: [1782], 83: [624, 2010], 86: [626], 87: [2122, 2138], 89: [1903, 1917]}

# Quests another quest gives on the way and that it waits for, right after it in every
# step that lists it. "Birk, hija de Bork" (step 83) gives "Los enemigos de mis enemigos
# son mis enemigos" (Qa=2011&Qo=14269, "Resuelve el problema de Birk") and "Los
# nanoinsumisos" (Qo=14272, "Ayuda a liberar al general Dourak"), and goes on only when
# each is finished (Torrente Arcano: "Debes completarla", "Una vez termines su misión,
# habla con el General Dourak"): both before the red line, which is past Dazahk.
SUBQUESTS = {2011: [2019, 2012]}

# Quests a step names but cannot do. Step 53 is "hasta la misión 3" of "El guardián del
# inmaculado", but its mission 2, "Hasta su último suspiro", starts past the fight with
# Kumijo in mission 3 (Qa=2180&Qo>16870), where step 53 stops: step 56 does it.
STEP_SKIP = {53: [2198]}

# Quest -> the quest it starts from, where the achievement lists it before: it goes right
# after it in every step that lists both. "Hasta su último suspiro" is mission 2 of "El
# guardián del inmaculado" but starts in mission 3, "Réquiem por un yokai" (Qa=2180).
# "La huida es la mejor salida" (step 16) needs "Nuestros amigos los animalitos"
# finished (Qf=1848), which the achievement lists after it.
QUEST_AFTER = {2198: 2180, 1849: 1848, 1665: 1656}

# Quest -> the quest that needs it, where it would go elsewhere: it goes right before it
# in every step that lists both. Step 33 takes "La eterna cosecha" for "La razón del más
# fuerte" (STEP_EXTRA).
QUEST_BEFORE = {439: 2442}

# Objectives of one stage can be done in any order; DofusDB lists them in one. Where the
# guide does them in another, (quest, stage) -> the new order, so the red line falls in
# its place. Step 39 passes Tynril and Morsagüino and leaves Funoroshi for step 48; step
# 50 passes Roca negra (Ben el Ripata), Kimbo and Obsidiantre and leaves Sfinter Cell
# for step 51.
OBJECTIVE_ORDER = {(1660, 0): [1, 2, 0, 3], (1661, 0): [1, 2, 3, 0, 4]}

# Quests the guide only asks to have taken, not to do. Step 28: "En este punto se debe
# tomar la misión de la Isla de Frigost: Logro "La cantera de hielo", misión 4: Luces y
# sombras. No es necesario hacerla, solo tenerla tomada." Its wording is unique, so it
# is listed by hand instead of parsed. Step 83 stops "justo después de pasar Dazahk
# Martegel y obtener la misión: La biblia de los rencores": taken, done later. Step 87
# takes "Toma de conciencia", which its two quests need in progress (STEP_EXTRA).
# Step 33 takes "La eterna cosecha", which "La razón del más fuerte" needs in progress;
# step 79 finishes it.
TAKE_ONLY = {28: [1286], 33: [439], 83: [2013], 87: [2138]}

# Quests a step adds (STEP_EXTRA) that do not hold it open. Step 38: "La sombra del reino"
# is not part of "Azul turquesa"; its red says it "se puede lanzar" during mission 3 and
# done "en cualquier punto hasta antes del inciso 80". So completing the achievement (step
# 62) finishes step 38 too; step 81's quest still needs it finished (PREREQS).
OPTIONAL_EXTRA = {38: [1665]}

# Steps whose missions go in the order the text names them, not the achievement's. Step
# 87: "misión 4: La guerra de cania…, misión 3: El juicio de la muerte"; they can only be
# done one at a time (startCriterion Qa!), and the 3rd is the one that waits for Ilyzaelle.
IN_TEXT_ORDER = {87}


# ---------------------------------------------------------------------------
# build_weights.py
# ---------------------------------------------------------------------------
LEVEL_FROM_MONSTERS = {"439"}  # La eterna cosecha


# ---------------------------------------------------------------------------
# build_figures.py
# ---------------------------------------------------------------------------
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
# your class, but in it you talk to the goddess Feca. Step 43's three quests start with
# three different NPCs, none of them the step's: the Daimia Hikomi stands for Pandala.
STEP_FIGURE = {
    "7": ("diosa-feca", "Diosa Feca", "La cólera de los dioses", "{4841}"),
    "43": ("daimia-hikomi", "Daimia Hikomi", "De qué madera estoy hecho", "{5784|||100}"),
}

# Step -> the quest whose start stands for the step, where the step opens with quests
# it only needs (STEP_EXTRA in build_quests_js.py) and the banner is the step's own: the
# Frigost lines after their "Abono de peaje" dungeon, the order quest 5 after Bonta
# mission 100, and step 87's own quests after the ones of steps 73 and 91 it needs.
FIGURE_QUEST = {"31": 592, "40": 593, "52": 595, "83": 2010, "86": 1910, "87": 2137, "89": 1917}


# ---------------------------------------------------------------------------
# fetch_zone_maps.py
# ---------------------------------------------------------------------------
ZONE_MAPS = {
    "Misiones de Mundo": 173015560,
    "Astrub": 190843396,
    "Krosmoz": 192677892,
    "Justicieros": 88212247,
    "Torres de la Hermandad": 188220416,
    "Cania": 126092568,
    "Sidimote": 216663046,
    "Dimensiones Divinas": 129763328,
    "Sufokia": 169082884,
    "Animatopía": 179307011,
    "Alineamiento": 188746241,
    "Isla de Frigost": 54173998,
    "Reino de Amakna": 88083730,
    "Selocalipsis": 202899464,
    "Isla de Pandala": 205522436,
    "Archipiélago de Valonia": 224790533,
    "Atolón de los Poseídos": 214962179,
}


# ---------------------------------------------------------------------------
# build_resources.py
# ---------------------------------------------------------------------------
# Mistakes in the page's lists, confirmed by players. Applied to the per-step data
# and to the compiled list alike, so the check still compares like with like.
CORRECTIONS = {
    "Hoja de kalipto": "Flor de kalipto",   # no such leaf exists; the guide means the flower
    "Filtro de dragonalgas": "Filtro de amor",  # what "En busca de un herrero" asks for (33380)
}

# Names that differ from DofusDB's Spanish name
ALIASES = {
    "jalabola dedicada a bonta": 26059,     # "Jalabola dedicada de Bonta"
    "jalabola dedicada a brakmar": 26061,   # "Jalabola dedicada de Brakmar"
    "pocima sesamobolizante": 10204,        # "Pócima de sesamobolizante"
}

# Same rules as the page's compiled list (buildCompiledResourcesData): these are kept
# after use, so two steps asking for one still need just one.
REUSABLE = {"mazorrasombrero", "varita pitusa", "piedra de alma mediana",
            "calzoncillo de repuesto de capitan chafer"}

# The page lists what the prerequisites need without saying which one asks for it.
# Item -> prerequisite id (PREREQS_LOGROS in steps.js), from the objectives of each
# prerequisite's quests in DofusDB (need.generated.items). Casco and Alas de madera
# are for the cannon to the island of Moon in "Ida sin vuelta" (Pan Koko Mío): it only
# asks to carry them, so DofusDB has no objective for them; torrentearcano's guide to
# that quest says so. Completing the prerequisite counts its items as spent.
PREREQ_OF = {
    "399": "l4", "429": "l4", "1002": "l4", "2551": "l4",      # El gran Guarrok
    "2553": "l4", "2617": "l4", "2618": "l4", "8759": "l4",
    "1019": "l8", "1021": "l8",                                 # Pan Koko Mío
    "7904": "l6",                                               # El cementerio primitivo
    "421": "l11", "885": "l11",                                 # El despertar de Pandala
    "1455": "l7", "1456": "l7", "1457": "l7", "1458": "l7",     # Intrusión en el territorio wabbit
}

# Rows the page lists twice. Step -> {item: why}. Dropped after the check against the
# compiled list, which counts them twice too. Checked against each quest's guide on
# torrentearcano and DofusDB's objectives and recipes.
DUPLICATES = {
    # "El receptáculo de los dofus" asks to do the quest that opens Pandala: that is
    # "El despertar de Pandala", already prerequisite l11. Its "Suero contra la
    # pandrista" takes 50 Ortiga and 5 Lana de jalatín negro, listed in step 0 for l11.
    "1": {"421": "prerrequisito l11", "885": "prerrequisito l11"},
    # The page's split of the old step 75 copied its items into the new 75 as well as
    # the 76, where "Empieza a hacer viento" (the boards, 4 × 4 per Tabla valepató in
    # DofusDB) and "Aviso de tormenta" (the rope, per its guide) use them.
    "75": {"16496": "paso 76", "16494": "paso 76", "16499": "paso 76", "16492": "paso 76",
           "9935": "paso 76"},
}

# Rows the page puts one step early. Step -> (step they belong to, {item: why}).
MOVED = {
    # "Barnabé en el espacio" (step 4) only asks for a fight. Both items are the first
    # objective of step 5's quests, in DofusDB and in their guides on torrentearcano:
    # "Las primeras impresiones son engañosas" (5 Lana de jalató) and "¿Dónde se ha ido
    # la 7.ª compañía?" (the key). The page lists step 5 with nothing.
    "4": ("5", {"384": "Las primeras impresiones son engañosas",
                "12073": "¿Dónde se ha ido la 7.ª compañía?"}),
    # Step 19 stops at mission 4 of "Púrpura profundo"; missions 5 and 6, done in step
    # 21, use these: "Remordimientos de eternala" (Tallo de bambuto, DofusDB objective)
    # and "El anillo de Tot" (Calavera and the ring's key, per its guide).
    "19": ("21", {"15444": "El anillo de Tot", "15477": "El anillo de Tot",
                  "7290": "Remordimientos de eternala"}),
    # Step 34 stops at "Arak-hais, ¿dónde vais?"; the glands are handed over in the
    # next mission, "Munster descubre el misterio" (step 35), per its guide.
    "34": ("35", {"16215": "Munster descubre el misterio"}),
}

# Rows the page leaves out: what an optional prerequisite asks for. Step -> [(category,
# label shown with the item, prerequisite id, item name, qty)]. "Escaeroplano de alta
# velocidad" (Altos vuelos, optional) takes the upgraded hat and wings (DofusDB's
# objectives and torrentearcano's guide to that quest), not the plain ones.
EXTRA_ITEMS = {
    "0": [("Equipables", "Opcional · Altos vuelos", "l10", "Casco mejorado", 1),
          ("Equipables", "Opcional · Altos vuelos", "l10", "Alas de madera mejoradas", 1)],
}

# Only needed if the alteration is gone: listed in its step, left out of totals.
OPTIONAL_ITEM = re.compile(r"elixir de los barquerontes.*no es necesario", re.I)


# ---------------------------------------------------------------------------
# audit_resources.py
# ---------------------------------------------------------------------------
# Items asked for by a quest the step does not list, only its guide names it.
# Step -> {item key: quest}.
# Also items reviewed by hand that stay where the page puts them though their quest is
# listed in another step: the quest is split across steps.
MANUAL = {
    # "Ver a Dark Vlad y morir... o no" asks to do this one first (torrentearcano)
    "1": {"2268": "Un péndulo para guiar sus pasos", "9318": "Un péndulo para guiar sus pasos",
          "746": "Un péndulo para guiar sus pasos"},
    # The beer of "De la mano" is brewed in the tavern, after step 64 stops at its door
    # and before "Dos alientos" (step 66) lets it go on
    "66": {"1977": "De la mano", "23972": "De la mano", "23179": "De la mano", "7055": "De la mano"},
    # Order 4: "4 de ellas con cuerda de escalada (uno de ellos siendo tú)"
    "78": {"9935": "Aprendizaje: Maestro de los Pergaminos"},
    # "Muerte y renovación" needs "Santísimo poder" done, which step 80 finishes
    "80": {"311": "Muerte y renovación"},
}

# Quests that hand over what they then ask for: nothing to gather.
GIVES_ITS_ITEMS = {
    2502: "Empezar bien",  # tutorial of "Con bases sólidas": it gives the ring's ingredients
}
