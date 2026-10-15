import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// Una misión que llevan varios pasos se ve terminada en todos en cuanto un paso hecho la
// termina entera: el que la lleva sin parar dentro, o el que para dentro si también está
// hecho el que lo cierra

const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/data/weights.json", import.meta.url), "utf8"));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w));
// El mismo redondeo que el hero: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
const doneOf = ns => Object.fromEntries(ns.map(n => [n, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
// Por el nombre exacto: otras misiones nombran a esta en sus objetivos
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator("summary .q-name").getByText(name, { exact: true }) });
const btn = (page, name) => quest(page, name).locator(".q-done-btn");

async function openStep(page, n) {
  await row(page, n).locator(".row-main").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

/** Completada por otro paso: hecha, sin poder deshacerla aquí, y dice en qué paso. */
async function doneIn(page, name, m) {
  await expect(btn(page, name)).toHaveAttribute("aria-pressed", "true");
  await expect(btn(page, name)).toBeDisabled();
  await expect(btn(page, name)).toHaveAttribute("title", `Completada en el paso ${m}`);
}
async function pending(page, name) {
  await expect(btn(page, name)).toHaveAttribute("aria-pressed", "false");
  await expect(btn(page, name)).toBeEnabled();
}

const LEFT_62 = ["Dragones y chapuzonas", "Altar del Norte", "El salvaje salvaje Oeste", "La bendición de Viti",
  "La bendición de Thomahon", "La bendición de Foluk", "Oración en los tiempos de cólera"];

test("las misiones que un paso hecho termina salen completadas en otro paso, y vuelven al desmarcarlo", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": doneOf([38]) });
  await openStep(page, 62);
  for (const name of ["Extinción de los fuegos", "Esto parece el Sur", "La bruja mala del Este"]) await doneIn(page, name, 38);
  for (const name of LEFT_62) await pending(page, name);
  // Sus medallones tampoco se pulsan
  const fuegos = quest(page, "Extinción de los fuegos");
  await fuegos.locator("summary .q-name").click();
  await expect(fuegos.locator(".obj-row.done").first()).toBeVisible();
  await expect(fuegos.locator(".obj-med:not([disabled])")).toHaveCount(0);
  // El porcentaje las cuenta en el 62
  const q = WEIGHTS[62].q;
  await expect(page.locator("#heroPct")).toHaveText(`${pctOf(WEIGHTS[38].w + q[1] + q[2] + q[3])}%`);
  // Desmarcar el 38 las deja pendientes otra vez
  await row(page, 38).locator(".row-check").click();
  await expect(row(page, 38)).not.toHaveClass(/\bdone\b/);
  for (const name of ["Extinción de los fuegos", "Esto parece el Sur", "La bruja mala del Este"]) await pending(page, name);
  await expect(page.locator("#heroPct")).toHaveText("0%");
  expect(errors).toEqual([]);
});

test("un paso que para dentro de la misión no la termina hasta que está hecho el que lo cierra", async ({ page }) => {
  // El 32 para en «Dragones y chapuzonas» (falta Roble Blando) y lo cierra el 37
  await openApp(page, { "silvestre:done": doneOf([32]) });
  await openStep(page, 62);
  await pending(page, "Dragones y chapuzonas");
  await page.evaluate(() => localStorage.setItem("silvestre:done", JSON.stringify({ 32: true, 37: true })));
  await page.reload();
  await openStep(page, 62);
  await doneIn(page, "Dragones y chapuzonas", 37);
  // El 39 deja Funoroshi para el 48: «La bendición de Viti» sigue pendiente sin el 48
  await page.evaluate(() => localStorage.setItem("silvestre:done", JSON.stringify({ 39: true })));
  await page.reload();
  await openStep(page, 62);
  await pending(page, "La bendición de Viti");
  await page.evaluate(() => localStorage.setItem("silvestre:done", JSON.stringify({ 39: true, 48: true })));
  await page.reload();
  await openStep(page, 62);
  await doneIn(page, "La bendición de Viti", 48);
});

test("en el 55 salen completadas las misiones que terminan el 33, el 44 y el 54", async ({ page }) => {
  await openApp(page, { "silvestre:done": doneOf([33, 34, 44, 45, 54]) });
  await openStep(page, 55);
  await doneIn(page, "El dofus y el alquimista", 33);
  await doneIn(page, "La razón del más fuerte", 33);
  await doneIn(page, "Después de él, el diluvio", 33);
  await doneIn(page, "Muchos cuerboks en la cabeza", 34);
  await doneIn(page, "Bien plantados", 45);
  await doneIn(page, "No hay humo sin fuego", 54);
  await doneIn(page, "Cuando se caldean las ánimas", 54);
  await pending(page, "El juramento del ámbar");
  // Solo el 33: lo de antes de su parada, sí; la misión de la parada y las de después, no
  await page.evaluate(() => localStorage.setItem("silvestre:done", JSON.stringify({ 33: true })));
  await page.reload();
  await openStep(page, 55);
  await doneIn(page, "El dofus y el alquimista", 33);
  await doneIn(page, "La razón del más fuerte", 33);
  await doneIn(page, "Después de él, el diluvio", 33);
  for (const name of ["Muchos cuerboks en la cabeza", "Bien plantados", "No hay humo sin fuego",
    "Cuando se caldean las ánimas", "El juramento del ámbar"]) await pending(page, name);
});

test("marcar el paso que termina lo último que le faltaba a otro marca también ese", async ({ page }) => {
  // Todo lo del 62 hecho en otros pasos salvo lo del 58; «Oración en los tiempos de cólera»,
  // que solo lleva el 62, terminada
  await openApp(page, {
    "silvestre:done": doneOf([32, 37, 38, 39, 48, 50, 51, 61]),
    "silvestre:questObjective": { 1663: 13 },
  });
  await openStep(page, 62);
  await pending(page, "La bendición de Foluk");
  await expect(row(page, 62)).not.toHaveClass(/\bdone\b/);
  await row(page, 58).locator(".row-check").click();
  await expect(row(page, 58)).toHaveClass(/\bdone\b/);
  await expect(row(page, 62)).toHaveClass(/\bdone\b/);
  // Desmarcar el 58 no desmarca el 62, que ya está hecho
  await row(page, 58).locator(".row-check").click();
  await expect(row(page, 58)).not.toHaveClass(/\bdone\b/);
  await expect(row(page, 62)).toHaveClass(/\bdone\b/);
});
