import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * Una sola regla para toda la app (lib/screen.js): en una pantalla alta (escritorio de
 * más de 900 px de ancho y 900 o más de alto) va todo como antes de la versión
 * compacta (el hero, la nota de las pausas en la página, los avisos del paso en bloques,
 * el estandarte grande y «Necesitas» antes de las misiones); en una baja, la versión
 * compacta (sin hero, la nota en un diálogo, fichas, el distintivo y las misiones
 * primero). La barra de la ventana: en alta, la franja de los Dofus del camino sobre una
 * fila de herramientas; en baja, una sola fila.
 */

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const open41 = async page => {
  await openApp(page, { "silvestre:done": upTo(40) });
  await page.locator('.diary-row[data-n="41"] .row-num').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("41");
  await expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });
};
/** Las secciones del detalle, de arriba abajo. */
const sections = page => page.locator("#journal").evaluate(j => [...j.querySelectorAll(".journal-needs, .journal-quests")]
  .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top).map(el => el.className));

for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  test(`a ${w}×${h} (pantalla alta) todo va como antes, con la barra en dos filas`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open41(page);
    // El hero: el fondo a todo el ancho, su contenido junto y centrado como antes (1320 px)
    const hero = await page.locator(".hero").boundingBox();
    const inner = await page.locator(".hero-inner").boundingBox();
    expect(hero.width).toBe(w);
    expect(inner.width).toBeLessThanOrEqual(1320);
    expect(Math.abs(inner.x - (w - inner.x - inner.width))).toBeLessThanOrEqual(2);
    // La nota de las pausas, en la página, entre el hero y la ventana, sin diálogo
    const nota = page.locator(".wrap > #nota");
    await expect(nota).toBeVisible();
    await expect(page.locator("#notaDialog")).toHaveCount(0);
    const [n, win] = [await nota.boundingBox(), await page.locator(".steps-win").boundingBox()];
    expect(n.y).toBeGreaterThan(hero.y + hero.height - 1);
    expect(n.y + n.height).toBeLessThanOrEqual(win.y);
    // Los avisos del paso, en bloques con su texto entero, sin fichas
    await expect(page.locator("#journal .call-head")).toHaveCount(0);
    await expect(page.locator("#journal .goal-calls .call.tip")).toBeVisible();
    await expect(page.locator("#journal .goal-calls .call.tip")).toContainText("Selocalipsis: Resonancia");
    await expect(page.locator('#journal .goal-calls .call.tip .step-ref[data-n="93"]')).toBeVisible();
    await expect(page.locator("#journal .goal-guide-label")).toHaveText("Texto de la guía");
    // El estandarte grande, sin distintivo
    await expect(page.locator("#journal .journal-top .journal-banner")).toBeVisible();
    await expect(page.locator("#journal .journal-badge")).toHaveCount(0);
    // «Necesitas» antes que las misiones
    expect(await sections(page)).toEqual(["journal-needs", "journal-quests"]);
    // La barra en dos filas: la franja de los Dofus (los 12 a la vista, el progreso y
    // «Siguiente») y la de herramientas, con el buscador entero, la zona, el overlay y el menú
    const strip = page.locator("#winBar > #winRoad.win-strip");
    await expect(strip.locator(".road-dofus")).toHaveCount(12);
    for (const egg of await strip.locator(".road-dofus").all()) await expect(egg).toBeVisible();
    await expect(strip.locator("#winPct")).toBeVisible();
    await expect(strip.locator("#winFill")).toBeVisible();
    await expect(strip.locator("#diaryNext")).toContainText("Siguiente: 41");
    await expect(page.locator("#roadBtn, #winProgress")).toHaveCount(0);
    const s = await strip.boundingBox();
    const tools = await page.locator("#winBar > .win-bar-in").boundingBox();
    expect(tools.y).toBeGreaterThanOrEqual(s.y + s.height - 1);
    for (const sel of ['[role="tablist"]', "#searchInput", "#zoneBtn", "#overlayBtn", "#moreBtn"]) {
      const b = await page.locator(sel).boundingBox();
      expect(b.y, sel).toBeGreaterThanOrEqual(tools.y - 0.5);
      expect(b.y + b.height, sel).toBeLessThanOrEqual(tools.y + tools.height + 0.5);
    }
    expect(tools.height).toBeLessThanOrEqual(64);
    // El buscador, entero y con su pista, sin necesidad de pulsarlo
    expect((await page.locator(".diary-search").boundingBox()).width).toBeGreaterThan(200);
  });
}

for (const [w, h] of [[1280, 720], [1279, 804]]) {
  test(`a ${w}×${h} (pantalla baja) va la versión compacta`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await open41(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    // La nota, solo en su diálogo
    await expect(page.locator(".wrap > #nota")).toHaveCount(0);
    await expect(page.locator("#notaDialog")).toHaveCount(1);
    await expect(page.locator("#nota")).toBeHidden();
    // Fichas y distintivo
    await expect(page.locator("#journal .call.tip .call-head")).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#journal .journal-badge")).toBeVisible();
    await expect(page.locator("#journal .journal-top .journal-banner")).toBeHidden();
    await expect(page.locator("#journal .goal-guide-label")).toHaveText("Qué hacer");
    // Las misiones antes que «Necesitas»
    expect(await sections(page)).toEqual(["journal-quests", "journal-needs"]);
    // La barra en una fila, con el «3/12» compacto y la lupa
    await expect(page.locator("#winBar .win-strip")).toHaveCount(0);
    const bar = await page.locator("#winBar").boundingBox();
    expect(bar.height).toBeLessThanOrEqual(64);
    await expect(page.locator("#roadBtn .road-count")).toHaveText("3/12");
    expect((await page.locator(".diary-search").boundingBox()).width).toBeLessThanOrEqual(44);
  });
}

test("en pantalla alta, «Qué es hasta tener que pasar» del menú lleva a la nota de la página", async ({ page }) => {
  await openApp(page);
  await page.locator("#diary").evaluate(el => el.scrollIntoView({ block: "start", behavior: "instant" }));
  await page.click("#moreBtn");
  await page.click("#notaOpen");
  await expect(page.locator("#nota")).toBeInViewport();
  await expect(page.locator("#notaDialog")).toHaveCount(0);
});

test("al redimensionar entre 1440×900 y 1280×720 se pasa de una versión a la otra y se vuelve", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await open41(page);
  await expect(page.locator(".hero")).toHaveCount(1);
  await expect(page.locator("#journal .call-head")).toHaveCount(0);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator(".hero")).toHaveCount(0);
  await expect(page.locator(".wrap > #nota")).toHaveCount(0);
  await expect(page.locator("#journal .call.tip .call-head")).toBeVisible();
  await expect(page.locator("#journal .journal-badge")).toBeVisible();
  expect(await sections(page)).toEqual(["journal-quests", "journal-needs"]);
  await expect(page.locator("#winBar")).toBeInViewport();
  await expect(page.locator("#winBar .win-strip")).toHaveCount(0);
  await expect(page.locator("#roadBtn")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator("#winBar .win-strip .road-dofus")).toHaveCount(12);
  await expect(page.locator("#roadBtn")).toHaveCount(0);
  await expect(page.locator(".hero")).toHaveCount(1);
  await expect(page.locator(".wrap > #nota")).toBeVisible();
  await expect(page.locator("#journal .call-head")).toHaveCount(0);
  await expect(page.locator("#journal .journal-top .journal-banner")).toBeVisible();
  expect(await sections(page)).toEqual(["journal-needs", "journal-quests"]);
});

test("a 1920×1080 la ventana de pasos va algo más ancha que el hero, con tope de 1440 px", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page);
  const win = (await page.locator("#diary").boundingBox()).width;
  expect(win).toBeGreaterThan(1360);
  expect(win).toBeLessThanOrEqual(1440);
  // Centrada en la pantalla
  const x = (await page.locator("#diary").boundingBox()).x;
  expect(Math.abs(x - (1920 - x - win))).toBeLessThanOrEqual(2);
});
