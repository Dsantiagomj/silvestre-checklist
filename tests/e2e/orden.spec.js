import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// La guía sigue la orden de Bonta Espíritu de la salvación: el paso 78 («Hasta la misión
// de orden 4») lleva sus cuatro misiones, y Torrente Arcano lista los recursos de las tres
// órdenes. Solo quedan los de la suya (CHOSEN_ORDER en .build/dofus/silvestre.py)

const ESPIRITU = "Orden Espíritu de la salvación";

async function openStep(page, n) {
  // Por el número: en el centro de la fila puede caer la etiqueta "cierra el…"
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .asset-note", { hasText: "Cargando misiones" })).toHaveCount(0, { timeout: 15_000 });
}

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
