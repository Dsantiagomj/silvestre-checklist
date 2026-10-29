# Development

How to work on the repo locally: the two Dofus, the site, the test suites, deploy and CI. The working rules (branches, TDD, the embed contract) are in `AGENTS.md`.

## Several Dofus

The checklist is a React 19 app built with Vite. `DOFUS=<id>` picks the Dofus, `silvestre` by default: `vite.config.js` points the `@dofus` alias at `src/dofus/<id>/`. That folder holds the generated data and a `config.js` with everything specific to that Dofus:

- the texts (title, hero, footer) and the guide version;
- the `localStorage` key prefix (`silvestre:`) and the classic checklist's keys;
- the backup file and the embed settings (`silvestre-root`, `--silvestre-top`);
- the hero egg, the prerequisites note and the explanatory note's example;
- the diary's hand-written notes (`journal`);
- where it builds: the Silvestre into `dist/silvestre/` and `dist/embed/silvestre.js`.

`index.html` carries `%DOFUS_*%` placeholders that the build fills with the title and description.

The other Dofus is the Dofus de los Hielos (`src/dofus/hielos/`), 70 steps from the Torrente Arcano guide:

```bash
DOFUS=hielos npm run dev     # the Hielos in development
npm run build:hielos         # its site, in dist/hielos/
npm run build:embed:hielos   # its embed, in dist/embed/hielos.js
```

What changes on screen comes from its `config.js`:

| Key | In the Hielos |
|---|---|
| `palette` | Ice blue on cool blue-grey instead of the Silvestre's lime. `src/tools/checklist/lib/palette.js` overrides the `global.css` variables with a CSS block: in the `<head>` on its page, inside the shadow root in the embed. The Silvestre has no palette |
| `hero.fx` | Snowflakes in the hero |
| `nota.caption` | The explanatory note's example and caption |
| `themeNames` | The names on the theme switch |
| `egg.final` | The Dofus de los Hielos, at step 69. The guide gives no Dofus before it, so the strip holds only that one and short screens get no Dofus del camino button |
| `html.icons` | Its favicons, which ship next to its JS |

Each checklist lives in its own folder, `silvestre/` or `hielos/`, and neither carries a copy of `public/`: their images are the ones at the root (`__SITE_ROOT__` in `src/tools/checklist/lib/assets.js`).

Progress is stored in `localStorage` under the same keys as the previous version of the app, so anyone who already had progress keeps it.

## The site

The «Dofus Tools» home page belongs to no Dofus. It builds with `SITE=1`, with `src/site/` as the Vite root, so `src/site/index.html` ends up in `dist/index.html`, with `public/`:

```bash
SITE=1 npm run dev     # the home page and the cosecha page
npm run build:site     # both, in dist/
```

The header (`src/site/shell/`) is a module without React, `mountShell(current)`, that only the site loads: no embed carries it. It sits above the home page, above both checklists (outside the app, in `src/site/checklist/main.jsx`) and above «La eterna cosecha» (`src/site/cosecha/`, which mounts the same widget as the embed in a shadow root, with its title as the `h1`). It does not stick on scroll, so the steps window bar stays at the very top.

An old link to the root with `?…` or `#…`, from when the Silvestre lived there, redirects to `silvestre/` with the same suffix.

The build variables (`SITE`, `DOFUS`, `EMBED`, `HUB`, `INICIO`, `COSECHA`, `BASE_PATH`, `EMBED_OUT`, `SITE_OUT`) are in the table in `AGENTS.md`.

## Tests

Run all five suites before pushing a branch. The browser suites build into their own folder, so they never overwrite `dist/`.

| Suite | Builds and serves | Viewport |
|---|---|---|
| `npm run test:unit` | Nothing: `node --test tests/unit/*.test.js` | |
| `npm run test:e2e` | The Silvestre in `.e2e-test/silvestre/`, served by `tests/serve.js` on port 4317 like Pages: the app at `/silvestre/`, images at the root | 1440×900 |
| `npm run test:embed` | The five embeds in `.embed-test/`, no server | 1440×900 |
| `npm run test:hielos` | The Hielos in `.hielos-test/`, on port 4321, with the app at `/hielos/` | 1440×1000 |
| `npm run test:site` | The site (`SITE=1`) in `.site-test/`, on port 4325 | 1440×900 |

The `.build/` pipeline has its own, standard library only: `python3 -I -m unittest discover -s .build/tests`.

### The app

`tests/e2e/` covers the diary, the detail, quests, filters, prerequisites, the item list, theme, header, reset with backup, the classic checklist import, the overlay, mobile and the site header above the app. The tests were written against the old single-file version, before the move to React, and both versions passed them unchanged.

With `APP_URL` the same suite runs against any deployment, given the Silvestre's address:

```bash
APP_URL=https://mi-despliegue.example/silvestre/ npm run test:e2e
```

### The embeds

`tests/embed/` opens each embed inside a page that mimics Torrente Arcano on Squarespace (`tests/embed/fixtures/`): a fixed 80 to 90 px header, aggressive global CSS (`* { font-family: serif }`, `button { all: unset }`…) and content above and below the block. No server runs: Playwright serves that page at its real torrentearcano.com address and the build files at the GitHub Pages address, so the snippet and the build are the production ones (`tests/embed/harness.js`).

| Spec | What it checks |
|---|---|
| `contract.spec.js` | The frozen contract: entries, `<div>`s, keys and variables, against the configs and the bundles |
| `embed.spec.js` | The Silvestre: CSS does not cross either way, checking steps, theme, diary scrolling, the header under the page's header, the classic import, the overlay and the bottom sheet on mobile |
| `hielos.spec.js` | The Hielos on a page like `/checklist-dofus-de-los-hielos` |
| `hub.spec.js` | One card per Dofus in the manifest, in order and with its link, the Próximamente card without a link, keyboard navigation, the mouse tilt (and none with reduced motion), isolated CSS, two cards per row on mobile and the `/checklists/` preview |
| `inicio.spec.js`, `cosecha.spec.js` | The other two widgets on their pages |

### The Hielos

`tests/hielos/` checks what differs from one Dofus to another: the 70 steps without errors, the snowy hero, the single-Dofus strip, short screens and mobile, the note with the example of steps 8, 12 and 13, the Dofus that lights up when step 69 is checked and the quest with a stop in step 12.

### The site

`tests/site/` checks on the home page the title, the cards and their links, the header with the brand and the nav, the redirect of old links to `silvestre/`, no horizontal overflow at 1440, 1024 and 390 px, that every image loads and that there are no errors. On «La eterna cosecha» it checks that the page comes from the site build with `cosecha.json` next to it, the checklist under the header, that marks survive a reload and that marks from the preview that used to live at that address are still there.

## Deploy

Every push to `main` is deployed by `.github/workflows/deploy.yml`: one job that installs, builds everything with `BASE_PATH=/silvestre-checklist/` and publishes `dist/` to GitHub Pages. It skips pushes that only touch docs, tests, `.build/` or CI; run by hand it always publishes. Locally and in the tests `BASE_PATH` is not set and the site lives at the root.

Order matters:

1. `npm run build:site`: the home page in `dist/index.html` with `public/` (images in `dist/img/`, the `/checklists/` preview) and the «La eterna cosecha» page in `dist/cosecha/`. It is the only build that empties `dist/`, so it goes first.
2. `npm run build` and `npm run build:hielos`: the Silvestre in `dist/silvestre/` and the Hielos in `dist/hielos/`. Each empties only its own folder and neither copies `public/`.
3. The embeds: `build:embed` (`dist/embed/silvestre.js`, chunks in `dist/embed/chunks/`), `build:embed:hielos` (`dist/embed/hielos.js`, chunks in `dist/embed/hielos-chunks/`), `build:hub`, `build:inicio` and `build:cosecha`. They load their chunks and images from the absolute Pages address. Each deletes only its own files inside `dist/embed/`, so their order does not matter.

To check a build the way Pages serves it:

```bash
BASE_PATH=/silvestre-checklist/ npm run build:site
BASE_PATH=/silvestre-checklist/ npm run build
SITE=1 BASE_PATH=/silvestre-checklist/ npx vite preview --port 4318
APP_URL=http://127.0.0.1:4318/silvestre-checklist/silvestre/ npm run test:e2e
```

`dist/` is almost all game images. The quests (`quests.json`) are a separate file that only downloads when needed.

## CI

`main` is protected (ruleset "Proteger main"): it cannot be deleted or force-pushed, and every change goes through a pull request with the `Pruebas` check green, with no exceptions, not even for admins. No approval is required and the branch is deleted on merge.

`.github/workflows/ci.yml` aims for speed: the repo is public and Actions minutes are free. Its jobs:

| Job | Name in the checks | What it does |
|---|---|---|
| `changes` | Qué cambia | Diffs the PR against its base and asks `.github/ci-paths.mjs` which suites to run |
| `unit` | Unitarias | Always runs `npm run test:unit`; the Python `.build/tests` only when `.build/` changed |
| `e2e` | App (1/6) to App (6/6) | The e2e suite in six shards that run at once, each with its own build |
| `embed` | Embebido, Hielos y sitio | `test:embed`, `test:hielos` and `test:site` as conditional steps of one job |
| `tests` | Pruebas | Passes when every other job passed or was skipped. This is the check `main` requires |

- The browser jobs run only when the PR touches something they cover, each suite with one retry. The folder-to-suite map is in `.github/ci-paths.mjs`, tested by `tests/unit/ci-paths.test.js`; its table is in `AGENTS.md`. A docs-only PR runs no browser suite.
- The browser jobs run in the Playwright image, whose version must match `@playwright/test` in `package-lock.json` (a step checks it).
- A draft PR runs only the unit tests; marking it ready runs the rest.
- Run by hand on `main`, it tests everything.
