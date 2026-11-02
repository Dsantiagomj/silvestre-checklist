import { test, expect } from "@playwright/test";
import path from "node:path";
import { SITE, readLS, servePages } from "./harness.js";

// El embebido del Hielos (embed/hielos.js, npm run build:embed:hielos) en una página como
// la de Torrente Arcano en Squarespace: se monta en #hielos-root, carga sus trozos y las
// imágenes de GitHub Pages (las de la raíz, las mismas del Silvestre) y guarda con su prefijo
const PAGE_URL = "https://www.torrentearcano.com/checklist-dofus-de-los-hielos";
const HARNESS = path.join(import.meta.dirname, "fixtures/squarespace-hielos.html");
const app = page => page.locator("#hielos-root");

/** Empieza en el diario salvo que se elija otra pestaña (view: null deja la de la app). */
async function openHielos(page, { view = "diary" } = {}) {
  const errors = [];
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === PAGE_URL
      ? route.fulfill({ status: 200, path: HARNESS, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(v => {
    if (v && !localStorage.getItem("hielos:stepsView")) localStorage.setItem("hielos:stepsView", v);
  }, view);
  await page.goto(PAGE_URL);
  if (view === "diary") await expect(app(page).locator(".diary-row")).toHaveCount(70, { timeout: 20_000 });
  else await expect(app(page).locator(".steps-win")).toBeVisible({ timeout: 20_000 });
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

test("en el embebido el tema sigue en el menú «⋯», con los iconos de Frigost y sus nombres, y se guarda en hielos:theme", async ({ page }) => {
  // En el sitio el tema es de la cabecera; en el embebido el checklist conserva su interruptor
  await openHielos(page);
  await app(page).locator("#moreBtn").click();
  const btn = app(page).locator("#themeBtn");
  await expect(btn).toHaveAttribute("aria-label", "Modo oscuro · Kama de hielo");
  await expect(app(page).locator("#tsLight")).toHaveAttribute("src", `${SITE}img/items/153007.png`);
  await expect(app(page).locator("#tsDark")).toHaveAttribute("src", `${SITE}img/items/24825.png`);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-label", "Modo claro · Copo de nieve");
  await expect(app(page).locator(".app-root")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("hielos:theme"))).toBe("light");
});

test("los prerrequisitos del Hielos no llevan el aviso de la orden de Bonta, que es del Silvestre", async ({ page }) => {
  const errors = await openHielos(page);
  await app(page).locator("#tabPrereqs").click();
  await expect(app(page).locator("#prereqs .pr-card").first()).toBeVisible();
  await expect(app(page).locator("#prereqs .pr-order")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("embebido, la primera vez abre los prerrequisitos y, al volver, el paso 60 del diario a la vista", async ({ page, context }) => {
  const errors = await openHielos(page, { view: null });
  await expect(app(page).locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(app(page).locator("#prereqs")).toBeVisible();
  await app(page).locator("#stepsViewDiary").click();
  await app(page).locator('.diary-row[data-n="60"] .row-num').click();
  await expect(app(page).locator("#journal .journal-num")).toHaveText("60");
  expect(await readLS(page, "hielos:selectedStep")).toBe(60);
  expect(errors).toEqual([]);
  const again = await context.newPage();
  await page.close();
  await again.goto(PAGE_URL);
  const row = app(again).locator('.diary-row[data-n="60"]');
  await expect(app(again).locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "true");
  await expect(row).toHaveAttribute("aria-current", "step");
  await expect(row).toBeInViewport();
  await expect(app(again).locator("#journal .journal-num")).toBeInViewport();
  const header = await again.evaluate(() => document.getElementById("header").getBoundingClientRect().bottom);
  expect(await row.evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThanOrEqual(header);
});
