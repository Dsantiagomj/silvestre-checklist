import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("carga los 100 pasos con su arte y sin errores", async ({ page }) => {
  const errors = await openApp(page);
  await expect.poll(() => page.locator(".cell-art.loaded").count(), { timeout: 15_000 }).toBeGreaterThanOrEqual(96);
  await expect(page.locator(".cell.has-art")).toHaveCount(96);
  expect(errors).toEqual([]);
});

test("el detalle del paso 93 muestra recompensa, jefes y objetos", async ({ page }) => {
  await openApp(page);
  await page.click('.cell[data-n="93"]');
  await expect(page.locator(".cell[data-n='93']")).toHaveClass(/selected/);
  await expect(page.locator(".detail-art-name")).toHaveText("Dofus Marfil");
  await expect(page.locator(".detail-art-label")).toHaveText("Recompensa");
  await expect(page.locator(".boss-row .boss-chip")).toHaveCount(6);
  const req = page.locator(".req", { has: page.locator("summary", { hasText: "Objetos necesarios (12)" }) });
  await expect(req.locator(".req-item")).toHaveCount(12);
});

test("el detalle lista las misiones del paso cuando cargan", async ({ page }) => {
  await openApp(page);
  await page.click('.cell[data-n="93"]');
  await expect(page.locator(".quests-block > summary")).toContainText("(10)", { timeout: 15_000 });
  await page.click(".quests-block > summary");
  await expect(page.locator(".q-item")).toHaveCount(10);
  await expect(page.locator(".q-item .q-name").first()).toHaveText("El dragón blanco");
});

test("marcar un paso actualiza celda, hero, header y almacenamiento", async ({ page }) => {
  await openApp(page);
  await page.click('.cell[data-n="93"]');
  await page.click("#toggleBtn");
  await expect(page.locator('.cell[data-n="93"]')).toHaveClass(/done/);
  await expect(page.locator("#statDone")).toHaveText("1");
  await expect(page.locator("#sbDone")).toHaveText("1");
  await expect(page.locator("#heroPct")).not.toHaveText(/^0%?$/);
  expect(await readLS(page, "silvestre:done")).toEqual({ "93": true });
  await page.click("#toggleBtn");
  await expect(page.locator('.cell[data-n="93"]')).not.toHaveClass(/done/);
});

test("los prerrequisitos tienen icono y se marcan", async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.locator(".pr-icons img").count()).toBeGreaterThanOrEqual(22);
  await page.click('.prereq-item[data-id="o1"]');
  await expect(page.locator('.prereq-item[data-id="o1"]')).toHaveClass(/done/);
  await expect(page.locator("#prereqsCount")).toContainText("1/18");
  expect(await readLS(page, "silvestre:prereqs")).toEqual({ o1: true });
});

test("los filtros de zona y la búsqueda atenúan las celdas que no coinciden", async ({ page }) => {
  await openApp(page);
  await page.locator("#zoneChips .chip").first().click();
  await expect.poll(() => page.locator(".cell.dimmed").count()).toBeGreaterThan(0);
  await page.click("#clearBtn");
  await expect(page.locator(".cell.dimmed")).toHaveCount(0);
  await page.fill("#searchInput", "Blanco marfil");
  await expect.poll(() => page.locator(".cell:not(.dimmed)").count()).toBeLessThan(10);
  await expect(page.locator('.cell[data-n="93"]')).not.toHaveClass(/dimmed/);
});
