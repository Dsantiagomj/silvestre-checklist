# Dofus Tools

Checklists and tools for Dofus, in Spanish. One codebase publishes them two ways: the site https://dsantiagomj.github.io/silvestre-checklist/ and five embeds that Torrente Arcano pastes into torrentearcano.com. The checklists follow the guides by Sandglass and Torrente Arcano without touching their text, and weigh progress by what each step costs. There are no accounts and no server: progress lives in the browser's `localStorage`.

## What is published

### Site pages

| URL | What it is | Source |
|---|---|---|
| `/` | The home page, one card per tool | `src/site/index.html` |
| `/silvestre/` | The Dofus Silvestre checklist, 100 steps | `index.html` and `src/site/checklist/` |
| `/hielos/` | The Dofus de los Hielos checklist, 70 steps | the same, with `DOFUS=hielos` |
| `/global/` | The Guía global: all permanent PvE content, level 1 to 200, generated from DofusDB | the same, with `DOFUS=global` |
| `/cosecha/` | «La eterna cosecha»: the 337 souls for the Dofus Ocre | `src/site/cosecha/` |
| `/checklists/` | Preview of the Torrente Arcano hub, `noindex`, not in the nav | `public/checklists/index.html` |

### Torrente Arcano embeds

Each embed is a `<div>` plus a `<script type="module">` that loads its file from `https://dsantiagomj.github.io/silvestre-checklist/` and mounts in a shadow root. They are a frozen contract: `AGENTS.md` lists what must not change.

| Embed | Torrente Arcano page | Entry | Div |
|---|---|---|---|
| Silvestre checklist | https://www.torrentearcano.com/checklist-silvestre | `embed/silvestre.js` | `#silvestre-root` |
| Hielos checklist | https://www.torrentearcano.com/checklist-dofus-de-los-hielos | `embed/hielos.js` | `#hielos-root` |
| Checklists hub | https://www.torrentearcano.com/checklists | `embed/checklists.js` | `#checklists-root` |
| Site home (inicio) | https://www.torrentearcano.com/ | `embed/inicio.js` | `#inicio-root` |
| La eterna cosecha | https://www.torrentearcano.com/lista-ocre | `embed/cosecha.js` | `#cosecha-root` |

The exact snippets and how they are mounted are in [docs/torrente-arcano.md](docs/torrente-arcano.md).

## Getting started

You need Node 22, the version CI uses. Python 3.12 is only needed for the `.build/` data pipeline.

```bash
npm ci
npm run dev              # the Silvestre checklist with hot reload
DOFUS=hielos npm run dev # the Hielos checklist
SITE=1 npm run dev       # the home page and the cosecha page
```

### Builds

All of them write to `dist/`.

| Script | What it builds |
|---|---|
| `npm run build:site` | The home page and `cosecha/`, with `public/`. The only build that empties `dist/` |
| `npm run build` | The Silvestre, in `dist/silvestre/` |
| `npm run build:hielos` | The Hielos, in `dist/hielos/` |
| `npm run build:global` | The Guía global, in `dist/global/` (no embed) |
| `npm run build:embed`, `build:embed:hielos` | The embedded checklists: `embed/silvestre.js`, `embed/hielos.js` |
| `npm run build:hub`, `build:inicio`, `build:cosecha` | The other three embeds: `embed/checklists.js`, `embed/inicio.js`, `embed/cosecha.js` |

### Tests

| Suite | What it covers |
|---|---|
| `npm run test:unit` | No browser: progress shared between checklists, quest stop points, the cosecha counts, the CI path map and the import rules between `src/` folders |
| `npm run test:e2e` | The Silvestre site in Playwright: diary, quests, items, theme, backup, overlay, mobile and the site header |
| `npm run test:embed` | The five embeds inside pages that mimic Squarespace, plus the frozen contract (`contract.spec.js`) |
| `npm run test:hielos` | What differs on the Hielos site: its 70 steps, the snowy hero, its single Dofus |
| `npm run test:global` | What differs on the Guía global: its 219 steps, its texts, its place in the site header |
| `npm run test:site` | The home page and the cosecha page: cards, links, header, no horizontal overflow |

The `.build/` pipeline has its own tests: `python3 -I -m unittest discover -s .build/tests`. Run all six suites before pushing a branch. Each suite is described in [docs/development.md](docs/development.md).

## Deploy and CI

`.github/workflows/deploy.yml` publishes `main` to GitHub Pages, with `BASE_PATH=/silvestre-checklist/`, on every push except those that only touch docs, tests, `.build/` or CI files. Build order: `build:site`, then `build`, `build:hielos` and `build:global`, then the five embeds. Why the order matters is in [docs/development.md](docs/development.md#deploy).

`main` is protected: every change goes through a pull request with the `Pruebas` check green. CI (`.github/workflows/ci.yml`) runs `changes` (Qué cambia), `unit`, six e2e shards and `embed` in parallel, and `Pruebas` aggregates them; skipped jobs count as passed. Browser suites run only when the PR touches something they cover, per the map in `.github/ci-paths.mjs`. A draft PR runs only the unit tests.

A daily workflow reads each checklist's guide on Torrente Arcano and, when it changed, regenerates the data and opens a PR. See [docs/data.md](docs/data.md#guide-sync).

## Repo map

| Folder | Contents |
|---|---|
| `src/tools/` | The tools: `checklist/` (the React app) and `cosecha/` (plain DOM) |
| `src/site/` | The «Dofus Tools» site: home page, header and each page's entry |
| `src/embeds/` | One entry per Torrente Arcano embed |
| `src/dofus/<id>/` | Per-checklist data (`silvestre`, `hielos`, `global`): its `config.js`, its steps and the generated JSON |
| `src/lib/` | Code shared by embeds, tools and site |
| `public/` | Self-hosted game images, the hub preview and `cosecha/cosecha.json` |
| `.build/` | The Python data pipeline: DofusDB, Torrente Arcano and images |
| `tests/` | One folder per suite, plus `serve.js`, which serves a build the way Pages does |
| `.github/` | Workflows and the CI path map |

The full map, the embed contract and the working rules are in [AGENTS.md](AGENTS.md). The visual language is in [DESIGN.md](DESIGN.md).

## Documentation

| Document | Topic |
|---|---|
| [docs/checklist.md](docs/checklist.md) | The checklist app: weighted progress, diary, map, overlay and known limits |
| [docs/data.md](docs/data.md) | Where data and images come from, how to regenerate them and the daily guide sync |
| [docs/torrente-arcano.md](docs/torrente-arcano.md) | Each embed's snippet and how it is mounted on Torrente Arcano |
| [docs/development.md](docs/development.md) | Local work: several Dofus, the site, the test suites, deploy and CI |

## Credits

- Sandglass, the reference for the Spanish-speaking Dofus community, wrote the original 100-step Silvestre guide.
- The owner of torrentearcano.com built the checklist system the site had before.
- This project redesigns how progress is scored and the interface.
- Game data and art come from [DofusDB](https://dofusdb.fr).

Dofus is a trademark of Ankama. This is an unofficial tool made by and for the community.
