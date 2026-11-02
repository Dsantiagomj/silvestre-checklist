import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// La guía sigue la orden de Bonta Espíritu de la salvación, y Torrente Arcano lista en el
// paso 78 los recursos de las tres órdenes. Solo quedan los de la suya (CHOSEN_ORDER en
// .build/dofus/silvestre.py). Su misión de orden 3 («adepto a las escrituras») para ante
// Roble Blando, y la 4 («Maestro de los Pergaminos») pide la 3 terminada (QF>121): va al
// paso 80, donde se pasan Roble Blando y Ugah (TEXT_FIXES, STEP_EXTRA)

const ESPIRITU = "Orden Espíritu de la salvación";
const ORDER_3 = "Aprendizaje: adepto a las escrituras";
const ORDER_4 = "Aprendizaje: Maestro de los Pergaminos";

async function openStep(page, n) {
  // Por el número: en el centro de la fila puede caer la etiqueta "cierra el…"
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .asset-note", { hasText: "Cargando misiones" })).toHaveCount(0, { timeout: 15_000 });
}

const quests = page => page.locator("#journal .q-item .q-name").allInnerTexts();
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });

test("el paso 78 llega a la misión de orden 3 y para ante Roble Blando", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 78);
  await expect(page.locator("#journal .journal-title")).toContainText("Hasta la misión de orden 3");
  expect(await quests(page)).toEqual(["Aprendizaje: Discípulo de Jiva", "Aprendizaje: Aprendiz iluminado", ORDER_3]);
  // La parada, en la misión de orden 3: antes de explorar el Claro del Roble Blando
  const q3 = quest(page, ORDER_3);
  await expect(q3.locator(".obj-stop")).toHaveText("Hasta tener que pasar Roble Blando");
  await expect(q3.locator(".obj-stop + .obj-row")).toContainText("Explora el Claro del Roble Blando");
  // La nota de la guía, para una sola orden: Roble Blando se pasa en el 80, con Ugah
  const note = page.locator("#journal .call.note", { hasText: "Roble Blando se pasa en el inciso" });
  await expect(note).toContainText("junto a Ugah, con el ídolo del dios Sadida");
  await expect(note.locator('.step-ref[data-n="80"]')).toHaveCount(1);
  await expect(page.locator("#journal")).not.toContainText("Si se escoge la orden");
  await expect(page.locator("#journal .call.closedin")).toContainText("paso 80");
  expect(errors).toEqual([]);
});

test("el paso 77 para ante Roble Blando, que se pasa en el 80 junto a Ugah", async ({ page }) => {
  await openApp(page);
  await openStep(page, 77);
  const stop = page.locator("#journal .call.stop");
  await expect(stop).toContainText("Hasta tener que pasar Roble Blando con el ídolo del dios Sadida");
  await expect(stop).not.toContainText("según la orden");
  await stop.locator('.step-ref[data-n="80"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("80");
});

test("el paso 80 hace la misión de orden 4 tras «Alma máster», hasta Ugah, y sigue cerrando el 77 y el 78", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 80);
  expect(await quests(page)).toEqual(["La última piedra", "Alma máster", ORDER_4]);
  // Las dos misiones pasan Ugah: la línea de lo que se resuelve va antes de su objetivo
  await expect(quest(page, "Alma máster").locator(".obj-resume + .obj-row")).toContainText("Vence a 1 x Ugah");
  await expect(quest(page, ORDER_4).locator(".obj-resume + .obj-row")).toContainText("Encuentra la estatuilla de Sumens");
  const note = page.locator("#journal .call.note", { hasText: "misión de orden 4" });
  await expect(note).toContainText("Tras pasar Roble Blando se termina la misión de orden 3");
  await expect(note).toContainText("hasta tener que pasar Ugah, que la termina");
  await expect(page.locator('.diary-row[data-n="80"]')).toContainText("cierra el 77, 78");
  expect(errors).toEqual([]);
});

test("el paso 78 solo pide los recursos de la orden Espíritu de la salvación", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 78);
  const slots = page.locator("#journal .journal-needs .slot");
  await expect(slots.first()).toBeVisible();
  const ids = await slots.evaluateAll(els => els.map(e => e.dataset.id));
  expect(ids.length).toBeGreaterThan(0);
  for (const id of ids) expect(id).toMatch(/@orden espiritu de la salvacion$/);
  // Cada casilla dice de qué orden es
  for (const tip of await slots.locator(".slot-tip").allTextContents()) expect(tip).toContain(ESPIRITU);
  await expect(page.locator("#journal .journal-needs")).not.toContainText("Corazón valiente");
  await expect(page.locator("#journal .journal-needs")).not.toContainText("Ojo atento");
  expect(errors).toEqual([]);
});

test("el paso 78 enlaza las misiones de orden de Corazón valiente y Ojo atento, por si se elige otra", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 78);
  const note = page.locator("#journal .call.note", { hasText: "¿Otra orden?" });
  await expect(note).toHaveCount(1);
  await expect(note.locator("b")).toHaveText("Nota");
  const SITE = "https://www.torrentearcano.com/aprendizaje-";
  const links = {
    // Corazón valiente (Menalt)
    "Discípulo de Menalt": "discipulo-de-menalt", "Escudero": "escudero",
    "Caballero de la esperanza": "caballero-de-la-esperanza", "Campeón maravilloso": "campeon-maravilloso",
    // Ojo atento (Silvosse)
    "Discípulo de Silvosse": "discipulo-de-silvosse", "Espía silencioso": "espia-silencioso",
    "Cazador de renegados": "cazador-de-renegados", "Asesino supremo": "asesino-supremo",
  };
  await expect(note.locator("a.guide-link")).toHaveCount(Object.keys(links).length);
  for (const [name, slug] of Object.entries(links)) {
    await expect(note.locator("a.guide-link", { hasText: name })).toHaveAttribute("href", SITE + slug);
  }
  await expect(note).toContainText("Corazón valiente");
  await expect(note).toContainText("Ojo atento");
  expect(errors).toEqual([]);
});

test("los prerrequisitos explican que la guía sigue la orden Espíritu de la salvación", async ({ page }) => {
  const errors = await openApp(page, null, { view: "prereqs" });
  const note = page.locator("#prereqs .pr-order");
  await expect(note).toHaveCount(1);
  await expect(note.locator("b")).toHaveText("La guía sigue la orden Espíritu de la salvación");
  await expect(note).toContainText("solo se listan los recursos de esa orden");
  await expect(note).toContainText("Corazón valiente");
  await expect(note).toContainText("Ojo atento");
  // Va junto al aviso del Dofus Ocre, con su mismo estilo, y lleva al paso 78
  await expect(page.locator("#prereqs .pr-ocre + .pr-order")).toHaveCount(1);
  await note.locator('.step-ref[data-n="78"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("78");
  expect(errors).toEqual([]);
});
