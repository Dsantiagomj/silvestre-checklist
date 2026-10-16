import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * En escritorio la ventana de los 100 pasos nunca es más alta que la pantalla: su
 * cabecera (los Dofus del camino, las pestañas y el buscador) queda fija y lo que no
 * cabe se desplaza por dentro, en el mapa o en las listas. El diario es la excepción:
 * el detalle del paso crece con sus misiones y se desplaza la página, con la lista de
 * pasos y la barra de pasos pegadas a la pantalla.
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

/** Dónde quedan la cabecera de la página, la sección y la ventana. */
const boxes = page => page.evaluate(() => {
  const r = el => el.getBoundingClientRect();
  return {
    header: r(document.querySelector("header")).bottom,
    section: r(document.getElementById("diary")).top,
    win: r(document.querySelector(".steps-win")),
    vh: innerHeight,
  };
});

/** La ventana entera a la vista, bajo la cabecera de la página. */
const fits = b => b.section >= b.header - 0.5 && b.win.top >= b.header - 0.5 && b.win.bottom <= b.vh + 0.5;

/**
 * En el diario: la ventana empieza bajo la cabecera y la cabecera del paso (estandarte y
 * objetivo) se ve entera. La barra de pasos puede quedar más abajo: no sube sobre ella.
 */
const fitsDiary = page => page.evaluate(() => {
  const header = document.querySelector("header").getBoundingClientRect().bottom;
  const win = document.querySelector(".steps-win").getBoundingClientRect();
  const top = document.querySelector("#journal .journal-top")?.getBoundingClientRect();
  return win.top >= header - 0.5 && !!top && top.top >= header - 0.5 && top.bottom <= innerHeight + 0.5;
});

for (const [w, h] of SIZES) {
  for (const view of VIEWS.filter(v => v !== "diary")) {
    test(`a ${w}×${h}, la ventana de pasos cabe en la pantalla con la pestaña «${view}»`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await openApp(page, null, { view });
      await align(page);
      await page.waitForTimeout(150);
      const b = await boxes(page);
      expect(b.win.height).toBeLessThanOrEqual(h - b.header);
      expect(fits(b), JSON.stringify(b)).toBe(true);
      // Ya alineada, no hace falta bajar la página para ver el final de la ventana
      expect(b.win.bottom).toBeLessThanOrEqual(h);
    });
  }
}

for (const [w, h] of SIZES) {
  test(`a ${w}×${h}, en el diario la ventana empieza bajo la cabecera y la cabecera del paso se ve sin bajar`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    await align(page);
    await page.waitForTimeout(150);
    const b = await boxes(page);
    expect(b.section).toBeGreaterThanOrEqual(b.header - 0.5);
    expect(await fitsDiary(page)).toBe(true);
    // La lista mide lo que la pantalla bajo la cabecera, no lo que el detalle
    const side = await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().height);
    expect(side).toBeLessThanOrEqual(h - b.header);
  });
}

test("la ventana tiene la misma altura en el mapa y las listas; en el diario, al menos esa", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page, null, { view: "map" });
  await align(page);
  const heights = {};
  for (const id of ["#stepsViewMap", "#stepsViewDiary", "#tabPrereqs", "#tabItems"]) {
    await page.click(id);
    await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
    await page.waitForTimeout(350);
    heights[id] = Math.round((await boxes(page)).win.height);
  }
  const { "#stepsViewDiary": diary, ...rest } = heights;
  expect(new Set(Object.values(rest)).size, JSON.stringify(heights)).toBe(1);
  expect(diary).toBeGreaterThanOrEqual(heights["#stepsViewMap"]);
});

// Lo que se desplaza en cada pestaña y lo que queda fijo encima
const SCROLL = {
  map: { scrollers: [".step-map-scroll"], fixed: [] },
  diary: { scrollers: [".diary-list"], fixed: [".diary-tabs", "#journal .journal-top", "#journal .journal-cta"] },
  prereqs: { scrollers: [".prereqs-panel"], fixed: [".needs-bar"] },
  items: { scrollers: [".items-body"], fixed: [".needs-toolbar"] },
};

for (const view of VIEWS) {
  test(`con «${view}», desplazar por dentro no mueve la cabecera de la ventana ni la página`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openApp(page, { "silvestre:done": Object.fromEntries([1, 2, 3].map(n => [n, true])) }, { view });
    if (view === "diary") {
      await page.click('.diary-row[data-n="1"] .row-main');
      await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
    }
    await align(page);
    await page.waitForTimeout(400);
    const { scrollers, fixed } = SCROLL[view];
    const watch = [".win-strip", ".win-tabs", ".win-tools", ...fixed];
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

test("«Siguiente» de la franja deja a la vista la ventana desde arriba y la cabecera del paso", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await page.click(".win-strip .diary-next");
  await expect.poll(() => fitsDiary(page), { timeout: 4000 }).toBe(true);
});

test("«Continuar» del hero deja a la vista la ventana desde arriba y la cabecera del paso", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.click("#heroNextGo");
  await expect.poll(() => fitsDiary(page), { timeout: 4000 }).toBe(true);
});

test("en el diario, la rueda sobre el detalle baja la página y la lista sigue a la vista", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  await align(page);
  await page.waitForTimeout(200);
  const y = await page.evaluate(() => scrollY);
  const box = await page.locator("#journal .journal-top").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 10);
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y + 100);
  expect(await page.locator("#journal .journal-body").evaluate(el => el.scrollTop)).toBe(0);
  await expect(page.locator(".diary-list")).toBeInViewport();
  await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
});

test("al volver al mapa, el paso se busca dentro del mapa y la página no se mueve", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await align(page);
  // Clics sin Playwright, que desplazaría la página para dejar a la vista lo que pulsa
  await page.locator('.diary-row[data-n="97"] .row-main').evaluate(el => el.click());
  await page.waitForTimeout(300);
  const y = await page.evaluate(() => scrollY);
  await page.locator("#journal .journal-to-map").evaluate(el => el.click());
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  await expect(page.locator('.map-node[data-n="97"]')).toBeInViewport({ timeout: 3000 });
  expect(await page.locator(".step-map-scroll").evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
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

for (const [w, h] of SIZES) {
  test(`a ${w}×${h}, con el detalle arriba se leen las misiones sin desplazar nada por dentro`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    await page.click('.diary-row[data-n="1"] .row-title');
    await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
    await align(page);
    await page.evaluate(() => {
      const header = document.querySelector("header").getBoundingClientRect().bottom;
      scrollBy(0, document.querySelector(".diary-detail").getBoundingClientRect().top - header);
    });
    // El cuerpo no se desplaza por dentro y las misiones empiezan sobre la barra de pasos,
    // que va pegada abajo: el 1, con su objetivo largo y tres objetos, ya deja ver la primera
    expect(await page.locator("#journal .journal-body").evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
    const ctaTop = await page.locator("#journal .journal-cta").evaluate(el => el.getBoundingClientRect().top);
    const first = await page.locator("#journal .q-item").first().evaluate(e => e.getBoundingClientRect().bottom);
    expect(first).toBeLessThanOrEqual(ctaTop + 0.5);
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
  });
}
