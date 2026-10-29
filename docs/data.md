# Data

The checklists draw on three sources: the Torrente Arcano guide (step texts and item list), DofusDB (achievements, quests, bosses, items and images) and the hand-written tables in `.build/dofus/<id>.py`. The `.build/` pipeline combines them and writes JSON to `src/dofus/<id>/` and images to `public/img/`. All of that is committed; the app requests nothing from DofusDB at load time, except the hero map.

The examples are for the Silvestre. Every script takes `--dofus <id>` or the `DOFUS` variable; without either, `silvestre`.

## Regenerating the assets

```bash
python3 -I .build/fetch_dofusdb.py     # downloads achievements, bosses, dungeons and quests
python3 -I .build/match_assets.py      # matches the steps and prints coverage
python3 -I .build/build_assets_js.py   # writes assets.json and copies images to public/img/
python3 -I .build/build_quests_js.py   # writes quests.json: quests and objectives per step
python3 -I .build/build_weights.py     # writes weights.json: each step's weight in the percentage
python3 -I .build/build_figures.py     # writes figures.json: start map and banner figure
python3 -I .build/fetch_start_maps.py  # copies those maps to public/img/maps/start/
python3 -I .build/build_resources.py   # writes resources.json: each step's items
python3 -I .build/audit_resources.py   # which quest each item is for (item_quests.json)
python3 -I .build/build_resources.py   # again, to read item_quests.json
```

This is the same sequence the daily sync runs. Three scripts are separate and run by hand: `import_guide_links.py` (links to the guides), `fetch_zone_maps.py` (zone landscapes) and `build_cosecha.py` (the souls of «La eterna cosecha», see [torrente-arcano.md](torrente-arcano.md#la-eterna-cosecha)).

| What | Where |
|---|---|
| Hand-written tables for one Dofus guide: steps it splits or closes, extra quests, corrected items, figures, zone maps | `.build/dofus/<id>.py` |
| Generated output | `src/dofus/<id>/` and `.build/lists/<id>/` |
| Intermediate files for one Dofus (`step_assets.json`) | `.build/data/<id>/` |
| Raw DofusDB data and API caches, shared by all | `.build/data/` |

The first run downloads about 180 MB into `.build/data/`, which is in `.gitignore`. API answers (names, map positions, professions) are cached in `.build/data/lookup_*.json`, so regenerating never asks again for what is already downloaded. DofusDB and Torrente Arcano fail at times; `AGENTS.md` covers the retries and the API gotchas.

The image scripts crop and compress through `.build/imaging.py`: `sips` on a Mac, ImageMagick elsewhere. They only process new downloads.

The pipeline's tests live in `.build/tests/` and use only the standard library: `python3 -I -m unittest discover -s .build/tests`.

## Game assets

Steps name achievements, quests and bosses in Spanish. That lets the pipeline match them against [DofusDB](https://dofusdb.fr) and fetch the game's real art. Matching covers 99 of the 100 steps; the missing one is step 89 ("Misión de orden 5"), which names nothing specific.

Each step picks its icon in this order:

| Priority | Source | Steps |
|---|---|---|
| 1 | Item rewarded by the achievement: the coloured Dofus, relics, ingredients | 72 |
| 2 | Portrait of the boss the step requires you to pass | 14 |
| 3 | Achievement category icon | 10 |

Three steps, 4, 29 and 86, only name quests and have no icon. The first source is the right one: the "Blanco marfil" achievement rewards item 7115, the Dofus Marfil, so step 93 shows that egg. Category icons are the last resort, because Ankama has only three for the whole checklist.

`assets.json` also stores each step's bosses: 64 in total, 36 distinct. Their portraits show on the map, in the list and in "Lo que se resuelve".

Each zone has a landscape: a game map picked by hand among those its quests cross. `.build/fetch_zone_maps.py` downloads them from DofusDB, crops the watermark and saves them in two sizes in `public/img/zones/`.

## Everything self-hosted

The game images live in `public/img/`, one folder per kind: about 1100 files and 26 MB. The build scripts copy them.

- Profession icons come from the `job_images_64.tar.gz` release of [dofusdude/dofus3-main](https://github.com/dofusdude/dofus3-main), because DofusDB returns 404 for its own.
- The maps where steps start, the banner background, are cropped by `fetch_start_maps.py` like the zone landscapes and kept at 800 px wide in `public/img/maps/start/`. The Silvestre uses 61; the folder holds 80 (3.4 MB) because it serves every Dofus, and the script only deletes maps that no `src/dofus/*/figures.json` uses.
- Those maps used to come from DofusDB when a step opened, and for a second the landscape showed before the map covered it. Now the banner has a single background, the map or, failing that, the landscape, and paints nothing until it has loaded.

The exception is the hero background, the next step's map in high resolution, which loads from DofusDB (`MAP_IMG_HD` in `src/tools/checklist/lib/quests.js`). The only other external request is Google Fonts.

## Required items

They come from the same Torrente Arcano page. Sandglass lists, step by step, only what you need to gather (base resources, equipment, consumables, souls, creatures), without the intermediate items crafted along the way. "Step 0" is the prerequisites. `.build/build_resources.py` looks each name up in DofusDB for its image and writes `src/dofus/silvestre/resources.json`: 442 items in 68 steps.

The totals follow the rules of the page's own compiled list, and the script compares them row by row with `.build/lists/silvestre/compilado.txt`:

- What you keep after using it (Mazorrasombrero, Varita pitusa, Piedra de alma mediana, Calzoncillo de repuesto de capitán chafer) counts once even if two steps ask for it.
- The Elixir de los barquerontes shows in its step but does not add up: you only need it if you lost the alteration.
- Items for an optional quest or for a single alignment order carry a tag. They count in the total like the rest: they are tied to their steps, so completing those covers them.

### Fixes to the page's list

All checked against each quest's guide and DofusDB. The tables are in `.build/dofus/silvestre.py`.

| Table | Fix |
|---|---|
| `CORRECTIONS` | The list asks for "Hoja de kalipto", which does not exist (it is the Flor de kalipto), and "Filtro de dragonalgas", now the Filtro de amor that "En busca de un herrero" asks for in step 47 |
| `DUPLICATES` | The Ortiga ×50 and Lana de jalatín negro ×5 of "El despertar de Pandala" appear twice, in the prerequisites (l11) and in step 1, whose "El receptáculo de los dofus" requires that quest: they stay only in the prerequisites. The planks and rope in step 75 duplicate step 76's, from when the page split the old step 75: they are removed |
| `MOVED` | The Lana de jalató ×5 and the Llave del Laboratorio de Brumen Tinctorias sit in step 4 (Barnabé en el espacio, which only asks for a fight) and belong to step 5: they are the first objective of its two quests. Same in step 19: the Calavera, the Llave del Ring Eskarlata and the Tallo de bambuto belong to quests 5 and 6 of Púrpura profundo, in step 21. The Glándula de arak-hai in step 34 is handed in at step 35 |
| `EXTRA_ITEMS` | The Casco and the Alas de madera are for the cannon to Moon island in "Ida sin vuelta" (Pan Koko Mío): carrying them is enough. "Altos vuelos", which is optional, asks instead for the Casco mejorado and the Alas de madera mejoradas; the page does not list them, so they are added with the tag "Opcional · Altos vuelos" |
| `PREREQ_OF` | Ties each prerequisite item to the prerequisite it is spent on, from the objectives of its quests in DofusDB |

Two names do not exist in DofusDB and show without an image: Esencia de cil and "Recursos recolectables de los reinos de tinta y papel".

### Which quest each item is for

`.build/audit_resources.py` cross-checks what each step asks for against what its quests consume in DofusDB (hand-ins and crafts, with their recipes) and against the "Necesitarás" section of its Torrente Arcano guide. It writes `.build/lists/silvestre/item_quests.json`, and `build_resources.py` reads it to store in `resources.json` which quest each item is for, which the app shows on hover. It also prints what does not match: items no quest of the step asks for (and which neighbouring step does), different quantities, and what the quests consume that the list misses. With `0` it checks the prerequisites.

## Guide links

The quests and achievements named in a step's text link to their guide on torrentearcano.com, as in the classic checklist. `.build/import_guide_links.py` takes the names from the page, builds the same URLs and keeps only those that answer, in `src/dofus/silvestre/guides.json`: 72 achievements and 103 quests from the text. "Draconantopía" is missing.

- The page does not link "En marcha hacia la aventura" or "Un ciudadano modelo", the two achievements step 1 includes: `EXTRA_ACHIEVEMENTS` gives them their guide. "Respuestas para todo" has no page.
- Where the guide misspells a name, `MISSION_URLS` gives the page: "Los tótems de Maimame", in step 92, links to "Los tótems de Maimane".
- It also links each quest in the diary list to its guide when the page is in the site's sitemap: 361 of 363. The "Prólogo invernal" links each alignment's guide from its start. These are kept apart (`quests` in `guides.json`) and are only linked in the list, because a short title like "Memo" must not link stray words in the text.

## Updating the guide

When Sandglass publishes a new version, it is imported from Torrente Arcano's data page, the one that holds the classic checklist:

```bash
mkdir -p /tmp/ta
curl -sL -A "Mozilla/5.0" -o /tmp/ta/page.html https://www.torrentearcano.com/checklist-silvestre-datos
python3 -I .build/import_guide.py /tmp/ta/page.html
```

You rarely need this: the daily sync does it. If the page lacks the checklist data (a 404, a password-protected page or the page with the app snippet), the script fails with a message and touches nothing. The same happens if not all steps arrive.

`import_guide.py` rewrites the steps in `src/dofus/silvestre/steps.js` and saves a copy of the page data in `.build/lists/silvestre/torrentearcano.json`. The page also publishes which steps of the previous version make up each new step (`PREVIOUS_STEPS`). That table migrates saved progress and old backups: a new step is done if all the old steps that form it were. Then regenerate the assets.

### The data pages

The classic checklist, with its data, lives at https://www.torrentearcano.com/checklist-silvestre-datos; the Hielos one at https://www.torrentearcano.com/checklist-hielos-datos. They must stay public and without a password. They can be hidden from the menu and from search engines.

### Progress from the classic checklist

The classic checklist stores progress in `dofus_silvestre_clean_v4`, and before that in `dofus_silvestre_clean_v3` with the guide's old numbering. The Hielos reads it from `dofus_hielos_clean_v2`. The app only reads those keys and never changes or deletes them (`src/tools/checklist/lib/classic.js`). To read them it must run on the same domain, `www.torrentearcano.com`: on another domain or without `www` it sees nothing.

- On the first visit it checks every step the classic checklist has checked. If no theme was chosen here, it also takes the classic's theme. v3 only counts when there is no v4, and it is mapped to the current numbering with `PREVIOUS_STEPS`.
- On later visits, if the classic has done steps that are not done here, a notice says "Tienes N pasos más en el checklist clásico" with a "Traerlos" button. The button only adds steps and never unchecks any. The × closes the notice, which does not come back until the steps checked in the classic change.
- Bringing steps over works like restoring a backup: it does not celebrate the Dofus that arrive and does not complete other steps on its own.

## Guide sync

`.github/workflows/sync-guide.yml` runs once a day and also by hand (Actions → Sync guide with Torrente Arcano → Run workflow). It calls `sync-guide-dofus.yml` once per Dofus, all on Ubuntu:

1. It downloads the data page and imports it. If nothing changes in `src/dofus/<id>` or `.build/lists/<id>`, it stops there.
2. If something changed, it regenerates the assets with the sequence above. Images go through ImageMagick (`.build/imaging.py`), which the workflow installs if missing. Every script that hits the network is retried up to 3 times, and `.build/data/` is kept in the Actions cache.
3. It pushes the change to its branch and opens a PR to `main`.
4. It triggers CI on that branch, waits for the `Pruebas` check, squash-merges the PR and requests a deploy. Actions taken with the workflow token (opening and merging the PR) do not trigger other workflows, so CI and deploy are requested separately.

| | Silvestre | Hielos |
|---|---|---|
| Data page | `GUIDE_URL` or, without it, https://www.torrentearcano.com/checklist-silvestre-datos | `GUIDE_URL_HIELOS` or https://www.torrentearcano.com/checklist-hielos-datos |
| Branch | `sync/guia` | `sync/guia-hielos` |
| PR title | `chore(guia): sincroniza con Torrente Arcano` | `chore(guia): sincroniza el Hielos con Torrente Arcano` |
| Issue on failure | "La sincronización con Torrente Arcano falló" | "La sincronización del Hielos con Torrente Arcano falló" |

`GUIDE_URL` and `GUIDE_URL_HIELOS` are repo variables (Settings → Secrets and variables → Actions → Variables). The Hielos runs after the Silvestre even if the Silvestre fails, so its PR starts from a `main` that already has the Silvestre changes merged.

If anything fails (the page does not answer, lacks the data, regeneration fails or a test fails), `main` does not change and the Dofus's issue is opened with a link to the run. If an issue with that title is already open, the run comments on it. The schedule only runs from the default branch: the workflow has to be on `main`.
