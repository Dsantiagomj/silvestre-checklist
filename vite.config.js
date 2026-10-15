import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // En GitHub Pages la app vive en /silvestre-checklist/: el workflow pasa BASE_PATH.
  // En local y en las pruebas, la raíz
  base: process.env.BASE_PATH || "/",
  // quests.json (~520 KB) va en su propio chunk diferido a propósito
  build: { chunkSizeWarningLimit: 600 },
});
