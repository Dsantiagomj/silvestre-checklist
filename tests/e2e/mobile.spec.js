import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("en móvil el header ocupa una línea y el detalle sube como hoja", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#overlayBtn")).toBeHidden();
  expect(await page.locator("header").evaluate(h => h.offsetHeight)).toBeLessThanOrEqual(56);
  await page.locator('.diary-row[data-n="19"] .row-main').click();
  await expect(page.locator("#sheet")).toHaveClass(/open/);
  await expect(page.locator("#sheetContent .journal-show-name")).toHaveText("Meriana");
  await expect(page.locator("#sheetContent .journal-reward")).toHaveCount(0);
});

test("en móvil, «Ver en el mapa» cierra la hoja y abre el mapa", async ({ page }) => {
  await openApp(page);
  await page.locator('.diary-row[data-n="34"] .row-main').click();
  await expect(page.locator("#sheet")).toHaveClass(/open/);
  await page.locator("#sheetContent .journal-to-map").click();
  await expect(page.locator("#sheet")).not.toHaveClass(/open/);
  await expect(page.locator(".map-node")).toHaveCount(100);
  await expect(page.locator('.map-node[data-n="34"]')).toBeInViewport();
});
