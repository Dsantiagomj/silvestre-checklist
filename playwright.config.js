import { defineConfig, devices } from "@playwright/test";

// Sin APP_URL se construye el sitio en .e2e-test (la home y la cosecha, con public/) y el
// Silvestre en .e2e-test/silvestre (para no pisar dist/), y se sirve como en GitHub Pages
// (tests/serve.js): la app en /silvestre/ y, en la raíz, la home y las imágenes. El tema es
// de todo el sitio y una prueba va de la home al Silvestre y a la cosecha (shell.spec.js). Con APP_URL la misma suite corre contra cualquier despliegue, con la
// dirección del Silvestre:
//   APP_URL=https://mi-despliegue.example/silvestre/ npx playwright test
// Puerto propio para las pruebas: así nunca chocan con un `vite preview` abierto a mano.
const TEST_PORT = 4317;
const APP_URL = process.env.APP_URL || `http://127.0.0.1:${TEST_PORT}/silvestre/`;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  // Con la máquina cargada, cambiar de paso (zoom, misiones en diferido) puede pasar de
  // los 5 s por defecto: los fallos eran de espera, no de comportamiento
  expect: { timeout: 10_000 },
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
        command: `SITE_OUT=.e2e-test npm run build:site && npm run build -- --outDir .e2e-test/silvestre && node tests/serve.js .e2e-test ${TEST_PORT}`,
        url: APP_URL,
        // Nunca reutilizar: un servidor ya abierto serviría un build anterior y las
        // pruebas pasarían o fallarían contra código viejo sin avisar.
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
