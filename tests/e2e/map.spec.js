import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const node = (page, n) => page.locator(`.map-node[data-n="${n}"]`);

async function openMap(page, seed) {
  await openApp(page, seed);
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(100);
}

test("el mapa recorre los 100 pasos y la elección se recuerda", async ({ page }) => {
  await openMap(page, { "silvestre:done": range(1, 32) });
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".diary-window")).toHaveCount(0);
  await expect(page.locator(".map-node.done")).toHaveCount(32);
  await expect(node(page, 33)).toHaveClass(/current/);
  // Los 12 Dofus del camino son hitos con su huevo; el Ocre en el 79 y la Piñata en el 99
  await expect(page.locator(".map-node .node-egg")).toHaveCount(12);
  await expect(node(page, 99).locator(".node-egg")).toHaveAttribute("src", /items\/23035\.png$/);
  await expect(node(page, 79).locator(".node-egg")).toHaveAttribute("src", /items\/23012\.png$/);
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
});

test("al elegir un paso sale su ficha con la parada y lo que cierra", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  const card = page.locator("#mapCard");
  await expect(card.locator(".map-card-title")).toContainText("34");
  // El 34 se resuelve solo: no hay dónde parar, solo lo que cierra
  await expect(card).not.toContainText("Hasta tener que pasar Lasoberaña");
  await expect(card).toContainText("Cierra también el 33");
  // Un arco une el paso con el que cierra
  await expect(page.locator(".map-arc")).toHaveCount(1);
  await card.locator(".map-card-done").click();
  await expect(node(page, 34)).toHaveClass(/done/);
  // Un paso que se queda a medias sí dice hasta dónde llegar
  await node(page, 33).click();
  await expect(card).toContainText("Hasta tener que pasar Lasoberaña");
});

test("«Abrir en el diario» cambia de vista con ese paso abierto", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  await page.click("#mapCard .map-card-open");
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
});

test("los pasos cuyo combate cierra otros llevan la insignia de su jefe", async ({ page }) => {
  await openMap(page);
  await expect(node(page, 34).locator(".node-boss")).toHaveCount(1);
  await expect(node(page, 33).locator(".node-boss")).toHaveCount(0);
});

test("los sellos y la búsqueda apagan en el mapa lo que no coincide", async ({ page }) => {
  await openMap(page);
  await page.click("#zoneBtn");
  await page.click('#zoneSeals .seal[data-zone="Astrub"]');
  await expect(page.locator(".map-node.dimmed")).toHaveCount(98);
  await page.click("#zoneBtn");
  await page.locator("#zoneSeals .seal").first().click();
  await expect(page.locator(".map-node.dimmed")).toHaveCount(0);
});

test("en el tema claro el mapa tiene fondo claro", async ({ page }) => {
  await openMap(page, { "silvestre:theme": "light" });
  const lum = sel => page.locator(sel).evaluate(el => {
    const [r, g, b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  await expect.poll(() => lum(".step-map")).toBeGreaterThan(0.75);
  // El paisaje de fondo se aclara en vez de oscurecerse
  const filter = await page.locator(".step-map-bg").evaluate(el => getComputedStyle(el).filter);
  expect(Number(filter.match(/brightness\(([\d.]+)\)/)[1])).toBeGreaterThanOrEqual(1);
});

test("la ficha nunca tapa el paso anterior ni el siguiente", async ({ page }) => {
  await openMap(page);
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  // 24 y 12 giran el camino hacia abajo; 30 está en medio de una fila; 100 es el último
  for (const n of [24, 12, 30, 37, 100]) {
    await node(page, n).click();
    const card = await page.locator("#mapCard").boundingBox();
    for (const m of [n - 1, n + 1].filter(m => m >= 1 && m <= 100)) {
      expect(overlaps(card, await node(page, m).boundingBox()), `paso ${n}: la ficha tapa el ${m}`).toBe(false);
    }
  }
  // Y se puede seguir al siguiente con un clic
  await node(page, 24).click();
  await node(page, 25).click();
  await expect(page.locator("#mapCard .map-card-title")).toContainText("25");
});

test("la ficha del mapa usa los mismos iconos que los avisos", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  // Se resuelve en el mismo paso: sin «hasta dónde llegar»; lo que cierra, con su jefe
  await expect(page.locator("#mapCard .map-card-line.stop")).toHaveCount(0);
  await expect(page.locator("#mapCard .map-card-line.done img")).toHaveAttribute("src", /monsters\/1267\.png$/);
  await node(page, 77).click();
  await expect(page.locator("#mapCard .map-card-line.stop img")).toHaveAttribute("src", /items\/84228\.png$/);
  await expect(page.locator("#mapCard")).not.toContainText("⛔");
});

test("desde el detalle del diario se vuelve al mapa con ese paso abierto", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await page.click("#journal .journal-to-map");
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#mapCard .map-card-title")).toContainText("34");
  await expect(node(page, 34)).toBeInViewport();
});

test("al volver al mapa con un paso lejano, lo desplaza hasta dejarlo a la vista", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.evaluate(() => document.getElementById("diary").scrollIntoView());
  await page.click('.diary-row[data-n="97"] .row-main');
  await page.click("#journal .journal-to-map");
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  await expect(node(page, 97)).toBeInViewport({ timeout: 3000 });
});

test("sin nada guardado, los pasos se abren en el mapa y el selector va primero", async ({ page }) => {
  await openApp(page, null, { view: null });
  await expect(page.locator(".map-node")).toHaveCount(100);
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  const order = await page.locator(".steps-view [role=tab]").evaluateAll(bs => bs.map(b => b.id));
  expect(order).toEqual(["stepsViewMap", "stepsViewDiary"]);
});

test("nada sobresale recortado: ni el Dofus del primer paso ni el marcador de zona", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, null, { view: null });
  await page.waitForTimeout(800);
  // Lo que asoma por arriba (huevo, halo del paso actual, marcador) cabe en su contenedor
  const room = (inner, outer) => page.evaluate(([i, o]) =>
    Math.round(document.querySelector(i).getBoundingClientRect().top - document.querySelector(o).getBoundingClientRect().top), [inner, outer]);
  expect(await room('.map-node[data-n="1"] .node-egg', ".step-map")).toBeGreaterThanOrEqual(6);
  await page.click("#zoneBtn");
  await page.locator(".seal.here").hover();
  await page.waitForTimeout(300);
  expect(await room(".seal.here .seal-pin", "#zoneSeals")).toBeGreaterThanOrEqual(2);
});

test("la ficha del mapa se cierra al pulsar fuera o con Escape; otro paso la cambia", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, null, { view: null });
  await page.waitForTimeout(500);
  await node(page, 34).click();
  await expect(page.locator("#mapCard")).toBeVisible();
  // Dentro de la ficha no se cierra
  await page.locator("#mapCard .map-card-title").click();
  await expect(page.locator("#mapCard")).toBeVisible();
  // Otro paso: la ficha pasa a ese paso
  await node(page, 35).click();
  await expect(page.locator("#mapCard .map-card-title")).toContainText("35");
  // Fuera: se cierra
  await page.locator("#diaryTitle").click();
  await expect(page.locator("#mapCard")).toHaveCount(0);
  await node(page, 34).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mapCard")).toHaveCount(0);
});
