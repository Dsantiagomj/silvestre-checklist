# Agent contract for silvestre-checklist

Rules for any agent that changes this repo. It serves two audiences from one codebase: the embeds Torre pastes into torrentearcano.com (Squarespace) and our own site on GitHub Pages. The embeds are a frozen contract; the site is ours to change. Visual rules live in `DESIGN.md`; product and data details live in the README (Spanish).

## When this applies

Every change: code, data, docs, CI. Read this file before the first edit. For UI work read `DESIGN.md` too.

## Quick path

1. One branch per change, in a worktree under `../silvestre-checklist-worktrees/<name>`.
2. Check the frozen embed contract below. If the change touches a row, stop and ask.
3. Strict TDD: write or adjust the test, watch it fail, then implement.
4. Run all five suites locally (see Testing). Report failures verbatim.
5. UI change: screenshots at 1440, 1024 and 390 px in `tmp/shots/`, compared with the approved mockup.
6. Open the PR (Spanish body, conventional commit title). No auto-merge unless asked.

## Frozen embed contract

Torre's live pages must not notice any change. Bundle bytes and chunk hashes may change; nothing in this table may, without explicit approval.

`EMBED_BASE` is `https://dsantiagomj.github.io/silvestre-checklist/` (`vite.config.js`). Every embed loads its chunks and images from there, and Torre's snippets point there.

| Surface | Entry under `EMBED_BASE` | Chunk and asset dirs | Host div | Fonts key (`data-*`) | Top var | Storage keys |
|---|---|---|---|---|---|---|
| Silvestre checklist | `embed/silvestre.js` | `embed/chunks`, `embed/assets` | `#silvestre-root` | `silvestre-fonts` | `--silvestre-top` | prefix `silvestre:`; reads `dofus_silvestre_clean_v4`, `_v3`; shares `dofus-checklists:shared` |
| Hielos checklist | `embed/hielos.js` | `embed/hielos-chunks`, `embed/hielos-assets` | `#hielos-root` | `hielos-fonts` | `--hielos-top` | prefix `hielos:`; reads `dofus_hielos_clean_v2`; shares `dofus-checklists:shared` |
| Checklists hub | `embed/checklists.js` | `embed/hub` | `#checklists-root` | `checklists-fonts` | none (sets the height var `--checklists-h`) | none |
| Torrente home (inicio) | `embed/inicio.js` | `embed/inicio` | `#inicio-root` | `inicio-fonts` | none | none |
| La eterna cosecha | `embed/cosecha.js` | `embed/cosecha` | `#cosecha-root` | `cosecha-fonts` | `--cosecha-top` | `cosecha:done`, `cosecha:ui` |

Also frozen: the classic keys are read-only (`src/tools/checklist/lib/classic.js`); `dofus-checklists:shared` is read and written by both checklists (`src/tools/checklist/lib/shared.js`); the stored formats; shadow-root isolation (`mode: "open"`); the preview page `/checklists/` (`noindex, nofollow`), which loads the live bundle from `EMBED_BASE`; `cosecha:done` on the site's `/cosecha/` page, which replaced the old `noindex` preview at the same URL; and the published `/cosecha/cosecha.json`.

Where the values live: `src/dofus/<id>/config.js` (`embed`, `build.embed`, `storagePrefix`, `classicKeys`), `vite.config.js` (`EMBEDS`, `EMBED_BASE`), `src/embeds/{hub,inicio,cosecha}/embed.js` (host id and fonts key, hard-coded), `src/tools/cosecha/cosecha.js` (`DONE_KEY`, `UI_KEY`). `tests/embed/contract.spec.js` holds these values as literals and checks them against the configs and the built bundles; keep them literal, a test that reads the configs passes whatever they say.

| Rule | Detail |
|---|---|
| Embeds never ship the site shell | No header, nav or site CSS in an embed bundle; `contract.spec.js` fails if any bundle contains `dt-shell` |
| Embed-only views get no site page | Inicio and the hub stay off the site navigation; their previews may stay |
| No behavior change while moving code | A restructuring PR moves and renames only, and keeps every test green without editing assertions |

## Language

| Artifact | Language |
|---|---|
| `AGENTS.md`, `DESIGN.md`, new docs under `docs/` | English |
| UI copy, code comments, commit messages, PR titles and bodies, issues | Spanish, matching the README and the history |
| Identifiers | follow the surrounding code |
| Commits | conventional commits (`feat(cosecha): …`, `fix(inicio): …`); no AI attribution lines |

## Workflow

| Rule | Detail |
|---|---|
| One branch per change | Worktrees under `../silvestre-checklist-worktrees/`, never inside the repo |
| All five suites before push | `npm run test:unit`, `npm run test:embed`, `npm run test:hielos`, `npm run test:site`, `npm run test:e2e`. Re-run a suspected flake alone (`--retries 0`) before calling it a flake |
| One concern per PR | Chain PRs when a change mixes concerns or passes about 400 changed lines. A pure `git mv` PR is exempt; review it with `git diff -M --stat` and say so in the body |
| Merge method | Rebase for human PRs. The guide-sync bot squash-merges (`gh pr merge --squash` in `sync-guide-dofus.yml`) and stays that way |
| Auto-merge | Only when the user asks |
| Required check | `Pruebas`, the aggregator job in `ci.yml` (ruleset "Proteger main"). Keep its name: `sync-guide-dofus.yml` polls it by name. Skipped jobs count as passed |
| Ask, do not guess | A blocked decision gets one question, then stop |
| Screenshots | `tmp/shots/` (git-ignored), 1440, 1024 and 390 px wide |

## Strict TDD

1. Write the test (or change the assertion) first. Run it and watch it fail for the right reason.
2. Implement the smallest change that passes.
3. Run the suite the test belongs to, then all five before pushing.
4. A refactor PR never edits assertions. If a move needs an import path changed in a test, say so in the PR body.

## Design process

1. Mockups first: two or three options as static HTML or images, kept out of the repo (`tmp/`). Follow `DESIGN.md`; real game art, no placeholders.
2. The user picks. Do not implement before that.
3. A functional prototype when the flow is unclear (interaction, scroll, sticky behavior), still outside `src/`.
4. Implementation, test first.
5. Screenshots at 1440, 1024 and 390 px in `tmp/shots/`, each next to its approved mockup, in the PR report.

## Embed engineering rules

Learned the hard way; each has a reference implementation.

| Rule | Why | Where |
|---|---|---|
| Mount in an open shadow root on the host div; return if `host.shadowRoot` exists | Squarespace CSS must not enter and ours must not leak; the script can be pasted twice | `src/embeds/*/embed.js(x)` |
| Fonts go in the page `<head>` through `pageFonts(css, key)` | `@font-face` does not apply inside a shadow root | `src/lib/fonts.js` |
| Reset `overflow-wrap: normal; word-break: normal; hyphens: manual` at the widget root, plus `font-size`, `line-height`, `letter-spacing: normal`, `text-transform: none`, `text-align: left`, `box-sizing` | Squarespace sets them on `body` and they inherit into the shadow root; the test fixtures set `* { font-family: serif; letter-spacing: .08em; box-sizing: content-box }` and `button { all: unset }` on purpose | `.inicio`, `.cosecha` |
| Widget titles are `h2`; the host page owns the `h1` | Torre's page already has an `h1` | hub `.title`, cosecha `.hd h2`. Known exceptions: the checklist embed renders the hero's `h1` (`src/tools/checklist/components/Hero.jsx`, same code as the site) and inicio renders an `h1` because it is the home page's own hero. New widgets use `h2`. On our own site the page owns the title: `src/site/cosecha/main.js` passes `{ heading: "h1" }` to `renderCosecha` |
| Container queries on the widget root, never media queries | The Squarespace column can be narrow on a wide screen | `container: <name> / inline-size` and `@container <name> (max-width: …)` in each CSS. The React checklist still uses media queries; it needs `fillViewportWidth(host)` to go edge to edge |
| Sticky UI sits under the page's fixed header through `followPageHeader(host, "--<name>-top")` | Squarespace's `#header` is fixed; the host may set the var itself and then wins | `src/lib/pageHeader.js`; `.rail { top: calc(var(--top) + 12px) }` in cosecha |
| Full-height widgets use `fitBetweenHeaderAndFooter(host, "--<name>-h", min)` | The hub fills what the header and footer leave | `src/embeds/hub/embed.js` (`MIN_FIT` 300) |
| Respect `prefers-reduced-motion` | | `src/lib/tilt.js` skips; each CSS sets `transition: none`; cosecha scrolls with `behavior: auto` |
| Never nest interactive elements | A card is an `<a>`; a cromo is a `<button>`; the copy button is a sibling in `.slot` | `src/embeds/hub/hub.js`, `src/tools/cosecha/cosecha.js` |
| Tilt and hover only for `pointerType === "mouse"` | Touch gets a still card | `src/lib/tilt.js` |
| Wrap `localStorage` in try/catch | Strict private mode throws; the widget still works unsaved | `read()`/`write()` in `src/tools/cosecha/cosecha.js` |
| Build image URLs from `import.meta.env.BASE_URL` | In an embed the base is `EMBED_BASE` | `img()` in `hub.js`, `inicio.js`, `cosecha.js` |
| Small widgets are plain DOM, no React | The hub is about 9 KB | `src/lib/dom.js` |

## Asset rules

- Self-host everything under `public/img/<kind>/`; the build scripts copy the files. Manifest paths are relative to `public/img/`.
- Nothing loads from DofusDB or Ankama at runtime. The one shipped exception is the checklist hero's HD map (`MAP_IMG_HD` in `src/tools/checklist/lib/quests.js`); do not add another. Google Fonts is the only other external request.
- Real game art only; see the asset policy in `DESIGN.md` for how to pick a zone background.

## DofusDB and Ankama gotchas

API: `https://api.dofusdb.fr`, 50 records per page (`$limit=50`), `lang=es`, send a `User-Agent`. Both DofusDB and Torrente fail at times (502, dropped connections): every script that hits the network retries (3 attempts in the workflow, 4 in `build_figures.py`) and caches answers in `.build/data/` (git-ignored). Run scripts with `python3 -I`.

| Gotcha | Rule | Source |
|---|---|---|
| Monster images | Use the `img` field (the `gfxId` URL), not the monster id. Several monsters share one gfx | `.build/build_cosecha.py` |
| NPC renders | `https://static.ankama.com/dofus/renderer/look/<hex(look)>/full/1/300_300-10.png`, with `look` from `npcs?id[$in][]=…`; mirrored into `public/img/npcs/` | `.build/build_figures.py` |
| Companions | They do not render; use their item icons (item type 157) | brief, not yet in a script |
| Searching NPCs by name | `npcs?name.es[$regex]=…` | brief |
| Item icon ids are not item ids | The Hielos egg is item 7043 with icon 23005, served as `img/items/23005.png` | `src/dofus/hielos/config.js`, `tests/embed/hielos.spec.js` |
| Job icons | DofusDB returns 404; they come from the `job_images_64.tar.gz` release of dofusdude/dofus3-main | README |
| `optimalLevel` of quest stages | Often 200 on every stage; use monster levels or the guide's "Nivel mínimo" | README |
| Image resizing scripts | Go through `.build/imaging.py`: `sips` on a Mac, ImageMagick elsewhere (the sync runs on Ubuntu). They only process new downloads, so the tool never re-encodes an image already in the repo | `.build/imaging.py` |

## Testing

| Suite | Command | Config and dir | Builds and serves | Covers |
|---|---|---|---|---|
| Unit | `npm run test:unit` | `node --test tests/unit/*.test.js` | nothing | `src/tools/checklist/lib/shared.js`, `src/tools/checklist/lib/stops.js`, `src/tools/cosecha/souls.js`, the CI path map (`.github/ci-paths.mjs`) and the import rules between `src/` folders |
| Build pipeline | `python3 -I -m unittest discover -s .build/tests` | `.build/tests/` | nothing | the Python scripts; CI runs it in the `unit` job |
| App e2e | `npm run test:e2e` | `playwright.config.js`, `tests/e2e/` | `npm run build -- --outDir .e2e-test/silvestre`, served by `tests/serve.js` on 127.0.0.1:4317 like Pages (the app at `/silvestre/`, `public/` at the root), never reusing a running server; `APP_URL=…/silvestre/` runs the suite against any deployment | the Silvestre site: diary, detail, quests, filters, prerequisites, items, theme, header, reset and backup, classic import, overlay, mobile, and the site shell above the app (`shell.spec.js`). Viewport 1440x900 |
| Embeds | `npm run test:embed` | `playwright.embed.config.js`, `tests/embed/` | `globalSetup` (`tests/embed/build.js`) builds the five embeds into `.embed-test/` (`EMBED_OUT`); no server | `contract.spec.js` (the frozen contract), `embed.spec.js` (Silvestre), `hielos.spec.js`, `hub.spec.js` (+ `/checklists/` preview), `inicio.spec.js`, `cosecha.spec.js` |
| Hielos site | `npm run test:hielos` | `playwright.hielos.config.js`, `tests/hielos/` | `build:hielos --outDir .hielos-test/hielos`, served by `tests/serve.js` on 127.0.0.1:4321 like Pages: the app at `/hielos/`, images from `public/` at the root | what differs per Dofus: 70 steps, snow hero, single-Dofus strip, short screen, mobile, the note example, the egg at step 69, the stop in step 12. Viewport 1440x1000 |
| Site | `npm run test:site` | `playwright.site.config.js`, `tests/site/` | `SITE_OUT=.site-test npm run build:site`, served by `tests/serve.js` on 127.0.0.1:4325 | `home.spec.js`: title, one card per tool and its link, the shell (brand, nav, `aria-current`), old `?…`/`#…` links redirected to `silvestre/`, no overflow at 1440, 1024 and 390. `cosecha.spec.js`: the page comes from the site build with `cosecha.json` next to it, the tool under the shell, marks kept in `cosecha:done` across reloads and from the old preview. Viewport 1440x900 |

How the embed tests serve Pages from disk (`tests/embed/harness.js`):

- `servePages` intercepts `https://dsantiagomj.github.io/silvestre-checklist/**`. Paths under `embed/` come from `.embed-test/`, everything else from `public/`; a directory serves its `index.html`; responses carry `access-control-allow-origin: *` like Pages. Unknown files answer 404.
- `https://www.torrentearcano.com/<page>` answers with a fixture from `tests/embed/fixtures/` (fixed 80 to 90 px header, aggressive global CSS, content around the block); any other Torrente URL answers 404.
- Each harness (`openHarness`, `openHub`, `openInicio`, `openCosecha`) collects `pageerror`, console errors, failed requests and responses of 400 or more; specs assert the list is empty. Playwright locators pierce the open shadow root, so `page.locator("#cosecha-root .cromo")` works.
- Seeds go into `localStorage` through `addInitScript` before navigation, only for keys that are missing.

CI (`.github/workflows/ci.yml`) is ONE job, `Pruebas` (the check `main` requires; `sync-guide-dofus.yml` polls it by name). It was cut to one job while the repo was private and minutes were paid; the repo is public now, so minutes are free and splitting it again (shards ran in about 7 minutes against about 15) is a speed decision, not a cost one. A draft PR runs only the unit tests; marking it ready runs the rest.

- The "Qué cambia" step pipes `git diff --name-only origin/<base>...HEAD` into `node .github/ci-paths.mjs`, which prints `e2e`, `embed`, `hielos` and `site`. Manual dispatch on `main` runs everything; on another branch (the guide sync) it diffs against `main`. `tests/unit/ci-paths.test.js` tests the map, so the map and CI cannot drift.
- `npm run test:unit` always runs; the Python `.build/tests` only when `.build/` changes.
- Then, as conditional steps and cheapest first: `test:embed`, `test:hielos`, `test:site`, the e2e suite, each with one retry. The job runs in the Playwright image, whose version must match `@playwright/test` in `package-lock.json` (a step checks it).
- `deploy.yml` is one job (build and publish) and skips pushes that only touch docs, tests, `.build/` or the CI. The guide sync runs once a day, all on Ubuntu (images through ImageMagick, `.build/imaging.py`).

The path map (`.github/ci-paths.mjs`); the first matching rule wins and a path that matches none runs every suite:

| Changed paths | Suites |
|---|---|
| `*.md`, `docs/**`, `LICENSE` | none |
| `.build/**`, `tests/unit/**` | none (`unit` always runs) |
| `public/img/{hub,inicio,cosecha}/**` | embed, site |
| `src/embeds/**`, `tests/embed/**`, `public/checklists/**` | embed |
| `src/tools/cosecha/**`, `public/cosecha/**` | embed, site |
| `src/tools/checklist/**` | e2e, hielos, embed |
| `src/site/shell/**` | e2e, hielos, site |
| `src/site/checklist/**`, `index.html` | e2e, hielos |
| `src/site/**` (home, cosecha page), `tests/site/**`, `playwright.site.config.js` | site |
| `tests/e2e/**` | e2e |
| `tests/hielos/**` | hielos |
| `src/dofus/silvestre/**` | e2e, embed |
| `src/dofus/hielos/**` | hielos, embed |
| anything else (`src/lib/**`, other `public/**`, `vite.config.js`, `package*.json`, `playwright*.config.js`, `tests/serve.js`, `.github/**`) | all four |

A new folder needs a rule and a test in `ci-paths.test.js`; without one it runs everything. `deploy.yml` builds every surface into one Pages artifact on push to `main` (order in the repo map). The repo is private: every CI minute is billed.

## Repo map

One folder per audience, so a path tells you which suites a change can break (CI path map above).

| Path | What | Used by |
|---|---|---|
| `src/embeds/<name>/` | One entry per Torrente embed: `checklist/embed.jsx` (the React app in a shadow root), `hub/`, `inicio/` (plain DOM widgets with their manifest and CSS), `cosecha/embed.js` | embeds only |
| `src/tools/checklist/` | The checklist app: `App.jsx`, `components/`, `overlay/`, `state/store.js`, `styles/global.css`, and `lib/` with its own helpers (assets, classic import, quests, shared storage, stops, palette…) | the Silvestre and Hielos sites and their embeds |
| `src/tools/cosecha/` | «La eterna cosecha»: `renderCosecha` (`cosecha.js`), the counts (`souls.js`), `cosecha.css` (written for a shadow root) | the cosecha embed and the site page |
| `src/site/` | Vite root of the `SITE=1` build. `index.html` is the home | site only |
| `src/site/shell/` | `mountShell(current)`, the `.dt-shell` header (see `DESIGN.md`) | every site page |
| `src/site/home/` | The home cards: `main.js`, `home.css`, `manifest.js` | `/` |
| `src/site/checklist/` | `main.jsx`, the entry of the checklist sites (root `index.html`): shell plus app | `/silvestre/`, `/hielos/` |
| `src/site/cosecha/` | `index.html` and `main.js`: shell plus the cosecha tool in a shadow root | `/cosecha/` |
| `src/lib/` | What more than one surface imports: `dom.js`, `fonts.js`, `pageHeader.js`, `tilt.js` | embeds, tools, site |
| `src/dofus/<id>/` | Per-Dofus data: `config.js`, `steps.js`, generated JSON, `icons/`; the app reads it through the `@dofus` alias | the checklist |
| `index.html` | Vite entry of the checklist sites (`%DOFUS_*%` placeholders) | `npm run build`, `build:hielos` |
| `public/` | Favicons, `img/<kind>/` (all game art), `checklists/index.html` (hub preview), `cosecha/cosecha.json` (source data, published). Only the `SITE=1` build copies it | the site; embeds load `img/` from `EMBED_BASE` |
| `.build/` | Python data pipeline (DofusDB, Torrente) with its tests in `.build/tests/`; `.build/data/` is the git-ignored cache | writes `src/dofus/`, `public/img/`, `public/cosecha/` |
| `tests/unit`, `tests/e2e`, `tests/embed`, `tests/hielos`, `tests/site` | One dir per suite (Testing above); `tests/serve.js` serves a build like Pages, with `public/` behind it | |
| `.github/ci-paths.mjs`, `.github/workflows/` | The CI path map; `ci.yml`, `deploy.yml` and the guide sync | |

Import rules (`tests/unit/import-rules.test.js`): `src/embeds/` and `src/tools/` never import `src/site/`; `src/tools/` and `src/site/` never import `src/embeds/`. The site uses tools and `src/lib/`.

Build switches (`vite.config.js`):

| Switch | Script | Output |
|---|---|---|
| `SITE=1` | `build:site` | `src/site/` as root, inputs `index.html` (home) and `cosecha/index.html`, into `dist/` (or `SITE_OUT`) with `public/`. Empties its outDir. Needs no Dofus |
| `DOFUS=<id>` (default `silvestre`) | `build`, `build:hielos` | the checklist site in `dist/<build.outDir>/` (`silvestre/`, `hielos/`), base `<BASE_PATH><outDir>/`, without `public/`; empties only its folder |
| `EMBED=1` (with `DOFUS`) | `build:embed`, `build:embed:hielos` | `embed/silvestre.js` or `embed/hielos.js` and their chunk dirs |
| `HUB=1`, `INICIO=1`, `COSECHA=1` | `build:hub`, `build:inicio`, `build:cosecha` | `embed/checklists.js`, `embed/inicio.js`, `embed/cosecha.js` |
| `BASE_PATH` | | the site root on Pages, `/silvestre-checklist/`; unset means `/` |
| `EMBED_OUT`, `SITE_OUT` | | where the embed and site builds go instead of `dist/` (the tests use `.embed-test/`, `.site-test/`) |

`SITE` wins over everything; among the embeds `COSECHA` > `INICIO` > `HUB` > `EMBED`. Each embed build deletes only its own entry and dirs under `embed/`.

Deploy order (`deploy.yml`, all with `BASE_PATH`): `build:site` first, because it is the only build that empties `dist/` and the one that copies `public/`; then `build` and `build:hielos`; then the five embed builds.

Site map (`https://dsantiagomj.github.io/silvestre-checklist/`):

| URL | Page | In the nav | Source |
|---|---|---|---|
| `/` | Home, one card per tool | brand | `src/site/index.html` |
| `/silvestre/` | Silvestre checklist | yes | `index.html` + `src/site/checklist/` |
| `/hielos/` | Hielos checklist | yes | same, `DOFUS=hielos` |
| `/cosecha/` | La eterna cosecha | yes | `src/site/cosecha/` |
| `/checklists/` | Hub preview, `noindex, nofollow`, loads the live embed | no | `public/checklists/index.html` |
| `/embed/*` | The embed bundles for Torrente Arcano | no | `src/embeds/` |
