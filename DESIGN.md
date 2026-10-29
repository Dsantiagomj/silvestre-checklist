# Design language

The visual rules behind the Torrente Arcano embeds and the "Dofus Tools" site. Every value here comes from shipped CSS: `src/embeds/hub/hub.css`, `src/embeds/inicio/inicio.css`, `src/tools/cosecha/cosecha.css`, `src/site/shell/shell.css`, `src/site/home/home.css`, `src/lib/themeSwitch.css`, plus the manifests and Dofus configs that feed them. When this file and the CSS disagree, the CSS wins and this file gets fixed.

## Quick path for a new surface

1. Copy the root block of an existing widget (`.inicio` in `inicio.css` is the most complete): fonts, `font-size: 16px`, `line-height: 1.35`, `color: #f2f5ee`, `letter-spacing: normal`, `text-transform: none`, `text-align: left`, the word-break reset, and `container: <name> / inline-size`.
2. Pick the radial background variant for the surface (table below).
3. Build from the components below. One visual motif per card.
4. Use real game art from `public/img/`, chosen with the asset policy.
5. Check the anti-patterns list, then screenshot at 1440, 1024 and 390 px (see `AGENTS.md`).

## Tokens

### Fonts

Loaded once per page through Google Fonts (`@import` at the top of each CSS; `src/lib/fonts.js` moves it to the page `<head>`).

| Role | Face | Weight | Size and tracking | Source |
|---|---|---|---|---|
| Display (titles, card names, labels) | `'Barlow Condensed'` (`--fd`) | 800 for titles, 700 for labels | uppercase; line-height 1 (titles) or .92 (card names); tracking .02em to .04em | all three CSS |
| Body | `'Barlow'` (`--fb`) | 400, 500, 600 (700 in cosecha) | 16px / 1.35 base | all three CSS |
| Eyebrow | `--fd` | 700 | 14 to 15px, tracking .3em, uppercase, gold or ocre | `.ey` in inicio and cosecha |
| Kicker on a card | `--fd` | 700 | clamp(11px, 4.6cqw, 14px), tracking .18em, on a dark pill | `.kick` in hub |
| Segmented buttons, rail labels | `--fd` | 700 | 15px, tracking .05em to .12em, uppercase | cosecha |

Title sizes: hub title `clamp(28px, 4.2vw, 48px)`; inicio `h1` 72px (44px under 600px); cosecha `h2` 54px (30px under 700px); card name `clamp(20px, 11.5cqw, 36px)` in the hub and `clamp(26px, 11.5cqw, 40px)` on wide inicio cards. Titles carry `text-shadow: 0 2px 0 rgba(0,0,0,.5)` (or `0 3px 0 rgba(0,0,0,.6)`).

### Backgrounds and text

| Token | Value | Where |
|---|---|---|
| Base black | `#0b0c0a` | every widget |
| Radial background, hub (green tint) | `radial-gradient(90% 80% at 50% 0%, #1a1f17, #0b0c0a 70%)` | `.cards` |
| Radial background, inicio (warm) | `radial-gradient(90% 60% at 50% 0%, #1d1a12, #0b0c0a 70%)` | `.inicio` |
| Radial background, cosecha (ochre) | `radial-gradient(90% 40% at 50% 0%, #211a0e, #0b0c0a 70%), #0b0c0a` | `.cosecha` |
| Text | `#f2f5ee` | root blocks |
| Lead text on cards | `#e4eadc` (hub), `#e9e3d4` (inicio), with a 1px dark text-shadow | `.lead` |
| Secondary text | `#d9d1bf`, `#c9c2b0` | cosecha |
| Muted | `#9f9a8a` (`--muted`) | cosecha |
| Hairline | `rgba(255,255,255,.1)` (`--line`) | cosecha |
| Dark pill behind text on art | `rgba(5,6,5,.72)` | `.kick` |
| Highlighted text (active, done) | `#f6d48a` | cosecha |

Header art (inicio hero, cosecha header) sits behind the title at opacity .45 or .28 and fades to transparent with a `mask-image: linear-gradient(180deg, #000 20-30%, transparent)`.

### Gold and the cosecha palette

| Token | Value | Use |
|---|---|---|
| `--gold` | `#d8b25a` | inner frames, eyebrows, rail title, «En camino» border, focus of inputs |
| `--ocre` | `#f0a336` | Dofus Ocre: progress, active rail item, done cromos |
| `--boss` | `#e3c565` | dungeon bosses |
| `--archi` | `#b7dc69` | archmonsters, "complete" states |

Gold appears as a frame (1px to 2px inset rings), as text, or as a 40 to 60 percent `color-mix` border. It is never a button fill.

### Light theme

Two surfaces have a light theme: the site (the home, the checklists, the cosecha page) and the cosecha embed. The palette is parchment with ochre ink. Gold only draws rings, ochre only fills (progress, stamps, complete numbers), and text never sits in pale ochre on parchment.

Cosecha keeps every color in a CSS variable on `.cosecha`; `.cosecha[data-theme="light"]` overrides only variables. A new rule in `cosecha.css` takes its colors from those variables, including inside the 700px container query.

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg`, `--glow` | `#0b0c0a`, `#211a0e` | `#f4ecdc`, `#fbeac6` | the radial page background |
| `--ink` | `#f2f5ee` | `#2a2114` | titles and body text |
| `--ink-2` | `#d9d1bf` | `#4d4030` | lead text, rail labels |
| `--muted` | `#9f9a8a` | `#6b5d48` | counts, small print |
| `--accent-ink` | `var(--ocre)` | `#8a4b05` | eyebrow, «Total», result titles, «Etapa» buttons |
| `--hi`, `--hi-on` | `#f6d48a` | `#8a4b05`, `#6a3a04` | active text; `--hi-on` on a pressed or marked surface |
| `--big` | `var(--ocre)` | `#b8650a` | the big stage number |
| `--frame` | `var(--gold)` | `#b88a2e` | rings and lines: the search field's focus ring, the toast, section rules |
| `--field` | `#14160f` | `#fffaf0` | segmented control, search |
| `--card` | `#1a1c14` to `#101209` | `#fffaf0` to `#f3e9d6` | cromo |
| `--done-card` | `#2c200c` to `#16110a` | `#fff0cf` to `#f8ddab` | marked cromo |
| `--rail-solid` | `#14130d` | `#fbf4e6` | the sticky rail row under 700px |
| `--art-opacity` | `.28` | `.42` | Cania behind the header, fading into the page |

The egg medallion (`.egg`) stays dark with its gold ring in both themes. The site home uses the same parchment (`#f4ecdc` with a `#fbeac6` glow); its cards keep their art and dark shade.

### Per-section colors (`src/embeds/inicio/manifest.js`)

Each card sets `--c`; the CSS uses it for the border ring, the name, the hover glow, the foil tint and the NPC outline.

| Section | `--c` | | Coming soon | `--c` |
|---|---|---|---|---|
| Misiones | `#e3c565` | | Mazmorras | `#b48cf0` |
| Guías Dofus | `#b7dc69` | | Oficios | `#e8a75a` |
| Checklists | `#7fd6c2` | | Compañeros | `#9fd8f0` |
| Clases y sets | `#ef7d5e` | | Mascotas | `#c9e07a` |
| Alineamiento | `#9fb7f0` | | | |
| Team builder | `#f08fb7` | | | |

### Per-Dofus colors (`src/embeds/hub/manifest.js`, `src/dofus/*/config.js`)

| Dofus | Card `--c` | Checklist app accent (`--amber`) | App dark background | Light-theme ink |
|---|---|---|---|---|
| Silvestre | `#b7dc69` | `#b7dc69`, titles `#cbee8f` (`src/tools/checklist/styles/global.css`) | `#0d0e0c` | `#3b6512` |
| Hielos | `#9fd8f0` | `#9fd8f0`, titles `#c8ecfa` (`palette` in `hielos/config.js`) | `#0b0e12` | `#1b5c7d` |
| Próximamente | `#e3c565` | | | |

### Spacing and shape

| Token | Value | Where |
|---|---|---|
| Card radius | 14px | cards, tiles, panels, rail |
| Small radius | 12px (cromo, chip), 10px (segmented control, inputs, chip icon), 9px (inner frame, small tile) | |
| Card shadow | `0 18px 30px rgba(0,0,0,.6)`; hover adds `0 0 32px -6px var(--c)` | hub, inicio |
| Tile shadow | `0 6px 14px rgba(0,0,0,.7)` plus `0 0 18px color-mix(in srgb, var(--c) 45%, transparent)` | `.tile`, `.ring` |
| Hub padding and gap | `--pad: 28px` (14px narrow); `--gap: clamp(16px, 2vw, 28px)` (12px narrow) | `.cards` |
| Inicio grid gap | 32px (18 to 20px narrow); card text inset 32px (20px narrow); hero padding 64px top, 36px bottom | `.featB`, `.restB` |
| Cosecha gaps | columns 24px; cromo grid 12px (8px narrow); tools 10px; header padding 34px top, 24px bottom | `.body`, `.grid` |
| Focus ring | `outline: 3px solid #fff; outline-offset: 4px` on cards; 2px on buttons | all |

### Content widths

| Surface | Max width | Side margin | Narrow margin |
|---|---|---|---|
| Inicio | 1240px | 48px each side (`calc(100% - 96px)`) | 16px under 600px |
| Cosecha | 1176px (five cromos per row) | 32px each side | 14px under 700px |
| Hub | full width; height from `--checklists-h` (min 300px, `MIN_FIT` in `src/embeds/hub/embed.js`) | 28px | 14px |
| Site shell and home | 1240px | 48px each side | 16px under 600px (shell), 700px (home) |
| Site shell on a tool page | the tool's width, set by the page through `--dt-max` and `--dt-side` (cosecha: 1176px, 32px each side) | | |

Backgrounds always reach the edges; only the content column is capped.

### Breakpoints

Always container queries on the widget root, never media queries: the Squarespace column can be narrow on a wide screen.

| Widget | Query | What changes |
|---|---|---|
| Hub | `@container hub (max-width: 600px)` | cards two per row, height becomes `auto` |
| Inicio | `@container inicio (max-width: 1180px)` | mid cards stack at 180px high; chips in two columns |
| Inicio | `(max-width: 900px)` | smaller tiles, eggs and ring on wide cards |
| Inicio | `(max-width: 600px)` | one column; wide cards go 5/4; hero 44px |
| Cosecha | `@container cosecha (max-width: 700px)` | rail becomes a sticky top row; cromos three per row |
| Site shell | `@container dt-shell (max-width: 600px)` | the nav moves to its own row under the brand and the switch, spread edge to edge, showing only the end of each name (`.dt-pre` hidden); it scrolls sideways if it still does not fit |
| Site home | `@container home (max-width: 700px)` | cards stack, landscape |

The React checklist app still uses media queries; that is a known exception, not the model.

### Motion

| Effect | Value | Source |
|---|---|---|
| Tilt | max 9deg, perspective 800px (hub); 5deg, 900px (inicio); mouse pointers only | `src/lib/tilt.js` |
| Card transitions | transform .15s ease-out, box-shadow .3s, foil opacity .3s | `.card` |
| Cromo and rail | .12s to .2s on background, box-shadow, filter | cosecha |
| Reduced motion | tilt off, every transition `none`, scrolling `auto` | `@media (prefers-reduced-motion: reduce)` in each CSS |

## Components

### Collectible card (`.card` in hub and inicio)

Use for anything that links to a whole section or tool: a Dofus checklist, a site section, a tool on the site home. The card itself is the link; nothing interactive goes inside it.

| Layer (z) | Recipe |
|---|---|
| `.art` (0) | zone background, `object-fit: cover`, `saturate(1.1)` |
| `.npc` (1) | NPC on the right, `right: -10% to -14%`, `top: 4% to 9%`, `height: 52% to 72%`; `drop-shadow(0 0 1.5px var(--c))` plus `drop-shadow(0 0 14px rgba(0,0,0,.95))`; bottom fade `mask-image: linear-gradient(0deg, transparent 4%, #000 40%)`; per-card framing through `npcFit` in the manifest |
| `.shade` (2) | dark gradient so text always sits on dark; vertical on wide cards, horizontal on mid cards |
| icon (3) | one tile, egg panel or ring at top-left |
| `.foil` (4) | two 115deg gradients, `mix-blend-mode: overlay`, position from `--fx`/`--fy` set by `tilt()` |
| `.inner` (5) | gold inner frame, `inset: 7px`, 1px `color-mix(in srgb, var(--gold) 45%, transparent)` (inicio only) |
| `.meta` (5) | name in `--c`, lead below |
| `::after` (6) | `inset 0 0 0 2px var(--c)` border ring, above everything |

Aspect ratios: hub 2/3, inicio wide 4/5 (5/4 under 600px), inicio mid 16/9. A locked card (`.lock`) is a `div[role=link][aria-disabled]`, greyscale, egg as a silhouette, no tilt.

### Framed game-icon tile (`.tile`)

Use when a card needs one icon that stands for the section (an achievement icon, a job icon). 84px square (46px `.sm`, 68px under 900px), radius 14px, `radial-gradient(circle at 50% 35%, #3a3020, #140f08)`, `inset 0 0 0 2px var(--gold), inset 0 0 0 4px #3b2a10`; the icon fills 78 percent. The cosecha header egg (`.egg`, 128px circle) is the same recipe in a circle.

### Egg panel (`.eggs`)

Use only on the card that leads to the checklists: the eggs of the published checklists side by side (58px, 48px) plus the coming one as a silhouette (40px, `brightness(0)`). Dark panel `rgba(10,8,4,.7)`, gold inset ring, radius 14px. Each egg glows with its Dofus color. Do not reuse it elsewhere: two cards with eggs was rejected.

### Primordial-Dofus ring (`.ring`)

Use only for "all the Dofus" (Guías Dofus). 96px circle (80px under 900px) with the tile recipe; six 30px icons placed on a circle of radius 29 percent starting at the top (`icon()` in `src/embeds/inicio/inicio.js`).

### «En camino» chips (`.soonB`, `.chip`)

Use for sections that do not exist yet. A dashed gold strip (`1px dashed` at 40 percent gold, background `rgba(216,178,90,.05)`) with a gold 20px title and one chip per section: 66px high, its zone image at `grayscale(1) brightness(.3)`, a 52px icon box with a 1.5px gold ring and the icon at `grayscale(.85)`, name in 800. Chips are plain `div`s with no link; under 1180px they go two per row.

### Rail item with raised active plate (`.stop`)

Use for a list of groups the user switches between (stages, regions). Grid of a 36px number circle, a label, a count and a 4px mini progress bar. The active item (`[aria-current=true]`) is a raised plate: `linear-gradient(180deg, #33260f, #21180a)`, `0 0 0 1px rgba(216,178,90,.45)` and a soft drop shadow; its number gets an ocre ring and glow and the label turns `#f6d48a`. The CSS comment is explicit: no side border. A complete group fills the number with ocre and turns the mini bar green. The rail is sticky under the page header (`top: calc(var(--top) + 12px)`) and becomes a horizontal sticky row under 700px.

### Soul cromo (`.cromo`)

Use for a collectible the user marks one by one. A `button` in a `.slot`, radius 12px, `linear-gradient(180deg, #1a1c14, #101209)`, 84px circular picture well, image at `grayscale(1) brightness(.5)` until marked. Marked (`.done`): warm gradient `#2c200c` to `#16110a`, 1.5px ocre ring, image with an ocre `drop-shadow`, name `#f6d48a`, the top-right stamp fills ocre. The copy button (`.cpy`) sits top-left as a sibling of the cromo, never inside it. Grid `repeat(auto-fill, minmax(150px, 1fr))`, three per row under 700px.

### Site shell (`.dt-shell`)

The "Dofus Tools" header on every site page, from `mountShell(current)` in `src/site/shell/`. Plain DOM, prepended to `<body>`, outside any app root; never in an embed. It stays dark in both themes: a light header over the checklist's dark bar would stack light, dark and light.

| Rule | Recipe |
|---|---|
| Zone strip | 84px high, `#0b0c0a`, with the page's zone art behind at opacity .6 and `object-position: center 38%`. Two gradients darken it: toward both sides (.96 at the left, .5 in the middle, .94 at the right) and slightly toward the bottom. Content is 1240px wide like the home |
| Zone per page | `art` in `TOOLS` (`shell.js`), picked like a card background: Krosmoz on the home, Amakna on `/silvestre/`, Frigost on `/hielos/`, Cania on `/cosecha/` |
| Gold rule | 1px at the bottom, `rgba(216,178,90,.75)` between 18 and 82 percent, fading to transparent at both ends |
| Not sticky | `position: relative`. The app's own sticky bar and the cosecha rail stay at the top of the window; `--cosecha-top` stays 0 |
| Brand | "Dofus Tools", display 800 30px (24px narrow), under a gold eyebrow «Checklists y herramientas» (display 700 12px, tracking .3em, `aria-hidden`); links to the home |
| Nav | one link per tool in `TOOLS` order, display 700 16px, tracking .08em, `#d9d1bf` with a dark text-shadow, 30px apart |
| Current page | `aria-current="page"`: text `#f6d48a` and a 3px gold bar with a soft glow, flush with the header's bottom edge. No side border, no pill, no fill |
| Theme switch | the egg switch (below) at the right, vertically centered |
| Narrow | `@container dt-shell (max-width: 600px)`: margins 14px; brand and switch on the first row, the nav on its own 46px row with `space-between`, showing only the end of each name |
| Self-contained | every value set under `.dt-shell`, so the page below (the checklist's light theme, its `img` and `a:hover` rules) cannot change it |

A tool under the shell keeps its own header: the cosecha page shows the shell and then the cosecha `.hd`, whose title is the page's only `h1`. Do not add a page title between the shell and the tool.

### Egg theme switch (`.theme-switch`)

Use for the light and dark theme, and only there. `src/lib/themeSwitch.js` builds it in plain DOM (`createThemeSwitch`); the checklist renders the same markup in `ThemeSwitch.jsx`. Its CSS is `src/lib/themeSwitch.css`, which each surface imports (inside the shadow root for an embed).

| Rule | Recipe |
|---|---|
| Shape | 64x34px pill; a parchment track (`#fffbe6` to `#f1e6b6`) with a night layer that fades in for dark |
| Eggs | the active egg 28px at the left with its glow, the other at `scale(.55)`, faded and greyed at the right. Site and cosecha: Dofus Marfil (`items/23011.png`) for light, Dofus Ébano (`items/23007.png`) for dark. The checklist embeds use `THEME_ICONS` and `themeNames` from their Dofus config |
| Accessibility | `role="switch"`, `aria-checked` true in dark, `aria-label` «Modo oscuro · Dofus Ébano» or «Modo claro · Dofus Marfil» |
| Motion | the eggs swap places in an arc, the arriving one bounces with sparks, and the theme lands 140ms later. On a page of our own the whole page changes with a View Transition that sweeps diagonally from the switch's corner (`pageThemeTransition`); in an embed the theme changes without it. Reduced motion: no animation |
| Colors | hover border and focus ring from `--ts-accent` and `--ts-focus`, which the shell and cosecha set to gold and white (or ink in light cosecha) |

Where it lives: the site header (one theme for the whole site, `dofus-tools:theme`), the cosecha embed's tools row (`cosecha:theme`; under 700px it moves up next to Todo, Jefes and Archis), and the checklist embeds' «⋯» menu (`silvestre:theme`, `hielos:theme`). On the site the checklist and the cosecha widget show no switch of their own.

### Smaller pieces

| Piece | Recipe | Source |
|---|---|---|
| Progress bar | 8px track `rgba(255,255,255,.08)`, fill `linear-gradient(90deg, #b86a12, var(--ocre))`, count in 700 16px display | `.bar` |
| Segmented control | dark `#14160f` strip with a hairline; pressed button `linear-gradient(180deg, #3a2c12, #251b0b)` plus a gold inset ring, text `#f6d48a`. The first and last buttons inherit the strip's outer radii, so the ring follows the rounded corners | `.seg` |
| Search field | same dark fill, gold 1.5px ring on focus, clear button appears when it has text | `.srch` |
| Gold rule | two 180px gradient lines (80px narrow) around a 44px emblem | `.rule` in inicio |
| Completion ring | `conic-gradient(var(--ocre) calc(var(--p) * 1%), rgba(255,255,255,.08) 0)` with a dark inner disc | `.ring` in cosecha |
| Reset dialog | a native `<dialog>` opened with `showModal()` (focus trap and Esc for free), never `confirm()`. A 76px ring of what is marked fills on open and drains on confirm (SVG stroke, because `@property` does not register inside a shadow root), the title in display 800, the count of what goes, then Cancelar (hairline ring) and the confirm button (pressed `.seg` fill with its gold ring). After it, the toast offers «Deshacer» for 8 seconds with a draining ochre line. The checklist's reset dialog is the model | `.rd` in cosecha |

## Asset policy

- Real Dofus art only: zone landscapes, NPC renders, monster images, class symbols, achievement, job and item icons. No emoji, no hand-drawn generic icons, no stock illustration.
- Everything lives under `public/img/` and is committed: `zones/` (with `-s.jpg` small variants for mid cards and chips), `npcs/`, `monsters/`, `achievements/`, `items/`, `jobs/`, `spells/`, `maps/`, plus `hub/`, `inicio/` and `cosecha/` for images picked for one widget. Manifests reference paths relative to `public/img/`.
- Widgets build URLs with `import.meta.env.BASE_URL + "img/" + rel`, so an embed loads them from GitHub Pages. Nothing is hotlinked from DofusDB or Ankama at runtime (the build scripts copy the files). The one shipped exception is the checklist hero's full-width HD map (`MAP_IMG_HD` in `src/tools/checklist/lib/quests.js`); do not add another.
- Decorative images carry `alt=""` and `draggable="false"`; the card's `aria-label` and `aria-describedby` carry the meaning.

### Picking a zone background for a character

1. Start from the place the section is about: Frigost for the Hielos, Amakna for Silvosse, Selocalipsis for Meriana, Cania for the Ocre.
2. The character must read against the top-right of the image, where `.npc` sits. Its outline is `--c` and its halo is near-black, so a background in the same hue as the character or as `--c` makes it vanish. Pick a zone whose dominant color differs from both.
3. Text never competes with the art: `.shade` keeps the bottom (wide cards) or the left half (mid cards) dark. If the chosen zone is bright at the top, the `.kick` pill keeps the label legible.
4. Check at 1440, 1024 and 390 px: the NPC fade (`transparent 4%` to `#000 40%`) must not cut a face, and `npcFit` is the knob for that.

## Anti-patterns

Each of these was rejected in review for looking generated. Do not reintroduce them.

| Rejected | Do instead |
|---|---|
| A side border accent on the active item | the raised plate of `.stop[aria-current=true]` |
| Gold gradient pill buttons | gold as a frame or text; dark fills with a gold ring (`.seg`, `.nav2`) |
| "Entrar →" calls to action on a card that is already a link | the whole card is the link; the lead sentence says where it goes |
| Decorative diamonds on frames | plain inset rings |
| Emoji or hand-drawn generic icons when a game asset exists | the game asset in a `.tile` |
| Cramped spacing; words split mid-word | the spacing scale above; `overflow-wrap: normal; word-break: normal; hyphens: manual` at the root |
| The same motif on two cards (the eggs) | one motif per card: tile, ring or eggs |
| A character on a background of its own hue | the zone-picking steps above |
| "VS" framing | the Bonta and Brakmar duo side by side (`.duo`), no label between them |
| Icons unrelated to the section's meaning (a dragon egg for «Guías Dofus») | the ring of the six primordial Dofus |
