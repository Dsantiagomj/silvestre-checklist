import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/data/weights.json", import.meta.url), "utf8"));
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w));
// El mismo redondeo que el hero: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
const BASE = sum(Array.from({ length: 11 }, (_, i) => WEIGHTS[i + 1].w)); // pasos 1 a 11 hechos
const Q12 = WEIGHTS[12].q; // Cofrología, Tesorfanato, El maleficio del cofre, Las grandes galerías, Espionaje industrial
const heroPct = page => page.locator("#heroPct");

const routeStates = rows => rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")).join(""));

async function openStep12(page) {
  await page.click('.diary-row[data-n="12"] .row-main');
  await expect(page.locator("#journal .journal-num")).toHaveText("12");
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

test("«Misión hecha» termina la misión, abre la siguiente y se puede deshacer, sin plegar ni desplegar", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(11) });
  await openStep12(page);
  const cofre = page.locator("#journal .q-item", { hasText: "Cofrología" });
  const tesor = page.locator("#journal .q-item", { hasText: "Tesorfanato" });
  const btn = cofre.locator(".q-done-btn");
  await cofre.locator("summary .q-name").click();
  await expect(cofre).toHaveAttribute("open", "");
  const rows = cofre.locator(".obj-list.route > .obj-row");
  expect(await routeStates(rows)).toMatch(/^n-+$/);
  await expect(btn).toHaveAttribute("aria-pressed", "false");

  // Pendiente: la termina entera, como pulsar su último medallón, y abre la siguiente
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(await routeStates(rows)).toMatch(/^d+$/);
  await expect(cofre).toHaveAttribute("open", "");
  await expect(tesor).toHaveAttribute("open", "");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:questPos"))["12"])).toBe(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:questObjective"))["1504"])).toBe(16);

  // Hecha: vuelve a su inicio, sin plegar la misión
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  expect(await routeStates(rows)).toMatch(/^n-+$/);
  await expect(cofre).toHaveAttribute("open", "");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:questPos"))["12"])).toBe(0);

  // Con la misión plegada, el botón tampoco la despliega
  await cofre.locator("summary .q-name").click();
  await expect(cofre).not.toHaveAttribute("open", "");
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(cofre).not.toHaveAttribute("open", "");
  expect(errors).toEqual([]);
});

test("el porcentaje suma cada misión hecha de un paso pendiente y la resta al deshacerla", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE)}%`);
  await openStep12(page);
  const btn = page.locator("#journal .q-item", { hasText: "Cofrología" }).locator(".q-done-btn");
  await btn.click();
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0])}%`);
  expect(pctOf(BASE + Q12[0])).toBeGreaterThan(pctOf(BASE));
  // La siguiente se suma encima; deshacer la primera deshace las dos (el avance es lineal)
  await page.locator("#journal .q-item", { hasText: "Tesorfanato" }).locator(".q-done-btn").click();
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0] + Q12[1])}%`);
  await btn.click();
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE)}%`);
});

test("el avance del overlay mueve el porcentaje sin abrir el diario", async ({ page }) => {
  const pctWith = async (questPos, questObj = {}) => {
    await page.evaluate(([p, o]) => {
      localStorage.setItem("silvestre:questPos", JSON.stringify(p));
      localStorage.setItem("silvestre:questObjective", JSON.stringify(o));
    }, [questPos, questObj]);
    await page.reload();
    await expect(page.locator(".map-node")).toHaveCount(100);
    return page.locator("#heroPct").innerText();
  };
  await openApp(page, { "silvestre:done": upTo(11) }, { view: "map" });
  // Va por la segunda misión: la primera, hecha
  expect(await pctWith({ 12: 1 })).toBe(`${pctOf(BASE + Q12[0])}%`);
  // En la última, sin terminar: las cuatro de antes
  expect(await pctWith({ 12: 4 }, { 1510: 11 })).toBe(`${pctOf(BASE + sum(Q12.slice(0, 4)))}%`);
  // La última, pasada de su último objetivo: el paso entero, como marcarlo
  expect(await pctWith({ 12: 4 }, { 1510: 12 })).toBe(`${pctOf(BASE + WEIGHTS[12].w)}%`);
  expect(await pctWith({})).toBe(`${pctOf(BASE)}%`);
});

test("en un paso hecho, «Misión hecha» sale hecho y no se pulsa", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(12) });
  await openStep12(page);
  const btns = page.locator("#journal .q-item .q-done-btn");
  await expect(btns).toHaveCount(5);
  for (const b of await btns.all()) {
    await expect(b).toBeDisabled();
    await expect(b).toHaveAttribute("aria-pressed", "true");
  }
});

test("un paso de una sola misión no lleva «Misión hecha»: lo hace «Paso hecho»", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-main');
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(page.locator("#journal .q-item")).toHaveCount(1, { timeout: 15_000 });
  await expect(page.locator("#journal .q-done-btn")).toHaveCount(0);
});
