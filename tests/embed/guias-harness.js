import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { SITE, servePages } from "./harness.js";

// La página «Guías de Dofus» de Torrente Arcano con el snippet de las guías, servida desde
// disco con sus direcciones de verdad, como la cosecha (cosecha-harness.js)
export const GUIAS_URL = "https://www.torrentearcano.com/guias-dofus";
export const SCRIPT = `${SITE}embed/guias.js`;
/** La página por defecto: cabecera fija, columna estrecha y CSS agresivo alrededor, sin h1 propio. */
export const PAGE = fs.readFileSync(path.join(import.meta.dirname, "fixtures/guias.html"), "utf8");

/** Escucha los errores de la página: consola, excepciones y lo que no carga. */
function collectErrors(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("requestfailed", r => errors.push(`requestfailed: ${r.url()}`));
  page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  return errors;
}

/**
 * Sirve `html` como la página de Torrente y GitHub Pages desde disco, con claves de
 * localStorage ya guardadas al cargar (solo las que falten: una recarga no las pisa).
 * Devuelve los errores.
 */
export async function loadGuias(page, { html = PAGE, seed = {} } = {}) {
  const errors = collectErrors(page);
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === GUIAS_URL
      ? route.fulfill({ status: 200, body: html, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  await page.addInitScript(s => {
    for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) == null) localStorage.setItem(k, v);
  }, seed);
  await page.goto(GUIAS_URL);
  return errors;
}

/** Abre la página y espera a que pinte sus cartas. Devuelve los errores. */
export async function openGuias(page, opts) {
  const errors = await loadGuias(page, opts);
  await expect(guias(page).locator(".card")).toHaveCount(30, { timeout: 20_000 });
  return errors;
}

/** La vista previa que publica GitHub Pages en /guias-dofus/ (public/guias-dofus/index.html). */
export async function openGuiasPreview(page) {
  const errors = collectErrors(page);
  await page.context().route(`${SITE}**`, servePages);
  await page.goto(`${SITE}guias-dofus/`);
  await expect(guias(page).locator(".card")).toHaveCount(30, { timeout: 20_000 });
  return errors;
}

/** Dentro del widget: los localizadores de Playwright atraviesan la shadow root abierta. */
export const guias = page => page.locator("#guias-root");
