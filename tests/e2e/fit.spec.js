import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * En escritorio la ventana de los 100 pasos mide como poco lo que queda bajo la cabecera
 * de la página y, si piden más, lo que piden los prerrequisitos enteros: su lista no se
 * desplaza nunca por dentro y la página baja para leerla. Su barra (el progreso, las
 * pestañas y sus herramientas) queda fija y lo que no cabe se desplaza por dentro: en el
 * mapa, en los objetos y, en el diario, la lista de pasos. El detalle del paso es la
 * excepción: no se desplaza por dentro, mide lo que su contenido y un paso largo alarga la
 * ventana y se lee bajando la página, con la barra y la lista pegadas arriba (ver
 * diary-scroll.spec.js).
 */

const VIEWS = ["map", "diary", "prereqs", "items"];
const SIZES = [[1440, 900], [1280, 720]];

/**
 * Deja la sección arriba, bajo la cabecera de la página, como al ir a ella. Con todo
 * cargado: lo que crece encima mientras carga desplazaría la página unos píxeles.
 */
async function align(page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
}

/** Dónde quedan la cabecera de la página (en su página no hay: 0), la sección y la ventana. */
const boxes = page => page.evaluate(() => {
  const r = el => el.getBoundingClientRect();
  const diary = document.getElementById("diary");
  return {
    header: 0,
    section: r(diary).top,
    win: r(document.querySelector(".steps-win")),
    bar: r(document.getElementById("winBar")),
    // Lo que piden los prerrequisitos enteros (Diary.jsx, useNeedsHeight)
    need: parseFloat(getComputedStyle(diary).getPropertyValue("--win-need")) || 0,
    vh: innerHeight,
  };
});

/** La ventana desde arriba, bajo la cabecera de la página, con su barra entera a la vista. */
const fromTop = b => b.section >= b.header - 0.5 && b.win.top >= b.header - 0.5 && b.bar.bottom <= b.vh + 0.5;

/**
 * En el diario: la ventana desde arriba, la lista entera a la vista y la cabecera del paso
 * (estandarte y objetivo) arriba del detalle, entera.
 */
const fitsDiary = page => page.evaluate(() => {
  const header = 0;
  const win = document.querySelector(".steps-win").getBoundingClientRect();
  const side = document.querySelector(".diary-side").getBoundingClientRect();
  const top = document.querySelector("#journal .journal-top")?.getBoundingClientRect();
  return win.top >= header - 0.5 && side.bottom <= innerHeight + 0.5
    && !!top && top.top >= header - 0.5 && top.bottom <= innerHeight + 0.5;
});

for (const [w, h] of SIZES) {
  for (const view of VIEWS) {
    // En el diario, con un paso corto (el 4): uno largo alarga la ventana
    const seed = view === "diary" ? { "silvestre:done": { 1: true, 2: true, 3: true } } : null;
    test(`a ${w}×${h}, la ventana de pasos mide lo que piden los prerrequisitos con la pestaña «${view}»`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await openApp(page, seed, { view });
      await align(page);
      await page.waitForTimeout(150);
      const b = await boxes(page);
      const height = b.win.bottom - b.section;
      // Lo que queda bajo la cabecera, con los 8 px de aire arriba y abajo
      const screen = h - b.header - 16;
      expect(b.need, JSON.stringify(b)).toBeGreaterThan(0);
      expect(fromTop(b), JSON.stringify(b)).toBe(true);
      if (view === "diary") {
        // El diario, como poco 1,3 veces la pantalla; la lista sí cabe
        expect(Math.abs(height - Math.max(1.3 * screen, b.need)), JSON.stringify(b)).toBeLessThanOrEqual(2);
        expect(await fitsDiary(page), JSON.stringify(b)).toBe(true);
        return;
      }
      expect(Math.abs(height - Math.max(screen, b.need)), JSON.stringify(b)).toBeLessThanOrEqual(2);
      // Los prerrequisitos, enteros: su lista no se desplaza por dentro
      if (view === "prereqs") {
        expect(await page.locator(".prereqs-panel").evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
      }
    });
  }
}

for (const [w, h] of SIZES) {
  test(`a ${w}×${h}, en el diario la lista cabe en la pantalla, el detalle llega al pie de la ventana y la cabecera del paso se ve`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    await align(page);
    await page.waitForTimeout(150);
    expect(await fitsDiary(page)).toBe(true);
    // El detalle llega al pie de la ventana; la lista, al pie de la pantalla (con su aire)
    const r = await page.evaluate(() => ({
      win: document.querySelector(".steps-win").getBoundingClientRect().bottom,
      side: document.querySelector(".diary-side").getBoundingClientRect().bottom,
      detail: document.querySelector(".diary-detail").getBoundingClientRect().bottom,
    }));
    expect(Math.abs(r.detail - r.win)).toBeLessThanOrEqual(1.5);
    expect(r.side).toBeLessThanOrEqual(r.win + 0.5);
    expect(r.side).toBeGreaterThan(h - 20);
  });
}

// Todas miden lo mismo, lo que piden los prerrequisitos (o la pantalla, si es más). El
// diario, con un paso corto (el 4), es la excepción: como poco 1,3 veces la pantalla (uno
// largo la alarga más)
test("la ventana tiene la misma altura en todas las pestañas salvo el diario, que puede ser más alto", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page, { "silvestre:done": { 1: true, 2: true, 3: true } }, { view: "map" });
  await align(page);
  const heights = {};
  let need = 0;
  for (const id of ["#stepsViewMap", "#stepsViewDiary", "#tabPrereqs", "#tabItems"]) {
    await page.click(id);
    await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
    await page.waitForTimeout(350);
    const b = await boxes(page);
    heights[id] = Math.round(b.win.bottom - b.section);
    need = b.need;
  }
  const { "#stepsViewDiary": diary, ...others } = heights;
  expect(new Set(Object.values(others)).size, JSON.stringify(heights)).toBe(1);
  const screen = 720 - 16;
  expect(Math.abs(others["#stepsViewMap"] - Math.max(screen, need)), JSON.stringify({ heights, need })).toBeLessThanOrEqual(2);
  expect(Math.abs(diary - Math.max(1.3 * screen, need)), JSON.stringify({ heights, need })).toBeLessThanOrEqual(2);
});

// Lo que se desplaza en cada pestaña y lo que queda fijo encima
const SCROLL = {
  map: { scrollers: [".step-map-scroll"], fixed: [] },
  diary: { scrollers: [".diary-list"], fixed: [".diary-tabs"] },
  // Los prerrequisitos ya no se desplazan: la ventana mide lo que piden (--win-need)
  prereqs: { scrollers: [], still: [".prereqs-panel"], fixed: [".needs-bar"] },
  items: { scrollers: [".items-body"], fixed: [".needs-toolbar"] },
};

for (const view of VIEWS) {
  test(`con «${view}», desplazar por dentro no mueve la cabecera de la ventana ni la página`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openApp(page, { "silvestre:done": Object.fromEntries([1, 2, 3].map(n => [n, true])) }, { view });
    if (view === "diary") {
      await page.click('.diary-row[data-n="1"] .row-num');
      await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
    }
    await align(page);
    await page.waitForTimeout(400);
    const { scrollers, still = [], fixed } = SCROLL[view];
    for (const sel of still) {
      const extra = await page.locator(sel).evaluate(el => el.scrollHeight - el.clientHeight);
      expect(extra, `${sel} se desplaza por dentro`).toBeLessThanOrEqual(1);
    }
    const watch = ["#winBar", ...(view === "prereqs" || view === "items" ? [".win-tools"] : []), ...fixed];
    const snap = () => page.evaluate(sels => ({
      y: scrollY,
      tops: sels.map(s => Math.round(document.querySelector(s).getBoundingClientRect().top)),
    }), watch);
    const before = await snap();
    for (const sel of scrollers) {
      const moved = await page.locator(sel).evaluate(el => {
        el.scrollTo(0, el.scrollHeight);
        return el.scrollTop;
      });
      expect(moved, `${sel} no se desplaza por dentro`).toBeGreaterThan(0);
    }
    await page.waitForTimeout(100);
    expect(await snap()).toEqual(before);
  });
}

test("con la rueda sobre la lista, se desplaza la lista y no la página", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await align(page);
  await page.waitForTimeout(200);
  const y = await page.evaluate(() => scrollY);
  const list = await page.locator(".diary-list").boundingBox();
  await page.mouse.move(list.x + list.width / 2, list.y + list.height / 2);
  await page.mouse.wheel(0, 400);
  await expect.poll(() => page.locator(".diary-list").evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

test("«Siguiente» de la barra deja a la vista la ventana desde arriba y la cabecera del paso", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await page.click("#diaryNext");
  await expect.poll(() => fitsDiary(page), { timeout: 4000 }).toBe(true);
});

test("en el diario, la rueda sobre el detalle baja la página y la lista se queda a la vista", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  await align(page);
  await page.waitForTimeout(200);
  const y = await page.evaluate(() => scrollY);
  const box = await page.locator("#journal .journal-top").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y + 100);
  expect(await page.locator(".diary-detail").evaluate(el => el.scrollTop)).toBe(0);
  expect(await page.locator("#journal .journal-body").evaluate(el => el.scrollTop)).toBe(0);
  await expect(page.locator(".diary-list")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
});

test("al volver al mapa, el paso se busca dentro del mapa y la página no se mueve si ahí se ve", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await align(page);
  // Clics sin Playwright, que desplazaría la página para dejar a la vista lo que pulsa
  await page.locator('.diary-row[data-n="60"] .row-num').evaluate(el => el.click());
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => scrollY);
  await page.locator("#journal .journal-to-map").evaluate(el => el.click());
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  await expect(page.locator('.map-node[data-n="60"]')).toBeInViewport({ timeout: 3000 });
  expect(await page.locator(".step-map-scroll").evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

// La ventana pasa de la pantalla: un paso del final no se ve ni con el mapa al fondo, y la
// página baja lo que falta
test("al volver al mapa con un paso del final, el mapa llega al fondo y la página baja hasta el paso", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await align(page);
  await page.locator('.diary-row[data-n="97"] .row-num').evaluate(el => el.click());
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => scrollY);
  await page.locator("#journal .journal-to-map").evaluate(el => el.click());
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  await expect(page.locator('.map-node[data-n="97"]')).toBeInViewport({ timeout: 3000 });
  await expect(page.locator("#mapCard")).toBeInViewport({ ratio: 0.95, timeout: 3000 });
  expect(await page.locator(".step-map-scroll").evaluate(el => el.scrollHeight - el.clientHeight - el.scrollTop)).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(y);
});

test("en móvil la ventana sigue el flujo de la página, sin alto fijo", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openApp(page);
  // Los 100 pasos, uno tras otro en la página: ni la lista ni la ventana se desplazan por dentro
  expect(await page.locator(".steps-win").evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(844);
  expect(await page.locator(".diary-list").evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  await ctx.close();
});

// Solo a 1440×900: en pantallas más bajas el tope de 240 px deja la barra de pasos al
// principio bajo el pie del detalle, y la primera misión se ve al desplazarlo
for (const [w, h] of SIZES.slice(0, 1)) {
  test(`a ${w}×${h}, con la ventana a la vista se lee la primera misión sobre la barra de pasos`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    await page.click('.diary-row[data-n="1"] .row-title');
    await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
    await align(page);
    // Solo el detalle se desplaza (el cuerpo no, por su lado) y las misiones empiezan sobre
    // la barra de pasos, pegada al pie: el 1, con su objetivo largo y tres objetos, ya deja
    // ver la primera
    expect(await page.locator("#journal .journal-body").evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    const ctaTop = await page.locator("#journal .journal-cta").evaluate(el => el.getBoundingClientRect().top);
    const first = await page.locator("#journal .q-item").first().evaluate(e => e.getBoundingClientRect().bottom);
    expect(first).toBeLessThanOrEqual(ctaTop + 0.5);
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
  });
}

test("a 1440×900, al final de la página, deshacer la última misión la abre y alarga la ventana sin mover la misión ni la página ni encoger la lista", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  // El 92: su última misión, «Los tótems de Maimane», para en el paso y se despliega
  await page.locator('.diary-row[data-n="92"] .row-num').evaluate(el => el.click());
  await expect(page.locator("#journal .journal-num")).toHaveText("92");
  await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  // Hecha, plegada: deshacerla la vuelve a abrir
  await page.locator("#journal .q-item.is-expandable .q-check").last().evaluate(el => el.click());
  await expect(page.locator("#journal .q-item").last().locator(".obj-list")).toHaveCount(0);
  await page.waitForTimeout(300);
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(100);
  const snap = () => page.evaluate(() => ({
    win: document.querySelector(".diary-window").getBoundingClientRect().height,
    side: document.querySelector(".diary-side").getBoundingClientRect().height,
    sum: [...document.querySelectorAll("#journal .q-item.is-expandable .q-check")].at(-1).getBoundingClientRect().top,
    y: scrollY,
  }));
  const before = await snap();
  // Sin Playwright, que desplazaría la página para dejar a la vista lo que pulsa
  await page.locator("#journal .q-item.is-expandable .q-check").last().evaluate(el => el.click());
  await expect(page.locator("#journal .q-item").last().locator(".obj-list").first()).toBeVisible();
  await page.waitForTimeout(600);
  const after = await snap();
  const msg = JSON.stringify({ before, after });
  expect(Math.abs(after.side - before.side), msg).toBeLessThanOrEqual(1);
  expect(Math.abs(after.sum - before.sum), msg).toBeLessThanOrEqual(1);
  expect(Math.abs(after.y - before.y), msg).toBeLessThanOrEqual(1);
  // Lo que crece es el detalle y, con él, la ventana
  expect(after.win).toBeGreaterThan(before.win);
});
