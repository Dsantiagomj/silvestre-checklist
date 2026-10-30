// Qué suites corre la CI según lo que cambia un PR (.github/ci-paths.mjs): la carpeta dice
// qué puede romperse. Lo que no encaja en ninguna regla lo corre todo.
// Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { suites } from "../../.github/ci-paths.mjs";

const NONE = { e2e: false, embed: false, hielos: false, global: false, site: false };
const ALL = { e2e: true, embed: true, hielos: true, global: true, site: true };
const only = (...names) => ({ ...NONE, ...Object.fromEntries(names.map(n => [n, true])) });

test("la documentación no corre nada con navegador", () => {
  assert.deepEqual(suites(["README.md", "AGENTS.md", "docs/plan.md", "LICENSE", "src/embeds/hub/NOTAS.md"]), NONE);
});

test("un embebido propio, sus pruebas o sus imágenes: solo el embebido", () => {
  for (const f of ["src/embeds/hub/hub.js", "src/embeds/inicio/inicio.css", "tests/embed/hub.spec.js", "public/checklists/index.html"]) {
    assert.deepEqual(suites([f]), only("embed"), f);
  }
});

test("las imágenes del hub (las cartas de la home) y las de la cosecha (su página): el embebido y el sitio", () => {
  for (const f of ["public/img/hub/otomai.png", "public/img/cosecha/1234.png", "public/img/inicio/dofus-ocre.png"]) {
    assert.deepEqual(suites([f]), only("embed", "site"), f);
  }
});

test("la cosecha como herramienta y sus datos: el embebido y su página del sitio", () => {
  assert.deepEqual(suites(["src/tools/cosecha/souls.js"]), only("embed", "site"));
  assert.deepEqual(suites(["public/cosecha/cosecha.json"]), only("embed", "site"));
});

test("la página de la cosecha en el sitio: solo el sitio", () => {
  assert.deepEqual(suites(["src/site/cosecha/main.js", "src/site/cosecha/index.html"]), only("site"));
});

test("la app del checklist va en el sitio, el Hielos, la guía global y el embebido, no en la home", () => {
  assert.deepEqual(suites(["src/tools/checklist/components/Hero.jsx"]), only("e2e", "hielos", "global", "embed"));
  assert.deepEqual(suites(["src/embeds/checklist/embed.jsx"]), only("embed"));
});

test("la entrada del checklist en el sitio: la app, el Hielos y la guía global, no los embebidos", () => {
  assert.deepEqual(suites(["src/site/checklist/main.jsx"]), only("e2e", "hielos", "global"));
  assert.deepEqual(suites(["index.html"]), only("e2e", "hielos", "global"));
});

test("la home y sus pruebas: solo el sitio", () => {
  for (const f of ["src/site/index.html", "src/site/home/home.css", "tests/site/home.spec.js", "playwright.site.config.js"]) {
    assert.deepEqual(suites([f]), only("site"), f);
  }
});

test("la cabecera del sitio va en la home y encima de los tres checklists", () => {
  assert.deepEqual(suites(["src/site/shell/shell.css"]), only("e2e", "hielos", "global", "site"));
});

test("las pruebas de cada suite corren solo su suite", () => {
  assert.deepEqual(suites(["tests/e2e/map.spec.js"]), only("e2e"));
  assert.deepEqual(suites(["tests/hielos/smoke.spec.js"]), only("hielos"));
  assert.deepEqual(suites(["tests/global/global.spec.js"]), only("global"));
});

test("los datos de cada Dofus: su sitio y el embebido", () => {
  assert.deepEqual(suites(["src/dofus/silvestre/quests.json"]), only("e2e", "embed"));
  assert.deepEqual(suites(["src/dofus/hielos/config.js"]), only("hielos", "embed"));
  // La guía global no tiene embebido publicado: solo su suite
  assert.deepEqual(suites(["src/dofus/global/steps.js"]), only("global"));
});

test("el pipeline de .build/ y las unitarias: solo las unitarias, que corren siempre", () => {
  assert.deepEqual(suites([".build/build_cosecha.py", ".build/tests/test_cosecha.py", "tests/unit/souls.test.js"]), NONE);
});

test("lo compartido o desconocido lo corre todo", () => {
  for (const f of ["src/lib/fonts.js", "public/img/zones/astrub.jpg", "vite.config.js", "package.json", "package-lock.json",
    "playwright.config.js", ".github/workflows/ci.yml", ".github/ci-paths.mjs", "tests/serve.js", "src/hub/hub.js", "otra/cosa.txt"]) {
    assert.deepEqual(suites([f]), ALL, f);
  }
});

test("varios archivos suman sus suites; sin archivos no corre nada", () => {
  assert.deepEqual(suites(["src/embeds/hub/hub.js", "tests/e2e/map.spec.js"]), only("e2e", "embed"));
  assert.deepEqual(suites(["README.md", "tests/hielos/smoke.spec.js"]), only("hielos"));
  assert.deepEqual(suites([]), NONE);
});
