import { defineConfig, devices } from "@playwright/test";

// La app embebida en una página que imita la de Torrente Arcano en Squarespace
// (tests/embed/fixtures). Va aparte de la suite principal: construye el embebido una
// vez (tests/embed/build.js) y no necesita servidor, las pruebas sirven los archivos.
export default defineConfig({
  testDir: "tests/embed",
  globalSetup: "./tests/embed/build.js",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [["list"]],
  use: { viewport: { width: 1440, height: 900 }, trace: "retain-on-failure" },
  projects: [{ name: "embed", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
});
