import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test("el overlay sigue las misiones del paso y se sincroniza con la página", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await page.click('.diary-row[data-n="93"] .row-main');
  // Esperar a las misiones antes de abrir, para que el overlay arranque completo
  await expect(page.locator("#journal .journal-quests .journal-h")).toContainText("(10)", { timeout: 15_000 });
  const [ov] = await Promise.all([context.waitForEvent("page"), page.click("#overlayBtn")]);
  await expect(ov.locator(".ov-qhead .ov-title")).toHaveText("El dragón blanco", { timeout: 10_000 });
  await expect(ov.locator(".req > summary")).toContainText("(12)");
  await expect(ov.locator(".ov-obj .ov-label")).toContainText("1 / 16");

  await ov.click('[data-ob="1"]');
  await expect(ov.locator(".ov-obj .ov-label")).toContainText("2 / 16");

  await ov.click('[data-q="1"]');
  await expect(ov.locator(".ov-qhead .ov-title")).toHaveText("Examen de paso");

  const chip = ov.locator(".coord-chip").first();
  await chip.click();
  expect(await ov.evaluate(() => navigator.clipboard.readText())).toMatch(/^\/travel -?\d+,-?\d+$/);

  await ov.click("[data-toggle]");
  await expect(page.locator('.diary-row[data-n="93"]')).toHaveClass(/done/);
  await expect(ov.locator(".ov-chip.done")).toBeVisible();
});
