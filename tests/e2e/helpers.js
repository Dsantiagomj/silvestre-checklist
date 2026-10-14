import { expect } from "@playwright/test";

/** Abre la app con un progreso inicial opcional y recoge los errores de la página. */
export async function openApp(page, seed = null) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.goto("");
  if (seed) {
    await page.evaluate(s => {
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }, seed);
    await page.reload();
  }
  await expect(page.locator(".diary-row")).toHaveCount(100);
  return errors;
}

export const readLS = (page, key) =>
  page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), key);

