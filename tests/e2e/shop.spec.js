import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("la lista de objetos agrupa 260 objetos en cuatro categorías", async ({ page }) => {
  await openApp(page);
  await expect(page.locator(".shop-item")).toHaveCount(260);
  await expect(page.locator('.shop-tab[data-tab="recursos"]')).toContainText("194");
  await expect(page.locator('.shop-tab[data-tab="consumibles"]')).toContainText("34");
  await expect(page.locator('.shop-tab[data-tab="equipables"]')).toContainText("25");
  await expect(page.locator('.shop-tab[data-tab="otros"]')).toContainText("7");
  await page.click('.shop-tab[data-tab="consumibles"]');
  await expect(page.locator(".shop-item")).toHaveCount(34);
});

test("un objeto se marca como conseguido y se guarda", async ({ page }) => {
  await openApp(page);
  const first = page.locator(".shop-item").first();
  const id = await first.getAttribute("data-id");
  await first.click();
  await expect(page.locator(`.shop-item[data-id="${id}"]`)).toHaveClass(/owned/);
  expect(await readLS(page, "silvestre:owned")).toEqual({ [id]: true });
});

test("solo pasos pendientes descuenta los objetos de pasos hechos", async ({ page }) => {
  // Paso 93 completo: sus objetos ("Blanco marfil") dejan de contar si no los pide otro paso
  await openApp(page, { "silvestre:done": { "93": true } });
  const pending = await page.locator(".shop-item").count();
  // El checkbox está oculto tras un interruptor dibujado: se pulsa la etiqueta, como haría una persona
  await page.locator("label.toggle", { has: page.locator("#shopPendingToggle") }).click();
  await expect(page.locator("#shopPendingToggle")).not.toBeChecked();
  await expect(page.locator(".shop-item")).toHaveCount(260);
  expect(pending).toBeLessThan(260);
});
