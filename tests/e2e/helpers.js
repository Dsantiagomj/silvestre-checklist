import { expect } from "@playwright/test";

/**
 * Abre la app con un progreso inicial opcional y recoge los errores de la página.
 * La pestaña por defecto de la ventana de pasos es el mapa; casi todas las pruebas
 * trabajan sobre el diario, así que empiezan en él salvo que la prueba elija otra
 * ("map", "prereqs", "items"; view: null deja la de la app).
 */
export async function openApp(page, seed = null, { view = "diary" } = {}) {
  const errors = [];
  if (view) {
    await page.addInitScript(v => {
      if (!localStorage.getItem("silvestre:stepsView")) localStorage.setItem("silvestre:stepsView", v);
    }, view);
  }
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.goto("");
  if (seed) {
    await page.evaluate(s => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }, seed);
    await page.reload();
  }
  if (view === "prereqs" || view === "items") await expect(page.locator(`#${view}`)).toBeVisible();
  else await expect(page.locator(view === "diary" ? ".diary-row" : ".map-node")).toHaveCount(100);
  return errors;
}

export const readLS = (page, key) =>
  page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), key);

