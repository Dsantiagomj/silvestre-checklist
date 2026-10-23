import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El Dofus del checklist se elige al construir: DOFUS=<id> (por defecto el Silvestre). La
// app lee sus datos y textos de src/dofus/<id>/ por el alias @dofus (config.js y lo que
// genera .build/ con --dofus <id>)
const DOFUS = process.env.DOFUS || "silvestre";
const DOFUS_DIR = path.resolve("src/dofus", DOFUS);
if (!fs.existsSync(path.join(DOFUS_DIR, "config.js"))) throw new Error(`DOFUS=${DOFUS}: falta src/dofus/${DOFUS}/config.js`);
const { default: CONFIG } = await import(pathToFileURL(path.join(DOFUS_DIR, "config.js")).href);
const resolve = { alias: { "@dofus": DOFUS_DIR } };

// index.html lleva marcas %DOFUS_*% con el título, la descripción y la nota del favicon
const dofusHtml = {
  name: "dofus-html",
  transformIndexHtml: html => html
    .replaceAll("%DOFUS_TITLE%", CONFIG.html.title)
    .replaceAll("%DOFUS_DESCRIPTION%", CONFIG.html.description)
    .replaceAll("%DOFUS_ICON_NOTE%", CONFIG.html.iconNote),
};

// El embebido (EMBED=1, npm run build:embed): la app como un solo módulo que se monta en
// una página ajena (src/embed.jsx). Carga sus trozos y las imágenes de GitHub Pages, así
// que la base es la dirección absoluta del sitio
const EMBED_BASE = "https://dsantiagomj.github.io/silvestre-checklist/";

// Los dos embebidos: la app del Dofus elegido (EMBED=1; el Silvestre, embed/silvestre.js,
// según el build de su config.js) y el hub de los checklists (HUB=1, npm run build:hub,
// src/hub/embed.js), una franja por Dofus que lleva a su checklist. El hub va aparte y
// solo: no carga la app ni sus datos
const EMBEDS = {
  app: { input: "src/embed.jsx", ...CONFIG.build.embed },
  hub: { input: "src/hub/embed.js", entry: "embed/checklists.js", chunks: "embed/hub", assets: "embed/hub" },
};

function embedConfig(name) {
  // Junto al sitio normal: dist/embed/silvestre.js y sus trozos en dist/embed/chunks/; el
  // hub, dist/embed/checklists.js. Las imágenes no se copian, son las de public/ que ya
  // publica el sitio. Las pruebas lo construyen en otra carpeta (EMBED_OUT) para no pisar
  // dist/. Cada uno borra solo lo suyo: construir uno no se lleva el otro
  const { input, entry, chunks, assets } = EMBEDS[name];
  const outDir = process.env.EMBED_OUT || "dist";
  for (const p of new Set([entry, chunks, assets])) fs.rmSync(path.join(outDir, p), { recursive: true, force: true });
  return {
    plugins: [react()],
    resolve,
    base: EMBED_BASE,
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

const embedName = () => (process.env.HUB ? "hub" : process.env.EMBED ? "app" : null);

export default defineConfig(({ command }) => (command === "build" && embedName() ? embedConfig(embedName()) : {
  plugins: [react(), dofusHtml],
  resolve,
  // En GitHub Pages la app vive en /silvestre-checklist/: el workflow pasa BASE_PATH.
  // En local y en las pruebas, la raíz
  base: process.env.BASE_PATH || "/",
  // quests.json (~520 KB) va en su propio chunk diferido a propósito. El sitio de cada
  // Dofus va en dist/ + build.outDir de su config.js (el Silvestre, en dist/ mismo)
  build: { chunkSizeWarningLimit: 600, outDir: path.join("dist", CONFIG.build.outDir) },
}));
