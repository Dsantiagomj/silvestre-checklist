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

/**
 * Estado del cambio de vista justo después del clic: las capas que conviven (la que se
 * va y la que llega, gestionadas por AnimatePresence), su origen y sus ids.
 */
const swapState = (page, click) => page.evaluate(async click => {
  document.querySelector(click).click();
  await new Promise(r => requestAnimationFrame(r));
  const layers = [...document.querySelectorAll(".steps-stage > .steps-layer")];
  return {
    layers: layers.length,
    leaving: layers.filter(l => l.hasAttribute("inert")).length,
    origins: layers.map(l => l.style.transformOrigin),
    journals: document.querySelectorAll("#journal").length,
    mapCards: document.querySelectorAll("#mapCard").length,
  };
}, click);

test("del diario al mapa es un zoom out desde el paso actual", async ({ page }) => {
  await openApp(page);
  // Las funciones de animación de motion llegan aparte: sin ellas el cambio es instantáneo
  await page.waitForLoadState("networkidle");
  const seen = await swapState(page, "#stepsViewMap");
  // Las dos vistas conviven: la que se va, inerte, encima de la que llega
  expect(seen.layers).toBe(2);
  expect(seen.leaving).toBe(1);
  // Centro del zoom: el sello del paso actual (el 1)
  const node = await page.locator('.map-node[data-n="1"]').evaluate(el => `${el.style.left} ${el.style.top}`);
  expect(seen.origins).toEqual([node, node]);
  // La que se va no repite ids
  expect(seen.journals).toBe(0);
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 2000 });
});

test("del mapa al diario es un zoom in hacia el paso", async ({ page }) => {
  await openApp(page);
  await page.click("#stepsViewMap");
  await page.waitForTimeout(800);
  await page.click('.map-node[data-n="34"]');
  const seen = await swapState(page, "#mapCard .map-card-open");
  expect(seen.layers).toBe(2);
  expect(seen.leaving).toBe(1);
  expect(seen.journals).toBe(1);
  expect(seen.mapCards).toBe(0);
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 2000 });
});

test("con movimiento reducido el cambio de vista es inmediato", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.click("#stepsViewMap");
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 150 });
  await expect(page.locator(".steps-stage .steps-layer")).not.toHaveClass(/swap/);
});

test("durante el zoom no se anima la altura ni nada dentro de la vista que se va", async ({ page }) => {
  await openApp(page);
  // Las funciones de animación de motion llegan aparte: sin ellas el cambio es instantáneo
  await page.waitForLoadState("networkidle");
  // Clic y lectura en la misma llamada: el zoom dura 0,3 s
  const busy = await page.evaluate(async () => {
    document.getElementById("stepsViewMap").click();
    await new Promise(r => requestAnimationFrame(r));
    const stage = document.querySelector(".steps-stage");
    const leaving = stage.querySelector(":scope > .steps-layer[inert]");
    if (!leaving) return "sin capa saliente";
    return document.getAnimations().filter(a => {
      const t = a.effect?.target;
      return t && leaving.contains(t) && t !== leaving;
    }).length + stage.getAnimations().length;
  });
  expect(busy).toBe(0);
});

test("tras el zoom al diario el contenido no vuelve a aparecer (sin parpadeo)", async ({ page }) => {
  await openApp(page);
  await page.click("#stepsViewMap");
  await page.waitForTimeout(800);
  await page.click('.map-node[data-n="34"]');
  // Opacidad efectiva del texto del detalle (la suya por la de sus ancestros) en cada fotograma
  const seen = await page.evaluate(async () => {
    document.querySelector("#mapCard .map-card-open").click();
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < 1100) {
      await new Promise(r => requestAnimationFrame(r));
      let el = document.querySelector("#journal .journal-body"), o = 1;
      for (; el; el = el.parentElement) o *= parseFloat(getComputedStyle(el).opacity);
      out.push(Math.round(o * 100) / 100);
    }
    return out;
  });
  const peak = seen.findIndex(o => o >= 0.95);
  expect(peak).toBeGreaterThanOrEqual(0);
  // Una vez visible, no vuelve a apagarse
  expect(Math.min(...seen.slice(peak))).toBeGreaterThanOrEqual(0.9);
});
