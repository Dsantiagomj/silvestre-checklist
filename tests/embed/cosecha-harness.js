import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { SITE, servePages } from "./harness.js";

// La página de «La eterna cosecha» en Torrente Arcano con el snippet del checklist, servida
// desde disco con sus direcciones de verdad, como el inicio (inicio-harness.js)
export const COSECHA_URL = "https://www.torrentearcano.com/la-eterna-cosecha";
export const SCRIPT = `${SITE}embed/cosecha.js`;
/** La página por defecto: cabecera fija, su h1, columna estrecha y CSS agresivo alrededor. */
export const PAGE = fs.readFileSync(path.join(import.meta.dirname, "fixtures/cosecha.html"), "utf8");
/** Las almas que pide la misión, las mismas que lleva el embebido. */
export const SOULS = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../public/cosecha/cosecha.json"), "utf8"));

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
export async function loadCosecha(page, { html = PAGE, seed = {} } = {}) {
  const errors = collectErrors(page);
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === COSECHA_URL
      ? route.fulfill({ status: 200, body: html, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  await page.addInitScript(s => {
    for (const [k, v] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, seed);
  await page.goto(COSECHA_URL);
  return errors;
}

/** Abre la página y espera a que pinte sus almas. Devuelve los errores. */
export async function openCosecha(page, opts) {
  const errors = await loadCosecha(page, opts);
  await expect(cosecha(page).locator(".cromo")).not.toHaveCount(0, { timeout: 20_000 });
  return errors;
}

/** Dentro del checklist: los localizadores de Playwright atraviesan la shadow root abierta. */
export const cosecha = page => page.locator("#cosecha-root");
export const readLS = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), key);
