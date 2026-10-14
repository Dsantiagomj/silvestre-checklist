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
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".diary-window")).toHaveCount(0);
  await expect(page.locator(".map-node.done")).toHaveCount(32);
  await expect(node(page, 33)).toHaveClass(/current/);
  // Los 11 Dofus del camino son hitos con su huevo
  await expect(page.locator(".map-node .node-egg")).toHaveCount(11);
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
});

test("al elegir un paso sale su ficha con la parada y lo que cierra", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  const card = page.locator("#mapCard");
  await expect(card.locator(".map-card-title")).toContainText("34");
  await expect(card).toContainText("Hasta tener que pasar Lasoberaña");
  await expect(card).toContainText("Cierra también el 33");
  // Un arco une el paso con el que cierra
  await expect(page.locator(".map-arc")).toHaveCount(1);
  await card.locator(".map-card-done").click();
  await expect(node(page, 34)).toHaveClass(/done/);
});

test("«Abrir en el diario» cambia de vista con ese paso abierto", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  await page.click("#mapCard .map-card-open");
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
});

test("los pasos cuyo combate cierra otros llevan la insignia de su jefe", async ({ page }) => {
  await openMap(page);
  await expect(node(page, 34).locator(".node-boss")).toHaveCount(1);
  await expect(node(page, 33).locator(".node-boss")).toHaveCount(0);
});

test("los sellos y la búsqueda apagan en el mapa lo que no coincide", async ({ page }) => {
  await openMap(page);
  await page.click('#zoneSeals .seal[data-zone="Astrub"]');
  await expect(page.locator(".map-node.dimmed")).toHaveCount(98);
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
