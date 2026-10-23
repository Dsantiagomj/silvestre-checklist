import { test, expect } from "@playwright/test";
import path from "node:path";
import { SITE, readLS, servePages } from "./harness.js";

// El embebido del Hielos (embed/hielos.js, npm run build:embed:hielos) en una página como
// la de Torrente Arcano en Squarespace: se monta en #hielos-root, carga sus trozos y las
// imágenes de GitHub Pages (las de la raíz, las mismas del Silvestre) y guarda con su prefijo
const PAGE_URL = "https://www.torrentearcano.com/checklist-dofus-de-los-hielos";
const HARNESS = path.join(import.meta.dirname, "fixtures/squarespace-hielos.html");
const app = page => page.locator("#hielos-root");

async function openHielos(page) {
  const errors = [];
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === PAGE_URL
      ? route.fulfill({ status: 200, path: HARNESS, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => {
    if (!localStorage.getItem("hielos:stepsView")) localStorage.setItem("hielos:stepsView", "diary");
  });
  await page.goto(PAGE_URL);
  await expect(app(page).locator(".diary-row")).toHaveCount(70, { timeout: 20_000 });
  return errors;
}

test("el Hielos se monta en #hielos-root con sus 70 pasos, sin errores", async ({ page }) => {
  const errors = await openHielos(page);
  expect(await app(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  expect(await page.evaluate(() => document.querySelectorAll(".diary-row, .hero").length)).toBe(0);
  // Pantalla alta: el hero con nieve y la franja de un solo Dofus
  await expect(app(page).locator(".hero")).toHaveClass(/\bfx-snow\b/);
  await expect(app(page).locator("#winRoad")).toHaveClass(/\bis-solo\b/);
  await expect(app(page).locator("#winRoad")).not.toContainText("0/0");
  // Las imágenes, de la raíz del sitio en Pages
  const egg = app(page).locator("#winRoad .road-dofus img");
  await expect(egg).toHaveAttribute("src", `${SITE}img/items/23005.png`);
  expect(await egg.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  // La cabecera fija de la página: la barra de la ventana se pega debajo (--hielos-top)
  expect(await app(page).evaluate(el => getComputedStyle(el).getPropertyValue("--hielos-top"))).toBe("80px");
  // Su paleta va dentro de la shadow root: el acento azul hielo en «Siguiente»
  expect(await app(page).locator("#diaryNext").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(159, 216, 240)");
  expect(errors).toEqual([]);
});

test("marcar un paso del Hielos guarda con su prefijo, sin tocar el del Silvestre", async ({ page }) => {
  await openHielos(page);
  await app(page).locator('.diary-row[data-n="1"] .row-check').click();
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
  expect(await readLS(page, "hielos:done")).toEqual({ 1: true });
  expect(await readLS(page, "silvestre:done")).toBeNull();
});
