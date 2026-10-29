# Agent contract for silvestre-checklist

Rules for any agent that changes this repo. It serves two audiences from one codebase: the embeds Torre pastes into torrentearcano.com (Squarespace) and our own site on GitHub Pages. The embeds are a frozen contract; the site is ours to change. Visual rules live in `DESIGN.md`; product and data details live in the README (Spanish).

## When this applies

Every change: code, data, docs, CI. Read this file before the first edit. For UI work read `DESIGN.md` too.

## Quick path

1. One branch per change, in a worktree under `../silvestre-checklist-worktrees/<name>`.
2. Check the frozen embed contract below. If the change touches a row, stop and ask.
3. Strict TDD: write or adjust the test, watch it fail, then implement.
4. Run all four suites locally. Report failures verbatim.
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

Also frozen: the classic keys are read-only (`src/lib/classic.js`); `dofus-checklists:shared` is read and written by both checklists (`src/lib/shared.js`); the stored formats; shadow-root isolation (`mode: "open"`); the preview pages `/checklists/` (`noindex, nofollow`) and `/cosecha/` (`noindex`), which load the live bundle from `EMBED_BASE`; and the published `/cosecha/cosecha.json`.

Where the values live: `src/dofus/<id>/config.js` (`embed`, `build.embed`, `storagePrefix`, `classicKeys`), `vite.config.js` (`EMBEDS`, `EMBED_BASE`), `src/{hub,inicio,cosecha}/embed.js` (host id and fonts key, hard-coded), `src/cosecha/cosecha.js` (`DONE_KEY`, `UI_KEY`). Phase 2 adds a contract test with these values as literals.

| Rule | Detail |
|---|---|
| Embeds never ship the site shell | No header, nav or site CSS in an embed bundle |
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
| All four suites before push | `npm run test:unit`, `npm run test:embed`, `npm run test:hielos`, `npm run test:e2e`. Re-run a suspected flake alone before calling it a flake |
| One concern per PR | Chain PRs when a change mixes concerns or passes about 400 changed lines. A pure `git mv` PR is exempt; review it with `git diff -M --stat` and say so in the body |
| Merge method | Rebase for human PRs. The guide-sync bot squash-merges (`gh pr merge --squash` in `sync-guide-dofus.yml`) and stays that way |
| Auto-merge | Only when the user asks |
| Required check | `Pruebas`, the aggregator job in `ci.yml` (ruleset "Proteger main"). Keep its name: `sync-guide-dofus.yml` polls it by name. Skipped jobs count as passed |
| Ask, do not guess | A blocked decision gets one question, then stop |
| Screenshots | `tmp/shots/` (git-ignored), 1440, 1024 and 390 px wide |

## Strict TDD

1. Write the test (or change the assertion) first. Run it and watch it fail for the right reason.
2. Implement the smallest change that passes.
3. Run the suite the test belongs to, then all four before pushing.
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
| Mount in an open shadow root on the host div; return if `host.shadowRoot` exists | Squarespace CSS must not enter and ours must not leak; the script can be pasted twice | `src/embed.jsx`, `src/*/embed.js` |
| Fonts go in the page `<head>` through `pageFonts(css, key)` | `@font-face` does not apply inside a shadow root | `src/lib/fonts.js` |
| Reset `overflow-wrap: normal; word-break: normal; hyphens: manual` at the widget root, plus `font-size`, `line-height`, `letter-spacing: normal`, `text-transform: none`, `text-align: left`, `box-sizing` | Squarespace sets them on `body` and they inherit into the shadow root; the test fixtures set `* { font-family: serif; letter-spacing: .08em; box-sizing: content-box }` and `button { all: unset }` on purpose | `.inicio`, `.cosecha` |
| Widget titles are `h2`; the host page owns the `h1` | Torre's page already has an `h1` | hub `.title`, cosecha `.hd h2`. Known exceptions: the checklist embed renders the hero's `h1` (`src/components/Hero.jsx`, same code as the site) and inicio renders an `h1` because it is the home page's own hero. New widgets use `h2` |
| Container queries on the widget root, never media queries | The Squarespace column can be narrow on a wide screen | `container: <name> / inline-size` and `@container <name> (max-width: …)` in each CSS. The React checklist still uses media queries; it needs `fillViewportWidth(host)` to go edge to edge |
| Sticky UI sits under the page's fixed header through `followPageHeader(host, "--<name>-top")` | Squarespace's `#header` is fixed; the host may set the var itself and then wins | `src/lib/pageHeader.js`; `.rail { top: calc(var(--top) + 12px) }` in cosecha |
| Full-height widgets use `fitBetweenHeaderAndFooter(host, "--<name>-h", min)` | The hub fills what the header and footer leave | `src/hub/embed.js` (`MIN_FIT` 300) |
| Respect `prefers-reduced-motion` | | `src/lib/tilt.js` skips; each CSS sets `transition: none`; cosecha scrolls with `behavior: auto` |
| Never nest interactive elements | A card is an `<a>`; a cromo is a `<button>`; the copy button is a sibling in `.slot` | `src/hub/hub.js`, `src/cosecha/cosecha.js` |
| Tilt and hover only for `pointerType === "mouse"` | Touch gets a still card | `src/lib/tilt.js` |
| Wrap `localStorage` in try/catch | Strict private mode throws; the widget still works unsaved | `read()`/`write()` in `src/cosecha/cosecha.js` |
| Build image URLs from `import.meta.env.BASE_URL` | In an embed the base is `EMBED_BASE` | `img()` in `hub.js`, `inicio.js`, `cosecha.js` |
| Small widgets are plain DOM, no React | The hub is about 9 KB | `src/lib/dom.js` |

## Asset rules

- Self-host everything under `public/img/<kind>/`; the build scripts copy the files. Manifest paths are relative to `public/img/`.
- Nothing loads from DofusDB or Ankama at runtime. The one shipped exception is the checklist hero's HD map (`MAP_IMG_HD` in `src/lib/quests.js`); do not add another. Google Fonts is the only other external request.
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
| Image resizing scripts | Use `sips`, so the sync workflow runs on macOS | `sync-guide-dofus.yml` |

## Testing

| Suite | Command | Config and dir | Builds and serves | Covers |
|---|---|---|---|---|
| Unit | `npm run test:unit` | `node --test tests/unit/*.test.js` | nothing | `src/lib/shared.js`, `src/lib/stops.js`, `src/cosecha/souls.js` |
| Build pipeline | `python3 -I -m unittest discover -s .build/tests` | `.build/tests/` | nothing | the Python scripts; CI runs it in the `unit` job |
| App e2e | `npm run test:e2e` | `playwright.config.js`, `tests/e2e/` | `npm run build` then `vite preview` on 127.0.0.1:4317, never reusing a running server; `APP_URL=…` runs the suite against any deployment | the Silvestre site: diary, detail, quests, filters, prerequisites, items, theme, header, reset and backup, classic import, overlay, mobile. Viewport 1440x900 |
| Embeds | `npm run test:embed` | `playwright.embed.config.js`, `tests/embed/` | `globalSetup` (`tests/embed/build.js`) builds the five embeds into `.embed-test/` (`EMBED_OUT`); no server | `embed.spec.js` (Silvestre), `hielos.spec.js`, `hub.spec.js` (+ `/checklists/` preview), `inicio.spec.js`, `cosecha.spec.js` (+ `/cosecha/` preview) |
| Hielos site | `npm run test:hielos` | `playwright.hielos.config.js`, `tests/hielos/` | `build:hielos --outDir .hielos-test/hielos`, served by `tests/hielos/serve.js` on 127.0.0.1:4321 like Pages: the app at `/hielos/`, images from `public/` at the root | what differs per Dofus: 70 steps, snow hero, single-Dofus strip, short screen, mobile, the note example, the egg at step 69, the stop in step 12. Viewport 1440x1000 |

How the embed tests serve Pages from disk (`tests/embed/harness.js`):

- `servePages` intercepts `https://dsantiagomj.github.io/silvestre-checklist/**`. Paths under `embed/` come from `.embed-test/`, everything else from `public/`; a directory serves its `index.html`; responses carry `access-control-allow-origin: *` like Pages. Unknown files answer 404.
- `https://www.torrentearcano.com/<page>` answers with a fixture from `tests/embed/fixtures/` (fixed 80 to 90 px header, aggressive global CSS, content around the block); any other Torrente URL answers 404.
- Each harness (`openHarness`, `openHub`, `openInicio`, `openCosecha`) collects `pageerror`, console errors, failed requests and responses of 400 or more; specs assert the list is empty. Playwright locators pierce the open shadow root, so `page.locator("#cosecha-root .cromo")` works.
- Seeds go into `localStorage` through `addInitScript` before navigation, only for keys that are missing.

CI (`.github/workflows/ci.yml`): `changes` skips browser jobs for docs-only PRs (`\.md$|^docs/|^LICENSE$`); `unit` always runs; `e2e` in four shards and `embed` (embeds plus Hielos) run on the Playwright image, whose version must match `@playwright/test` in `package-lock.json` (a step checks it); `Pruebas` aggregates. Manual dispatch runs everything. `deploy.yml` builds every surface into one Pages artifact on push to `main`. The repo is private: every CI minute is billed.

## Repo map

Placeholder. This section is written at the end of phase 2, once the layout (`src/embeds/`, `src/tools/`, `src/site/`, the `src/lib/` split) is final. Until then, the "Estructura del proyecto" section of the README describes the current tree.
