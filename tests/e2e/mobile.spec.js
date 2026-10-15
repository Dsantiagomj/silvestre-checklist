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

test("en móvil, la ficha de un paso del mapa sube como hoja y lleva al diario", async ({ page }) => {
  await openApp(page, null, { view: "map" });
  await page.locator('.map-node[data-n="34"]').click();
  const sheet = page.locator("#sheet");
  await expect(sheet).toHaveClass(/open/);
  // La misma ficha del mapa, no el detalle entero
  await expect(sheet.locator(".map-card .journal-num")).toHaveText("34");
  await expect(sheet.locator(".map-card-reward")).toContainText("Se pasa Lasoberaña");
  await expect(sheet.locator(".journal-quests")).toHaveCount(0);
  // Cabe en la pantalla
  const box = await sheet.locator(".map-card").boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  // Lo que cierra lleva a ese paso en la misma hoja
  await sheet.locator('.step-chip[data-n="33"]').click();
  await expect(sheet.locator(".map-card .journal-num")).toHaveText("33");
  // «Abrir en el diario»: el detalle entero en la hoja
  await sheet.locator(".map-card-open").click();
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "true");
  await expect(sheet).toHaveClass(/open/);
  await expect(page.locator("#sheetContent .journal-to-map")).toBeVisible();
  await expect(page.locator("#sheetContent .journal-num")).toHaveText("33");
});
