import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * Animaciones de entrada y de altura en curso sobre un elemento o sus hijos. Las
 * transiciones CSS no cuentan: son reacciones al hover, no al cambio de estado.
 */
const running = (page, sel) => page.evaluate(s => {
  const root = document.querySelector(s);
  return document.getAnimations().filter(a => {
    const t = a.effect?.target;
    return t && !(a instanceof CSSTransition) && (t === root || root.contains(t));
  }).length;
}, sel);

test("ocultar y mostrar «Lo que necesitas» anima la altura y el contenido", async ({ page }) => {
  await openApp(page);
  await page.click("#needsCollapse");
  expect(await running(page, "#needs")).toBeGreaterThan(0);
  await expect(page.locator("#needsExpand")).toBeVisible();
  await page.waitForTimeout(500);
  await page.click("#needsExpand");
  expect(await running(page, "#needs")).toBeGreaterThan(0);
});

test("cambiar de pestaña en «Lo que necesitas» anima el panel nuevo", async ({ page }) => {
  await openApp(page);
  await page.click("#tabItems");
  expect(await running(page, "#items")).toBeGreaterThan(0);
});

test("con movimiento reducido no hay animaciones al ocultar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.waitForTimeout(400);
  await page.click("#needsCollapse");
  expect(await running(page, "#needs")).toBe(0);
});
