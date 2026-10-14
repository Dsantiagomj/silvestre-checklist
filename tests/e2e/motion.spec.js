import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * Animaciones de entrada y de altura en curso sobre un elemento o sus hijos. No
 * cuentan las transiciones CSS (reacciones al hover) ni los bucles infinitos
 * (el jefe que flota): no responden al cambio de estado.
 */
const running = (page, sel) => page.evaluate(s => {
  const root = document.querySelector(s);
  return document.getAnimations().filter(a => {
    const t = a.effect?.target;
    return t && !(a instanceof CSSTransition) && a.effect.getTiming().iterations !== Infinity &&
      (t === root || root.contains(t));
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

test("cambiar de paso anima el escenario y el contenido del detalle", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(500);
  await page.click('.diary-row[data-n="34"] .row-main');
  expect(await running(page, "#journal")).toBeGreaterThan(0);
});

test("cambiar entre diario y mapa anima la vista nueva", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(500);
  await page.click("#stepsViewMap");
  expect(await running(page, "#diary")).toBeGreaterThan(0);
});

test("marcar un paso hace aparecer la ✓ con un rebote", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(500);
  await page.click('.diary-row[data-n="5"] .row-check');
  const pops = await page.evaluate(() => document.getAnimations()
    .filter(a => a.animationName === "check-pop").length);
  expect(pops).toBeGreaterThan(0);
});

test("la ficha del mapa aparece animada y el paso actual late", async ({ page }) => {
  await openApp(page);
  await page.click("#stepsViewMap");
  await page.waitForTimeout(500);
  expect(await page.locator(".map-node.current").evaluate(el =>
    el.getAnimations().some(a => a.animationName === "node-here"))).toBe(true);
  await page.click('.map-node[data-n="34"]');
  expect(await running(page, "#mapCard")).toBeGreaterThan(0);
});

test("con movimiento reducido el diario y el mapa no se animan", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.waitForTimeout(400);
  await page.click('.diary-row[data-n="34"] .row-main');
  expect(await running(page, "#diary")).toBe(0);
  await page.click("#stepsViewMap");
  expect(await running(page, "#diary")).toBe(0);
});

test("la lista fija no se mueve mientras se anima el cambio de paso", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => document.getElementById("diary").scrollIntoView());
  await page.click('.diary-row[data-n="33"] .row-main');
  await page.waitForTimeout(600);
  const tops = await page.evaluate(async () => {
    document.querySelector('.diary-row[data-n="34"] .row-main').click();
    const out = [];
    for (let i = 0; i < 20; i++) {
      out.push(Math.round(document.querySelector(".diary-tabs").getBoundingClientRect().top));
      await new Promise(r => requestAnimationFrame(r));
    }
    return out;
  });
  expect(new Set(tops).size).toBe(1);
});

const pops = page => page.evaluate(() => document.getAnimations().filter(a => a.animationName === "check-pop").length);

test("marcar un prerrequisito o un objeto hace aparecer su ✓ con el mismo rebote", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(500);
  await page.click('#prereqs .pr-card[data-id="o1"]');
  expect(await pops(page)).toBeGreaterThan(0);
  await page.click("#tabItems");
  await page.waitForTimeout(500);
  await page.locator("#items .slot .slot-main").first().click();
  expect(await pops(page)).toBeGreaterThan(0);
});

test("las secciones entran al hacer scroll", async ({ page }) => {
  await openApp(page);
  const reveal = await page.locator("#diary").evaluate(el =>
    el.getAnimations().some(a => a.animationName === "reveal" && a.timeline && !(a.timeline instanceof DocumentTimeline)));
  expect(reveal).toBe(true);
});

/** Nombres de las animaciones en curso en un selector. */
const names = (page, sel) => page.evaluate(s => document.getAnimations()
  .filter(a => a.effect?.target?.matches?.(s)).map(a => a.animationName), sel);

test("del diario al mapa es un zoom out desde el paso actual", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(500);
  await page.click("#stepsViewMap");
  // La vista que se va queda encima, como instantánea, mientras entra la nueva
  await expect(page.locator(".steps-leaving")).toHaveCount(1);
  expect(await names(page, ".steps-leaving")).toContain("zoom-away-small");
  expect(await names(page, ".steps-current")).toContain("zoom-from-near");
  // Centro del zoom: el sello del paso actual (el 1)
  const origin = await page.locator(".steps-stage").evaluate(el => [el.style.getPropertyValue("--zx"), el.style.getPropertyValue("--zy")]);
  const node = await page.locator('.map-node[data-n="1"]').evaluate(el => [el.style.left, el.style.top]);
  expect(origin).toEqual(node);
  // La instantánea no repite ids y se va al terminar
  await expect(page.locator("#journal")).toHaveCount(0);
  await expect(page.locator(".steps-leaving")).toHaveCount(0, { timeout: 2000 });
});

test("del mapa al diario es un zoom in hacia el paso", async ({ page }) => {
  await openApp(page);
  await page.click("#stepsViewMap");
  await page.waitForTimeout(800);
  await page.click('.map-node[data-n="34"]');
  await page.click("#mapCard .map-card-open");
  expect(await names(page, ".steps-leaving")).toContain("zoom-into");
  expect(await names(page, ".steps-current")).toContain("zoom-from-far");
  await expect(page.locator("#journal")).toHaveCount(1);
  await expect(page.locator(".steps-leaving")).toHaveCount(0, { timeout: 2000 });
});

test("con movimiento reducido el cambio de vista no deja instantánea", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.click("#stepsViewMap");
  await expect(page.locator(".steps-leaving")).toHaveCount(0);
});
