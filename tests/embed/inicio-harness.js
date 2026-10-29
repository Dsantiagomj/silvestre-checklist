import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { SITE, servePages } from "./harness.js";

// El inicio de Torrente Arcano con el snippet del inicio, servido desde disco con sus
// direcciones de verdad, como el hub (hub-harness.js). No tiene vista previa en Pages: solo
// vive en Squarespace
export const INICIO_URL = "https://www.torrentearcano.com/";
export const SCRIPT = `${SITE}embed/inicio.js`;
/** La página por defecto: cabecera fija, columna estrecha y CSS agresivo alrededor. */
export const PAGE = fs.readFileSync(path.join(import.meta.dirname, "fixtures/inicio.html"), "utf8");

/** Escucha los errores de la página: consola, excepciones y lo que no carga. */
function collectErrors(page) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("requestfailed", r => errors.push(`requestfailed: ${r.url()}`));
  page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  return errors;
}

/** Sirve `html` como el inicio y GitHub Pages desde disco; devuelve los errores. */
export async function loadInicio(page, html = PAGE) {
  const errors = collectErrors(page);
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === INICIO_URL
      ? route.fulfill({ status: 200, body: html, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  await page.goto(INICIO_URL);
  return errors;
}

/** Abre el inicio y espera a que pinte sus cartas. Devuelve los errores. */
export async function openInicio(page, html = PAGE) {
  const errors = await loadInicio(page, html);
  await expect(inicio(page).locator(".card")).not.toHaveCount(0, { timeout: 20_000 });
  return errors;
}

/** Dentro del inicio: los localizadores de Playwright atraviesan la shadow root abierta. */
export const inicio = page => page.locator("#inicio-root");
