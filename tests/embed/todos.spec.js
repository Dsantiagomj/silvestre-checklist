import { test, expect } from "@playwright/test";
import path from "node:path";
import { SITE, readLS, servePages } from "./harness.js";

// El embebido del Rush de todos los Dofus (embed/todos.js, npm run build:embed:todos) en una
// página como la de Torrente Arcano en Squarespace: se monta en #todos-root, carga sus trozos
// y las imágenes de GitHub Pages (las de la raíz) y guarda con su prefijo. No hay checklist
// clásico que leer
const PAGE_URL = "https://www.torrentearcano.com/checklist-todos-dofus";
const HARNESS = path.join(import.meta.dirname, "fixtures/squarespace-todos.html");
const app = page => page.locator("#todos-root");

async function openTodos(page) {
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
    if (!localStorage.getItem("todos:stepsView")) localStorage.setItem("todos:stepsView", "diary");
  });
  await page.goto(PAGE_URL);
  await expect(app(page).locator(".diary-row")).toHaveCount(200, { timeout: 20_000 });
  return errors;
}

test("el rush se monta en #todos-root con sus 200 pasos, sin errores", async ({ page }) => {
  const errors = await openTodos(page);
  expect(await app(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  expect(await page.evaluate(() => document.querySelectorAll(".diary-row, .hero").length)).toBe(0);
  // Pantalla alta: el hero con sus motas y los 26 Dofus en su propia fila, con el Vulbis al final
  await expect(app(page).locator(".hero")).toHaveClass(/\bfx-nebula\b/);
  await expect(app(page).locator("#winRoad")).toHaveClass(/\bis-long\b/);
  await expect(app(page).locator("#winRoad .road-dofus")).toHaveCount(26);
  const egg = app(page).locator('#winRoad .road-dofus[data-step="200"] img');
  await expect(egg).toHaveAttribute("src", `${SITE}img/items/23004.png`);
  expect(await egg.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  // La cabecera fija de la página: la barra de la ventana se pega debajo (--todos-top)
  expect(await app(page).evaluate(el => getComputedStyle(el).getPropertyValue("--todos-top"))).toBe("80px");
  // Su paleta va dentro de la shadow root: el acento dorado en «Siguiente»
  expect(await app(page).locator("#diaryNext").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(245, 228, 177)");
  expect(errors).toEqual([]);
});

test("marcar un paso del rush guarda con su prefijo, sin tocar los de los otros checklists", async ({ page }) => {
  await openTodos(page);
  await app(page).locator('.diary-row[data-n="1"] .row-check').click();
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
  expect(await readLS(page, "todos:done")).toEqual({ 1: true });
  for (const key of ["silvestre:done", "hielos:done", "nebuloso:done"]) expect(await readLS(page, key)).toBeNull();
});

test("en el embebido el tema sigue en el menú «⋯», con el Marfil y el Ébano, y se guarda en todos:theme", async ({ page }) => {
  await openTodos(page);
  await app(page).locator("#moreBtn").click();
  const btn = app(page).locator("#themeBtn");
  await expect(btn).toHaveAttribute("aria-label", "Modo oscuro · Dofus Ébano");
  await expect(app(page).locator("#tsLight")).toHaveAttribute("src", `${SITE}img/items/23011.png`);
  await expect(app(page).locator("#tsDark")).toHaveAttribute("src", `${SITE}img/items/23007.png`);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-label", "Modo claro · Dofus Marfil");
  await expect(app(page).locator(".app-root")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("todos:theme"))).toBe("light");
});
