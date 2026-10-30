import { defineConfig, devices } from "@playwright/test";

// La guía global de progresión (DOFUS=global): la misma app con otros datos, generados desde
// DofusDB. Una prueba de humo de lo que cambia respecto al Silvestre; lo demás ya lo prueba la
// suite principal (tests/e2e). Se construye aparte, en .global-test/global, y se sirve como en
// GitHub Pages (tests/serve.js): la app en /global/ y las imágenes en la raíz. Puerto propio
const TEST_PORT = 4322;
const APP_URL = `http://127.0.0.1:${TEST_PORT}/global/`;

export default defineConfig({
  testDir: "tests/global",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: APP_URL, viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  projects: [{ name: "global", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npm run build:global -- --outDir .global-test/global && node tests/serve.js .global-test ${TEST_PORT}`,
    url: APP_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
