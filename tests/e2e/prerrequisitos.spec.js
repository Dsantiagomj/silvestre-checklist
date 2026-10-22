import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Una misión solo da por terminada a otra anterior si la necesita terminada para empezar
// (su startCriterion en DofusDB). PREREQS lleva, de cada misión de la ruta, todas las de
// la ruta que tiene detrás, también las que necesita a través de otras

const QUESTS = JSON.parse(readFileSync(new URL("../../src/data/quests.json", import.meta.url), "utf8"));
const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/data/weights.json", import.meta.url), "utf8"));
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w));
// El mismo redondeo que el hero: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
const BASE = sum(Array.from({ length: 11 }, (_, i) => WEIGHTS[i + 1].w)); // pasos 1 a 11 hechos
const Q12 = WEIGHTS[12].q; // Cofrología, Tesorfanato, El maleficio del cofre, Las grandes galerías, Espionaje industrial
const heroPct = page => page.locator("#heroPct");
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
// Por el nombre exacto: otras misiones nombran a esta en sus objetivos
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator("summary .q-name").getByText(name, { exact: true }) });
const btn = (page, name) => quest(page, name).locator(".q-done-btn");
const done = (page, name) => expect(btn(page, name)).toHaveAttribute("aria-pressed", "true");
const pending = (page, name) => expect(btn(page, name)).toHaveAttribute("aria-pressed", "false");

async function openStep(page, n) {
  await row(page, n).locator(".row-num").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

test("el build saca de DofusDB qué misiones de la ruta necesita terminadas cada una", () => {
  const { PREREQS } = QUESTS;
  // Qf=X: «Toro de rodeo» pide «El libro de los toros»
  expect(PREREQS[1522]).toContain(1521);
  // Y en cadena: «El tesoro de Totankama» pide «Toro de rodeo», que pide «El libro de los
  // toros», que pide «La hechicera de los pantanos»
  expect(PREREQS[1523]).toEqual(expect.arrayContaining([1462, 1521, 1522]));
  // Una alternativa no obliga: «Cómo perder la pluma» se lanza con «El tesoro de Totankama»
  // empezada o terminada ((Qa=1523&Qo>8635)|Qf=1523), y no pide ninguna de su paso
  expect(PREREQS[1527]).toBeUndefined();
  // Qa= solo la pide empezada: «La razón del más fuerte» no pide «La eterna cosecha»
  expect(PREREQS[2442]).not.toContain(439);
  // En el 16 solo «La huida es la mejor salida» pide otra de los Cazadores
  expect(PREREQS[1849]).toEqual([1848]);
  for (const id of [1851, 1846, 1854, 1848, 1850, 1847]) expect(PREREQS[id]).toBeUndefined();
  // Las de varias clases cuentan como la fila «Misión de clase», que pide «Consejo de clase»
  expect(PREREQS[1960]).toContain("clase");
  expect(PREREQS.clase).toEqual([1958, 1959, 2009]);
  // Y las del «Prólogo invernal» (una por alineamiento), como su fila
  expect(PREREQS[1317]).toEqual(["alt:554:2751"]);
  // Solo filas de la ruta, en orden
  const route = new Set(Object.values(QUESTS.STEP_QUESTS).flat().map(String));
  for (const [id, need] of Object.entries(PREREQS)) {
    expect(route.has(id)).toBe(true);
    for (const x of need) expect(route.has(String(x))).toBe(true);
    expect(need).not.toContain(isNaN(id) ? id : Number(id));
  }
});

test("en el 16, completar «Con las mismas armas» no completa las otras de los Cazadores", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(15) });
  await openStep(page, 16);
  await btn(page, "Con las mismas armas").click();
  await done(page, "Con las mismas armas");
  for (const name of ["Directo al mulaguabús", "Sin denominación de origen", "El vals de manuales",
    "Nuestros amigos los animalitos", "La huida es la mejor salida", "Shyriiwook"]) await pending(page, name);
  await expect(row(page, 16)).not.toHaveClass(/\bdone\b/);
  // «La huida es la mejor salida» sí pide «Nuestros amigos los animalitos» terminada
  await btn(page, "La huida es la mejor salida").click();
  await done(page, "Nuestros amigos los animalitos");
  await pending(page, "Shyriiwook");
  expect(errors).toEqual([]);
});

test("en un paso en cadena, completar una misión completa las que necesita y el porcentaje las suma", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  // «El maleficio del cofre» pide «Tesorfanato», que pide «Cofrología»; «Las grandes
  // galerías» no hace falta
  await btn(page, "El maleficio del cofre").click();
  await done(page, "Cofrología");
  await done(page, "Tesorfanato");
  await pending(page, "Las grandes galerías");
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0] + Q12[1] + Q12[2])}%`);
  // No se guardan: son de la que las pide
  const objs = await readLS(page, "silvestre:questObjective");
  expect(objs["1504"]).toBeUndefined();
  expect(objs["1505"]).toBeUndefined();
  // Y la última de la cadena las pide todas: el paso queda hecho solo
  await btn(page, "Espionaje industrial").click();
  await done(page, "Las grandes galerías");
  await expect(row(page, 12)).toHaveClass(/\bdone\b/);
});

test("deshacer la misión que las pedía deja como estaban las que daba por hechas", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11), "silvestre:questObjective": { 1504: 16 } });
  await openStep(page, 12);
  await btn(page, "El maleficio del cofre").click();
  await done(page, "Tesorfanato");
  // Sola no se deshace: se deshace la que la pide
  await expect(btn(page, "Tesorfanato")).toBeDisabled();
  await expect(btn(page, "Tesorfanato")).toHaveAttribute("title", "Completada: la pide terminada «El maleficio del cofre»");
  await expect(btn(page, "Cofrología")).toBeEnabled();
  await btn(page, "El maleficio del cofre").click();
  await pending(page, "El maleficio del cofre");
  await pending(page, "Tesorfanato");
  await expect(btn(page, "Tesorfanato")).toBeEnabled();
  // La que estaba hecha de verdad sigue hecha
  await done(page, "Cofrología");
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0])}%`);
});

test("completar una misión da por hechas las que necesita aunque sean de otro paso", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(18) });
  // «Como alma en pena», en el 21, pide «El tesoro de Totankama», del 19 (y lo de antes)
  await openStep(page, 21);
  await btn(page, "Como alma en pena").click();
  await done(page, "El tesoro de Totankama");
  await pending(page, "Remordimientos de eternala");
  await pending(page, "El anillo de Tot");
  await openStep(page, 19);
  for (const name of ["El libro de los toros", "Toro de rodeo", "El tesoro de Totankama"]) await done(page, name);
  await pending(page, "A la leche caliente, batir de repente");
  await expect(row(page, 19)).not.toHaveClass(/\bdone\b/);
});

test("el progreso guardado con la misión en curso pasa a sus misiones: las de antes quedan completadas", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) }, { view: "map" });
  // Progreso de antes: en el 12 se iba por la 3.ª, y «Las grandes galerías» iba a medias
  await page.evaluate(() => {
    localStorage.setItem("silvestre:questPos", JSON.stringify({ 12: 2 }));
    localStorage.setItem("silvestre:questObjective", JSON.stringify({ 1507: 2 }));
    localStorage.removeItem("silvestre:questModel");
  });
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
  // El mismo porcentaje que antes: las dos de antes de la actual
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0] + Q12[1])}%`);
  expect(await readLS(page, "silvestre:questObjective")).toEqual({ 1504: 16, 1505: 11, 1507: 2 });
  expect(await readLS(page, "silvestre:questPos")).toEqual({ 12: 2 });
  expect(await readLS(page, "silvestre:questModel")).toBe(2);
  // Solo una vez: lo que se deshaga después no vuelve
  await page.evaluate(() => localStorage.setItem("silvestre:questObjective", JSON.stringify({ 1504: 16 })));
  await page.reload();
  await expect(heroPct(page)).toHaveText(`${pctOf(BASE + Q12[0])}%`);
});
