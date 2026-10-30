import { test, expect } from "@playwright/test";

// Prueba de humo de la guía global de progresión: lo que cambia respecto al Silvestre (sus
// datos, sus textos y su sitio en global/). La app es la misma: el resto lo prueba tests/e2e

const STEPS = 219;

/** Abre la guía, en el diario o en el mapa, y recoge los errores de la página. */
async function openGlobal(page, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  // Los iconos de los avisos (CALL_ICONS) aún no están generados para la guía: su 404 no
  // es un error de la app. Cualquier otro error de consola sí cuenta
  page.on("console", m => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`);
  });
  await page.addInitScript(v => {
    if (localStorage.getItem("global:stepsView") == null) localStorage.setItem("global:stepsView", v);
  }, view);
  await page.goto("");
  await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(STEPS);
  return errors;
}

test("los pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openGlobal(page);
  await expect(page).toHaveTitle("Guía global · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los pasos de la guía global");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(STEPS);
  expect(errors).toEqual([]);
});

test("lleva encima la cabecera del sitio, con la guía global como página actual", async ({ page }) => {
  await openGlobal(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  const current = shell.getByRole("navigation").getByRole("link", { name: "Guía global" });
  await expect(current).toHaveAttribute("aria-current", "page");
  expect(await current.getAttribute("href")).toBe("/global/");
});

test("el primer paso abre en el diario con sus misiones", async ({ page }) => {
  await openGlobal(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("1");
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  expect(await page.locator("#journal .q-item").count()).toBeGreaterThan(5);
});
