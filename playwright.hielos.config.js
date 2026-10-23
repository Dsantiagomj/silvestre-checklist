import { defineConfig, devices } from "@playwright/test";

// El checklist del Dofus de los Hielos (DOFUS=hielos): la misma app con otros datos. Una
// prueba de humo de lo que cambia de un Dofus a otro; lo demás ya lo prueba la suite del
// Silvestre (tests/e2e). Se construye aparte, en .hielos-test/hielos, para no pisar dist/ si
// a la vez corre la suite principal, y se sirve como en GitHub Pages (tests/hielos/serve.js):
// la app en /hielos/ y las imágenes en la raíz. Puerto propio
const TEST_PORT = 4321;
const APP_URL = `http://127.0.0.1:${TEST_PORT}/hielos/`;

export default defineConfig({
  testDir: "tests/hielos",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: APP_URL, viewport: { width: 1440, height: 1000 }, trace: "retain-on-failure" },
  projects: [{ name: "hielos", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npm run build:hielos -- --outDir .hielos-test/hielos && node tests/hielos/serve.js ${TEST_PORT}`,
    url: APP_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
