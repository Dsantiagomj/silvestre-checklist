import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("la lista de objetos es la de torrentearcano, por categorías", async ({ page }) => {
  await openApp(page);
  // Sin progreso, "solo pasos pendientes" muestra la guía entera: el compilado de la página
  await expect(page.locator(".shop-item")).toHaveCount(421);
  const counts = { recursos: 336, consumibles: 48, equipables: 18, almas: 9, criaturas: 9, cosmeticos: 1 };
  for (const [tab, n] of Object.entries(counts)) {
    await expect(page.locator(`.shop-tab[data-tab="${tab}"] .n`)).toHaveText(String(n));
  }
  await expect(page.locator(".shop-item").first()).toContainText("Pepita");
  await expect(page.locator(".shop-item").first().locator(".q")).toHaveText("×2202");
  await page.click('.shop-tab[data-tab="consumibles"]');
  await expect(page.locator(".shop-item")).toHaveCount(48);
});

test("las alternativas, las notas y los objetos de una sola orden se distinguen", async ({ page }) => {
  await openApp(page);
  const bamboo = page.locator(".shop-item", { hasText: "Madera de bambú o Madera de bambú oscuro" });
  await expect(bamboo.locator("img")).toHaveCount(2);
  await expect(page.locator(".shop-item", { hasText: "Edelweiss" }).locator(".tag")).toHaveText("Orden Corazón valiente");
  await expect(page.locator(".shop-item .tag", { hasText: "Misión opcional" }).first()).toBeVisible();
  await expect(page.locator(".shop-item", { hasText: "Carne rancia" }).locator(".note")).toHaveText("amayiro");
});

test("un objeto se marca como conseguido y se guarda", async ({ page }) => {
  await openApp(page);
  const first = page.locator(".shop-item").first();
  const id = await first.getAttribute("data-id");
  await first.click();
  await expect(page.locator(`.shop-item[data-id="${id}"]`)).toHaveClass(/owned/);
  expect(await readLS(page, "silvestre:owned")).toEqual({ [id]: true });
});

test("solo pasos pendientes descuenta los objetos de pasos hechos", async ({ page }) => {
  // Paso 93 completo: sus objetos ("Blanco marfil") dejan de contar si no los pide otro paso
  await openApp(page, { "silvestre:done": { "93": true } });
  await expect(page.locator(".shop-item")).toHaveCount(414);
  // El checkbox está oculto tras un interruptor dibujado: se pulsa la etiqueta, como haría una persona
  await page.locator("label.toggle", { has: page.locator("#shopPendingToggle") }).click();
  await expect(page.locator("#shopPendingToggle")).not.toBeChecked();
  await expect(page.locator(".shop-item")).toHaveCount(421);
});

test("completar un paso cubre los objetos que solo pedía ese paso", async ({ page }) => {
  // El paso 1 es el único que pide la cabellera de bwork arquero y las cadenas rotas
  await openApp(page, { "silvestre:done": { "1": true } });
  await expect(page.locator("#statOwned")).toHaveText("2");
  await expect(page.locator(".shop-item", { hasText: "Cadenas rotas" })).toHaveCount(0);
  await page.locator("label.toggle", { has: page.locator("#shopPendingToggle") }).click();
  await expect(page.locator(".shop-item", { hasText: "Cadenas rotas" })).toHaveClass(/owned/);
});

test("los prerrequisitos muestran los objetos que necesitan", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#prereqs .req > summary")).toContainText("(17)");
  await expect(page.locator("#prereqs .req-item")).toHaveCount(17);
});
