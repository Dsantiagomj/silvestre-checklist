import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const read = f => JSON.parse(readFileSync(new URL(`../../src/data/${f}`, import.meta.url), "utf8"));
const WEIGHTS = read("weights.json");
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w));
// El mismo redondeo que el hero: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
// Pasos 1 a n hechos. Con el 22 hecho, «Veneno de scorbuto para la prisión», que también
// lleva el 36, cuenta allí como terminada
const base = n => sum(Array.from({ length: n }, (_, i) => WEIGHTS[i + 1].w)) + (n >= 22 ? WEIGHTS[36].q[0] : 0);
const heroPct = page => page.locator("#heroPct");
const routeStates = rows => rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")).join(""));
const quest = (page, name) => page.locator("#journal .q-item", { hasText: name });

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-main`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

test("las misiones opcionales y las de solo tomarla no pesan en el porcentaje", async () => {
  const { STEP_QUESTS, STEP_QUEST_KINDS } = read("quests.json");
  expect(STEP_QUEST_KINDS).toEqual({ 7: { 1939: "optional" }, 27: { 646: "optional" }, 28: { 1286: "take" }, 83: { 2013: "take" } });
  for (const [n, kinds] of Object.entries(STEP_QUEST_KINDS)) {
    const { w, q } = WEIGHTS[n];
    STEP_QUESTS[n].forEach((id, i) => { if (kinds[id]) expect(q[i]).toBe(0); });
    expect(sum(q)).toBeCloseTo(w, 3);
  }
  expect(WEIGHTS[7].w).toBeCloseTo(100, 3);
  expect(WEIGHTS[27].w).toBeCloseTo(264.575, 3);
  expect(WEIGHTS[28].w).toBeCloseTo(364.829, 3);
  expect(WEIGHTS[83].w).toBeCloseTo(1085.307, 3);
  expect(TOTAL).toBeCloseTo(155339, 0);
  // El id y los objetivos de cada misión, en el orden del paso
  expect([WEIGHTS[7].ids, WEIGHTS[7].os]).toEqual([["1938", "1939"], [4, 18]]);
  expect([WEIGHTS[27].ids, WEIGHTS[27].os]).toEqual([["646", "543"], [17, 7]]);
  expect([WEIGHTS[28].ids, WEIGHTS[28].os]).toEqual([["577", "1286"], [11, 3]]);
  expect([WEIGHTS[83].ids, WEIGHTS[83].os]).toEqual([["2010", "2011", "2013"], [9, 27, 17]]);
});

test("paso 28: «Luces y sombras» solo hay que tomarla, sin objetivos ni «Completar»", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(27) });
  await openStep(page, 28);
  const luces = quest(page, "Luces y sombras");
  await expect(luces.locator(".q-take")).toHaveText("Solo tomarla");
  await expect(luces.locator(".q-take")).toHaveCSS("border-top-style", "solid");
  await luces.locator("summary .q-name").click();
  await expect(luces.locator(".q-start").first()).toContainText("Waldos FieldChester Potcobble");
  await expect(luces.locator(".q-take-note")).toHaveText("No hace falta hacerla: basta con tenerla tomada.");
  await expect(luces.locator(".obj-row")).toHaveCount(0);
  // Una sola misión obligatoria: «Paso hecho» la termina, el botón sobra
  await expect(page.locator("#journal .q-done-btn")).toHaveCount(0);
  await expect(page.locator("#journal .q-take")).toHaveCount(1);
  await expect(page.locator("#journal .q-optional")).toHaveCount(0);

  // El paso hecho suma su peso entero, sin «Luces y sombras»
  await page.locator("#toggleBtn").click();
  await expect(heroPct(page)).toHaveText(`${pctOf(base(28))}%`);
  expect(errors).toEqual([]);
});

test("paso 28: terminar «Pesca en aguas congeladas» no lleva a «Luces y sombras»", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(27) });
  await openStep(page, 28);
  const pesca = quest(page, "Pesca en aguas congeladas");
  await pesca.locator("summary .q-name").click();
  await pesca.locator(".obj-list.route > .obj-row").last().locator(".obj-med").click();
  expect(await routeStates(pesca.locator(".obj-list.route > .obj-row"))).toMatch(/^d+$/);
  expect((await readLS(page, "silvestre:questPos"))["28"]).toBe(0);
  // Terminada la única obligatoria, cuenta el paso entero
  await expect(heroPct(page)).toHaveText(`${pctOf(base(28))}%`);
});

test("paso 7: «Paso hecho» no marca «Arma letal», que se sigue completando a mano sin mover el porcentaje", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(6) });
  await openStep(page, 7);
  const colera = quest(page, "La cólera de los dioses");
  const arma = quest(page, "Arma letal");
  // Una sola misión obligatoria: la cólera no lleva «Completar»; la opcional sí
  await expect(colera.locator(".q-done-btn")).toHaveCount(0);
  const btn = arma.locator(".q-done-btn");
  await expect(btn).toHaveText("Completar");

  // Completar la opcional no mueve ni el porcentaje ni la misión en curso
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(heroPct(page)).toHaveText(`${pctOf(base(6))}%`);
  expect((await readLS(page, "silvestre:questPos"))?.["7"] ?? 0).toBe(0);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(heroPct(page)).toHaveText(`${pctOf(base(6))}%`);

  // Con el paso hecho, la cólera sale hecha y «Arma letal» sigue pendiente
  await page.locator("#toggleBtn").click();
  await openStep(page, 7);
  await expect(heroPct(page)).toHaveText(`${pctOf(base(7))}%`);
  await colera.locator("summary .q-name").click();
  expect(await routeStates(colera.locator(".obj-list.route > .obj-row"))).toMatch(/^d+$/);
  await arma.locator("summary .q-name").click();
  expect(await routeStates(arma.locator(".obj-list.route > .obj-row"))).not.toMatch(/^d+$/);
  await expect(btn).toBeEnabled();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  // La parada roja sigue dentro de «Arma letal»
  await expect(arma.locator(".obj-stop")).toHaveCount(1);

  // Y se completa a mano, también con el paso hecho, sin mover el porcentaje
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  expect(await routeStates(arma.locator(".obj-list.route > .obj-row"))).toMatch(/^d+$/);
  await expect(heroPct(page)).toHaveText(`${pctOf(base(7))}%`);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(heroPct(page)).toHaveText(`${pctOf(base(7))}%`);
  expect(errors).toEqual([]);
});

test("paso 27: «La marcha de la emperatriz» suma sus puntos; «Star ski y Dutch» no", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(26) });
  await openStep(page, 27);
  const star = quest(page, "Star ski y Dutch");
  const marcha = quest(page, "La marcha de la emperatriz");
  await expect(heroPct(page)).toHaveText(`${pctOf(base(26))}%`);

  // La opcional: ni el porcentaje ni la misión en curso se mueven
  await star.locator(".q-done-btn").click();
  await expect(star.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(heroPct(page)).toHaveText(`${pctOf(base(26))}%`);
  expect((await readLS(page, "silvestre:questPos"))?.["27"] ?? 0).toBe(0);
  await star.locator(".q-done-btn").click();
  await expect(star.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "false");

  // La única obligatoria no lleva «Completar»: se termina con su último medallón. Suma
  // lo que vale y la opcional sigue sin hacer
  await expect(marcha.locator(".q-done-btn")).toHaveCount(0);
  await marcha.locator("summary .q-name").click();
  const rows = marcha.locator(".obj-list.route > .obj-row");
  await rows.last().locator(".obj-med").click();
  expect(await routeStates(rows)).toMatch(/^d+$/);
  await expect(heroPct(page)).toHaveText(`${pctOf(base(26) + WEIGHTS[27].q[1])}%`);
  await expect(star.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "false");
  await star.locator("summary .q-name").click();
  expect(await routeStates(star.locator(".obj-list.route > .obj-row"))).not.toMatch(/^d+$/);
});

test("el overlay entra en «Arma letal» y salta «Luces y sombras»", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(6) });
  await openStep(page, 7);
  const [ov] = await Promise.all([context.waitForEvent("page"), page.click("#overlayBtn")]);
  await expect(ov.locator(".ov-qhead .ov-title")).toHaveText("La cólera de los dioses", { timeout: 10_000 });
  await ov.click('[data-q="1"]');
  await expect(ov.locator(".ov-qhead .ov-title")).toHaveText("Arma letal");

  await page.bringToFront();
  await openStep(page, 28);
  await expect(ov.locator(".ov-qhead .ov-title")).toHaveText("Pesca en aguas congeladas");
  await expect(ov.locator(".ov-switch")).toContainText("Misión 1 / 1");
  await expect(ov.locator('[data-q="1"]')).toBeDisabled();
});

test("paso 83: «Birk, hija de Bork» con la misión que pide antes y «La biblia de los rencores» solo tomada", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(82) });
  await openStep(page, 83);
  // No el logro entero: la misión que nombra, la que la abre y la que deja tomada
  await expect(page.locator("#journal .q-item summary .q-name")).toHaveText(
    ["Llama, amigo y entra", "Birk, hija de Bork", "La biblia de los rencores"]);
  const biblia = quest(page, "La biblia de los rencores");
  await expect(biblia.locator(".q-take")).toHaveText("Solo tomarla");
  // La parada roja, justo tras vencer a Dazahk y recibir «La biblia de los rencores»
  const birk = quest(page, "Birk, hija de Bork");
  await birk.locator("summary .q-name").click();
  await expect(birk.locator(".obj-stop")).toHaveCount(1);
  await expect(birk.locator(".obj-stop")).toContainText("Hasta justo después de pasar Dazahk Martegel");
  await expect(page.locator("#journal .obj-stop")).toHaveCount(1);
  expect(errors).toEqual([]);
});
