import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

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
  // Por el número: en el centro de la fila puede caer la etiqueta "cierra el…", que lleva a otro paso
  await row(page, n).locator(".row-num").click();
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

test("las notas del 93 terminan el 92 y retoman el 84; la misión opcional del 7 no cierra el 7", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 92);
  const closed = page.locator("#journal .call.closedin");
  await expect(closed).toContainText("Se termina más adelante");
  await expect(closed.locator(".step-ref")).toHaveAttribute("data-n", "93");
  // La parada roja del 92 cae en «Los tótems de Maimane»
  const totems = quest(page, "Los tótems de Maimane");
  await totems.locator("summary .q-name").click();
  await expect(totems.locator(".obj-stop")).toHaveCount(1);
  // El 84 se retoma en el 93
  await openStep(page, 84);
  const resumed = page.locator("#journal .call.resumedin");
  await expect(resumed).toContainText("Se retoma más adelante");
  await expect(resumed.locator('.step-ref[data-n="93"]')).toHaveCount(1);
  // «Se termina la misión opcional del inciso 7»: el 7 se hace sin ella
  await openStep(page, 7);
  await expect(page.locator("#journal .call.closedin")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("en el 92, «Los tótems de Maimame» (así en la guía) enlaza a la guía de «Los tótems de Maimane»", async ({ page }) => {
  await openApp(page);
  await openStep(page, 92);
  await expect(page.locator("#journal .journal-goal a.guide-link", { hasText: "Los tótems de Maimame" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/los-totems-de-maimane");
});

test("con el 92 y el 93 hechos, «Los tótems de Maimane» sale completada en el 98", async ({ page }) => {
  await openApp(page, { "silvestre:done": doneOf([92]) });
  await openStep(page, 98);
  await doneIn(page, "La danza de la disonancia", 92);
  await pending(page, "Los tótems de Maimane");
  await page.evaluate(() => localStorage.setItem("silvestre:done", JSON.stringify({ 92: true, 93: true })));
  await page.reload();
  await openStep(page, 98);
  await doneIn(page, "Los tótems de Maimane", 93);
});

test("marcar el 93 termina «Los tótems de Maimane», donde para el 92, y el 92 sigue pendiente sin sus misiones anteriores", async ({ page }) => {
  await openApp(page, { "silvestre:done": doneOf([91]) });
  await openStep(page, 93);
  await page.locator("#toggleBtn").click();
  await expect(row(page, 93)).toHaveClass(/\bdone\b/);
  await expect(row(page, 92)).not.toHaveClass(/\bdone\b/);
  await expect(page.locator("#toastTxt")).toHaveText("El 92 sigue pendiente: le faltan 3 misiones anteriores.");
  expect((await readLS(page, "silvestre:questObjective"))["2425"]).toBe(6);
});

test("el 87 termina «Las cuatro voluntades», que el 73 deja a medias, y deja tomada «Toma de conciencia» antes de sus dos misiones", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": doneOf([86]), "silvestre:questPos": { 73: 1 } });
  await expect(row(page, 73).locator(".row-closed")).toHaveText("se cierra en el 87");
  await expect(row(page, 87).locator(".row-closes")).toHaveText("cierra el 72, 73, 85, 86");
  await openStep(page, 87);
  // Se hacen de una en una: la 4 («La guerra de Cania…») y luego la 3, la de Ilyzaelle
  await expect(page.locator("#journal .q-item summary .q-name")).toHaveText(["Las cuatro voluntades", "Toma de conciencia",
    "La guerra de Cania no se llevará a cabo", "El juicio de la Muerte"]);
  await expect(quest(page, "Toma de conciencia").locator(".q-take")).toHaveText("Solo tomarla");
  // La guía no lo dice: una nota explica por qué el 87 termina la misión del 73
  await expect(page.locator("#journal .call.note", { hasText: "Las cuatro voluntades" }).locator('.step-ref[data-n="73"]')).toHaveCount(1);
  await expect(quest(page, "La guerra de Cania no se llevará a cabo").locator(".obj-stop, .obj-resume")).toHaveCount(0);
  await expect(page.locator("#journal :is(.obj-stop, .obj-resume)")).toHaveCount(1);
  await expect(quest(page, "El juicio de la Muerte").locator(":is(.obj-stop, .obj-resume) + .obj-row"))
    .toHaveText(/Entrégale a Maestro Cuerbok.*Fuego devorador/);
  // «Hecho» en el 87 termina «Las cuatro voluntades» y, con lo de antes hecho, el 73
  await page.locator("#toggleBtn").click();
  await expect(row(page, 87)).toHaveClass(/\bdone\b/);
  await expect(row(page, 73)).toHaveClass(/\bdone\b/);
  const objs = await readLS(page, "silvestre:questObjective");
  expect(objs["2122"]).toBe(18);
  // «Toma de conciencia» se hace en el 91: el 87 no la termina
  expect(objs["2138"]).toBeUndefined();
  await expect(row(page, 91)).not.toHaveClass(/\bdone\b/);
  expect(errors).toEqual([]);
});

test("con el 87 hecho, «Las cuatro voluntades» sale completada en el 73", async ({ page }) => {
  await openApp(page, { "silvestre:done": doneOf([87]) });
  await openStep(page, 73);
  await doneIn(page, "Las cuatro voluntades", 87);
  await pending(page, "Los senderos de la guerra");
});

test("«Hasta su último suspiro» no va en el 53, que para antes de Kumijo, sino en el 56 tras «Réquiem por un yokai»", async ({ page }) => {
  await openApp(page, { "silvestre:done": doneOf([53]) });
  // Empieza pasado el combate contra Kumijo (Qo>16870), y el 53 para justo antes
  await openStep(page, 53);
  await expect(page.locator("#journal .q-item summary .q-name")).toHaveText(["Maldita desaparición", "Réquiem por un yokai"]);
  await openStep(page, 56);
  await expect(page.locator("#journal .q-item summary .q-name")).toHaveText(
    ["Maldita desaparición", "Réquiem por un yokai", "Hasta su último suspiro"]);
  // Con el 53 hecho solo sale completada la misión de antes de su parada
  await doneIn(page, "Maldita desaparición", 53);
  await pending(page, "Réquiem por un yokai");
  await pending(page, "Hasta su último suspiro");
});
