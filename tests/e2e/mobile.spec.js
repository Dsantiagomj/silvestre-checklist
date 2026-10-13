import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test("en móvil el header ocupa una línea y el detalle sube como hoja", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#overlayBtn")).toBeHidden();
  expect(await page.locator("header").evaluate(h => h.offsetHeight)).toBeLessThanOrEqual(56);
  await page.locator('.cell[data-n="19"]').click();
  await expect(page.locator("#sheet")).toHaveClass(/open/);
  await expect(page.locator("#sheetContent .detail-art-name")).toHaveText("Dofus Púrpura");
});
