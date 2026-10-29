import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El sitio «Dofus Tools» (SITE=1, npm run build:site): la home y las páginas que no son
// de un Dofus (siteConfig, abajo). No lee ningún Dofus
const SITE = !!process.env.SITE;

// El Dofus del checklist se elige al construir: DOFUS=<id> (por defecto el Silvestre). La
// app lee sus datos y textos de src/dofus/<id>/ por el alias @dofus (config.js y lo que
// genera .build/ con --dofus <id>)
const DOFUS = process.env.DOFUS || "silvestre";
const DOFUS_DIR = path.resolve("src/dofus", DOFUS);
if (!SITE && !fs.existsSync(path.join(DOFUS_DIR, "config.js"))) throw new Error(`DOFUS=${DOFUS}: falta src/dofus/${DOFUS}/config.js`);
const CONFIG = SITE ? null : (await import(pathToFileURL(path.join(DOFUS_DIR, "config.js")).href)).default;
const resolve = { alias: { "@dofus": DOFUS_DIR } };

// index.html lleva marcas %DOFUS_*% con el título, la descripción y la nota del favicon
const dofusHtml = {
  name: "dofus-html",
  transformIndexHtml: html => html
    .replaceAll("%DOFUS_TITLE%", CONFIG.html.title)
    .replaceAll("%DOFUS_DESCRIPTION%", CONFIG.html.description)
    .replaceAll("%DOFUS_ICON_NOTE%", CONFIG.html.iconNote),
};

// Los favicons de index.html son los de public/. Un Dofus con los suyos (html.icons en su
// config.js, rutas relativas a su carpeta; los dos los llevan, sus builds no copian public/) los cambia antes de que Vite
// procese el HTML: así salen con hash en su build, junto a su JS
const dofusIcons = {
  name: "dofus-icons",
  transformIndexHtml: {
    order: "pre",
    handler: html => Object.entries(CONFIG.html.icons || {}).reduce(
      (out, [file, own]) => out.replaceAll(`href="/${file}"`, `href="/src/dofus/${DOFUS}/${own}"`), html),
  },
};

// La raíz del sitio de GitHub Pages, donde están public/ y sus imágenes (img/): en Pages
// el workflow pasa BASE_PATH; en local y en las pruebas, la raíz. Ahí va la home del sitio
// (SITE=1); cada Dofus, con su build.outDir (el Silvestre en silvestre/, el Hielos en
// hielos/), vive debajo y comparte las imágenes de la raíz en vez de llevar otra copia de
// public/ (src/tools/checklist/lib/assets.js, __SITE_ROOT__)
const SITE_ROOT = process.env.BASE_PATH || "/";

// El embebido (EMBED=1, npm run build:embed): la app como un solo módulo que se monta en
// una página ajena (src/embeds/checklist/embed.jsx). Carga sus trozos y las imágenes de GitHub Pages, así
// que la base es la dirección absoluta del sitio
const EMBED_BASE = "https://dsantiagomj.github.io/silvestre-checklist/";

// Los embebidos: la app del Dofus elegido (EMBED=1, según el build de su config.js: el
// Silvestre, embed/silvestre.js; con DOFUS=hielos, npm run build:embed:hielos,
// embed/hielos.js), el hub de los checklists (HUB=1, npm run build:hub,
// src/embeds/hub/embed.js), una franja por Dofus que lleva a su checklist, y el inicio de
// torrentearcano.com (INICIO=1, npm run build:inicio, src/embeds/inicio/embed.js) y el checklist
// de «La eterna cosecha» (COSECHA=1, npm run build:cosecha, src/embeds/cosecha/embed.js). Esos tres
// van aparte y solos: no cargan la app ni sus datos
const EMBEDS = {
  app: { input: "src/embeds/checklist/embed.jsx", ...CONFIG?.build.embed },
  hub: { input: "src/embeds/hub/embed.js", entry: "embed/checklists.js", chunks: "embed/hub", assets: "embed/hub" },
  inicio: { input: "src/embeds/inicio/embed.js", entry: "embed/inicio.js", chunks: "embed/inicio", assets: "embed/inicio" },
  cosecha: { input: "src/embeds/cosecha/embed.js", entry: "embed/cosecha.js", chunks: "embed/cosecha", assets: "embed/cosecha" },
};

function embedConfig(name) {
  // Junto al sitio normal: dist/embed/silvestre.js y sus trozos en dist/embed/chunks/ (el
  // Hielos, dist/embed/hielos.js y dist/embed/hielos-chunks/); el hub, dist/embed/checklists.js;
  // el inicio, dist/embed/inicio.js; la cosecha, dist/embed/cosecha.js. Las imágenes no se copian, son las de public/ que ya
  // publica el sitio. Las pruebas lo construyen en otra carpeta (EMBED_OUT) para no pisar
  // dist/. Cada uno borra solo lo suyo: construir uno no se lleva el otro
  const { input, entry, chunks, assets } = EMBEDS[name];
  const outDir = process.env.EMBED_OUT || "dist";
  for (const p of new Set([entry, chunks, assets])) fs.rmSync(path.join(outDir, p), { recursive: true, force: true });
  return {
    plugins: [react()],
    resolve,
    base: EMBED_BASE,
    define: { __SITE_ROOT__: JSON.stringify(EMBED_BASE) },
    build: {
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        input,
        // Nombre fijo para el snippet; los trozos llevan hash
        output: {
          entryFileNames: entry,
          chunkFileNames: `${chunks}/[name]-[hash].js`,
          assetFileNames: `${assets}/[name]-[hash][extname]`,
        },
        // Un módulo de entrada no se deja vacío aunque no exporte nada
        preserveEntrySignatures: false,
      },
    },
  };
}

const embedName = () => (process.env.COSECHA ? "cosecha" : process.env.INICIO ? "inicio" : process.env.HUB ? "hub" : process.env.EMBED ? "app" : null);

// El sitio de un Dofus que no vive en la raíz (build.outDir): en su carpeta y sin public/
const nested = command => command === "build" && !!CONFIG.build.outDir;

// El sitio «Dofus Tools» (SITE=1): su raíz es src/site/, así que src/site/index.html (la
// home) sale en dist/index.html; cada página más es otra entrada. Va en la raíz del sitio
// (SITE_ROOT) con public/; los checklists van debajo. Las pruebas lo construyen en otra carpeta
// (SITE_OUT) para no pisar dist/
const SITE_DIR = path.resolve("src/site");
const siteConfig = () => ({
  root: SITE_DIR,
  publicDir: path.resolve("public"),
  base: SITE_ROOT,
  define: { __SITE_ROOT__: JSON.stringify(SITE_ROOT) },
  build: {
    outDir: path.resolve(process.env.SITE_OUT || "dist"),
    // Fuera de su raíz Vite no la vacía si no se le pide
    emptyOutDir: true,
    rolldownOptions: { input: { home: path.join(SITE_DIR, "index.html") } },
  },
});

export default defineConfig(({ command }) => SITE ? siteConfig() : (command === "build" && embedName() ? embedConfig(embedName()) : {
  plugins: [react(), dofusIcons, dofusHtml],
  resolve,
  // En GitHub Pages el Silvestre vive en /silvestre-checklist/silvestre/ y el Hielos en
  // /silvestre-checklist/hielos/, bajo la raíz (SITE_ROOT). En desarrollo, siempre la raíz,
  // con public/ servido
  base: nested(command) ? `${SITE_ROOT}${CONFIG.build.outDir}/` : SITE_ROOT,
  define: { __SITE_ROOT__: JSON.stringify(SITE_ROOT) },
  // quests.json (~520 KB) va en su propio chunk diferido a propósito. El sitio de cada
  // Dofus va en dist/ + build.outDir de su config.js (el Silvestre, en dist/silvestre/) y
  // no copia public/: sus imágenes son las de la raíz
  build: { chunkSizeWarningLimit: 600, outDir: path.join("dist", CONFIG.build.outDir), copyPublicDir: !nested(command) },
}));
