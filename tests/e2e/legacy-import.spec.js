import { test, expect } from "@playwright/test";
import { readLS } from "./helpers.js";

// El checklist clásico de torrentearcano guarda su progreso en el mismo dominio: `checked[i]`
// es el paso i + 1. La v3 es la numeración anterior de la guía (PREVIOUS_STEPS)
const V4 = "dofus_silvestre_clean_v4";
const V3 = "dofus_silvestre_clean_v3";
const classic = (steps, { darkMode = true } = {}) => ({
  checked: Array.from({ length: 100 }, (_, i) => steps.includes(i + 1)),
  filter: "all",
  sortMode: "guide",
  prerequisitesOpen: false,
  darkMode,
});

/**
 * Abre la app con claves ya guardadas antes de que cargue, como las tendría alguien que
 * llega desde el checklist clásico. Solo se escriben si no están: así una recarga no
 * pisa lo que la prueba cambie después.
 */
async function openWith(page, seed) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(s => {
    if (!localStorage.getItem("silvestre:stepsView")) localStorage.setItem("silvestre:stepsView", "diary");
    for (const [k, v] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof v === "string" ? v : JSON.stringify(v));
    }
  }, seed);
  await page.goto("");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  return errors;
}

const doneRows = page => page.locator(".diary-row.done");
const doneKeys = async page => Object.keys(await readLS(page, "silvestre:done")).map(Number).sort((a, b) => a - b);
const notice = page => page.locator("#classicNotice");

test("la primera visita trae los pasos marcados del checklist clásico y su tema", async ({ page }) => {
  const errors = await openWith(page, { [V4]: classic([1, 2, 3, 18, 40], { darkMode: false }) });
  await expect(doneRows(page)).toHaveCount(5);
  expect(await doneKeys(page)).toEqual([1, 2, 3, 18, 40]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  // Traerlos no es conseguirlos ahora: ni franja ni aviso del Dofus (el 1 y el 18 dan uno)
  await page.waitForTimeout(300);
  await expect(page.locator(".road-dofus.won")).toHaveCount(0);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
  await expect(notice(page)).toHaveCount(0);
  // Sus claves no se tocan
  expect(await readLS(page, V4)).toEqual(classic([1, 2, 3, 18, 40], { darkMode: false }));
  // Ya importado, recargar no lo repite: lo desmarcado aquí se queda desmarcado
  await page.click('.diary-row[data-n="40"] .row-check');
  await page.reload();
  await expect(doneRows(page)).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("sin v4, la v3 se pasa a la numeración actual", async ({ page }) => {
  // El 41 de ahora junta el 41 y el 90 de antes (falta el 90); el 75 de antes son del 74 al 77
  await openWith(page, { [V3]: classic([1, 41, 75]) });
  expect(await doneKeys(page)).toEqual([1, 74, 75, 76, 77]);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("con las dos versiones manda la v4", async ({ page }) => {
  await openWith(page, { [V4]: classic([5]), [V3]: classic([1, 2, 3]) });
  expect(await doneKeys(page)).toEqual([5]);
});

test("un tema ya elegido aquí no lo cambia el clásico", async ({ page }) => {
  await openWith(page, { "silvestre:theme": "dark", [V4]: classic([1], { darkMode: false }) });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await doneKeys(page)).toEqual([1]);
});

test("sin checklist clásico no pasa nada", async ({ page }) => {
  await openWith(page, {});
  await expect(doneRows(page)).toHaveCount(0);
  await expect(notice(page)).toHaveCount(0);
});

test("después, los pasos de más del clásico se avisan y «Traerlos» solo añade", async ({ page }) => {
  // Ya vino una vez; luego marcó el 7, el 8 y el 18 en el clásico, y aquí el 9, que allí no
  await openWith(page, { [V4]: classic([1, 2]) });
  await page.click('.diary-row[data-n="9"] .row-check');
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [V4, classic([1, 2, 7, 8, 18])]);
  await page.reload();
  await expect(notice(page)).toBeVisible();
  await expect(notice(page)).toContainText("Tienes 3 pasos más en el checklist clásico");
  await expect(doneRows(page)).toHaveCount(3);
  await notice(page).getByRole("button", { name: "Traerlos" }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(await doneKeys(page)).toEqual([1, 2, 7, 8, 9, 18]);
  // Como una copia restaurada: el Dofus del 18 no se celebra
  await page.waitForTimeout(300);
  await expect(page.locator(".road-dofus.won")).toHaveCount(0);
  await expect(page.locator("#toastTxt")).not.toHaveText(/obtenido/);
  await page.reload();
  await expect(notice(page)).toHaveCount(0);
});

test("un solo paso de más se dice en singular", async ({ page }) => {
  await openWith(page, { [V4]: classic([1]) });
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [V4, classic([1, 4])]);
  await page.reload();
  await expect(notice(page)).toContainText("Tienes 1 paso más en el checklist clásico");
});

test("cerrar el aviso lo calla hasta que el clásico cambie", async ({ page }) => {
  await openWith(page, { [V4]: classic([1]) });
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [V4, classic([1, 4, 5])]);
  await page.reload();
  await expect(notice(page)).toBeVisible();
  await notice(page).getByRole("button", { name: "Cerrar aviso" }).click();
  await expect(notice(page)).toHaveCount(0);
  expect(await doneKeys(page)).toEqual([1]);
  await page.reload();
  await expect(doneRows(page)).toHaveCount(1);
  await expect(notice(page)).toHaveCount(0);
  // Marca otro allí: vuelve a avisar, ya con los tres
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [V4, classic([1, 4, 5, 6])]);
  await page.reload();
  await expect(notice(page)).toContainText("Tienes 3 pasos más en el checklist clásico");
});
