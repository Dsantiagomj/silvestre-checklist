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

test("el zoom espera a que el diario esté listo: no se muestra a medio cargar", async ({ page }) => {
  // Las misiones (su chunk) tardan: el diario no debe aparecer sin ellas
  let release;
  const held = new Promise(r => { release = r; });
  await page.route(/quests-[\w-]+\.js$/, async route => { await held; await route.continue(); });
  await openApp(page, null, { view: "map" });
  await page.waitForTimeout(400);
  await page.click('.map-node[data-n="34"]');
  await page.click("#mapCard .map-card-open");
  await page.waitForTimeout(700);
  const during = await page.evaluate(() => {
    const layers = [...document.querySelectorAll(".steps-stage > .steps-layer")];
    const op = el => parseFloat(getComputedStyle(el).opacity);
    return { layers: layers.length, entering: op(layers.find(l => !l.hasAttribute("inert"))),
      leaving: op(layers.find(l => l.hasAttribute("inert"))) };
  });
  // El mapa sigue ampliado y visible; el diario, oculto mientras carga
  expect(during.layers).toBe(2);
  expect(during.entering).toBeLessThan(0.05);
  expect(during.leaving).toBeGreaterThan(0.9);
  release();
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  // Al aparecer, las misiones ya están
  await expect(page.locator("#journal .q-item").first()).toBeVisible();
  expect(await page.locator("#journal .asset-note", { hasText: "Cargando misiones" }).count()).toBe(0);
});

test("con todo a mano, la vista nueva aparece sin agotar la espera", async ({ page }) => {
  await openApp(page, null, { view: "map" });
  await page.waitForLoadState("networkidle");
  await page.click('.map-node[data-n="34"]');
  const shown = await page.evaluate(async () => {
    document.querySelector("#mapCard .map-card-open").click();
    const t0 = performance.now();
    await new Promise(r => requestAnimationFrame(r));
    const layer = document.querySelector(".steps-stage > .steps-layer:not([inert])");
    while (performance.now() - t0 < 3000) {
      await new Promise(r => requestAnimationFrame(r));
      if (parseFloat(getComputedStyle(layer).opacity) > 0.05) return performance.now() - t0;
    }
    return Infinity;
  });
  // El límite es 1,5 s: esperar lo que el navegador no va a cargar lo agotaría
  expect(shown).toBeLessThan(1000);
});

test("ir al diario y volver al mapa deja el mapa donde estaba", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, null, { view: null });
  await page.waitForLoadState("networkidle");
  // El mapa con el paso 1 a la vista, como al bajar hasta él
  await page.evaluate(() => scrollTo(0, document.querySelector(".steps-stage").getBoundingClientRect().top + scrollY - 200));
  await page.click('.map-node[data-n="1"]');
  const before = await page.evaluate(() => scrollY);
  // Cada ida y vuelta, dos segundos fotograma a fotograma: el desplazamiento suave se ve entero
  const settle = () => page.evaluate(async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) await new Promise(r => requestAnimationFrame(r));
  });
  await page.click("#mapCard .map-card-open");
  await settle();
  await page.click(".journal-to-map");
  await settle();
  // El paso ya estaba a la vista: nada que desplazar
  const after = await page.evaluate(() => scrollY);
  expect(Math.abs(after - before)).toBeLessThan(4);
});

/** Posición de la lista en cada fotograma mientras se pulsan las cabeceras indicadas. */
const listTops = (page, clicks) => page.evaluate(async clicks => {
  const box = document.querySelector(".diary-list");
  const sums = document.querySelectorAll("#journal .q-item summary");
  const out = [Math.round(box.getBoundingClientRect().top)];
  for (const k of clicks) {
    sums[k].click();
    for (let i = 0; i < 25; i++) {
      await new Promise(r => requestAnimationFrame(r));
      out.push(Math.round(box.getBoundingClientRect().top));
    }
  }
  return out;
}, clicks);

test("plegar y desplegar misiones no mueve la lista de pasos", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  await page.locator("#journal .q-item").nth(5).waitFor({ timeout: 15_000 });
  // Con el diario a media pantalla (la lista fija arriba)
  await page.evaluate(() => scrollTo(0, document.querySelector(".diary-window").getBoundingClientRect().top + scrollY + 300));
  await page.waitForTimeout(600);
  const tops = await listTops(page, [0, 2, 0, 2]);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
});

test("con el final del diario a la vista, desplegar y plegar misiones no mueve la lista", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.click('.diary-row[data-n="17"] .row-main');
  await page.locator("#journal .q-item").nth(3).waitFor({ timeout: 15_000 });
  await page.locator("#journal .q-item summary").first().click();
  await page.waitForTimeout(600);
  // Al final de la ventana del diario, como al bajar hasta las últimas misiones
  await page.evaluate(() => { const w = document.querySelector(".diary-window"); scrollTo(0, w.getBoundingClientRect().bottom + scrollY - innerHeight + 40); });
  await page.waitForTimeout(600);
  // Las pestañas de la lista siguen a la vista: la lista no se ha ido hacia arriba
  const tabsTop = await page.locator(".diary-tabs").evaluate(el => el.getBoundingClientRect().top);
  expect(tabsTop).toBeGreaterThan(0);
  const tops = await listTops(page, [2, 2, 0, 0]);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
});

test("al final de la página, desplegar una misión no mueve nada ni cambia el tamaño de la lista", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 820 });
  await openApp(page);
  await page.click('.diary-row[data-n="11"] .row-main');
  await page.locator("#journal .q-item").nth(2).waitFor({ timeout: 15_000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(600);
  const frames = await page.evaluate(async () => {
    const side = document.querySelector(".diary-side");
    const sum = document.querySelectorAll("#journal .q-item summary")[1];
    const snap = () => ({ y: Math.round(scrollY), sum: Math.round(sum.getBoundingClientRect().top),
      top: Math.round(side.getBoundingClientRect().top), h: Math.round(side.offsetHeight) });
    const out = [snap()];
    sum.click();
    for (let i = 0; i < 30; i++) { await new Promise(r => requestAnimationFrame(r)); out.push(snap()); }
    return out;
  });
  const spread = k => Math.max(...frames.map(f => f[k])) - Math.min(...frames.map(f => f[k]));
  // Ni la página, ni la misión pulsada, ni la lista se mueven; la lista no cambia de altura
  expect([spread("y"), spread("sum"), spread("top"), spread("h")].every(d => d <= 1)).toBe(true);
});
