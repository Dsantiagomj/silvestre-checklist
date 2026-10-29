import { test, expect } from "@playwright/test";
import { openApp, siteHeaderBottom } from "./helpers.js";

// La barra de una fila es la de las pantallas bajas (lib/screen.js); en las altas va la
// franja de los Dofus encima (screens.spec.js)
test.use({ viewport: { width: 1280, height: 720 } });

/**
 * La ventana de los pasos lleva arriba una sola fila de herramientas: el progreso, los
 * Dofus del camino, «Siguiente», las pestañas, el buscador, la zona, el overlay y el
 * menú «⋯» con el tema y el reinicio. Ya no hay cabecera de la app; el hero solo va
 * encima en pantallas altas.
 */

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const box = (page, sel) => page.locator(sel).first().evaluate(el => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
});

test("en pantallas bajas, una sola fila de herramientas, sin cabecera de la app ni hero", async ({ page }) => {
  // Con 900 px de alto o más va el hero encima (hero.spec.js)
  await page.setViewportSize({ width: 1440, height: 860 });
  await openApp(page);
  await expect(page.locator("#root header")).toHaveCount(0);
  await expect(page.locator(".hero, #heroNext, .title-bar")).toHaveCount(0);
  // El nombre de la página sigue para los lectores de pantalla
  await expect(page.locator("h1")).toHaveText("Checklist del Dofus Silvestre");
  const bar = await box(page, "#winBar");
  expect(bar.height).toBeLessThanOrEqual(64);
  // Todo en la misma fila, dentro de la barra
  for (const sel of ["#winProgress", "#roadBtn", "#diaryNext", '[role="tablist"]', "#searchInput", "#zoneBtn", "#overlayBtn", "#moreBtn"]) {
    const b = await box(page, sel);
    expect(b.top, sel).toBeGreaterThanOrEqual(bar.top - 0.5);
    expect(b.bottom, sel).toBeLessThanOrEqual(bar.bottom + 0.5);
  }
  await expect(page.locator("#overlayBtn")).toBeVisible();
  await expect(page.locator("#overlayBtn")).toHaveAttribute("aria-label", "Abrir overlay sobre el juego");
  // La ventana arranca arriba de la página, bajo la cabecera del sitio: lo primero que se ve es la lista
  expect((await box(page, ".steps-win")).top).toBeLessThan(await siteHeaderBottom(page) + 40);
  await expect(page.locator('.diary-row[data-n="1"]')).toBeInViewport();
});

test("a 1280×720 también cabe en una fila", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  const bar = await box(page, "#winBar");
  expect(bar.height).toBeLessThanOrEqual(64);
  for (const sel of ["#winProgress", "#moreBtn", "#zoneBtn"]) {
    const b = await box(page, sel);
    expect(b.bottom, sel).toBeLessThanOrEqual(bar.bottom + 0.5);
  }
});

test("el menú ⋯ lleva el reinicio y la nota, y el tema va en la cabecera del sitio", async ({ page }) => {
  await openApp(page);
  const more = page.locator("#moreBtn");
  await expect(more).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#moreMenu")).toHaveCount(0);
  await more.click();
  await expect(more).toHaveAttribute("aria-expanded", "true");
  const menu = page.locator("#moreMenu");
  await expect(menu).toBeVisible();
  await expect(menu).not.toContainText("Tema");
  await expect(menu.locator("#themeBtn")).toHaveCount(0);
  await expect(menu.locator("#notaOpen")).toBeVisible();
  await expect(menu.locator("#resetBtn")).toContainText("Reiniciar");
  // Reiniciar abre el diálogo de siempre y cierra el menú
  await menu.locator("#resetBtn").click();
  await expect(page.locator("#resetDialog")).toBeVisible();
  await expect(page.locator("#moreMenu")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.locator("#resetDialog")).toBeHidden();
  // Escape y un clic fuera lo cierran
  await more.click();
  await expect(page.locator("#moreMenu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#moreMenu")).toHaveCount(0);
  await more.click();
  await page.mouse.click(5, 600);
  await expect(page.locator("#moreMenu")).toHaveCount(0);
});

test("los Dofus del camino se resumen en la barra y se despliegan enteros", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(17) });
  const btn = page.locator("#roadBtn");
  await expect(btn.locator(".road-count")).toHaveText("1/12");
  expect(await btn.locator(".road-mini").count()).toBe(3);
  await expect(btn.locator('.road-mini.obtained[data-step="1"]')).toHaveCount(1);
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  const pop = page.locator("#winRoad");
  await expect(pop).toBeVisible();
  await expect(pop.locator(".road-title")).toHaveText("Dofus del camino");
  await expect(pop.locator(".road-dofus")).toHaveCount(12);
  await expect(pop.locator(".road-dofus.obtained")).toHaveCount(1);
  // Pulsar un huevo abre su paso y cierra el desplegable
  await pop.locator('.road-dofus[data-step="18"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("18");
  await expect(page.locator("#winRoad")).toHaveCount(0);
  await btn.click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#winRoad")).toHaveCount(0);
  // Escape cierra el desplegable, no el paso abierto
  await expect(page.locator("#journal")).toHaveCount(1);
});

test("el buscador es una lupa que se despliega al usarla", async ({ page }) => {
  await openApp(page);
  const input = page.locator("#searchInput");
  const width = () => page.locator(".diary-search").evaluate(el => el.getBoundingClientRect().width);
  await expect.poll(width).toBeLessThanOrEqual(44);
  await expect(input).toHaveAttribute("aria-label", "Buscar paso");
  // Con el teclado: va justo después de las pestañas y el foco la despliega
  await page.locator("#stepsViewDiary").focus();
  await page.keyboard.press("Tab");
  await expect(input).toBeFocused();
  await expect.poll(width).toBeGreaterThan(160);
  await page.keyboard.type("Frigost");
  await expect(page.locator("#searchMatches")).toBeVisible();
  expect(await page.locator(".diary-row").count()).toBeLessThan(100);
  // Con algo escrito sigue desplegada aunque se vaya el foco
  await page.locator('.diary-row .row-main').first().focus();
  await expect.poll(width).toBeGreaterThan(160);
  // Vacía y sin foco se vuelve a plegar
  await page.click("#searchClear");
  await page.locator('.diary-row .row-main').first().focus();
  await expect.poll(width).toBeLessThanOrEqual(44);
  // Con el ratón, un clic en la lupa la despliega con el foco dentro
  await page.locator(".diary-search").click();
  await expect(input).toBeFocused();
  await expect.poll(width).toBeGreaterThan(160);
});

test("el progreso compacto: anillo, porcentaje, pasos y la nota del ponderado", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true, 3: true } });
  const pct = parseFloat(await page.locator("#winPct").innerText());
  expect(pct).toBeGreaterThan(0);
  expect(await page.locator(".win-ring").evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue("--p")))).toBeCloseTo(pct, 1);
  await expect(page.locator("#winDone")).toHaveText("3");
  await expect(page.locator("#winProgress")).toContainText("/100 pasos");
  // El Silvestre, apagado hasta el final
  await expect(page.locator(".win-ring")).toHaveAttribute("data-stage", "off");
  const info = page.locator("#pctInfo");
  await expect(info).toHaveAttribute("aria-describedby", "pctNote");
  await expect(page.locator("#pctNote")).toBeHidden();
  await info.hover();
  await expect(page.locator("#pctNote")).toBeVisible();
  await expect(page.locator("#pctNote")).toHaveText("No todos los pasos valen lo mismo: cuentan más los que tienen misiones de más nivel y más largas.");
  // La nota no se sale de la pantalla ni queda bajo la barra
  const note = await box(page, "#pctNote");
  expect(note.left).toBeGreaterThanOrEqual(0);
  expect(note.top).toBeGreaterThanOrEqual(0);
});

test("en el anillo, el huevo sigue la guía: la Piñata con el 99 y el Silvestre obtenido con el 100", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(99) });
  await expect(page.locator(".win-ring")).toHaveAttribute("data-stage", "pinata");
  await page.locator('.diary-row[data-n="100"] .row-check').click();
  await expect(page.locator(".win-ring")).toHaveAttribute("data-stage", "silvestre");
  await expect(page.locator("#winPct")).toHaveText("100%");
  await expect(page.locator("#winProgress")).toHaveClass(/obtained/);
  await expect(page.locator("#winProgress")).toContainText("¡Obtenido!");
  await expect(page.locator("#diaryNext")).toBeDisabled();
});

test("«Siguiente» de la barra abre el siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(40) });
  await expect(page.locator("#diaryNext")).toContainText("Siguiente: 41");
  await page.click('.diary-row[data-n="3"] .row-num');
  await page.click("#diaryNext");
  await expect(page.locator("#journal .journal-num")).toHaveText("41");
});

test("en móvil la barra cabe, se queda arriba al bajar y lleva el menú ⋯", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  await openApp(page);
  // Nada se sale de lado
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  const bar = await box(page, "#winBar");
  expect(bar.height).toBeLessThanOrEqual(120);
  for (const sel of ["#winProgress", "#roadBtn", "#diaryNext", "#moreBtn", "#zoneBtn", ".diary-search"]) {
    const b = await box(page, sel);
    expect(b.right, sel).toBeLessThanOrEqual(390.5);
    expect(b.left, sel).toBeGreaterThanOrEqual(-0.5);
  }
  // Al bajar por los 100 pasos la barra se queda pegada arriba
  await page.evaluate(() => window.scrollTo(0, 2500));
  await expect.poll(() => box(page, "#winBar").then(b => Math.round(b.top))).toBe(0);
  await page.locator("#moreBtn").tap();
  await expect(page.locator("#moreMenu #resetBtn")).toBeVisible();
  await ctx.close();
});

test("con movimiento reducido, los desplegables de la barra se abren sin animación", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page);
  await page.click("#roadBtn");
  expect(await page.locator("#winRoad").evaluate(el => el.getAnimations().length)).toBe(0);
  await page.click("#moreBtn");
  expect(await page.locator("#moreMenu").evaluate(el => el.getAnimations().length)).toBe(0);
});
