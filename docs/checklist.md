# The checklist

The checklist app is the same for the Dofus Silvestre and the Dofus de los Hielos, on the site and in the Torrente Arcano embeds. This document describes the Silvestre. What changes for the Hielos comes from its `config.js` and is covered in [development.md](development.md#several-dofus).

The Silvestre guide is Sandglass's, version 4. The text of its 100 steps is imported verbatim from torrentearcano.com and never edited. What changes compared with the site's classic checklist is how progress is computed and shown, and the interface.

The app's UI is in Spanish. Labels, quest names and guide text are quoted here as they appear on screen.

## The problem with flat counting

The classic checklist counts each of the 100 steps as 1 %. Steps cost very different amounts, so its bar was wrong:

| Step | What it asks | Real time | Weight in the classic | Weight here |
|---|---|---|---|---|
| 4 | Quest "Barnabé en el espacio" | 10 to 15 min | 1 % | 0.03 % |
| 93 | Full achievement "Blanco marfil": 6 bosses, 4 totems, 4 sacrifices and Necronix | 30 to 40 h | 1 % | 5.03 % |

Step 93 weighs about 178 times as much as step 4.

## Weighted progress

Each step is worth what its quests cost.

- Each quest earns points from its level and its number of objectives.
- A quest that appears in several steps is split between them, so it never counts twice.
- Only the quests a step asks for count. Optional quests and quests you only need to have started are worth 0, done or not.
- Finished quests count before the step is checked. Checking the step counts it in full.

Step 1 moves the percentage by 0.6 %, and step 61, with level 200 quests, by 6.7 %. With the steps done in order, the percentage is around 11.5 % after step 20, 28 % after step 50 and 84 % after step 90. It only reads 100 % when everything is done. "X/100 pasos" still shows next to it.

<details>
<summary>How it is computed</summary>

- A quest is worth `level × √objectives`. A level 180 quest with 4 objectives is worth 360; with 25, 900. The square root stops the longest quests from eating the percentage.
- The level is the "Nivel mínimo" given by the quest's guide on Torrente Arcano. When the guide gives none, DofusDB's `levelMin` is used. The class quest in step 1 counts as level 20. The "Prólogo invernal" in step 63 is one of three quests depending on alignment, all level 50 with 6 objectives, so it is worth about 122.
- "La eterna cosecha", which step 79 finishes, does not use its minimum level. You start it at level 40, but its stages ask for souls of archmonsters from level 1 to 181. Its level is the mean of the 337 souls, 73.8, and with 339 objectives it is worth about 1360 (`LEVEL_FROM_MONSTERS` in `.build/dofus/silvestre.py`, with the levels in `.build/data/monster_levels.json`). The `optimalLevel` DofusDB gives each stage is no use here: in many quests it is 200 on every stage.
- Optional and take-only quests are worth 0 in their step (`STEP_QUEST_KINDS` in `quests.json`). Today the optional ones are "Arma letal" in step 7, "Star ski y Dutch" in 27, "La sombra del reino" in 38 and "Lavandería automática" in 50. The take-only ones are "Luces y sombras" in 28, "La eterna cosecha" in 33, "La biblia de los rencores" in 83 and "Toma de conciencia" in 87. Without its optional quest, step 7 is worth 100 points.
- A shared quest (61 of the 363) splits its points equally between the steps that ask for it. A step without quests would be worth one level 1 quest; today every step has some.
- `.build/build_weights.py` downloads each guide once (`.build/data/ta_levels.json`) and writes `src/dofus/silvestre/weights.json`, which `progressPct` in `src/tools/checklist/state/store.js` reads. Total: 159 518 points.
- Each step in `weights.json` carries its weight (`w`), what each quest is worth after splitting, in order (`q`), and each quest's id and objective count (`ids`, `os`).
- For an unchecked step, `donePts` adds three things: the quests before the current one (`questPos`, the same progress the overlay and the diary use), any other quest whose objective (`questObj`) reaches its total even if it runs ahead, and the quests another checked step finished. It counts what the diary shows as done. The last part needs the quests loaded, because it depends on where each step stops; until they arrive it is not added. Undoing a finished quest that runs ahead does not move progress forward. 100 % still requires all 100 steps checked.

</details>

## The steps window

The whole checklist lives in one window with four tabs: Mapa, Diario, Prerrequisitos and Objetos. Mapa and Diario are two views of the same steps; a divider separates them from the other two. The open tab and the view are remembered.

At the top sits the "Dofus del camino" strip, with progress. Below it, a toolbar that has the same height on all four tabs and only changes its contents:

| Tab | Tools |
|---|---|
| Mapa and Diario | Step search, by number or text, and the zone button |
| Prerrequisitos | "Marcar todo" and "Limpiar" |
| Objetos | Search, sort, view and "Solo pasos pendientes" |

### It fits the screen

On desktop the window is never taller than what is left under the page header. The strip, the tabs and the search never scroll; whatever does not fit scrolls inside:

- In the diary, the list and the detail, each on its own. Changing step scrolls the detail back to the top.
- In the map, the path. Coming back from the diary keeps its position; the first time it opens with the current step in view.
- In Prerrequisitos and Objetos, the lists, with the explanation, the buttons and the tools fixed above.

Jumping to the window from "Siguiente", the hero, the Dofus Ocre notice or the "/" key leaves it right under the header. On very short screens the window does not go below 560 px, and you scroll the page to see its end. On mobile everything follows the page flow.

### Dofus del camino

These are the 12 Dofus the guide gives before the Silvestre: Dofawa, Esmeralda, Púrpura, Domakuro, Dorigami, Turquesa, Moteado, Ocre, Marfil, Ébano, Pesadilla and the Piñata de pino. Each sits on the step that completes its achievement. They come from the rewards of the achievements and their quests, filtered by DofusDB's Dofus item type rather than by name.

Two exceptions are set by hand in `MISSING_DOFUS` (`.build/dofus/silvestre.py`). DofusDB has neither the objectives nor the reward of "El fin de la eternidad", the step 79 achievement, so it gets the Dofus Ocre. The Piñata de pino comes from a separate quest, Grunob then Goblepino, opened by "El secreto de los dofus: Prólogo", and counts at step 99.

The strip shows its title, the count in large type (8/12) and the 12 eggs across: the ones you have with a gold halo, the missing ones in grey. Checking the step that gives one lights its egg with a bounce and a flash, bumps the count and shows a toast like "¡Dofus Esmeralda obtenido!". None of this happens on page load or when restoring a backup. Unchecking only dims it. Each egg shows its name and step on hover and opens that step on click. The same strip holds the weighted percentage, the steps done, a thin bar and "Siguiente: N →". On mobile the eggs go in two rows of 6.

### Zone seals

The "Zona: Todas · 79/100 ▾" button shows the chosen zone and its progress. It opens a panel with one medallion per zone, with its landscape and a ring that fills with the steps done. Complete zones get a ✓, and a marker points at the zone of the open step. Picking a seal leaves only that zone on the map and in the diary; "Todas" brings them all back. Escape or a click outside closes the panel without closing the open step.

## The map

This is the default view: the 100 steps as a path on parchment, dark and warm in the dark theme and light in the light one, drawn with gradients and no images. The trail winds top to bottom in rows that wave. At the end is the Dofus Silvestre, unlit until you finish.

- The path walked, from the first step to the last one done, lights up in green. Done steps are green with their ✓, pending ones carry their zone colour on the border, and the next pending step pulses with "Estás aquí".
- The 12 Dofus del camino are large landmarks with their egg. Steps that pass a boss show its small portrait next to them.
- Hovering a step shows a pill with its figure, number, title and zone.

Clicking a step opens its card next to it, with an arrow pointing at the step, wherever it fits without covering the step or its neighbours. If it does not fit, the map scrolls just enough. The card carries a small copy of the step's banner and, beside it:

- the zone, the title and what you earn ("Se gana Dofus…" with its egg, or "Se pasa…" with the boss portrait);
- how far to go and what gets resolved, with the steps it closes;
- "Se retoma más adelante" and "Se termina más adelante" when they apply, as chips that open those steps;
- how many quests and items it needs;
- "✓ Hecho" (or "✓ Hecho, y termina el 33") or "Desmarcar", and "Abrir en el diario →".

An arc joins the step with the steps it closes. The card closes with ×, a click outside or Escape. With the keyboard, Enter opens the card with focus inside and Escape returns focus to the step. On mobile the card rises as a bottom sheet, and "Abrir en el diario" shows the full detail in the same sheet.

## The diary

The 100 steps read like the game's quest journal: the list on the left, the step detail on the right.

### The list

The 100 steps run in one list with no chapters per Dofus, because many steps have nothing to do with the Dofus of their stretch. The Pendientes, Hechos and Todos tabs filter it. Each row has:

- a checkbox to check the step without opening it;
- the number, the achievement it works towards and its zone below;
- on the right, what you earn: the Dofus it gives or, if none, the boss its green note resolves; if neither, it stays blank;
- the "se cierra en el 34" and "cierra" tags, which jump to those steps on click. On desktop they sit on the right next to the portrait; on mobile, under the title.

With the Pendientes filter, a row you check stays a moment with its ✓ and then folds away. With nothing selected, the detail shows the next pending step. The open step is saved in `silvestre:selectedStep`: after a reload, the diary and the map stay on it.

### The banner

At the top of the detail, dark in both themes, hangs a vertical pennant with a gold frame over the game map where the step's first quest starts. Without a map it shows the zone landscape. Inside are the number, the zone and the figure that best represents the step.

On desktop the pennant is always 200 px tall and 156 px wide, so a long objective like step 93's does not stretch it. The figure has no name on it: a line under the objective says who it is ("Inicia el paso: Profesor Max Ymillán", "Se gana: Dofawa"). On mobile the pennant is larger, carries the name inside and grows with the objective up to 287 px.

The figure is picked in this order (`src/dofus/silvestre/figures.json` and `public/img/npcs/`, from `build_figures.py`):

1. The Dofus the step gives.
2. The figure of its achievement: the primordial dragon of its Dofus, the rider or Draconiros in Selocalipsis, Silvosse in the Silvestre line. The primordial lines that Meriana starts show Meriana.
3. The NPC who starts the step. For a quest without a start point, the first NPC it sends you to, such as Pandawelo in step 64. If the NPC depends on your class, as in step 7, there is none; there the goddess Feca, whom you talk to in the quest, is set by hand. Step 43 shows the Daimia Hikomi, because its three quests start with different NPCs (`STEP_FIGURE` in `.build/dofus/silvestre.py`).
4. The boss it resolves.

### The objective

Next to the banner sits the achievement with its icon. The title is not a link: its guide is linked in the text. A gold ✓ on the icon means the step asks for the whole achievement. Below it comes Sandglass's text once, under "Texto de la guía", and the guide's callouts as lines with their icon and coloured label. At the top right, "Ver en el mapa" goes back to the map with that step open. Coordinates carry the game's compass and copy the `/travel` command on click.

The green callout names the steps this one closes, with chips that open them. Two more lines point at related steps. They are notices and check nothing:

- "Se termina más adelante" links to the step that finishes it.
- "Se retoma más adelante" links to the step that only updates its quest ("se actualiza la misión del inciso 53"). Step 53 is resumed in 54, and 58 is resumed in 59 and finished in 61. Step 63 is resumed in 81: its note reminds you that room 3 of Golosotrón holds the resource step 63's quest is missing, which the guide says no other way (`UPDATES` in `.build/dofus/silvestre.py`). `import_guide.py` takes this from the green callout as `updates`, and also from a blue note with that same sentence.

So, from their notes, step 93 finishes 92 and resumes 84, which finishes 94. Step 87 also finishes 73, though the guide does not say so: its two quests need "Toma de conciencia" started, which is done in 91, and that one needs "Las cuatro voluntades" finished, where step 73 stops. So step 87 lists those two first, the first to finish it and the second only started. `CLOSES` in `.build/dofus/silvestre.py` adds 73 by hand and a note explains it. Its two quests are done one at a time and go in the order the guide names them, mission 4 before mission 3, which is the one that waits for Ilyzaelle (`IN_TEXT_ORDER`).

"Se termina la misión opcional del inciso 7" does not close step 7, which is done without it. With step 93 done, "Arma letal" shows as completed in step 7 ("Completada en el paso 93") and step 7 stays as it was (`journal.optionalDoneBy` in `src/dofus/silvestre/config.js`).

### Guide callouts

These are torrentearcano.com's highlights in three colours. Red says how far to go ("Hasta tener que pasar Lasoberaña"). Green says what gets resolved and which steps it closes. The site's blue mixes several things, so `import_guide.py` splits it by what it says:

| Label | What it is |
|---|---|
| Incluye | What the step covers |
| También hay que | A quest the guide also requires, with the game's «!» |
| Consejo | What is recommended, optional or worth taking advantage of |
| Nota | Everything else |

Each kind has its own colour and game icon.

Two more kinds exist for guides generated from DofusDB rather than from a Torrente Arcano page: `dungeon` ("Mazmorra", the dungeon the step enters with the quests that need it in progress) and `farm` ("Farmeo", where to fight for several quests at once). The hero shows the step's first `stop`, `done`, `dungeon` or `farm` callout. A kind without an icon in `CALL_ICONS` renders an empty medallion instead of a broken image.

Three config switches let a checklist drop what only a Torrente Arcano guide has: `texts.guideSource` names who wrote the linked guides (null hides the "its name opens its guide" hint and the link titles), `nota: null` removes the "hasta tener que pasar" explainer from the «⋯» menu and the callouts, and an empty `DOFUS_ROAD` with no `egg.final` hides the "Dofus del camino" strip and menu altogether, keeping only the progress.

A guide with alignment quests sets `sides` in its config (`sides: { bonta: "Bonta", brakmar: "Brakmar" }` in `src/dofus/global/config.js`; `null` in Silvestre and Hielos). The window bar then shows a «Bando» radio group (`#sideSwitch`, label from `texts.sideLabel`) and the choice persists in `<prefix>side` (`global:side`). `questsOf()` in `src/tools/checklist/lib/quests.js` drops every quest whose `side` is set and differs from the chosen one, so the journal, the hero, the overlay and the progress functions all see the same filtered list; with no side chosen every quest shows. Quests that carry a side get a `.q-side` badge with its name. Picking a side resets the store's quest index and runs the same cascade as marking a step: a step whose remaining mandatory quests all belonged to the other side gets marked done.

Some notes go inside a quest instead of on the step:

- A note that starts with "Misión N: Nombre." goes at the top of that quest, without that prefix. In step 93, "Se pasa Miauvisor y se dropea el tótem de sorpresa" shows in "El dragón blanco". N is the quest's number in the achievement, so "Nordalia", as the guide spells it, lands in "Nordalía".
- A tip that starts with `En el logro "X", misión N: Nombre. =` (steps 75, 76 and 77) goes inside that quest. In step 77 it lands in "Muerte y renovación", which only starts after "Santísimo poder" is finished, in step 80.
- Three quests the guide leaves half done and never resumes say so inside: "La guía no la retoma: para el Silvestre basta con llegar hasta aquí." They are "El daño de Búril" (13), "Su nombre es Ninguno" (15) and "Birk, hija de Bork" (83). According to DofusDB's start criteria, no quest or achievement in the guide needs them finished; "Birk, hija de Bork" only needs "El daño de Búril" in progress. The sentence that only introduced them ("…se actualizan algunas misiones:") no longer shows.

Mentions of other steps ("véase el inciso 78") link to that step.

### Quests and objectives

Below the objective, styled like the game's Quests window (dark wood, or parchment in the light theme), comes what you need to gather and then the quests with the game's «!». Opening a step shows all of them folded.

If the step mixes quests from several achievements, as step 1 does, they go under one heading per achievement with its icon. If it mixes one achievement's quests with a standalone one, such as "Cómo perder la pluma" in step 21, that one goes under "Fuera del logro" (`STEP_GROUPS`, from `build_quests_js.py`).

Each quest's objectives form a route of gold medallions joined by a dotted path. Each kind of objective carries a game item (`OBJ_ICONS` in `build_assets_js.py`):

| Objective | Icon |
|---|---|
| Talk | Letter |
| Fight | Sword |
| Hand in | Bag |
| Go somewhere | Compass |
| Craft | Hammer |
| Anything else | Book |

Items to hand in show as a slot with the item's icon. Done objectives turn green and the current one glows; with the step done, everything shows as done.

To make progress:

- Clicking a medallion marks the objective done, or goes back to it if it already was. It is the same progress the overlay uses.
- "Completar", on each quest's row, finishes it at once. Once done it reads "✓ Completada" and clicking it sends the quest back to its start. On narrow screens only the ✓ shows.
- Finishing a quest moves on to the next quest of the step and unfolds it.
- Undoing a quest in a done step unchecks the step and leaves the other quests completed.
- Completing the last required quest, from the diary or the overlay, marks the step done and the view stays on it. If the step closes others, it finishes what they have left, like "Completar paso N".

A quest shared by several steps shows as completed in all of them once a done step finishes it. In the other steps its button and medallions are disabled and the button reads "Completada en el paso 38", or whichever step it was; unchecking that step sets the quest back to pending. If checking a step leaves another pending step with all its required quests done, that one is checked too, in a chain. `questDoneElsewhere` in `src/tools/checklist/state/store.js` computes this without storing anything.

### Quest kinds

`build_quests_js.py` writes each quest's kind to `STEP_QUEST_KINDS`.

| Kind | Which | How it looks |
|---|---|---|
| Required | All the rest | Objective route and "Completar" |
| Optional | The guide's "opcional pero útil" quests (steps 7 and 27), parsed from its text, and the ones a step adds without keeping it open: "La sombra del reino" in 38 and "Lavandería automática" in 50 (`OPTIONAL_EXTRA`) | "Opcional" tag and the button always shown |
| Take only | "Luces y sombras" in 28, "La eterna cosecha" in 33, "La biblia de los rencores" in 83 and "Toma de conciencia" in 87 (`TAKE_ONLY`, by hand) | "Solo tomarla" tag, where it starts and a note, with no objectives or button |

Optional quests are only checked by hand: "Completar paso N" does not check them, finishing them does not change the current quest and, with the step done, they stay clickable. The overlay skips take-only quests. "La eterna cosecha" is started in step 33, right before "La razón del más fuerte", which needs it in progress, and finished in step 79; having it started in 33 does not count it as done there.

### Red stops

A step leaves half done only the quest where its red stop falls. It also finishes the quests after the stop: step 52 finishes "El S.L.I.P. está que arde", 65 "La epopeya del monje peregrino" and 68 "Mediante este juramento se escribe el mundo", which step 71 needs. A parent quest whose child is left half done waits too: in step 68, "Cuando el despertar no es más que un sueño" waits for "La última muralla".

When the red callout names a boss that appears in the objectives, a red line inside the quest marks where to stop. The name is matched on whole words; otherwise the "cil" in "Hoticili" matched Cil. The stop also understands "hasta que puedas entrar a la mazmorra X": it goes before the first objective in that dungeon.

Where no objective names the boss or the zone, `journal.stopAt` in `src/dofus/silvestre/config.js` says by hand which objective the stop falls on, or which ones if the step stops in two quests, following the quest's guide on Torrente Arcano. That covers 37 steps. Some cases:

- In step 10, the iron bone of "Encender la mecha" drops from Maxilubo, whom no objective names.
- In step 85, "Ilyzaelle" already appears on the map of her lookout, before the fight. In step 54, the fight against Kumijo is "Capta la atención de la kitsu de nueve colas", before the deal that names her.
- In step 61, the line goes on the fight against Cil in "Un frío que hiela las piedras", not on the map of his dungeon entrance.
- In step 64, the stop is not where the guide puts it ("hasta poder entrar en la taberna") but after handing the strong beer to Pandawelo, because mission 2, in step 66, cannot start earlier. A hand-written note explains it (`journal.extraNotes`), and its "paso 66" and "paso 67" link to those steps.

The fights of one stage can be done in any order, but DofusDB lists them in one. Where the guide passes some bosses and leaves others for later, `OBJECTIVE_ORDER` in `.build/dofus/silvestre.py` moves the pending ones to the end, after the line: in step 39 Funoroshi is left, and in step 50 Sfinter Cell. Step 58 needs no change, because Kanígrula and Cil already come after Perfósil.

Some quests are left half done in one step and finished by a later one. In steps 38 and 92, `later` in `journal.stopAt` marks it:

- Step 39 stops inside "La bendición de Viti" and leaves Funoroshi for step 48, so in step 62 that quest only shows completed with 39 and 48 done.
- Step 38 finishes its quests except "La bruja mala del Este", which stops before Viti's blessing, the one step 39's quest gives. It gets its own red line, even though step 38 resolves itself, and step 62, which includes the quest, finishes it; the guide does not resume it earlier.
- In step 92, "Un legado atormentado" cannot craft the rune without the totem from "Los tótems de Maimane", so it stops in red before crafting it and step 98 finishes it. Step 93 finishes "Los tótems de Maimane", not that one.

In a step that resolves itself (it has a green callout), red is not where to stop but where you resume. It does not show as a callout, and on the route the line is green and says what gets resolved ("Se pasa Nelwynn y se terminan las misiones de los incisos 5 y 22"). If the red added something else ("Retomar sala 5…"), it stays as a note. If the green ends with "…hasta tener que pasar X" (step 43 with Kodámade, step 72 with Ilyzaelle), that is a new stop: a red callout and a red line in its quest, which can carry both lines. "Lo que se resuelve" shows the portrait of the boss you pass, or the game's sword if there is no boss, on the map card too.

### Parent and child quests

A quest that starts inside another quest of the same step and fulfils its objectives is its child. Its start criterion in DofusDB says so ("Qa=1786&Qo>11555": the parent in progress and past that objective), and `build_quests_js.py` stores it in `PARENT`, inside `quests.json`.

On the parent's route, a gold line says which children are done at that objective ("Aquí se hacen «El dragón de las aguas»…" in step 81, or one per objective in "Nordalía", in step 93). Each name unfolds that quest and scrolls it into view. It only shows if the child is in the same step: in step 38, "La bruja mala del Este" does not name "La bendición de Viti", which belongs to step 39. Finishing a child does not finish the parent. When the parent is finished, progress moves to the first quest still not done.

### Completing a step

At the bottom of the detail sits a bar with the previous step, "✓ Completar paso 34" and the next step. Completing checks the step and opens the next pending one. With the step done, the button reads "Paso completado · deshacer". Enter or Space on the selected step does the same, and so does the map card.

On desktop the bar sits at the bottom of the detail. With few quests, as in step 4, the gap stays between the content and the bar. With more, it sticks to the bottom while scrolling, and it never rises over the banner and the objective: it leaves at least 240 px of the body visible first. Opening a quest lengthens the detail inside, without changing the window height or moving the list.

If the step's fight closes other steps that are still pending, the same button finishes what they have left, and a small line below says what: "Además: en el 33 completa «Muchos cuerboks en la cabeza»." A closed step that ends up done shows as "el 77 queda completado", and if several of its quests get completed, they are counted ("en el 78 completa 2 misiones").

Closing a step does not check it in full. It finishes what that step left half done: the quest where its red stop falls and the parent waiting for that quest, if any. The others are done in that step itself, because not everyone follows the guide in order. A stop that a later step finishes is not finished by the closing step: step 93 closes 92, and 92 ends up done if you reached the stop in "Un legado atormentado".

If that leaves the closed step with all its required quests done, it is checked. If not, it stays pending and a notice says what is missing ("El 5 sigue pendiente: falta «Las primeras impresiones son engañosas»."), with "Las hice, marcar el 5" to check it anyway. While the quests have not loaded, or if it is unknown where the stop falls, the closed step is checked in full.

### What you need to gather

It uses the same slots as the Objetos tab and the same state: clicking one marks it collected for that step in both places. The corner icon copies the name for the marketplace.

An item that several steps need is added up in Objetos. What you collected for one step, or what a done step covers, is subtracted, so the slot shows what is still missing until you have every part. For example, Ortiga ×100 (50 for step 1 and 50 for the prerequisites) drops to ×50 when you collect it in step 1.

## Prerequisites

There are 20, kept in line with torrentearcano.com: 11 earlier achievements and quests, 6 professions and 3 spells. "La tierra banquisa" is not here because it is the first quest of step 23. At the top sits Sandglass's advice to start the Dofus Ocre as early as possible, with a notice that links to step 79. Prerequisites do not count towards Silvestre progress: they are tracked separately.

Each one is a card you can check, with the items it needs below. Professions and spells show their game icon. Prerequisites that ask for specific quests show the quest «!»; those that ask for a full achievement, the small book with a trophy. Optional ones carry a blue tag and a dashed border.

The earlier achievements with a guide on Torrente Arcano (El gran Guarrok, Turbera maldita, Altos vuelos, Pan Koko Mío, Frío al cubo and Ángeles y demonios) link to it with "Guía ↗", even when the prerequisite only asks for some of their quests. Those that are a single quest link to the quest's guide: El despertar de Pandala and Intrusión en el territorio wabbit. El cementerio primitivo has no guide. The link sits over the card's corner and not inside, because the card is the button that checks it.

Each item is tied to the prerequisite it is spent on (`PREREQ_OF` in `.build/dofus/silvestre.py`, taken from the objectives of its quests in DofusDB). Completing a prerequisite counts its items as used. Not the other way round: checking an item does not complete the prerequisite, because you can buy it beforehand. The fixes to the site's list are in [data.md](data.md#required-items).

## Required items

This is torrentearcano.com's list, step by step, laid out like the game inventory.

- "Tus próximos pasos" gathers what your next 5 steps need, plus any missing prerequisites, with the exact quantity and sorted by step. The rest goes under "Más adelante". An item that several steps need goes in the first step that needs it.
- Completing a step moves the strip forward. Each step's tag gets a ✓ once everything it needs is gathered, and fades if it needs nothing. It does not wait for optional items.
- A part counts as spent when its step is done or the prerequisite that needs it is completed. With "Solo pasos pendientes" off, "Ya utilizados" shows what was spent.
- You can sort by quantity or A to Z, filter by category and search ignoring accents. The "/" key opens the tab with the search ready from anywhere on the page.
- There is a grid view and a list view. In the grid, search highlights matches and moves them first; the list is paginated (10, 25, 50, 100 or all) and search filters it.
- On hover, each item says what it is for: "Para «Intrusión en el territorio wabbit»" in the prerequisites, and the quest in the steps ("«Las primeras impresiones son engañosas»"). `.build/audit_resources.py` works it out ([data.md](data.md#which-quest-each-item-is-for)).
- The copy icon on each slot, or a long press on mobile, copies its name for the marketplace search.

The Prerrequisitos and Objetos tabs carry a badge with what is missing, or a ✓. Above each list is the credit to Sandglass. "Marcar todo" and "Limpiar" act on what is visible and can be undone.

## Hero and header

The hero is the next pending step. Its banner is shown large over the game map where that step starts, full width, with parallax on scroll, fireflies at night and falling leaves by day. If the map fails to load, the zone landscape remains. In the light theme the black around the map room becomes transparent.

Next to the banner sit the step title, a line with the zone, where it starts, how many quests it has and how many items are missing, its first guide callout and "Continuar con el paso N →". Checking or unchecking steps fades the hero to the new next step. It takes at most 70 % of the screen (620 px), so the next section peeks below.

Progress is a 10-segment ring around the Dofus Silvestre, unlit until the end, with the percentage, the steps done and a note about how steps are weighted. Checking step 99 makes the unlit Silvestre shake, burst and turn into the Piñata de pino. Checking step 100 turns the Piñata into the lit Silvestre. The animation only plays at that moment. With the guide finished, the hero goes back to the large title and the obtained egg, over a different map per theme. On mobile the ring sits at the top, compact.

The header merges with the hero: transparent over its map and solid once you scroll. It carries the brand, a logotype in the style of Dofus's (Lilita One with an outline) next to the tilted Silvestre, and two buttons made from game items: the Catalejo de gobletrotter opens the overlay and the Minirreloj de arena opens the reset dialog.

## Other features

| Feature | What it does |
|---|---|
| Light and dark theme | A switch with two eggs, Dofus Ébano and Dofus Marfil, that swap places along an arc. The page changes with a diagonal wipe from the switch. In light mode fills are lime green and accent text is an ink green (`--accent-ink`) with AA contrast |
| Reset | A dialog shows your progress and lets you pick what to erase: steps, prerequisites or items. Erasing steps also erases each quest's progress. A toast lets you undo for 8 seconds |
| Backup | In the same dialog: says when the last backup was and warns if it was more than 14 days ago or never, downloads progress as JSON and restores it with a button or by dropping the file |
| Torrente Arcano guides | Quests and achievements named in the text link to their guide, and each quest with a guide has "Guía ↗" on its row. Details in [data.md](data.md#guide-links) |
| Explanatory note | Explains "Hasta tener que pasar X jefe" with steps 43 and 44, which stop before Kodámade, and step 45, which finishes them. Links to the 33 steps that use that instruction |
| Keyboard | ←/→ between steps, Space to check, Esc to close. "/" opens the item search |
| Search fields | The step search and the item search are the same control (`SearchField.jsx`): they show how many match ("12 de 100") and Escape or × clears them. Each keeps its own query |

### Motion

Every state change is visible. With reduced motion nothing animates.

- Going from the map to the diary zooms into the seal of the current step (0.3 s), and going back zooms out. The incoming view gets ready invisibly until what is on screen is loaded, with a 1.5 s limit, and then the two cross (`src/tools/checklist/lib/viewSwap.js`). The DofusDB game map is not awaited: it arrives over the landscape.
- [motion](https://motion.dev)'s `AnimatePresence` coordinates this in `popLayout` mode, with `usePresence` and motion's mini `useAnimate`. Heights do not use motion's `layout`, which scales and would make the content below jump: they use `useHeightMorph` (`src/tools/checklist/lib/motion.js`), which animates the real height with `interpolate-size`.
- Between Prerrequisitos and Objetos, or to and from them, the outgoing view slides aside and fades out, and only then does the new one come in. Two views never show at once. The active tab pill slides over and the badges bounce when what is missing changes.
- On mobile, switching tabs animates the height. On desktop the window has the screen height and does not animate.
- ✓ marks pop in with a bounce, quests open with their height, seals fill their ring and sections enter on scroll without JavaScript.

## Mobile

The list takes the full width. Tapping a step raises a bottom sheet with the detail, which closes by dragging down or tapping outside. The overlay is not available on mobile.

## Quests for each step

Each achievement stores its objectives in order, and each objective is "finish quest X". Sandglass numbers quests the same way: an achievement's "misión 4" is its fourth objective. With that, each step resolves to its quests:

| The guide says | Taken |
|---|---|
| "hasta la misión N" | From 1 to N |
| "misión 7, misión 8" | Exactly those |
| "misión: Birk, hija de Bork", no number | The quest with that name |
| "(Completo)" or no numbers | The whole achievement |
| "Alineamiento Bontariano: Misión N" | From the quest the previous alignment step paused on up to N, the one that needs Bonta alignment level N−1 |

The order follows the achievement's objectives, counting those that are not quests, so that "misión 7" is the seventh. If a step cites several achievements, they go in the order the guide names them. What the step "incluye" are its requirements, so it goes first. `match_assets.py` reads this.

Rules for which quests get in:

- Callouts only add quests if they cite them by number or say the step "incluye" the achievement. Mentioning another achievement in passing does not add its quests.
- A standalone quest gets in by name after "Misión:", also when several follow each other, like Mel's three in step 29.
- Without the colon, only the quest the guide requires gets in ("Se debe hacer la misión Flovoración", in step 100), not one you merely can start.
- A quest name does not keep the ")" that closes the highlight ("Detenla si puedes", in step 54).

Result: all 100 steps have quests, 363 in total, with 5023 objectives, 4114 of them with a map or coordinates. NPC, item and monster names inside the texts all resolve. `src/dofus/silvestre/quests.json` weighs about 600 KB and the page loads it after the first render.

### Quests added by hand

Some quests do not come from the text and `.build/dofus/silvestre.py` adds them:

| Table | What it does | Cases |
|---|---|---|
| `STEP_EXTRA` | Adds quests the step requires | Step 12 lists Cofrología, Tesorfanato, El maleficio del cofre and Las grandes galerías before "Espionaje industrial". Step 78 has the Espíritu de la salvación order quests up to 4, and step 89 the order 5 quest with "El exorcista" first, Bonta's quest 100, because the order 5 quest needs alignment level 100 and step 85 reaches 99. Step 80 starts with "La última piedra", which "Alma máster" needs first |
| `STEP_EXTRA` and `QUEST_AFTER` | The "Abono de peaje" quests, which have no step of their own. Each is a run through a Frigost dungeon that the island's quests require. They go under their achievement, after the quest where their dungeon is passed | Antimonárquico in 21, Las joyas de la corona in 28, Duerme y tendrás un pastel in 38, Lavandería automática in 50, Hace fresco, pero no importa in 52, Canozzirujana in 61 and Allá arriba, en el pico helado… in 81. No quest needs "Allá en la montaña…", so it is left out |
| `FIGURE_QUEST` | The banner and its map stay those of the step's own quest, not of what was added | 31, 40, 52, 83, 86, 87 and 89 |
| `SUBQUESTS` | Quests another quest gives along the way and waits for | In step 83, "Birk, hija de Bork" gives "Los enemigos de mis enemigos son mis enemigos" and "Los nanoinsumisos" and does not continue until both are finished. They go right after Birk, before the stop, and are required |
| `STEP_SKIP` and `QUEST_AFTER` | Quests the step names but cannot do | Step 53 does not include "Hasta su último suspiro", although it is mission 2 of its achievement: it starts after the fight against Kumijo, where step 53 stops, so it goes in step 56 after "Réquiem por un yokai". In step 16, "La huida es la mejor salida" needs "Nuestros amigos los animalitos" finished, which the achievement lists later, so it goes after it |

"La sombra del reino", in step 38, is also added by hand. The red callout says it can be started during mission 3 and done any time before step 80, and "La sombra de lo que era", in step 81, needs it finished. It goes after "Esto parece el Sur" as optional, because it does not keep the step open, and carries a note ("Se puede hacer en cualquier momento antes del paso 80.", `journal.questNotes` in `src/dofus/silvestre/config.js`).

Two objectives show as a single row. The objective of "Un ciudadano modelo" fulfilled by any class quest shows as "Misión de clase", linked to the Torrente Arcano page that lists each class's quest. The "Prólogo invernal" of "Un alma helada", in step 63, depends on alignment: its start says which one Bonta, Brakmar and players with no alignment or neutral get, and links each one's guide.

## Overlay

The Overlay button in the header opens a window that stays on top of the game, so you do not have to switch back to the browser. It opens at 400×680 and does not resize itself afterwards: you choose the size and the content adapts. The header, the tabs and the footer stay fixed and only the middle scrolls.

It uses the Document Picture-in-Picture API, the same one duffus.fr uses. In Chrome and Edge the window stays on top of everything, including the Dofus client. Firefox and Safari do not implement it: there a regular popup opens with the same content, but it does not float. The browser decides the position, because the window does not support `moveTo`. On mobile the button does not appear.

At the top are the step number, its title in the zone colour (up to two lines), "Guía ↗" and the percentage. "Guía ↗" opens the step's guide on Torrente Arcano: the guide of the achievement its text names or, for alignment steps, the guide of its first quest that has one. Clicking the number opens the list of the 100 steps inside the overlay, with done steps dimmed and the current one in view. Escape or × closes it.

Below are four tabs. The first time it opens on Ahora; after that, on the last one used (`silvestre:overlayTab`).

| Tab | Contents |
|---|---|
| Ahora | "Hasta dónde llegar" and "Lo que se resuelve", the current quest with its "Completar" and a dropdown of the step's quests, the current objective with its medallion and coordinates, "◀ Objetivo 3 de 12 ▶" with "✓ Completar objetivo", and the next two objectives |
| Misiones | The same list as the diary, with its groups, routes, stops and notes |
| Objetos | The step's item slots; the tab shows how many are missing |
| Guía | Sandglass's text with its links and all its callouts |

In Ahora, "Completar objetivo" marks the objective done and moves to the next one; on the last one it finishes the quest and, if it was the last required one, the step is checked. With the quest finished, the bar reads "✓ Misión completada", with "Siguiente misión ▶" if another quest remains. The stop shows whenever the step has one, even if the current quest is not the one that stops: it helps to see it in advance. There is no map thumbnail: the coordinates are enough.

At the bottom sits the diary's bar, with the same button and the "Además: …" line. While the quests have not loaded, Ahora shows the stop and that button completes the step.

The overlay keeps its own step: its arrows and links do not change the step open on the page. If you pick another step on the page, the overlay follows it again. Everything else is the same state in both windows. With the window focused, ←/→ change step, ↑/↓ change objective and Space or Enter check the step. Coordinates copy `/travel x,y` for the game chat.

## Limitations

1. Objectives approximate duration. The weight comes from level and objective count, not real time: talking to an NPC counts the same as clearing a dungeon. It is a reproducible measure, not an exact one.
2. Progress lives in `localStorage`, per domain and with no account. Progress on github.io and on torrentearcano.com is separate. If the site moves, everyone loses their progress unless they kept a backup.
3. Asset matching is automatic. A step may show the icon of a secondary reward, because the script takes the first achievement in the text that hands out an item. Bosses are detected by capitalised proper names, which rules out false positives like "la guerra interminable" but depends on Sandglass keeping that style. `.build/data/silvestre/step_assets.json` lets you audit any step.
4. The data comes from DofusDB, a third-party service. The images are copied into `public/img/`, so the page does not depend on it except for the hero's high-resolution map. Regenerating the data does need it.
5. The `/travel` syntax is not verified in game. The only reference is an extension for dofus-map.com that copies `/travel` followed by two coordinates. If the game expects another format, change it in `copyTravel()` (`src/tools/checklist/components/StepParts.jsx`).
6. Alignment quests are derived from start criteria, not from an official list. The levels match what each step says (quest 99, level 199, leads to Ilyzaelle's lookout), but it is an inference.
