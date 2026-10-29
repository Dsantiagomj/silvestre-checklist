# Mounting on Torrente Arcano

Torrente Arcano (torrentearcano.com, built on Squarespace) uses five embeds from this repo. Each one is a code block with a `<div>` and a script loaded from GitHub Pages. All five are live:

| Embed | Page | Code |
|---|---|---|
| Silvestre checklist | https://www.torrentearcano.com/checklist-silvestre | `src/embeds/checklist/` and `src/tools/checklist/` |
| Hielos checklist | https://www.torrentearcano.com/checklist-dofus-de-los-hielos | the same, with `DOFUS=hielos` |
| Checklists hub | https://www.torrentearcano.com/checklists | `src/embeds/hub/` |
| Site home (inicio) | https://www.torrentearcano.com/ | `src/embeds/inicio/` |
| La eterna cosecha | https://www.torrentearcano.com/lista-ocre | `src/embeds/cosecha/` and `src/tools/cosecha/` |

The entries, the `<div>`s, the `localStorage` keys and the CSS variables are a frozen contract: changing them breaks Torrente Arcano's pages. The full table is in `AGENTS.md`, and `tests/embed/contract.spec.js` checks it.

## How an embed works

None of them uses an iframe: inside an iframe the browser does not allow the checklist's Picture-in-Picture overlay.

- The script mounts in an open shadow root on its `<div>`. Squarespace's CSS does not get in and the embed's CSS does not leak out.
- Google Fonts are added to the page `<head>`, because they do not load inside a shadow root.
- If the page has Squarespace's fixed header (`#header`), the embed measures its height and sticks its own header or rail below it (`src/lib/pageHeader.js`).
- JavaScript chunks and images load from https://dsantiagomj.github.io/silvestre-checklist/, so images are never copied twice.

Progress is stored per domain. Progress on github.io and on torrentearcano.com is separate.

## Silvestre checklist

```html
<div id="silvestre-root"></div>
<script type="module" src="https://dsantiagomj.github.io/silvestre-checklist/embed/silvestre.js"></script>
```

It replaces the classic checklist. `src/embeds/checklist/embed.jsx` mounts it. The app's media queries look at the window width, not the block width, so the section must be full width or the app will look cramped on desktop. It stores progress under the `silvestre:` prefix and reads the classic checklist's progress ([data.md](data.md#progress-from-the-classic-checklist)).

## Hielos checklist

```html
<div id="hielos-root"></div>
<script type="module" src="https://dsantiagomj.github.io/silvestre-checklist/embed/hielos.js"></script>
```

The same app with the Hielos data. It stores progress under the `hielos:` prefix and reads its classic checklist's progress from `dofus_hielos_clean_v2`.

## The checklists hub

```html
<div id="checklists-root"></div>
<script type="module" src="https://dsantiagomj.github.io/silvestre-checklist/embed/checklists.js"></script>
```

The cards that lead to each checklist. It is a separate widget (`src/embeds/hub/`), with neither React nor the app's data, at about 9 KB.

Each Dofus is a collectible card with the zone in the background, the NPC peeking out, the egg glowing in its colour and the name at the bottom. Today they are the Silvestre, the Hielos and the Ocre, which leads to «La eterna cosecha». With a mouse the card tilts and a holographic shine follows it; with reduced motion or on a touch screen it stays still. `showSoon` adds the locked Próximamente card at the end, grey and without a link. The hub lays cards out two by two based on the block width (a container query), not the window width.

The Dofus come from `src/embeds/hub/manifest.js`. To add one, add an entry with its colour, its checklist URL, its tagline and its images: the egg and the NPC in `public/img/hub/`, the background in `public/img/zones/`.

Before pasting it you can preview it at https://dsantiagomj.github.io/silvestre-checklist/checklists/ (`public/checklists/index.html`), a dark page with the same snippet and the published embed, marked `noindex`.

## The site home (inicio)

```html
<div id="inicio-root"></div>
<script type="module" src="https://dsantiagomj.github.io/silvestre-checklist/embed/inicio.js"></script>
```

The front page with the site's sections. It only exists as an embed: the GitHub Pages site has no page for it. It is a separate widget (`src/embeds/inicio/`), without React, using the same card as the hub (the tilt and shine from `src/lib/tilt.js`).

At the top are three large cards (Misiones, Guías Dofus and Checklists), below them three medium ones (Clases y sets, Alineamiento and Team builder) and at the end the «En camino» strip with the sections that have no page yet, without links. Texts, links and images come from `src/embeds/inicio/manifest.js`. Images are in `public/img/`; the ones from DofusDB are copied into `public/img/inicio/`. It takes the full width and the height of its content. Below 600 px of block width it switches to a single column. Build it with `npm run build:inicio`.

## La eterna cosecha

```html
<div id="cosecha-root"></div>
<script type="module" src="https://dsantiagomj.github.io/silvestre-checklist/embed/cosecha.js"></script>
```

The 337 souls that «La eterna cosecha», the Dofus Ocre quest, asks for. It is a separate widget (`src/tools/cosecha/`, with its entry in `src/embeds/cosecha/`), without React, that carries the souls inside and weighs about 74 KB (19 KB compressed). The site also publishes it at `/cosecha/`, with its header (`src/site/cosecha/`).

- At the top, the Ocre egg over Cania and three bars: total, bosses and archmonsters.
- On the left, the rail with the quest's 18 stages, or the 19 regions when grouped «Por región», from the region with most souls to the one with fewest and by subzone within each.
- On the right, the souls of the chosen stage as trading cards you click to mark. The corner button copies the name for the marketplace.
- «Jefes» and «Archis» drop from the rail the stages with no souls of that type. «Ocultar hechos» hides the marked ones without changing the counts.
- Search looks through every stage at once and dims the rail entries with no match. «/» jumps to search.
- Below 700 px of width the rail becomes a row of stages stuck to the top and the cards go three per row. The rail sticks under Squarespace's fixed header.

Marks are saved in `cosecha:done`, the key of the standalone page that used to live at https://dsantiagomj.github.io/silvestre-checklist/cosecha/, so nobody on that domain loses progress. The view (grouping, type, hide done and the chosen stage or region) goes in `cosecha:ui`. Another open tab updates itself. On torrentearcano.com progress started from zero, because the browser stores it per domain.

The souls come from `public/cosecha/cosecha.json`, written by `python3 -I .build/build_cosecha.py` from DofusDB (quest 439). Each soul carries its stage (`e`, the position of its step in `quest.steps`; recommended levels do not count) and its region (`r`, the area of its first subzone). The script copies the images to `public/img/cosecha/`. `cosecha.json` is published next to the `/cosecha/` page. Build it with `npm run build:cosecha`.

## Order to go live

This is how the Silvestre checklist went live, and it works for any embed that replaces an existing page:

1. The owner of Torrente Arcano copies the classic checklist block to its data page (`/checklist-silvestre-datos`): public, no password, hidden from the menu and from search engines.
2. Set `GUIDE_URL` if another address is needed, run the sync by hand and check that it reads the page. If the guide did not change, it ends without changes.
3. Test the snippet on a hidden test page on the same domain.
4. Replace the public page's block with the snippet.

To roll back, paste the old block back. Users' progress in the classic checklist stays in its keys, which the app never touched.
