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

test("cambiar a la pestaña de objetos anima el panel nuevo", async ({ page }) => {
  await openApp(page, null, { view: "prereqs" });
  await page.click("#tabItems");
  // La capa que lo lleva entra deslizándose
  expect(await running(page, ".steps-stage > .steps-layer:not([inert])")).toBeGreaterThan(0);
});

test("con movimiento reducido no hay animaciones al cambiar de pestaña", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.waitForTimeout(400);
  await page.click("#tabPrereqs");
  expect(await running(page, "#diary")).toBe(0);
  await page.click("#tabItems");
  expect(await running(page, "#diary")).toBe(0);
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
  await openApp(page, null, { view: "prereqs" });
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
    el.getAnimations().some(a => /^reveal/.test(a.animationName) && a.timeline && !(a.timeline instanceof DocumentTimeline)));
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
  // La ventana a la vista y, dentro, el mapa desplazado hasta el paso 40
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  await page.locator(".step-map-scroll").evaluate(el => {
    el.scrollTop = el.querySelector('.map-node[data-n="40"]').offsetTop - el.clientHeight / 2;
  });
  await page.click('.map-node[data-n="40"]');
  const where = () => page.evaluate(() => ({ page: scrollY, map: document.querySelector(".step-map-scroll").scrollTop }));
  const before = await where();
  expect(before.map).toBeGreaterThan(0);
  // Cada ida y vuelta, dos segundos fotograma a fotograma: el desplazamiento suave se ve entero
  const settle = () => page.evaluate(async () => {
    const t0 = performance.now();
    while (performance.now() - t0 < 2000) await new Promise(r => requestAnimationFrame(r));
  });
  // Clics sin Playwright, que desplazaría el mapa para dejar entera a la vista la ficha
  await page.locator("#mapCard .map-card-open").evaluate(el => el.click());
  await settle();
  await page.locator(".journal-to-map").evaluate(el => el.click());
  await settle();
  // El paso ya estaba a la vista: ni la página ni el mapa se desplazan
  const after = await where();
  expect(Math.abs(after.page - before.page)).toBeLessThan(4);
  expect(Math.abs(after.map - before.map)).toBeLessThan(4);
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

/**
 * El zoom entre mapa y diario fotograma a fotograma: cuánto tarda cada fotograma, dónde
 * está la vista que llega (respecto a la que se va) y cuánto se ve.
 */
const sampleSwap = (page, click) => page.evaluate(async click => {
  const t0 = performance.now();
  document.querySelector(click).click();
  const out = [];
  let last = t0;
  while (performance.now() - t0 < 1300) {
    await new Promise(r => requestAnimationFrame(r));
    const now = performance.now();
    const layers = [...document.querySelectorAll(".steps-stage > .steps-layer")];
    const enter = layers.find(l => !l.hasAttribute("inert"));
    const leave = layers.find(l => l.hasAttribute("inert"));
    out.push({
      dt: now - last,
      layers: layers.length,
      // Las dos vistas, una encima de la otra: la que se va sale del flujo
      offset: leave ? Math.abs(enter.offsetTop - leave.offsetTop) : 0,
      opacity: parseFloat(getComputedStyle(enter).opacity),
      onScreen: enter.getBoundingClientRect().top < innerHeight,
    });
    last = now;
  }
  return out;
}, click);

for (const [name, view, click] of [
  ["del mapa al diario", "map", "#stepsViewDiary"],
  ["del diario al mapa", "diary", "#stepsViewMap"],
]) {
  test(`${name}, la vista nueva aparece en el sitio de la vieja y el zoom no se atasca`, async ({ page }) => {
    await openApp(page, null, { view });
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.querySelector(".steps-win").scrollIntoView());
    await page.waitForTimeout(400);
    const frames = await sampleSwap(page, click);
    const both = frames.filter(f => f.layers === 2);
    expect(both.length).toBeGreaterThan(0);
    // Mientras conviven, la que llega está en el mismo sitio que la que se va (no debajo)
    expect(Math.max(...both.map(f => f.offset))).toBeLessThanOrEqual(1);
    // Y se ve aparecer antes de que la vieja se quite: no salta al final
    expect(both.some(f => f.onScreen && f.opacity > 0.5)).toBe(true);
    // Sin parones: el umbral deja margen para la máquina cargada, no para un atasco
    expect(Math.max(...frames.slice(1).map(f => f.dt))).toBeLessThan(150);
  });
}

/**
 * Las capas de la ventana en los primeros fotogramas tras pulsar una pestaña: cuántas
 * conviven y hasta dónde se desplaza cada una (el máximo, con su signo).
 */
const tabSwap = (page, click) => page.evaluate(async click => {
  document.querySelector(click).click();
  const x = el => new DOMMatrix(getComputedStyle(el).transform).m41;
  const far = (a, b) => (Math.abs(b) > Math.abs(a) ? b : a);
  const seen = { layers: 0, enterX: 0, leaveX: 0, enterOpacity: 1, offset: 0 };
  for (let i = 0; i < 10; i++) {
    await new Promise(r => requestAnimationFrame(r));
    const layers = [...document.querySelectorAll(".steps-stage > .steps-layer")];
    const enter = layers.find(l => !l.hasAttribute("inert"));
    const leave = layers.find(l => l.hasAttribute("inert"));
    seen.layers = Math.max(seen.layers, layers.length);
    seen.enterX = far(seen.enterX, x(enter));
    seen.enterOpacity = Math.min(seen.enterOpacity, parseFloat(getComputedStyle(enter).opacity));
    if (leave) {
      seen.leaveX = far(seen.leaveX, x(leave));
      seen.offset = Math.max(seen.offset, Math.abs(enter.offsetTop - leave.offsetTop));
    }
  }
  return seen;
}, click);

test("las pestañas de las listas se cruzan deslizándose hacia el lado de la pestaña", async ({ page }) => {
  await openApp(page, null, { view: "prereqs" });
  await page.waitForLoadState("networkidle");
  // Hacia la derecha: la nueva llega desde la derecha y la vieja se va por la izquierda
  const right = await tabSwap(page, "#tabItems");
  expect(right.layers).toBe(2);
  expect(right.offset).toBeLessThanOrEqual(1);
  expect(right.enterX).toBeGreaterThan(0);
  expect(right.leaveX).toBeLessThan(0);
  expect(right.enterOpacity).toBeLessThan(1);
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 2000 });
  // Y al revés
  const left = await tabSwap(page, "#tabPrereqs");
  expect(left.enterX).toBeLessThan(0);
  expect(left.leaveX).toBeGreaterThan(0);
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 2000 });
  // Del diario a una lista, el mismo deslizamiento (el zoom es solo entre mapa y diario)
  await page.click("#stepsViewDiary");
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 2000 });
  const fromDiary = await tabSwap(page, "#tabPrereqs");
  expect(fromDiary.layers).toBe(2);
  expect(fromDiary.enterX).toBeGreaterThan(0);
});

test("en móvil, al cambiar de pestaña la ventana cambia de alto poco a poco", async ({ browser }) => {
  // En escritorio la ventana tiene siempre el alto de la pantalla (fit.spec.js); en
  // móvil sigue el flujo de la página y su altura se anima
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openApp(page, null, { view: "diary" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const heights = await page.evaluate(async () => {
    const win = document.querySelector(".steps-win");
    const out = [win.offsetHeight];
    document.getElementById("tabPrereqs").click();
    for (let i = 0; i < 40; i++) {
      await new Promise(r => requestAnimationFrame(r));
      out.push(win.offsetHeight);
    }
    return out;
  });
  const from = heights[0], to = heights.at(-1);
  expect(Math.abs(to - from)).toBeGreaterThan(100);
  // Pasa por alturas intermedias en vez de saltar de una a otra
  const between = new Set(heights.filter(h => h > Math.min(from, to) + 10 && h < Math.max(from, to) - 10));
  expect(between.size).toBeGreaterThanOrEqual(3);
  await ctx.close();
});

test("la marca de la pestaña activa se desliza hasta la pestaña nueva", async ({ page }) => {
  await openApp(page, null, { view: "diary" });
  await page.waitForTimeout(400);
  const pill = page.locator(".win-tabs .win-tab-pill");
  const box = async sel => page.locator(sel).evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, w: r.width }; });
  const at = await pill.evaluate(el => el.getBoundingClientRect().left);
  expect(Math.abs(at - (await box("#stepsViewDiary")).x)).toBeLessThanOrEqual(1);
  const xs = await page.evaluate(async () => {
    document.getElementById("tabItems").click();
    const out = [];
    for (let i = 0; i < 30; i++) {
      await new Promise(r => requestAnimationFrame(r));
      out.push(document.querySelector(".win-tab-pill").getBoundingClientRect().left);
    }
    return out;
  });
  const target = await box("#tabItems");
  // Recorre el camino (posiciones intermedias) y acaba bajo la pestaña nueva, con su ancho
  expect(xs.filter(x => x > at + 5 && x < target.x - 5).length).toBeGreaterThan(2);
  const end = await pill.evaluate(el => { const r = el.getBoundingClientRect(); return { x: r.left, w: r.width }; });
  expect(Math.abs(end.x - target.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(end.w - target.w)).toBeLessThanOrEqual(1);
});

test("la insignia de una pestaña rebota cuando cambia lo que falta", async ({ page }) => {
  await openApp(page, null, { view: "prereqs" });
  await page.waitForTimeout(400);
  await page.click('#prereqs .pr-card[data-id="o1"]');
  expect(await page.locator("#prereqsCount").evaluate(el =>
    el.getAnimations().some(a => a.animationName === "badge-bump"))).toBe(true);
});

test("las herramientas de la ventana cambian con un fundido, sin cambiar de alto", async ({ page }) => {
  await openApp(page, null, { view: "diary" });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(400);
  const seen = await page.evaluate(async () => {
    const row = document.querySelector(".win-tools");
    const h = row.offsetHeight;
    document.getElementById("tabPrereqs").click();
    const out = { heights: [], both: 0, anims: 0 };
    for (let i = 0; i < 30; i++) {
      await new Promise(r => requestAnimationFrame(r));
      out.heights.push(document.querySelector(".win-tools").offsetHeight - h);
      const sets = [...document.querySelectorAll(".win-tools > .win-tool")];
      if (sets.length > 1) out.both++;
      out.anims = Math.max(out.anims, sets.reduce((n, el) => n + el.getAnimations().length, 0));
    }
    return out;
  });
  // La fila es siempre la misma: solo su contenido se apaga y se enciende
  expect(seen.heights.every(d => d === 0), seen.heights.join()).toBe(true);
  expect(seen.both).toBeGreaterThan(0);
  expect(seen.anims).toBeGreaterThan(0);
  await expect(page.locator(".win-tools > .win-tool")).toHaveCount(1, { timeout: 2000 });
  await expect(page.locator('.win-tools > .win-tool[data-tool="prereqs"]')).toBeVisible();
});

test("con movimiento reducido las pestañas cambian al instante", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, null, { view: "diary" });
  await page.click("#tabPrereqs");
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 150 });
  await expect(page.locator(".win-tools > .win-tool")).toHaveCount(1, { timeout: 150 });
  await expect(page.locator('.win-tools > .win-tool[data-tool="prereqs"]')).toHaveCSS("opacity", "1");
  expect(await page.locator(".win-tab-pill").evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s");
});

test("el desplegable de zona se abre y se cierra con una animación", async ({ page }) => {
  await openApp(page);
  await page.waitForTimeout(300);
  await page.click("#zoneBtn");
  expect(await page.locator("#zoneSeals").evaluate(el => el.getAnimations().length)).toBeGreaterThan(0);
  await page.waitForTimeout(400);
  // Al cerrarse sigue un momento, apagándose, y luego se va
  const closing = await page.evaluate(async () => {
    document.getElementById("zoneBtn").click();
    await new Promise(r => requestAnimationFrame(r));
    const pop = document.querySelector(".zone-pop");
    return pop ? pop.getAnimations().length : -1;
  });
  expect(closing).toBeGreaterThan(0);
  await expect(page.locator(".zone-pop")).toHaveCount(0, { timeout: 1500 });
  await expect(page.locator("#zoneBtn")).toHaveAttribute("aria-expanded", "false");
});

test("con movimiento reducido el desplegable de zona se abre y se cierra al instante", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.click("#zoneBtn");
  expect(await page.locator("#zoneSeals").evaluate(el => el.getAnimations().length)).toBe(0);
  await page.click("#zoneBtn");
  await expect(page.locator(".zone-pop")).toHaveCount(0, { timeout: 150 });
});

test("con el filtro Pendientes, la fila marcada se pliega en vez de desaparecer de golpe", async ({ page }) => {
  await openApp(page);
  await page.click("#diaryTabPending");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  await page.waitForTimeout(300);
  const seen = await page.evaluate(async () => {
    const row = document.querySelector('.diary-row[data-n="5"]');
    row.querySelector(".row-check").click();
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => setTimeout(r, 380));
    const still = document.querySelector('.diary-row[data-n="5"]');
    return { still: !!still, anims: still ? still.getAnimations().length : 0, h: still?.offsetHeight ?? 0 };
  });
  // Se queda un momento (se ve la ✓) y se pliega
  expect(seen.still).toBe(true);
  expect(seen.anims).toBeGreaterThan(0);
  await expect(page.locator(".diary-row")).toHaveCount(99, { timeout: 2000 });
});

test("cambiar de filtro en la lista no espera a que se plieguen las filas", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true } });
  await page.click("#diaryTabDone");
  await expect(page.locator(".diary-row")).toHaveCount(2, { timeout: 200 });
});

/**
 * Cambiar a una lista (o volver) es un fundido en dos tiempos: la vista que se va se
 * apaga del todo antes de que se vea la que llega, y la que llega no salta de sitio
 * una vez visible. La fila de herramientas está siempre (solo cambia su contenido),
 * así que nada se mueve: ni el escenario, ni la vista que se va, ni la página.
 */
const SWAPS = [
  ["#stepsViewDiary", "#tabPrereqs"], ["#tabPrereqs", "#tabItems"], ["#tabItems", "#stepsViewMap"],
  ["#stepsViewMap", "#tabPrereqs"], ["#stepsViewDiary", "#tabItems"],
];
for (const [from, to] of SWAPS) {
  test(`de ${from} a ${to} las vistas no se superponen ni saltan`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page);
    await page.evaluate(s => document.querySelector(s).click(), from);
    await page.waitForTimeout(900);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
    await page.waitForTimeout(100);
    const frames = await page.evaluate(async sel => {
      const out = [];
      const stage = document.querySelector(".steps-stage");
      const old = stage.querySelector(".steps-layer");
      out.push({ stage: stage.getBoundingClientRect().top, old: old.getBoundingClientRect().top, y: scrollY, layers: [] });
      document.querySelector(sel).click();
      const t0 = performance.now();
      while (performance.now() - t0 < 900) {
        await new Promise(r => requestAnimationFrame(r));
        const layers = [...document.querySelectorAll(".steps-layer")].map(el => ({
          op: parseFloat(getComputedStyle(el).opacity), top: Math.round(el.getBoundingClientRect().top), leaving: el.hasAttribute("inert"),
        }));
        out.push({
          stage: stage.getBoundingClientRect().top,
          old: old.isConnected ? old.getBoundingClientRect().top : null,
          y: scrollY, layers,
        });
      }
      return out;
    }, to);
    // Nunca dos capas visibles a la vez
    const overlap = frames.filter(f => f.layers.filter(l => l.op > 0.05).length > 1);
    expect(overlap.length).toBe(0);
    // La que llega, una vez visible, no cambia de altura en la página
    const tops = frames.map(f => f.layers.find(l => !l.leaving && l.op > 0.05)?.top).filter(t => t != null);
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
    // El escenario y la vista que se va se quedan quietos fotograma a fotograma, y la página no se desplaza
    const spread = xs => Math.max(...xs) - Math.min(...xs);
    expect(spread(frames.map(f => f.stage)), frames.map(f => Math.round(f.stage)).join()).toBeLessThanOrEqual(1);
    expect(spread(frames.map(f => f.old).filter(t => t != null))).toBeLessThanOrEqual(1);
    expect(spread(frames.map(f => f.y))).toBe(0);
  });
}

/** La fila de herramientas de la ventana: la misma altura en las cuatro pestañas y, en cada una, lo suyo. */
for (const [w, h] of [[1440, 900], [1280, 720], [1100, 800]]) {
  test(`a ${w}×${h}, la fila de herramientas mide lo mismo en las cuatro pestañas y lleva lo de cada una`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, null, { view: "map" });
    const heights = [];
    const only = async (shown, hidden) => {
      for (const sel of shown) await expect(page.locator(`.win-tools ${sel}`)).toBeVisible();
      for (const sel of hidden) await expect(page.locator(sel)).toHaveCount(0);
    };
    const STEPS_TOOLS = ["#searchInput", "#zoneBtn"];
    const ITEMS_TOOLS = ["#needsSearch", ".needs-sort", ".needs-view", "#shopPendingToggle + .sw"];
    const PRE_TOOLS = ["#needsMarkAll", "#needsClear"];
    for (const [tab, shown, hidden] of [
      ["#stepsViewMap", STEPS_TOOLS, [...ITEMS_TOOLS, ...PRE_TOOLS]],
      ["#stepsViewDiary", STEPS_TOOLS, [...ITEMS_TOOLS, ...PRE_TOOLS]],
      ["#tabPrereqs", PRE_TOOLS, [...STEPS_TOOLS, ...ITEMS_TOOLS]],
      ["#tabItems", ITEMS_TOOLS, STEPS_TOOLS],
    ]) {
      await page.click(tab);
      await expect(page.locator(".win-tools > .win-tool")).toHaveCount(1, { timeout: 2000 });
      await only(shown, hidden);
      heights.push(await page.locator(".win-tools").evaluate(el => el.offsetHeight));
      // Todo en una fila: nada se sale por debajo
      const spill = await page.locator(".win-tools > .win-tool").evaluate(el => el.scrollHeight - el.clientHeight);
      expect(spill).toBeLessThanOrEqual(0);
    }
    expect(new Set(heights).size, heights.join()).toBe(1);
  });
}
