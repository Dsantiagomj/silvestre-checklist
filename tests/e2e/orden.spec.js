import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, readLS } from "./helpers.js";

// La guía sigue la orden de Bonta Espíritu de la salvación. Torrente Arcano lista en el
// paso 78 los recursos de las tres órdenes: solo quedan los de la suya, como objetos de
// siempre, sin grupo (CHOSEN_ORDER en .build/dofus/silvestre.py). Su misión de orden 3
// («adepto a las escrituras») para ante Roble Blando, y la 4 («Maestro de los
// Pergaminos») pide la 3 terminada (QF>121): va al paso 80, donde se pasan Roble Blando y
// Ugah, con sus objetos (TEXT_FIXES, STEP_EXTRA y MOVED)

const RESOURCES = JSON.parse(fs.readFileSync(new URL("../../src/dofus/silvestre/resources.json", import.meta.url), "utf8"));
const ORDER_3 = "Aprendizaje: adepto a las escrituras";
const ORDER_4 = "Aprendizaje: Maestro de los Pergaminos";
// Los objetos de la misión de orden 4 (DofusDB y su guía): Pócima de envejecimiento, Polvos
// mágicos, Mandrágora, Mijo, Tenca, Corteza de abrakno oscuro y Cuerda de escalada
const ORDER_4_ITEMS = ["17060", "519", "16389", "16456", "16469", "16154", "9935"];

async function openStep(page, n) {
  // Por el número: en el centro de la fila puede caer la etiqueta "cierra el…"
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .asset-note", { hasText: "Cargando misiones" })).toHaveCount(0, { timeout: 15_000 });
}
const needs = page => page.locator("#journal .journal-needs .slot").evaluateAll(els => els.map(e => e.dataset.id));
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

test("los objetos de la misión de orden 4 van al paso 80 y el 78 guarda los de la 2", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 78);
  // «Aprendiz iluminado»: 15 Polvos mágicos y la Pócima de resucitador, sin grupo ni «Orden»
  expect(await needs(page)).toEqual(["519", "14443"]);
  await expect(page.locator("#journal .journal-needs .slot-tag")).toHaveCount(0);
  await expect(page.locator('#journal .journal-needs .slot[data-id="519"] .q')).toHaveText("15");
  await openStep(page, 80);
  const s80 = await needs(page);
  for (const id of ORDER_4_ITEMS) expect(s80).toContain(id);
  await expect(page.locator('#journal .journal-needs .slot[data-id="519"] .q')).toHaveText("10");
  await expect(page.locator('#journal .journal-needs .slot[data-id="519"] .slot-tip')).toContainText(ORDER_4.replace("Aprendizaje: ", ""));
  await expect(page.locator("#journal .journal-needs .slot-tag")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("en Objetos cuentan como los demás: una casilla por objeto, sumada con la de otros pasos", async ({ page }) => {
  await openApp(page, null, { view: "items" });
  await page.click('.needs-sort [data-sort="qty"]');
  await expect(page.locator('#items .slot[data-id*="@orden"]')).toHaveCount(0);
  // Los Polvos mágicos: los 15 del 78 y los 10 del 80 suman con los de los demás pasos
  const rows = Object.entries(RESOURCES.steps).filter(([, rs]) => rs.some(r => r.k === "519"));
  const total = rows.flatMap(([, rs]) => rs).filter(r => r.k === "519").reduce((a, r) => a + r.a[0][1], 0);
  expect(rows.map(([n]) => n)).toEqual(expect.arrayContaining(["78", "80"]));
  const polvos = page.locator('#items .slot[data-id="519"]');
  await expect(polvos).toHaveCount(1);
  await expect(polvos.locator(".q")).toHaveText(String(total));
  await expect(polvos.locator(".slot-tag")).toHaveCount(0);
  // Con más de cuatro pasos el aviso nombra tres y cuenta el resto
  await expect(polvos.locator(".slot-tip")).toContainText(rows.length > 4 ? `y ${rows.length - 3} más` : "80");
});

test("lo conseguido con las claves de la orden pasa a las nuevas al cargar", async ({ page }) => {
  await openApp(page);
  // Guardado por la versión de antes (sin silvestre:ownedModel): el objeto entero y
  // partes de un paso
  await page.evaluate(() => {
    localStorage.setItem("silvestre:owned", JSON.stringify({
      "519@orden espiritu de la salvacion": true,
      "17060@orden espiritu de la salvacion#78": true,
      "14443@orden espiritu de la salvacion#78": true,
      "311": true,
    }));
    localStorage.removeItem("silvestre:ownedModel");
  });
  await page.reload();
  await expect(page.locator(".diary-row")).toHaveCount(100);
  expect(await readLS(page, "silvestre:ownedModel")).toBe(1);
  await expect.poll(() => readLS(page, "silvestre:owned")).toEqual({
    "519#78": true, "519#80": true, "17060#80": true, "14443#78": true, "311": true,
  });
  await openStep(page, 78);
  for (const id of ["519", "14443"]) await expect(page.locator(`#journal .journal-needs .slot[data-id="${id}"]`)).toHaveClass(/owned/);
  await openStep(page, 80);
  for (const id of ["519", "17060", "311"]) await expect(page.locator(`#journal .journal-needs .slot[data-id="${id}"]`)).toHaveClass(/owned/);
  await expect(page.locator('#journal .journal-needs .slot[data-id="16389"]')).not.toHaveClass(/owned/);
  // Y se queda así al recargar
  await page.reload();
  expect(await readLS(page, "silvestre:owned")).toEqual({
    "519#78": true, "519#80": true, "17060#80": true, "14443#78": true, "311": true,
  });
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
