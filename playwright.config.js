import { defineConfig, devices } from "@playwright/test";

// Sin APP_URL se construye el sitio y se prueba en `vite preview`.
// Con APP_URL la misma suite corre contra cualquier despliegue:
//   APP_URL=https://mi-despliegue.example/ npx playwright test
const APP_URL = process.env.APP_URL || "http://127.0.0.1:4173/";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: APP_URL,
    viewport: { width: 1440, height: 900 },
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: process.env.APP_URL
    ? undefined
    : {
        command: "npm run build && npm run preview -- --port 4173 --strictPort --host 127.0.0.1",
        url: APP_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
