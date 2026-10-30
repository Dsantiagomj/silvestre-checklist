import { test, expect } from "@playwright/test";

// Prueba de humo de la guía global de progresión: lo que cambia respecto al Silvestre (sus
// datos, sus textos y su sitio en global/). La app es la misma: el resto lo prueba tests/e2e

const STEPS = 219;

/** Abre la guía, en el diario o en el mapa, y recoge los errores de la página. */
async function openGlobal(page, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(v => {
    if (localStorage.getItem("global:stepsView") == null) localStorage.setItem("global:stepsView", v);
  }, view);
  await page.goto("");
  await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(STEPS);
  return errors;
}

test("los pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openGlobal(page);
  await expect(page).toHaveTitle("Guía global · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los pasos de la guía global");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(STEPS);
  expect(errors).toEqual([]);
});

test("lleva encima la cabecera del sitio, con la guía global como página actual", async ({ page }) => {
  await openGlobal(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  const current = shell.getByRole("navigation").getByRole("link", { name: "Guía global" });
  await expect(current).toHaveAttribute("aria-current", "page");
  expect(await current.getAttribute("href")).toBe("/global/");
});

/** El texto de la app sin la cabecera del sitio (que enlaza a los otros checklists). */
const appText = page => page.evaluate(() => [...document.body.children]
  .filter(el => !el.matches(".dt-shell")).map(el => el.textContent).join(" "));

test("el primer paso abre en el diario con sus misiones, la mazmorra y el farmeo del paso", async ({ page }) => {
  const errors = await openGlobal(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("1");
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  expect(await page.locator("#journal .q-item").count()).toBeGreaterThan(5);
  // La mazmorra y los farmeos del paso son avisos propios, no «lo que se resuelve» ni notas
  const dungeon = page.locator("#journal .call.dungeon").first();
  await expect(dungeon.locator("b").first()).toHaveText("Mazmorra");
  await expect(dungeon).toContainText("Pasa la mazmorra");
  const farm = page.locator("#journal .call.farm").first();
  await expect(farm.locator("b").first()).toHaveText("Farmeo");
  await expect(farm).toContainText("Farmea en");
  // Sin icono generado, el medallón va vacío: ninguna imagen rota
  expect(await page.locator("#journal .call i img").evaluateAll(imgs => imgs.filter(i => i.complete && i.naturalWidth === 0).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("sin Dofus ni guía de Torrente Arcano: ni franja de Dofus del camino ni enlaces a guías", async ({ page }) => {
  await openGlobal(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#winRoad, .road-head, .road-menu")).toHaveCount(0);
  await expect.poll(() => appText(page)).not.toMatch(/Dofus del camino|Torrente Arcano/);
  // Los nombres de las misiones no son enlaces: no hay guía a la que llevar
  await expect(page.locator("#journal a.q-name")).toHaveCount(0);
  await expect(page.locator("#journal .q-howto")).toHaveText("Pulsa una misión para darla por hecha.");
  // Tampoco la nota de las pausas: la guía no la tiene
  await expect(page.locator("#notaDialog, #notaOpen, .nota-open")).toHaveCount(0);
});
