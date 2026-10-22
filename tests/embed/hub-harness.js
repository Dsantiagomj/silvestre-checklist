import { expect } from "@playwright/test";
import path from "node:path";
import { SITE, servePages } from "./harness.js";

// La página de los checklists de Torrente Arcano con el snippet del hub, servida desde
// disco con sus direcciones de verdad, como la del Silvestre (harness.js)
export const HUB_URL = "https://www.torrentearcano.com/checklists";
const HARNESS = path.join(import.meta.dirname, "fixtures/checklists.html");
/** La página como quedará: solo el hub entre la cabecera fija y el pie de Torrente Arcano. */
export const PAGE_FIXTURE = path.join(import.meta.dirname, "fixtures/checklists-page.html");

/**
 * Abre la página con el hub y espera a que pinte sus franjas. Devuelve los errores. Por
 * defecto la de CSS agresivo y texto alrededor; `fixture` cambia la página.
 */
export async function openHub(page, fixture = HARNESS) {
  const errors = [];
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === HUB_URL
      ? route.fulfill({ status: 200, path: fixture, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  // Las imágenes que no estén en public/ salen como 404 en la consola
  page.on("requestfailed", r => errors.push(`requestfailed: ${r.url()}`));
  page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(HUB_URL);
  await expect(hub(page).locator(".pane")).not.toHaveCount(0, { timeout: 20_000 });
  return errors;
}

/** Dentro del hub: los localizadores de Playwright atraviesan la shadow root abierta. */
export const hub = page => page.locator("#checklists-root");

/** La vista previa que publica GitHub Pages en /checklists/ (public/checklists/index.html). */
export async function openHubPreview(page) {
  const errors = [];
  await page.context().route(`${SITE}**`, servePages);
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("response", r => { if (r.status() >= 400) errors.push(`${r.status()}: ${r.url()}`); });
  await page.goto(`${SITE}checklists/`);
  await expect(hub(page).locator(".pane")).not.toHaveCount(0, { timeout: 20_000 });
  return errors;
}
