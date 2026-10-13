import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // quests.json (~520 KB) va en su propio chunk diferido a propósito
  build: { chunkSizeWarningLimit: 600 },
});
