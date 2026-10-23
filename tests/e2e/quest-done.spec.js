import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/dofus/silvestre/weights.json", import.meta.url), "utf8"));
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w));
// El mismo redondeo que el porcentaje de la barra: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
const BASE = sum(Array.from({ length: 11 }, (_, i) => WEIGHTS[i + 1].w)); // pasos 1 a 11 hechos
const Q12 = WEIGHTS[12].q; // Cofrología, Tesorfanato, El maleficio del cofre, Las grandes galerías, Espionaje industrial
const barPct = page => page.locator("#winPct");

const routeStates = rows => rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")).join(""));

async function openStep12(page) {
  await page.click('.diary-row[data-n="12"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("12");
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

test("la ✓ de la misión abierta la termina y la pliega; otra vez, vuelve a su inicio y la abre", async ({ page }) => {
  // Paso 5: «¿Dónde se ha ido la 7.ª compañía?» para en el paso (va abierta) y va en curso
  const errors = await openApp(page, { "silvestre:done": upTo(4), "silvestre:questPos": { 5: 1 } });
  await page.click('.diary-row[data-n="5"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("5");
  const comp = page.locator("#journal .q-item", { hasText: "7.ª compañía" });
  const btn = comp.locator(".q-check");
  const rows = comp.locator(".obj-list.route > .obj-row");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await routeStates(rows)).toMatch(/^n-+$/);
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  // Pendiente: la termina entera, como pulsar su último medallón, y se pliega
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(comp.locator(".obj-list")).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:questObjective"))["703"])).toBe(8);
  // Hecha: vuelve a su inicio y se abre
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(rows.first()).toBeVisible();
  expect(await routeStates(rows)).toMatch(/^n-+$/);
  expect(errors).toEqual([]);
});

test("el porcentaje suma cada misión hecha de un paso pendiente y la resta al deshacerla", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await expect(barPct(page)).toHaveText(`${pctOf(BASE)}%`);
  await openStep12(page);
  const btn = page.locator("#journal .q-item", { hasText: "Cofrología" }).locator(".q-check");
  await btn.click();
  await expect(barPct(page)).toHaveText(`${pctOf(BASE + Q12[0])}%`);
  expect(pctOf(BASE + Q12[0])).toBeGreaterThan(pctOf(BASE));
  // Otra se suma encima («Las grandes galerías» no pide «Cofrología»)
  const galerias = page.locator("#journal .q-item", { hasText: "Las grandes galerías" }).locator(".q-check");
  await galerias.click();
  await expect(barPct(page)).toHaveText(`${pctOf(BASE + Q12[0] + Q12[3])}%`);
  // Deshacer la primera resta solo esa: la otra sigue terminada, en el diario y en el %
  await btn.click();
  await expect(galerias).toHaveAttribute("aria-pressed", "true");
  await expect(barPct(page)).toHaveText(`${pctOf(BASE + Q12[3])}%`);
  await galerias.click();
  await expect(barPct(page)).toHaveText(`${pctOf(BASE)}%`);
});

test("el avance del overlay mueve el porcentaje sin abrir el diario", async ({ page }) => {
  const pctWith = async (questPos, questObj = {}) => {
    await page.evaluate(([p, o]) => {
      localStorage.setItem("silvestre:questPos", JSON.stringify(p));
      localStorage.setItem("silvestre:questObjective", JSON.stringify(o));
    }, [questPos, questObj]);
    await page.reload();
    await expect(page.locator(".map-node")).toHaveCount(100);
    return barPct(page);
  };
  await openApp(page, { "silvestre:done": upTo(11) }, { view: "map" });
  // La primera, pasada de su último objetivo
  await expect(await pctWith({ 12: 1 }, { 1504: 16 })).toHaveText(`${pctOf(BASE + Q12[0])}%`);
  // Ir por una misión no da por hechas las de antes: solo las que pide terminadas
  await expect(await pctWith({ 12: 4 }, { 1510: 11 })).toHaveText(`${pctOf(BASE)}%`);
  // La última, pasada de su último objetivo: pide todas las de antes, el paso entero
  await expect(await pctWith({ 12: 4 }, { 1510: 12 })).toHaveText(`${pctOf(BASE + WEIGHTS[12].w)}%`);
  // Una misión terminada por delante de la actual (se terminó la 2.ª y se reinició la 1.ª)
  // cuenta, igual que el diario la muestra hecha; y con ella, la 1.ª, que pide terminada
  await expect(await pctWith({ 12: 0 }, { 1505: 11 })).toHaveText(`${pctOf(BASE + Q12[0] + Q12[1])}%`);
  await expect(await pctWith({})).toHaveText(`${pctOf(BASE)}%`);
});

test("en un paso hecho, desmarcar una misión desmarca el paso y deja las demás completadas", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(12) });
  await openStep12(page);
  const btns = page.locator("#journal .q-item .q-check");
  await expect(btns).toHaveCount(5);
  for (const b of await btns.all()) {
    await expect(b).toBeEnabled();
    await expect(b).toHaveAttribute("aria-pressed", "true");
  }
  // Un clic de más en «Espionaje industrial»: solo esa vuelve a su inicio, y el paso deja de estar hecho
  const espionaje = page.locator("#journal .q-item", { hasText: "Espionaje industrial" }).locator(".q-check");
  await espionaje.click();
  await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
  expect(await btns.evaluateAll(els => els.map(e => e.getAttribute("aria-pressed")))).toEqual(["true", "true", "true", "true", "false"]);
  await expect(barPct(page)).toHaveText(`${pctOf(BASE + sum(Q12) - Q12[4])}%`);
  await expect(page.locator("#journal .journal-num")).toHaveText("12");
  // Volver a completarla deja el paso hecho otra vez
  await espionaje.click();
  await expect(page.locator('.diary-row[data-n="12"]')).toHaveClass(/\bdone\b/);
});

test("en un paso hecho, deshacer una misión deshace también las que la piden terminada", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(12) });
  await openStep12(page);
  const btns = page.locator("#journal .q-item .q-check");
  await expect(btns).toHaveCount(5);
  // «El maleficio del cofre» y «Espionaje industrial» piden «Tesorfanato»: sin ella no
  // pueden estar terminadas
  await page.locator("#journal .q-item", { hasText: "Tesorfanato" }).locator(".q-check").click();
  await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
  expect(await btns.evaluateAll(els => els.map(e => e.getAttribute("aria-pressed")))).toEqual(["true", "false", "false", "true", "false"]);
  await expect(barPct(page)).toHaveText(`${pctOf(BASE + Q12[0] + Q12[3])}%`);
});

test("en un paso hecho, deshacer la misión plegada la abre desde su inicio y desmarca el paso", async ({ page }) => {
  // El 27: «La marcha de la emperatriz», su obligatoria, para en el paso
  await openApp(page, { "silvestre:done": upTo(27) });
  await page.click('.diary-row[data-n="27"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("27");
  const marcha = page.locator("#journal .q-item", { hasText: "La marcha de la emperatriz" });
  await expect(marcha.locator(".obj-list")).toHaveCount(0);
  await marcha.locator(".q-check").click();
  await expect(page.locator('.diary-row[data-n="27"]')).not.toHaveClass(/\bdone\b/);
  const rows = marcha.locator(".obj-list.route > .obj-row");
  await expect(rows.first()).toBeVisible();
  // Los medallones vuelven a marcarse uno a uno
  await rows.nth(2).locator(".obj-med").click();
  expect(await routeStates(rows)).toMatch(/^dddn-+$/);
});

test("un paso de una sola misión también lleva su ✓, y completarla marca el paso", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(page.locator("#journal .q-item")).toHaveCount(1, { timeout: 15_000 });
  const btn = page.locator("#journal .q-check");
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.diary-row[data-n="4"]')).toHaveClass(/\bdone\b/);
});

test("completar todas las misiones obligatorias marca el paso, sin cambiar de paso", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep12(page);
  const names = ["Cofrología", "Tesorfanato", "El maleficio del cofre", "Las grandes galerías"];
  for (const name of names) {
    await page.locator("#journal .q-item", { hasText: name }).locator(".q-check").click();
    // Con misiones por hacer, el paso sigue pendiente
    await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
  }
  await page.locator("#journal .q-item", { hasText: "Espionaje industrial" }).locator(".q-check").click();
  await expect(page.locator('.diary-row[data-n="12"]')).toHaveClass(/\bdone\b/);
  expect((await readLS(page, "silvestre:done"))["12"]).toBe(true);
  // Sigue en el 12
  await expect(page.locator("#journal .journal-num")).toHaveText("12");
  await expect(page.locator("#toggleBtn")).toHaveText("Paso completado · deshacer");
});

test("deshacer un paso que se marcó solo reabre el último objetivo de su última misión", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep12(page);
  for (const name of ["Cofrología", "Tesorfanato", "El maleficio del cofre", "Las grandes galerías", "Espionaje industrial"]) {
    await page.locator("#journal .q-item", { hasText: name }).locator(".q-check").click();
  }
  await expect(page.locator("#toggleBtn")).toHaveText("Paso completado · deshacer");
  await page.locator("#toggleBtn").click();
  await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
  // La última misión vuelve a su último objetivo; las de antes siguen hechas
  const espionaje = page.locator("#journal .q-item", { hasText: "Espionaje industrial" });
  await expect(espionaje.locator(".q-check")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#journal .q-item", { hasText: "Cofrología" }).locator(".q-check")).toHaveAttribute("aria-pressed", "true");
  // En su último objetivo (12 de 12, el que sigue al 11.º)
  expect((await readLS(page, "silvestre:questObjective"))["1510"]).toBe(11);
  // Y no se vuelve a marcar solo
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 12");
});

test("la misión opcional no hace falta para que el paso se marque solo", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(6) });
  await page.click('.diary-row[data-n="7"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("7");
  const colera = page.locator("#journal .q-item", { hasText: "La cólera de los dioses" });
  // Pulsar su fila termina la única obligatoria: Arma letal (opcional) sigue sin hacer
  await colera.locator(".q-check").click();
  await expect(page.locator('.diary-row[data-n="7"]')).toHaveClass(/\bdone\b/);
  await expect(page.locator("#journal .journal-num")).toHaveText("7");
  await expect(page.locator("#journal .q-item", { hasText: "Arma letal" }).locator(".q-check")).toHaveAttribute("aria-pressed", "false");
});

test("completar una misión que va por delante no da por hechas las de antes ni marca el paso", async ({ page }) => {
  // Paso 21: «Cómo perder la pluma» se hace «en algún punto» del paso, y va la última
  await openApp(page, { "silvestre:done": upTo(20) });
  await page.click('.diary-row[data-n="21"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("21");
  const item = name => page.locator("#journal .q-item").filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });
  const pluma = item("Cómo perder la pluma");
  await expect(pluma).toBeVisible({ timeout: 15_000 });
  await pluma.locator(".q-check").click();
  await expect(pluma.locator(".q-check")).toHaveAttribute("aria-pressed", "true");
  // Las de Púrpura profundo que no terminó el 19 siguen pendientes, y el paso también
  for (const name of ["Remordimientos de eternala", "El anillo de Tot", "Como alma en pena", "El poder detrás del trono"]) {
    await expect(item(name).locator(".q-check")).toHaveAttribute("aria-pressed", "false");
  }
  await expect(page.locator('.diary-row[data-n="21"]')).not.toHaveClass(/done/);
  expect((await readLS(page, "silvestre:done"))["21"]).toBeUndefined();
  // La misión en curso sigue siendo la primera
  expect((await readLS(page, "silvestre:questPos") || {})["21"] || 0).toBe(0);
});

test("marcar el Dofus Turquesa (62) marca también el 38: «La sombra del reino» es opcional allí", async ({ page }) => {
  // El 38 hace las misiones 2, 3 y 4 de «Azul turquesa», que el 62 completa entero. Su
  // cuarta misión, «La sombra del reino», no es del logro: la guía dice que se puede lanzar
  // y hacer en cualquier punto antes del 80, así que no le impide quedar hecho
  await openApp(page, { "silvestre:done": upTo(37) });
  // Con las misiones ya cargadas (llegan en diferido): sin ellas no se sabe qué deja hecho
  await page.locator('.diary-row[data-n="62"] .row-num').click();
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  await page.locator('.diary-row[data-n="62"] .row-check').click();
  for (const n of [38, 39, 50, 62]) await expect(page.locator(`.diary-row[data-n="${n}"]`), `paso ${n}`).toHaveClass(/\bdone\b/, { timeout: 15_000 });
  // En el 38 sigue apareciendo, como opcional, con su nota
  await page.locator('.diary-row[data-n="38"] .row-num').click();
  const sombra = page.locator("#journal .q-item", { hasText: "La sombra del reino" });
  await expect(sombra).toBeVisible({ timeout: 15_000 });
  await expect(sombra.locator(".q-optional")).toHaveText("Opcional");
});
