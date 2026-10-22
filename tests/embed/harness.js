import { expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// La página de Torrente Arcano y GitHub Pages se sirven desde disco con sus direcciones de
// verdad: el snippet es el mismo que se pega en Squarespace y el embebido, el mismo build
// que se publica (EMBED_OUT lo deja aparte para no pisar dist/)
export const PAGE_URL = "https://www.torrentearcano.com/checklist-silvestre";
export const SITE = "https://dsantiagomj.github.io/silvestre-checklist/";
const ROOT = path.resolve(import.meta.dirname, "../..");
export const EMBED_OUT = path.join(ROOT, process.env.EMBED_OUT || ".embed-test");
const HARNESS = path.join(import.meta.dirname, "fixtures/squarespace.html");

const TYPES = {
  ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".svg": "image/svg+xml", ".css": "text/css", ".html": "text/html; charset=utf-8",
};

/** GitHub Pages: /embed/ sale del build del embebido, el resto de public/, con CORS abierto como Pages. */
export async function servePages(route) {
  let rel = decodeURIComponent(new URL(route.request().url()).pathname.slice(new URL(SITE).pathname.length));
  if (rel.endsWith("/")) rel += "index.html"; // como Pages: una carpeta sirve su index.html
  const file = rel.startsWith("embed/") ? path.join(EMBED_OUT, rel) : path.join(ROOT, "public", rel);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({
    status: 200,
    path: file,
    headers: { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "access-control-allow-origin": "*" },
  });
}

/**
 * Abre la página de Torrente Arcano con el bloque de la app, con claves de localStorage
 * opcionales ya guardadas al cargar (solo las que falten: una recarga no las pisa).
 */
export async function openHarness(page, seed = {}) {
  const errors = [];
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === PAGE_URL
      ? route.fulfill({ status: 200, path: HARNESS, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(s => {
    if (!localStorage.getItem("silvestre:stepsView")) localStorage.setItem("silvestre:stepsView", "diary");
    for (const [k, v] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, seed);
  await page.goto(PAGE_URL);
  await expect(page.locator("#silvestre-root .diary-row")).toHaveCount(100, { timeout: 20_000 });
  return errors;
}

/** Dentro de la app: los localizadores de Playwright atraviesan la shadow root abierta. */
export const app = page => page.locator("#silvestre-root");
export const readLS = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), key);
