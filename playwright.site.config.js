import { defineConfig, devices } from "@playwright/test";

// El sitio «Dofus Tools» (SITE=1): la home con la cabecera del sitio. Se construye aparte, en
// .site-test (SITE_OUT), para no pisar dist/, y se sirve como en GitHub Pages
// (tests/serve.js): la home en la raíz, con public/. Puerto propio
const TEST_PORT = 4325;
const APP_URL = `http://127.0.0.1:${TEST_PORT}/`;

export default defineConfig({
  testDir: "tests/site",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: APP_URL, viewport: { width: 1440, height: 900 }, trace: "retain-on-failure" },
  projects: [{ name: "site", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `SITE_OUT=.site-test npm run build:site && node tests/serve.js .site-test ${TEST_PORT}`,
    url: APP_URL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
