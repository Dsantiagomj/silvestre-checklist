import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * En el diario solo hay dos desplazamientos: la lista de pasos, por dentro, y la página.
 * El detalle del paso no se desplaza nunca por su lado: mide lo que su contenido y, si es
 * más alto que la pantalla, se lee bajando la página. La columna de la lista se queda
 * pegada bajo la barra de la ventana y la barra de acciones del paso, al pie de la pantalla.
 */

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));

/** El detalle no tiene desplazamiento propio: ni lo que sobra ni overflow que lo permita. */
const detailScroll = page => page.locator(".diary-detail").evaluate(el => ({
  extra: el.scrollHeight - el.clientHeight,
  overflowY: getComputedStyle(el).overflowY,
}));

const align = page => page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));

// A 1920×1080 el 41 casi cabe: el 1, con sus 16 misiones, no
for (const [w, h, n] of [[1280, 720, 41], [1920, 1080, 1]]) {
  test(`a ${w}×${h}, en un paso largo (el ${n}) el detalle no se desplaza por dentro: se baja la página`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, { "silvestre:done": upTo(40) });
    await page.locator(`.diary-row[data-n="${n}"] .row-num`).click();
    await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
    await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
    await page.waitForLoadState("networkidle");
    await align(page);
    await page.waitForTimeout(200);

    const d = await detailScroll(page);
    expect(d.extra, JSON.stringify(d)).toBeLessThanOrEqual(1);
    expect(["auto", "scroll"]).not.toContain(d.overflowY);

    // El paso no cabe en la pantalla: la página es la que baja
    const detailBottom = await page.locator(".diary-detail").evaluate(el => el.getBoundingClientRect().bottom);
    expect(detailBottom).toBeGreaterThan(h);
    // La barra de acciones del paso, siempre a mano al pie de la pantalla
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });

    const y0 = await page.evaluate(() => scrollY);
    const side0 = await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().height);
    await page.evaluate(() => scrollBy({ top: 150, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 100);
    await page.waitForTimeout(100);
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
    // La barra de la ventana se queda; la lista, con su alto entero, pegada bajo ella o, al
    // final de la ventana, yéndose con ella (nunca encoge)
    await expect(page.locator("#winBar")).toBeInViewport({ ratio: 1 });
    const r = await page.evaluate(() => ({
      bar: document.getElementById("winBar").getBoundingClientRect().bottom,
      side: document.querySelector(".diary-side").getBoundingClientRect(),
      win: document.querySelector(".diary-window").getBoundingClientRect().bottom,
    }));
    expect(Math.abs(r.side.height - side0), JSON.stringify(r)).toBeLessThanOrEqual(1);
    expect(r.side.bottom).toBeLessThanOrEqual(h + 0.5);
    expect(Math.abs(r.side.top - r.bar) <= 1.5 || Math.abs(r.side.bottom - r.win) <= 1.5, JSON.stringify(r)).toBe(true);

    // La lista, en cambio, se desplaza por dentro sin mover la página
    const y1 = await page.evaluate(() => scrollY);
    const moved = await page.locator(".diary-list").evaluate(el => { el.scrollTo(0, el.scrollHeight); return el.scrollTop; });
    expect(moved).toBeGreaterThan(0);
    expect(await page.evaluate(() => scrollY)).toBe(y1);

    // Al final de la página, la barra de acciones vuelve a ir tras el contenido del paso
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(100);
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
    expect((await detailScroll(page)).extra).toBeLessThanOrEqual(1);
  });
}

test("cambiar de paso desde el final de un paso largo sube la página hasta el principio del detalle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page, { "silvestre:done": upTo(40) });
  await page.locator('.diary-row[data-n="41"] .row-num').click();
  await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(150);
  await page.locator("#nextBtn").evaluate(el => el.click());
  await expect(page.locator("#journal .journal-num")).toHaveText("42");
  await page.waitForTimeout(150);
  // La cabecera del paso, entera a la vista, justo bajo la barra de la ventana
  await expect(page.locator("#journal .journal-top")).toBeInViewport({ ratio: 1 });
  const r = await page.evaluate(() => ({
    bar: document.getElementById("winBar").getBoundingClientRect().bottom,
    detail: document.querySelector(".diary-detail").getBoundingClientRect().top,
  }));
  expect(r.detail).toBeGreaterThanOrEqual(r.bar - 1.5);
  expect(r.detail).toBeLessThanOrEqual(r.bar + 2);
});

test("cambiar de paso con el principio del detalle a la vista no mueve la página", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page, { "silvestre:done": upTo(40) });
  await page.waitForLoadState("networkidle");
  await align(page);
  await page.waitForTimeout(150);
  const y = await page.evaluate(() => scrollY);
  await page.locator('.diary-row[data-n="45"] .row-num').evaluate(el => el.click());
  await expect(page.locator("#journal .journal-num")).toHaveText("45");
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

/**
 * El alto que queda bajo la cabecera de la página (--silvestre-top), con los 8 px de aire
 * de arriba y de abajo de la sección; la sección del diario, la ventana y la lista.
 */
const diaryHeights = root => {
  const diary = root.getElementById("diary");
  const cs = getComputedStyle(diary);
  const top = parseFloat(cs.getPropertyValue("--silvestre-top")) || 0;
  const winbar = parseFloat(getComputedStyle(root.querySelector(".diary-window")).getPropertyValue("--winbar-h")) || 0;
  return {
    avail: innerHeight - top - 16, section: diary.getBoundingClientRect().height,
    win: root.querySelector(".steps-win").getBoundingClientRect().bottom - diary.getBoundingClientRect().top,
    side: root.querySelector(".diary-side").getBoundingClientRect().height, sideWant: innerHeight - top - winbar - 18,
    // Hasta dónde llega el detalle, respecto al final de la ventana: la llena, sin hueco debajo
    detailGap: root.querySelector(".steps-win").getBoundingClientRect().bottom - root.querySelector(".diary-detail").getBoundingClientRect().bottom,
    page: document.documentElement.scrollHeight, vh: innerHeight,
    // Lo que piden los prerrequisitos enteros (Diary.jsx): la ventana nunca mide menos
    need: parseFloat(cs.getPropertyValue("--win-need")) || 0,
  };
};

test("a 1440×900, en un paso corto el diario mide 1,3 veces el alto disponible (o lo que piden los prerrequisitos) y la lista sigue cabiendo en la pantalla", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, { "silvestre:done": upTo(3) });
  // El 4: una sola misión
  await page.locator('.diary-row[data-n="4"] .row-num').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
  await align(page);
  await page.waitForTimeout(200);
  const m = await page.evaluate(`(${diaryHeights})(document)`);
  const msg = JSON.stringify(m);
  // La sección y la ventana, más altas que la pantalla: 1,3 veces, o lo que piden los
  // prerrequisitos si es más. La página baja
  expect(m.need, msg).toBeGreaterThan(0);
  expect(Math.abs(m.section - Math.max(1.3 * m.avail, m.need)), msg).toBeLessThanOrEqual(2);
  expect(Math.abs(m.win - m.section), msg).toBeLessThanOrEqual(2);
  expect(m.page, msg).toBeGreaterThan(m.vh);
  expect(m.detailGap, msg).toBeLessThanOrEqual(3);
  // La lista, como antes: lo que queda de pantalla bajo la barra de la ventana
  expect(Math.abs(m.side - m.sideWant), msg).toBeLessThanOrEqual(1);
  const side = await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().bottom);
  expect(side, msg).toBeLessThanOrEqual(m.vh + 0.5);
  // Al bajar, la lista no encoge: al final de la ventana se va con ella, entera
  await page.evaluate(() => scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await page.waitForTimeout(150);
  expect(Math.abs((await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().height)) - m.side)).toBeLessThanOrEqual(1);
});
