"""El Rush de todos los Dofus: what the pipeline needs to know about its guide.

Sandglass's 200-step rush through about 25 Dofus, made for Torrente Arcano, whose page will
be checklist-todos-dofus. There is no data page and no classic checklist: the only source is
his PDF (titled «Rush del Dofus Silvestre»), transcribed with its colours into
.build/lists/todos/torrentearcano.json, the snapshot's own form (import_guide.read_source).
No guide sync runs for it. Loaded by .build/dofus/__init__.py when a script runs with
--dofus todos.

Many steps are the Silvestre's, word for word or nearly: Sandglass wrote both, in the same
format. SAME_AS says which, and the tables below reuse silvestre.py's wherever a step
coincides; the reasons come from DofusDB (startCriterion, objectives, rewards), checked on
2026-11-14.
"""
import json
import pathlib
import re

# Torrente Arcano, where the guides of the quests live
SITE = "https://www.torrentearcano.com/"
# The checklist page the guide will live on (import_guide.py keeps it in the snapshot)
SOURCE_URL = SITE + "checklist-todos-dofus"
# The checklist's name. It names no Dofus, so DOFUS_ROAD (build_assets_js.py) keeps every
# Dofus the guide hands out, the Vulbis of step 200 included
NAME = "Rush de todos los Dofus"
# The PDF's 200 numbered steps ("incisos"): the texts point at each other by number ("los
# incisos 23 y 27"), so the numbering is the PDF's. No previous version
STEP_COUNT = 200
PREVIOUS_REQUIRED = False

_SNAPSHOT = pathlib.Path(__file__).resolve().parent.parent / "lists" / "todos" / "torrentearcano.json"


# ---------------------------------------------------------------------------
# import_guide.py
# ---------------------------------------------------------------------------
SPLIT_TIERS = {}

# Step -> the Silvestre step it repeats, word for word or with another step number in its
# notes (by text, checked by hand). Its effort tier comes from there, and so do the hand
# tables that follow (STEP_EXTRA, QUEST_AFTER, TAKE_ONLY, OBJECTIVE_ORDER, figures…); the
# Silvestre's journal.stopAt maps through it too.
SAME_AS = {
    12: 4, 13: 5, 17: 6, 18: 7, 19: 9, 21: 8, 23: 10, 27: 17, 28: 18, 34: 20, 35: 19, 41: 23,
    45: 22, 46: 25, 47: 26, 48: 27, 50: 28, 53: 29, 54: 30, 55: 31, 56: 33, 57: 34, 58: 35,
    59: 36, 60: 37, 61: 32, 62: 38, 64: 39, 69: 43, 70: 44, 71: 45, 72: 46, 73: 47, 74: 48,
    75: 49, 76: 50, 77: 51, 79: 42, 83: 53, 84: 54, 85: 55, 86: 56, 87: 57, 92: 58, 93: 11,
    94: 59, 97: 60, 98: 61, 100: 62, 101: 63, 104: 16, 113: 64, 114: 65, 115: 66, 116: 67,
    117: 68, 118: 70, 119: 71, 120: 72, 121: 73, 122: 74, 123: 75, 124: 76, 125: 77, 126: 78,
    127: 79, 128: 80, 133: 14, 149: 85, 150: 86, 151: 87, 152: 88, 155: 89, 157: 90, 159: 91,
    161: 92, 166: 15, 168: 93, 169: 98, 178: 94, 185: 95, 188: 96, 191: 97, 192: 99, 196: 100,
}
# The Silvestre's tiers for those steps (src/dofus/silvestre/steps.js)
_SILVESTRE_TIER = {
    4: "trivial", 5: "corto", 6: "trivial", 7: "medio", 8: "trivial", 9: "trivial", 10: "medio",
    11: "corto", 14: "trivial", 15: "medio", 16: "largo", 17: "medio", 18: "largo", 19: "corto",
    20: "medio", 22: "medio", 23: "largo", 25: "corto", 26: "corto", 27: "corto", 28: "medio",
    29: "trivial", 30: "trivial", 31: "trivial", 32: "corto", 33: "corto", 34: "medio", 35: "corto",
    36: "medio", 37: "medio", 38: "medio", 39: "medio", 42: "largo", 43: "corto", 44: "medio",
    45: "medio", 46: "medio", 47: "medio", 48: "medio", 49: "largo", 50: "medio", 51: "medio",
    53: "corto", 54: "medio", 55: "largo", 56: "largo", 57: "corto", 58: "corto", 59: "medio",
    60: "corto", 61: "medio", 62: "largo", 63: "corto", 64: "corto", 65: "corto", 66: "medio",
    67: "largo", 68: "corto", 70: "corto", 71: "corto", 72: "medio", 73: "corto", 74: "largo",
    75: "largo", 76: "largo", 77: "medio", 78: "medio", 79: "largo", 80: "medio", 85: "corto",
    86: "corto", 87: "corto", 88: "largo", 89: "medio", 90: "largo", 91: "corto", 92: "corto",
    93: "epico", 94: "epico", 95: "corto", 96: "corto", 97: "epico", 98: "largo", 99: "largo",
    100: "medio",
}
# The other steps, estimated on the same scale: trivial = only taking or talking, corto =
# one or two quests up to a stop, medio = a dungeon passed (a green closer) or several
# quests, largo = a whole achievement with dungeons, or most of one. The app weighs the
# percentage by the quests' levels (weights.json), not by the tier.
_OWN_TIER = {
    "trivial": [52],
    "corto": [1, 3, 4, 30, 31, 33, 39, 40, 42, 43, 65, 67, 80, 95, 102, 106, 108, 109, 111, 135,
              139, 141, 145, 146, 153, 156, 158, 160, 164, 165, 167, 170, 174, 176, 180, 181, 182,
              186, 187, 195],
    "medio": [2, 5, 6, 8, 9, 10, 14, 15, 20, 24, 25, 26, 29, 32, 36, 37, 38, 44, 49, 51, 63, 66,
              68, 81, 82, 90, 99, 103, 105, 107, 110, 112, 130, 131, 132, 134, 136, 140, 142, 143,
              147, 148, 163, 171, 173, 175, 184, 190, 193, 194, 197, 198, 199],
    "largo": [7, 11, 16, 22, 78, 88, 89, 91, 96, 129, 137, 138, 144, 154, 162, 172, 177, 179, 183,
              189, 200],
}
_TIER = {**{n: tier for tier, ns in _OWN_TIER.items() for n in ns},
         **{n: _SILVESTRE_TIER[s] for n, s in SAME_AS.items()}}

# The zone is what the step writes before its colon, named as the Silvestre names it
# ("Misiones de mundo" is "Misiones de Mundo", "Alineamiento Bontariano" is
# "Alineamiento"), its misspellings fixed ("Krozmos", "Isla de Frigsot")
ZONE_NAMES = {
    "misiones de mundo": "Misiones de Mundo", "krosmoz": "Krosmoz", "krozmos": "Krosmoz",
    "torres de la hermandad": "Torres de la Hermandad", "dimensiones divinas": "Dimensiones Divinas",
    "alineamiento": "Alineamiento", "alineamiento bontariano": "Alineamiento",
    "isla de frigost": "Isla de Frigost", "isla de frigsot": "Isla de Frigost",
    "reino de amakna": "Reino de Amakna", "atolón de los poseídos": "Atolón de los Poseídos",
    "archipiélago wabbit": "Archipiélago Wabbit", "archipiélago de las escamas": "Archipiélago de las Escamas",
    "pesadilla de los devastadores": "Pesadilla de los Devastadores",
}


def _zone(raw):
    prefix = re.split(r"[:,]", raw, maxsplit=1)[0].strip()
    return ZONE_NAMES.get(prefix.lower(), prefix)


_STEPS = json.loads(_SNAPSHOT.read_text(encoding="utf-8"))["steps"]
STEP_ZONE = {n: (_zone(raw), _TIER[n]) for n, raw in enumerate(_STEPS, 1)}

# Earlier steps a step finishes that its text does not let import_guide.py read: a green
# that says "para actualizar la misión del inciso 47 y terminar las misiones de los incisos
# 48 y 49" (the clause with "actualizar" is never read as closing), a blue list that says
# "completando las misiones de los incisos 170, 171 y 178" or ", y se terminan las misiones
# de los incisos 173, 175 y 178". 151 finishes "Las cuatro voluntades", which 121 leaves at
# its 2nd objective (the Silvestre's 87 and 73). 168's "Misión 7: Una voz de cristal" ends
# with "se termina con el logro “El mar por legado”", the achievement of step 166. 158, 159
# and 160 stop "hasta tener que dropear en sueños": only the optional incisos I and II (a note
# on 160) would finish them there, so without that branch nothing closed them; 200, «Sueños
# de dragón» complete, goes through the dreams and finishes them.
CLOSES = {49: [48], 103: [102], 144: [143], 151: [121], 168: [166], 178: [170, 171, 173, 175],
          200: [158, 159, 160]}

# Earlier steps a step updates that its text does not let import_guide.py read ("para
# actualizar la misión del inciso 62": the infinitive), and 136, which finishes only mission
# 7 of step 134 ("y la misión 7 del inciso 134"); its mission 5 ends in 138, which closes it.
UPDATES = {49: [47], 63: [62], 103: [101], 136: [134], 142: [141]}

# Rewrites of the PDF's text (on the raw transcription, colour markers included): step ->
# [(the PDF's passage, ours)]. The snapshot keeps the PDF's own text.
#   45, 48: the PDF prints in black what every other step colours: the stop of 45 ("Hasta
#     tener que pasar Nelwynn", which its own green resolves) and the "(opcional pero útil)"
#     of 48, blue in the Silvestre's 27.
#   64, 76: the PDF colours green the bosses the step passes and red the one it leaves
#     ("dejando pendiente Funoroshi"). A green in the step would read as resolving it, so the
#     whole parenthesis is the stop, as in the Silvestre's 39 and 50.
#   77, 144: wrong step numbers. 77's Sfinter Cell closes 76 and 77, the Azul turquesa and
#     Bonta 65 steps (the Silvestre's 50 and 51), not "75 y 76" (75 is a whole achievement).
#     144's last green kills the monsters "para terminar la misión del inciso 131", but 131
#     ("La sombra de lo que era") ends at its own green; the monsters of every subzone are
#     those of 141 ("La guerra gría"), which 142 and 144 update.
#   125, 126, 128: the order Espíritu de la salvación, as in the Silvestre's 77, 78 and 80
#     (silvestre.py, TEXT_FIXES): order mission 3 stops at Roble Blando and mission 4 needs it
#     finished (startCriterion QF>121), so 126 goes up to mission 3 and mission 4 is done in
#     128, where Roble Blando and Ugah are passed with the Sadida idol. 61's green already
#     says the guide may follow that order.
#   160: the PDF's incisos I and II (yellow, page 12), only for whoever already has the
#     Parangón de potencia of step 111: a note on 160, quoting them, and no steps of their
#     own (they would renumber the rest). The names go without quotes so no quest of "Sueños
#     de dragón" joins step 160.
#   199: the PDF leaves the step of the Parangón de potencia as "xxx" (and writes "inicio"
#     once): it is 111, "Hasta tener que dropear el Parangón de potencia".
_ESPIRITU = "con el ídolo del dios Sadida"
TEXT_FIXES = {
    45: [("Misión 29. (Hasta tener que pasar Nelwynn)",
          "Misión 29. [[RED]](Hasta tener que pasar Nelwynn)[[/RED]]")],
    48: [("misión 2 (opcional pero útil): Star", "misión 2 [[BLUE]](opcional pero útil)[[/BLUE]]: Star")],
    64: [("[[GREEN]](Se pasa Tynril y Morsagüino con sus respectivos ídolos, [[/GREEN]][[RED]]dejando pendiente"
          " Funoroshi)[[/RED]]",
          "[[RED]](Se pasa Tynril y Morsagüino con sus respectivos ídolos, dejando pendiente Funoroshi)[[/RED]]")],
    76: [("[[GREEN]](Se pasa Roca negra, Obsidiantre y Kimbo con sus respectivos ídolos,[[/GREEN]][[RED]] quedando"
          " pendiente Sfinter cell)[[/RED]]",
          "[[RED]](Se pasa Roca negra, Obsidiantre y Kimbo con sus respectivos ídolos, quedando pendiente Sfinter"
          " cell)[[/RED]]")],
    77: [("se terminan las misiones del inciso 75 y 76.", "se terminan las misiones del inciso 76 y 77.")],
    125: [("(Hasta tener que pasar Roble Blando o Ugah (según la orden escogida, véase el inciso siguiente) "
           f"{_ESPIRITU})",
           f"(Hasta tener que pasar Roble Blando {_ESPIRITU} (se pasa en el inciso 128, junto a Ugah))")],
    126: [("Hasta la misión de orden 4.", "Hasta la misión de orden 3."),
          ("[[RED]](Hasta tener que pasar Ugah)[[/RED]]", "[[RED]](Hasta tener que pasar Roble Blando)[[/RED]]"),
          ("[[BLUE]](Si se escoge la orden Espíritu de la salvación, en la misión de orden 3 se tendrá que pasar"
           " Roble blando, por tanto, en el inciso anterior se puede pasar Roble blando con el ídolo del dios"
           " Sadida para validar ambas misiones)[[/BLUE]]",
           f"[[BLUE]](Roble Blando se pasa en el inciso 128, junto a Ugah, {_ESPIRITU})[[/BLUE]]")],
    128: [("[[RED]](Hasta tener que pasar Ugah)[[/RED]]\n",
           "[[RED]](Hasta tener que pasar Ugah)[[/RED]]\n[[BLUE]](Tras pasar Roble Blando se termina la misión de"
           " orden 3 y se hace la misión de orden 4, Maestro de los Pergaminos, hasta tener que pasar Ugah, que la"
           " termina)[[/BLUE]]\n")],
    144: [("para terminar la misión del inciso 131.", "para terminar la misión del inciso 141.")],
    160: [("[[RED]](Hasta tener que hacer una ronda completa de sueños)[[/RED]]",
           "[[RED]](Hasta tener que hacer una ronda completa de sueños)[[/RED]]\n[[BLUE]]Solo si para este punto"
           " ya se logró dropear el Parangón de potencia del inciso 111 (en la guía, los incisos I y II, en"
           " amarillo): I. Logro Sueños de dragón, hasta la misión 3, Pesadilla Infinita, hasta tener que dropear"
           " en sueños; «Se dropea en sueños, y se terminan las misiones de los incisos 158, 159, 160 y I». II."
           " Logro Sueños de dragón completo: «Se obtiene el Dofus Vulbis», y el inciso 200 queda hecho aquí. Si"
           " no es así, se sigue con el inciso 161.[[/BLUE]]")],
    199: [("parangón de potencia del inciso xxx", "parangón de potencia del inciso 111"),
          ("en el inicio xxx no se haya dropeado", "en el inciso 111 no se haya dropeado")],
}


# ---------------------------------------------------------------------------
# import_guide_links.py
# ---------------------------------------------------------------------------
# Missions the text names without the "misión: X" form: "se debe hacer la misión
# Flovoración" (196), "se puede lanzar la misión La sombra del reino" (62) and "hasta la
# misión adjunta: Cómo perder la pluma" (37). And three the blue notes of 123, 124 and 125
# name before a ";" ("misión 1: El barco con esclavos; se puede encadenar…"), which the
# page's own pattern does not stop at
TEXT_MISSIONS = ["Flovoración", "La sombra del reino", "Cómo perder la pluma", "El barco con esclavos",
                 "Vientos de cambio", "Muerte y renovación"]

# Pages for names the guide misspells or Torrente Arcano gives another slug, from its sitemap
MISSION_URLS = {
    name: SITE + page for name, page in [
        ("Los tótems de Maimame", "los-totems-de-maimane"),           # 161, as in the Silvestre
        ("Draconantopía", "draconantropia"),                           # 27
        ("La guerra gría", "la-guerra-fria"),                          # 141
        ("La reina de la belleza", "reina-de-la-belleza"),             # 135
        ("Los siete mercenarios", "los-siete-mercenarinos"),           # 153
        ("Los mercenarios están bien equipados", "los-mercenarinos-estan-bien-equipados"),  # 154
        ("Reparo sin reparo", "reparo-sin-reparo-1"),                  # 173
        ("Un amigo que te quiere… por que algo quiere", "un-amigo-que-te-quiere-porque-algo-quiere"),  # 103
    ]
}

# There is no achievementLinks: the achievements the steps name get the sitemap's page of
# their slug (import_guide_links.achievement_names). These are the ones whose page has
# another slug, as Torrente Arcano's own pages link them (the Silvestre's, Hielos' and
# Nebuloso's guides.json), and the ones the guide misspells.
EXTRA_ACHIEVEMENTS = {
    name: SITE + page for name, page in [
        ("Escapadas y emboscadas", "logro-escapadas-y-emboscadas"),
        ("El atardecer de los muertos", "atardecer-de-los-muertos"),
        ("Los supervivientes de Frigost", "supervivientes-de-frigost"),
        ("Ocre ámbar", "ocre-de-ambar"),
        ("Esto son dos dragones que entran a un bar…", "esto-son-dos-dragones-que-entran-en-un-bar"),
        ("Selocalipsis: Reminiscenia", "selocalipsis-reminiscencia"),
        ("Incarnación", "incarnaccion"),
        ("Favores encadenados", "lfavores-encadenados"),
        ("Luces, cámara y chapuzón", "lluces-camara-y-chapuzon"),
        ("Cuestión de equilibrio", "logro-cuestion-de-equilibrio"),
        ("Un movimiento zznzalbz", "logro-un-movimiento-zznzalbz"),
        ("El gusto por la vida salvaje", "logro-el-gusto-por-la-vida-salvaje"),
        ("La tajada Rhoarim", "logro-la-tajada-rhoarim"),
    ]
}


# ---------------------------------------------------------------------------
# build_assets_js.py
# ---------------------------------------------------------------------------
# Hero background, one map per theme, picked by eye
HERO_MAPS = {"dark": "maps/1/223350028.jpg", "light": "maps/1/88080387.jpg"}

# Header logo: the Dofus Vulbis (item 6980, icon 23004), the last one, at step 200
BRAND_ICON = "items/23004.png"

# Theme switch: Dofus Marfil (light) and Dofus Ébano (dark), both on the road (168 and 178)
THEME_ICONS = {"light": "items/23011.png", "dark": "items/23007.png"}

# Prerequisites from the PDF's first page. Achievements and quests resolve by name; jobs and
# spells use their DofusDB ids, those of the Silvestre. o6 is "Campesino o Alquimista nivel 200"
PREREQ_JOBS = {"o1": [60, 13], "o2": [79], "o3": [65], "o4": [24, 26], "o5": [28], "o6": [28, 26]}

PREREQ_SPELLS = {
    "h1": ("spells/sort_12461.png", "Captura de Almas"),
    "h2": ("spells/sort_11763.png", "Llamilla"),
    "h3": ("spells/sort_11775.png", "Zanahowia Sabwosa"),
}

# Dofus DofusDB lists as no reward: achievement id -> (item id, icon, name). "Una odisea en
# tres dimensiones" gives the Dofus de los Vigilantes for its four achievements; the last of
# them, "Las apariencias engañan", is step 91 ("Se obtiene el Dofus Vigilantes"). No Dofus
# Ocre: the PDF asks for it from step 127 and its "El fin de la eternidad" says no "Se
# obtiene". No Piñata de pino on "El secreto de los dofus: Prólogo" either, as in the
# Silvestre: the PDF gives it at 194, after Grunob (ROAD_STEPS).
MISSING_DOFUS = {1186: (16061, "items/23020.png", "Dofus de los vigilantes")}

# Where the PDF says each Dofus is obtained (its purple «Se obtiene…») and DofusDB's road does
# not: item id -> step. The ones a quest gives and no achievement rewards: the Dofus
# plateado (10, after the Astrub achievements), the Dotruz (37, "Un huevo para Zurcarák",
# closed there), the Dofus kalipto (38, "Los tiempos que corren", closed there), the Dofus
# abisal (181, "El héroe de Sufokia"), the Dofus plateado centelleante (190, "El silencio es
# áureo"), the Dofus de los hielos (190, in the green that passes the Conde Kontatrás) and the
# Dofus forjalava (193). And the ones obtained on another step than the achievement's: the
# Dofus Púrpura at 44 (its green passes the Jalamut Real that ends 43), the Piñata de pino at
# 194 (Grunob) and the Dofus silvestre at 196: DofusDB has it (item 29136) as the reward of
# "Mientras llega la primavera", whose mission 4 is 195, but the PDF gives it when 196's
# "¿Quién nos protege del protector?" ends.
ROAD_STEPS = {19629: 10, 15235: 37, 8072: 38, 694: 44, 18043: 181, 20286: 190, 7043: 190, 19398: 193,
              27803: 194, 29136: 196}

# The prerequisites say the Dofus Ocre is needed from step 127: they show the egg
OCRE_ICON = "items/23012.png"


# ---------------------------------------------------------------------------
# build_quests_js.py
# ---------------------------------------------------------------------------
# Achievements DofusDB has no quest objectives for: achievement id -> its quests. "El fin de
# la eternidad" (127) is "La eterna cosecha" (the Silvestre's 79). "Pelo de zanahowia" (16) has
# one objective, "Hazte pasar por el Wey Wabbit" (Qo>5285): past that objective of "¿El huevo
# o la zanahowia?", mission 3 of 15's "Un wey de pacotilla"
MISSING_OBJECTIVES = {565: [439], 992: [835]}
MISSION_TYPOS = {}

# Quests a step needs that its text doesn't name, put first (silvestre.py, by SAME_AS):
#   37: "hasta la misión adjunta: Cómo perder la pluma" (1527), no mission of "Púrpura
#       profundo": the quest it names (the Silvestre's 21 asks for it in a note).
#   The "Abono de peaje" runs the Frigost lines ask for (Qf=), each in the step whose green
#   passes its dungeon: Jalamut Real in 44 (619), Morsagüino Real in 51 (620), Roca negra in
#   63 (621), Obsidiantre in 76 (622, with its idol, the Silvestre's 50), Tengu Gélifux in 81
#   (623), Cil in 99 (624). Golosotrón Real (626, which "La guardia muere, pero no se rinde",
#   150, needs) is never passed in a green: it goes in 137, "Cuatro de seis" complete, like
#   the Silvestre's 81.
#   56: "La eterna cosecha" taken, which "La razón del más fuerte" needs (the Silvestre's 33).
#   62: "La sombra del reino", which the step's blue says can be started there and 131 needs
#       (the Silvestre's 38).
#   126: the order quests 1 to 3 of Espíritu de la salvación; 128: "La última piedra" before
#       "Alma máster", and order quest 4 (TEXT_FIXES; the Silvestre's 78 and 80).
#   145: "hasta obtener la misión 4: La biblia de los rencores", which "Birk, hija de Bork"
#       gives on its way past Dazahk (Qa=2011&Qo=14288): Birk goes on in 145.
#   151: "Las cuatro voluntades" finished and "Toma de conciencia" taken (the Silvestre's 87).
#   155: Bonta's mission 100, "El exorcista", before order quest 5 (the Silvestre's 89).
STEP_EXTRA = {37: [1527], 44: [619], 51: [620], 56: [439], 62: [1665], 63: [621], 76: [622], 81: [623],
              99: [624], 126: [434, 111, 121], 128: [1782, 423], 137: [626], 145: [2011], 151: [2122, 2138],
              155: [1903, 1917]}

# "Birk, hija de Bork" gives "Los enemigos de mis enemigos son mis enemigos" and "Los
# nanoinsumisos" and waits for them (silvestre.py)
SUBQUESTS = {2011: [2019, 2012]}

# 83 is "hasta la misión 3" of "El guardián del inmaculado", whose mission 2 starts past
# Kumijo (the Silvestre's 53)
STEP_SKIP = {83: [2198]}

# Quest -> the quest it goes right after (silvestre.py): "Hasta su último suspiro" after
# "Réquiem por un yokai", "La sombra del reino" after "Esto parece el Sur", order quest 4
# after "Alma máster", and each "Abono de peaje" after the quest whose green passes its
# dungeon (the "Agricultura o alquimia" rows are one per objective, agriculture or alchemy)
QUEST_AFTER = {2198: 2180, 1849: 1848, 1665: 1656, 619: 615, 620: "alt:607:1570", 621: "alt:607:1571",
               622: 1661, 623: "alt:607:1574", 624: "alt:607:1575", 626: 1793, 423: 1784}

QUEST_BEFORE = {439: 2442}

# 64 passes Tynril and Morsagüino and leaves Funoroshi; 76 passes Roca negra, Kimbo and
# Obsidiantre and leaves Sfinter Cell (the Silvestre's 39 and 50)
OBJECTIVE_ORDER = {(1660, 0): [1, 2, 0, 3], (1661, 0): [1, 2, 3, 0, 4]}

# Only taken: "Luces y sombras" ("No es necesario hacerla, solo tomarla", 52), "La eterna
# cosecha" (56), "La biblia de los rencores" (145, "hasta obtener la misión 4") and "Toma de
# conciencia" (151, done in 159)
TAKE_ONLY = {52: [1286], 56: [439], 145: [2013], 151: [2138]}

# Added, but not holding the step open: "La sombra del reino" (62) and "Lavandería
# automática" (76), as in the Silvestre's 38 and 50
OPTIONAL_EXTRA = {62: [1665], 76: [622]}

# 151: "misión 4: …, misión 3: …", in that order (the Silvestre's 87)
IN_TEXT_ORDER = {151}


# ---------------------------------------------------------------------------
# build_weights.py
# ---------------------------------------------------------------------------
LEVEL_FROM_MONSTERS = {"439"}  # La eterna cosecha


# ---------------------------------------------------------------------------
# build_figures.py
# ---------------------------------------------------------------------------
MERIANA = 2205
DRAGON = "Dragón primordial"
# The Silvestre's figures (silvestre.py)
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

# The Silvestre's 7 and 43: the goddess Feca of "La cólera de los dioses" (18) and the Daimia
# Hikomi for the three Pandala quests of 69. The quests of "Cuestión de equilibrio" (110, 197,
# 198) start with the Sacerdotisa de Osamodas, and 109's "Un movimiento zznzalbz", whose
# missions 110 includes, with the Cabo Goblasto: their looks ({9580}, {9540}) are too new for
# Ankama's renderer, which never answers. The god Osamodas (npc 4958) stands for them.
_OSAMODAS = ("dios-osamodas", "Dios Osamodas", "{5346|||100}")
STEP_FIGURE = {
    "18": ("diosa-feca", "Diosa Feca", "La cólera de los dioses", "{4841}"),
    "69": ("daimia-hikomi", "Daimia Hikomi", "De qué madera estoy hecho", "{5784|||100}"),
    "109": (*_OSAMODAS[:2], "Un movimiento zznzalbz", _OSAMODAS[2]),
    **{n: (*_OSAMODAS[:2], "Cuestión de equilibrio", _OSAMODAS[2]) for n in ("110", "197", "198")},
}

# Step -> the quest that stands for it, where it opens with quests it only needs: the order
# quest 5 after Bonta's mission 100, 151's own quests after the ones of 121 and 159. 179 opens
# with "La cólera de los dioses", whose NPC depends on the class (no figure): its own mission,
# the one left pending, is "Toda el agua al molino"
FIGURE_QUEST = {"151": 2137, "155": 1917, "179": 1955}


# ---------------------------------------------------------------------------
# fetch_zone_maps.py
# ---------------------------------------------------------------------------
# The Silvestre's maps for the zones it shares (the files are shared by name), and one for
# each new zone, picked among the maps its quests go through
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
    # Incarnam: the Camino de las Almas, where most of its quests go (outdoor, the temple)
    "Incarnam": 153878787,
    # Archipiélago Wabbit: the Isla Zanahowia, with its carrots and coast
    "Archipiélago Wabbit": 99614727,
    # Isla de Moon: Playa Tortuga, where "Pan Koko Mío" lands
    "Isla de Moon": 156894216,
    # Archipiélago de las Escamas: the Santuario de Torkelonia; the rest of "Lágrimas de
    # cocodrail" goes through the dark interiors of Cocuzko and Astrub
    "Archipiélago de las Escamas": 198709250,
    # Pesadilla de los Devastadores: its only quest ("El peso de su mirada") goes through
    # Pandamonium alone, the Atolón de los Poseídos' map
    "Pesadilla de los Devastadores": 214962179,
}


# ---------------------------------------------------------------------------
# build_resources.py and audit_resources.py
# ---------------------------------------------------------------------------
# The PDF lists no items: no resources, no compiled list, nothing to fix
CORRECTIONS = {}
ALIASES = {}
GENERIC_IMG = {}
REUSABLE = set()
PREREQ_OF = {}
DUPLICATES = {}
MOVED = {}
EXTRA_ITEMS = {}
CHOSEN_ORDER = {}
OPTIONAL_ITEM = re.compile(r"(?!)")
MANUAL = {}
GIVES_ITS_ITEMS = {}
