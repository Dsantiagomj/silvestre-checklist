import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// El paso 1 da el Dofawa y el 18 el Dofus Esmeralda
const SEED = { "silvestre:done": Object.fromEntries(Array.from({ length: 17 }, (_, i) => [i + 1, true])) };
const egg = page => page.locator('.road-dofus[data-step="18"]');
const wonAnims = page => egg(page).evaluate(el => [el, ...el.querySelectorAll("*")]
  .flatMap(n => n.getAnimations()).filter(a => /^egg-won|^egg-burst/.test(a.animationName)).length);

// La celebración dura poco («won» se quita al acabar egg-won, count-tick dura .5 s y el
// aviso se va a los 4,5 s): con la máquina cargada ya puede haber terminado cuando la
// prueba mira la clase o getAnimations(). Por eso, desde antes de marcar el paso, se
// apunta cada animación que arranca y si el aviso llegó a mostrarse, y luego se comprueba
// que ocurrió, no que siga en marcha.
const recordCelebration = page => page.evaluate(() => {
  window.__anims = [];
  window.__toastShown = false;
  const toast = document.getElementById("toast");
  new MutationObserver(() => { if (toast.classList.contains("show")) window.__toastShown = true; })
    .observe(toast, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("animationstart", e => {
    const t = e.target;
    window.__anims.push({
      name: e.animationName,
      step: t.closest("[data-step]")?.dataset.step ?? null,
      count: t.classList.contains("road-count"),
      bar: !!t.closest("#roadBtn"),
    });
  }, true);
});
const started = (page, match) => expect.poll(() => page.evaluate(m =>
  window.__anims.some(a => Object.entries(m).every(([k, v]) => a[k] === v)), match)).toBe(true);
const toastWasShown = page => expect.poll(() => page.evaluate(() => window.__toastShown)).toBe(true);

test("al marcar el paso de un Dofus del camino, su huevo se enciende y se avisa", async ({ page }) => {
  await openApp(page, SEED);
  await page.evaluate(() => document.getElementById("winRoad").scrollIntoView());
  await expect(page.locator(".road-count")).toHaveText("1/12");
  await recordCelebration(page);
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(egg(page)).toHaveClass(/obtained/);
  // El huevo se enciende (egg-won solo corre con la clase «won») y estalla
  await started(page, { name: "egg-won", step: "18", bar: false });
  await started(page, { name: "egg-burst", step: "18", bar: false });
  // La cuenta sube con un pequeño salto
  await expect(page.locator(".road-count")).toHaveText("2/12");
  await started(page, { name: "count-tick", count: true, bar: false });
  await toastWasShown(page);
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
  await expect(page.locator(".road-dofus.won")).toHaveCount(0);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
});

test("con movimiento reducido el huevo cambia sin animación, pero se avisa igual", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, SEED);
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(egg(page)).toHaveClass(/obtained/);
  expect(await wonAnims(page)).toBe(0);
  expect(await page.locator(".road-count").evaluate(el => el.getAnimations().length)).toBe(0);
  await expect(page.locator("#toastTxt")).toHaveText("¡Dofus Esmeralda obtenido!");
});

// En pantalla baja, el del botón de los Dofus del camino de la barra (WinBar.jsx)
const miniEgg = page => page.locator('#roadBtn .road-mini[data-step="18"]');

test("en pantalla baja, el huevo pequeño de la barra se enciende igual y la cuenta salta", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page, SEED);
  await expect(page.locator("#roadBtn .road-count")).toHaveText("1/12");
  await recordCelebration(page);
  await page.click('.diary-row[data-n="18"] .row-check');
  await expect(miniEgg(page)).toHaveClass(/obtained/);
  await started(page, { name: "egg-won", step: "18", bar: true });
  // La cuenta sube con un pequeño salto
  await expect(page.locator("#roadBtn .road-count")).toHaveText("2/12");
  await started(page, { name: "count-tick", count: true, bar: true });
  await toastWasShown(page);
  await expect(page.locator("#toastTxt")).toHaveText("¡Dofus Esmeralda obtenido!");
});
