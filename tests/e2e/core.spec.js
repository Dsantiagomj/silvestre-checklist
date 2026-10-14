import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("carga los 100 pasos con su arte y sin errores", async ({ page }) => {
  const errors = await openApp(page);
  await expect(page.locator(".diary-row .row-art img")).toHaveCount(96);
  // Las imágenes de la lista cargan en diferido: basta con las que están a la vista
  await expect.poll(() => page.locator(".diary-row .row-art img").evaluateAll(
    imgs => imgs.filter(i => i.complete && i.naturalWidth > 0).length), { timeout: 15_000 }).toBeGreaterThanOrEqual(8);
  expect(errors).toEqual([]);
});

test("el detalle del paso 93 muestra recompensa, jefes y objetos", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="93"] .row-main');
  await expect(page.locator('.diary-row[data-n="93"]')).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#journal .journal-show-name")).toHaveText("Nileza");
  await expect(page.locator("#journal .journal-reward-name")).toHaveText("Dofus Marfil");
  await expect(page.locator(".boss-row .boss-chip")).toHaveCount(6);
  const req = page.locator(".req", { has: page.locator("summary", { hasText: "Necesitas (12)" }) });
  await expect(req.locator(".req-item")).toHaveCount(12);
});

test("el detalle lista las misiones del paso cuando cargan", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="93"] .row-main');
  await expect(page.locator("#journal .journal-quests .journal-h")).toContainText("(10)", { timeout: 15_000 });
  await expect(page.locator("#journal .q-item")).toHaveCount(10);
  await expect(page.locator(".q-item .q-name").first()).toHaveText("El dragón blanco");
});

test("marcar un paso actualiza la fila, hero, header y almacenamiento", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="93"] .row-main');
  await page.click("#toggleBtn");
  await expect(page.locator('.diary-row[data-n="93"]')).toHaveClass(/done/);
  await expect(page.locator("#statDone")).toHaveText("1");
  await expect(page.locator("#sbDone")).toHaveText("1");
  await expect(page.locator("#heroPct")).not.toHaveText(/^0%?$/);
  expect(await readLS(page, "silvestre:done")).toEqual({ "93": true });
  // «Paso hecho» ya llevó al 94; se desmarca desde la casilla de la fila
  await expect(page.locator("#journal .journal-num")).toHaveText("94");
  await page.click('.diary-row[data-n="93"] .row-check');
  await expect(page.locator('.diary-row[data-n="93"]')).not.toHaveClass(/done/);
});

test("los prerrequisitos tienen icono y se marcan", async ({ page }) => {
  await openApp(page);
  await expect.poll(() => page.locator(".pr-icons img").count()).toBeGreaterThanOrEqual(22);
  await page.click('.pr-card[data-id="o1"]');
  await expect(page.locator('.pr-card[data-id="o1"]')).toHaveClass(/done/);
  await expect(page.locator("#prereqsCount")).toHaveText("1/18");
  expect(await readLS(page, "silvestre:prereqs")).toEqual({ o1: true });
});

test("los filtros de zona y la búsqueda dejan en la lista solo lo que coincide", async ({ page }) => {
  await openApp(page);
  await page.locator("#zoneSeals .seal").nth(1).click();
  await expect.poll(() => page.locator(".diary-row").count()).toBeLessThan(100);
  await page.locator("#zoneSeals .seal").first().click();
  await expect(page.locator(".diary-row")).toHaveCount(100);
  await page.fill("#searchInput", "Blanco marfil");
  await expect.poll(() => page.locator(".diary-row").count()).toBeLessThan(10);
  await expect(page.locator('.diary-row[data-n="93"]')).toBeVisible();
});
