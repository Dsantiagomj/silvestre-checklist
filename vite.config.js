import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// El embebido (EMBED=1, npm run build:embed): la app como un solo módulo que se monta en
// una página ajena (src/embed.jsx). Carga sus trozos y las imágenes de GitHub Pages, así
// que la base es la dirección absoluta del sitio
const EMBED_BASE = "https://dsantiagomj.github.io/silvestre-checklist/";

function embedConfig() {
  // Junto al sitio normal: dist/embed/silvestre.js y sus trozos en dist/embed/chunks/. Las
  // imágenes no se copian, son las de public/ que ya publica el sitio. Las pruebas lo
  // construyen en otra carpeta (EMBED_OUT) para no pisar dist/
  const outDir = process.env.EMBED_OUT || "dist";
  fs.rmSync(path.join(outDir, "embed"), { recursive: true, force: true });
  return {
    plugins: [react()],
    base: EMBED_BASE,
    build: {
      outDir,
      emptyOutDir: false,
      copyPublicDir: false,
      chunkSizeWarningLimit: 600,
      rolldownOptions: {
        input: "src/embed.jsx",
        // Nombre fijo para el snippet; los trozos llevan hash
        output: {
          entryFileNames: "embed/silvestre.js",
          chunkFileNames: "embed/chunks/[name]-[hash].js",
          assetFileNames: "embed/assets/[name]-[hash][extname]",
        },
        // Un módulo de entrada no se deja vacío aunque no exporte nada
        preserveEntrySignatures: false,
      },
    },
  };
}

export default defineConfig(({ command }) => (command === "build" && process.env.EMBED ? embedConfig() : {
  plugins: [react()],
  // En GitHub Pages la app vive en /silvestre-checklist/: el workflow pasa BASE_PATH.
  // En local y en las pruebas, la raíz
  base: process.env.BASE_PATH || "/",
  // quests.json (~520 KB) va en su propio chunk diferido a propósito
  build: { chunkSizeWarningLimit: 600 },
}));
