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
