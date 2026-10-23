import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// El paso 1 da el Dofawa y el 18 el Dofus Esmeralda
const SEED = { "silvestre:done": Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, true])) };
// El huevo del Esmeralda en el botón de los Dofus del camino de la barra
const egg = page => page.locator('#roadBtn .road-mini[data-step="18"]');
const wonAnims = page => egg(page).evaluate(el => [el, ...el.querySelectorAll("*")]
  .flatMap(n => n.getAnimations()).filter(a => /^egg-won|^egg-burst/.test(a.animationName)).length);

test("al marcar el paso de un Dofus del camino, su huevo se enciende y se avisa", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator("#roadBtn .road-count")).toHaveText("1/12");
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(egg(page)).toHaveClass(/obtained/);
  await expect(egg(page)).toHaveClass(/won/);
  expect(await wonAnims(page)).toBeGreaterThan(0);
  // La cuenta sube con un pequeño salto
  await expect(page.locator("#roadBtn .road-count")).toHaveText("2/12");
  expect(await page.locator("#roadBtn .road-count").evaluate(el => el.getAnimations().some(a => a.animationName === "count-tick"))).toBe(true);
  await expect(page.locator("#toast")).toHaveClass(/show/);
  await expect(page.locator("#toastTxt")).toHaveText("¡Dofus Esmeralda obtenido!");
});

test("el aviso del Dofus lleva su huevo y va centrado, sin hueco a la derecha", async ({ page }) => {
  await openApp(page, SEED);
  await page.click('.diary-row[data-n="18"] .row-check');
  const toast = page.locator("#toast");
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveClass(/toast-dofus/);
  await expect(toast.locator(".toast-icons img")).toHaveAttribute("src", /items\/23002\.png$/);
  // Lo que se ve (huevo y texto) deja el mismo margen a cada lado
  await expect.poll(() => toast.evaluate(el => {
    const box = el.getBoundingClientRect();
    const parts = [...el.children].filter(c => c.offsetWidth && !c.classList.contains("toast-bar"))
      .map(c => c.getBoundingClientRect());
    const left = Math.min(...parts.map(r => r.left)) - box.left;
    const right = box.right - Math.max(...parts.map(r => r.right));
    return Math.abs(left - right);
  })).toBeLessThan(3);
});

test("al cargar la página con el Dofus ya conseguido no hay celebración", async ({ page }) => {
  await openApp(page, { "silvestre:done": { ...SEED["silvestre:done"], 18: true } });
  await page.waitForTimeout(300);
  await expect(egg(page)).toHaveClass(/obtained/);
  await expect(egg(page)).not.toHaveClass(/won/);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
});

test("desmarcar el paso apaga el huevo sin celebrar", async ({ page }) => {
  await openApp(page, { "silvestre:done": { ...SEED["silvestre:done"], 18: true } });
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(egg(page)).not.toHaveClass(/obtained/);
  await expect(egg(page)).not.toHaveClass(/won/);
  expect(await wonAnims(page)).toBe(0);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
});

test("marcar un paso que no da Dofus no celebra nada", async ({ page }) => {
  await openApp(page, SEED);
  await page.click('.diary-row[data-n="19"] .row-check');
  await expect(page.locator(".road-mini.won, .road-dofus.won")).toHaveCount(0);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
});

test("con movimiento reducido el huevo cambia sin animación, pero se avisa igual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, SEED);
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(egg(page)).toHaveClass(/obtained/);
  expect(await wonAnims(page)).toBe(0);
  expect(await page.locator("#roadBtn .road-count").evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(page.locator("#toastTxt")).toHaveText("¡Dofus Esmeralda obtenido!");
});
