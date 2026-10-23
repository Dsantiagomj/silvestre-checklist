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
    await page.evaluate(() => scrollBy({ top: 150, behavior: "instant" }));
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y0 + 100);
    await page.waitForTimeout(100);
    await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
    // La lista sigue entera a la vista (pegada bajo la barra de la ventana, que tampoco se va)
    await expect(page.locator("#winBar")).toBeInViewport({ ratio: 1 });
    const r = await page.evaluate(() => ({
      bar: document.getElementById("winBar").getBoundingClientRect().bottom,
      side: document.querySelector(".diary-side").getBoundingClientRect(),
    }));
    expect(r.side.top).toBeGreaterThanOrEqual(r.bar - 1.5);
    expect(r.side.bottom).toBeLessThanOrEqual(h + 0.5);

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
