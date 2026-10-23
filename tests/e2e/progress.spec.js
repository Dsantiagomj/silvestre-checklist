import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * El porcentaje de la barra pesa cada paso por sus misiones, y terminar la guía es tener
 * el Dofus: todo lo que pide cuenta como reunido.
 */

test("el peso de una misión es su nivel por la raíz de sus objetivos", async () => {
  const read = f => JSON.parse(readFileSync(new URL(`../../src/dofus/silvestre/${f}`, import.meta.url), "utf8"));
  const weights = read("weights.json");
  // 29 y 30: misiones de nivel 110 (mínimo en Torrente Arcano); las tres de Mel del 29 con 2
  // objetivos cada una, la del 30 con 7
  expect(weights["29"].w).toBeCloseTo(3 * 110 * Math.sqrt(2), 1);
  expect(weights["30"].w).toBeCloseTo(110 * Math.sqrt(7), 1);
  // «La eterna cosecha» (paso 79, 339 objetivos) pesa mucho, pero la raíz lo contiene. Su
  // nivel no es el 40 de empezarla: es la media de los 337 archimonstruos que pide (73,8)
  expect(weights["79"].w / Math.sqrt(339)).toBeCloseTo(73.8, 1);
  // Lo que vale cada misión del paso suma lo que vale el paso
  for (const { w, q } of Object.values(weights)) expect(q.reduce((a, p) => a + p, 0)).toBeCloseTo(w, 1);
});

test("el porcentaje pesa cada paso por el nivel de sus misiones", async ({ page }) => {
  const pctWith = async done => {
    await page.evaluate(d => localStorage.setItem("silvestre:done", JSON.stringify(d)), done);
    await page.reload();
    await expect(page.locator(".diary-row")).toHaveCount(100);
    return parseFloat(await page.locator("#winPct").innerText());
  };
  await openApp(page);
  expect(await pctWith({})).toBe(0);
  // El 1 son misiones de nivel bajo; el 61, misiones de nivel 200: pesa mucho más
  const first = await pctWith({ 1: true });
  const heavy = await pctWith({ 61: true });
  expect(first).toBeGreaterThan(0);
  expect(heavy).toBeGreaterThan(first * 5);
  // Todo pesa algo: sin el 4, una sola misión de nivel 15, no se llega al 100
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  expect(await pctWith(all)).toBe(100);
  expect(await pctWith({ ...all, 4: false })).toBeLessThan(100);
  expect(await pctWith({ 4: true })).toBeGreaterThan(0);
});

test("con el Dofus obtenido, prerrequisitos y objetos cuentan como completos", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  // Sin haber marcado nada a mano: terminar la guía implica tenerlo todo
  await expect(page.locator("#prereqsCount")).toHaveText("✓");
  await expect(page.locator("#itemsCount")).toHaveText("✓");
  await page.click("#tabPrereqs");
  await expect(page.locator(".pr-card:not(.done)")).toHaveCount(0);
  await page.click("#tabItems");
  await expect(page.locator("#items .slot:not(.owned)")).toHaveCount(0);
  // El diálogo de reinicio cuenta lo mismo que se ve en la página
  await page.click("#moreBtn");
  await page.click("#resetBtn");
  await expect(page.locator("#rdNPre")).toHaveText("20");
});

test("con los 100 pasos hechos, la barra dice que el Dofus está obtenido y los del camino, todos", async ({ page }) => {
  // La barra compacta, la de las pantallas bajas
  await page.setViewportSize({ width: 1280, height: 720 });
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  await expect(page.locator("#winPct")).toHaveText("100%");
  await expect(page.locator("#winProgress")).toContainText("¡Obtenido!");
  await expect(page.locator("#roadBtn .road-count")).toHaveText("12/12");
  await page.click("#roadBtn");
  await expect(page.locator("#winRoad .road-dofus.obtained")).toHaveCount(12);
  await expect(page.locator("#diaryNext")).toBeDisabled();
  await expect(page.locator("#diaryNext")).toHaveText("Guía completa");
});
