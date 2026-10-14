import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);

test("el diario lista los 100 pasos agrupados por el Dofus al que llevan", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#diary .section-num")).toHaveText("02");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  const groups = page.locator(".diary-group-head");
  await expect(groups.first()).toContainText("Dofawa");
  await expect(groups.last()).toContainText("Dofus Silvestre");
  // Cada fila: número, título y zona
  await expect(row(page, 34).locator(".row-num")).toHaveText("34");
  await expect(row(page, 34).locator(".row-title")).toHaveText("El árbol que esconde el bosque");
  await expect(row(page, 34).locator(".row-zone")).toContainText("Reino de Amakna");
});

test("sin nada seleccionado, el detalle muestra el siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 33) });
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
  await expect(row(page, 34)).toHaveAttribute("aria-current", "step");
});

test("el detalle del 34 muestra jefe, avisos de la guía y los pasos que cierra", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-main").click();
  const j = page.locator("#journal");
  await expect(j.locator(".journal-num")).toHaveText("34");
  await expect(j.locator(".journal-title")).toHaveText("El árbol que esconde el bosque");
  await expect(j.locator(".journal-show-name")).toHaveText("Lasoberaña");
  await expect(j.locator(".journal-base")).toHaveText(/hasta la misión 2: Arak-hais, ¿dónde vais\?$/);
  await expect(j.locator(".call.stop")).toContainText("Hasta tener que pasar Lasoberaña");
  await expect(j.locator(".call.tip")).toContainText("primeras 4 salas");
  await expect(j.locator(".call.done")).toContainText("Se pasa Lasoberaña");
  // Las fichas del verde llevan a esos pasos
  await j.locator('.call.done .step-chip[data-n="33"]').click();
  await expect(j.locator(".journal-num")).toHaveText("33");
});

test("en la lista, un paso que se termina más adelante lo dice", async ({ page }) => {
  await openApp(page);
  await expect(row(page, 33).locator(".row-closed")).toHaveText("se cierra en el 34");
  await expect(row(page, 34).locator(".row-closed")).toHaveCount(0);
});

test("la línea de parada cae justo antes de vencer a Lasoberaña", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-main").click();
  const quest = page.locator("#journal .q-item", { hasText: "Arak-hais, ¿dónde vais?" });
  await expect(quest.locator(".obj-stop")).toHaveCount(1, { timeout: 15_000 });
  const next = quest.locator(".obj-stop + .obj-row");
  await expect(next).toContainText("Vence a 1 x Lasoberaña");
});

test("«Paso hecho» marca el paso y salta al siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#toggleBtn")).toContainText("Paso hecho · ir al 35");
  await page.click("#toggleBtn");
  await expect(row(page, 34)).toHaveClass(/done/);
  await expect(page.locator("#journal .journal-num")).toHaveText("35");
  expect((await readLS(page, "silvestre:done"))["34"]).toBe(true);
});

test("si el paso cierra otros pendientes, ofrece marcarlos también", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#closesBtn")).toHaveText("Marcar el 33 también");
  await page.click("#closesBtn");
  await expect(row(page, 33)).toHaveClass(/done/);
  await expect(page.locator("#closesBtn")).toHaveCount(0);
  // Sigue en el mismo paso
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
});

test("la casilla de cada fila marca el paso sin cambiar lo que se ve", async ({ page }) => {
  await openApp(page);
  await row(page, 50).locator(".row-main").click();
  await row(page, 10).locator(".row-check").click();
  await expect(row(page, 10)).toHaveClass(/done/);
  await expect(page.locator("#journal .journal-num")).toHaveText("50");
});

test("las pestañas filtran pendientes, hechos y todos", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 30) });
  await expect(page.locator("#diaryTabPending")).toContainText("70");
  await expect(page.locator("#diaryTabDone")).toContainText("30");
  await page.click("#diaryTabPending");
  await expect(page.locator(".diary-row")).toHaveCount(70);
  await page.click("#diaryTabDone");
  await expect(page.locator(".diary-row")).toHaveCount(30);
  await page.click("#diaryTabAll");
  await expect(page.locator(".diary-row")).toHaveCount(100);
});
