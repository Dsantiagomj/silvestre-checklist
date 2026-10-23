import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Las misiones del diario: el título enlaza a su guía de Torrente Arcano; pulsar la fila
// (o su ✓) la completa y otra vez la deshace. Sin «Completar». Las que llevan en el paso
// la línea de «hasta dónde» (aquí se detiene) o la verde de dónde se retoma van abiertas
// con sus etapas mientras no estén hechas: completarlas las pliega y deshacerlas las abre
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });

/**
 * Pulsa la fila de la misión donde va `sel` (su nivel, su «!»): con el ratón en ese punto,
 * como la persona; lo que hay ahí es el interruptor que cubre la fila.
 */
async function clickRow(item, sel = ".q-lv") {
  const box = await item.locator(sel).first().boundingBox();
  await item.page().mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

/** Las guías de Torrente Arcano, sin salir a la red: una página vacía. */
const stubGuides = context => context.route("https://www.torrentearcano.com/**", r => r.fulfill({ contentType: "text/html", body: "<title>guía</title>" }));

test("el título de la misión es el enlace a su guía y no hay botón «Guía» ni «Completar»", async ({ page, context }) => {
  await stubGuides(context);
  const errors = await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  await expect(page.locator("#journal .q-guide, #journal .q-done-btn")).toHaveCount(0);
  await expect(page.locator("#journal .q-item", { hasText: /Guía|Completar/ })).toHaveCount(0);
  const cofre = quest(page, "Cofrología");
  const title = cofre.locator("a.q-name");
  await expect(title).toHaveAttribute("href", "https://www.torrentearcano.com/cofrologia");
  await expect(title).toHaveAttribute("target", "_blank");
  await expect(title).toHaveAttribute("rel", /noopener/);
  // Pulsarlo abre la guía en otra pestaña y no completa la misión
  const [guide] = await Promise.all([context.waitForEvent("page"), title.click()]);
  await guide.waitForLoadState();
  expect(guide.url()).toBe("https://www.torrentearcano.com/cofrologia");
  await guide.close();
  await expect(cofre.locator(".q-check")).toHaveAttribute("aria-pressed", "false");
  expect((await readLS(page, "silvestre:questObjective")) || {}).toEqual({});
  // El título no va dentro del interruptor
  await expect(page.locator("#journal button a, #journal button .q-name")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("pulsar la fila de una misión la completa y otra vez la deshace, sin desplegarla", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  const cofre = quest(page, "Cofrología");
  const check = cofre.locator(".q-check");
  await expect(cofre.locator(".obj-list")).toHaveCount(0);
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await expect(check).toHaveAccessibleName("Marcar «Cofrología» como hecha");
  // En cualquier punto de la fila que no sea el título: el nivel, por ejemplo
  await clickRow(cofre);
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect(check).toHaveAccessibleName("Marcar «Cofrología» sin hacer");
  await expect(cofre).toHaveClass(/\bis-done\b/);
  expect((await readLS(page, "silvestre:questObjective"))["1504"]).toBe(16);
  expect((await readLS(page, "silvestre:questPos"))["12"]).toBe(1);
  await expect(cofre.locator(".obj-list")).toHaveCount(0);
  // Otra vez: vuelve a pendiente
  await clickRow(cofre, ".q-mark");
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await expect(cofre).not.toHaveClass(/\bis-done\b/);
  expect((await readLS(page, "silvestre:questPos"))["12"]).toBe(0);
  // La ✓ hace lo mismo
  await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await check.click();
  await expect(check).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("la ✓ es un interruptor con el teclado: Intro y espacio", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  const check = quest(page, "Cofrología").locator(".q-check");
  await check.focus();
  await page.keyboard.press("Enter");
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(check).toHaveAttribute("aria-pressed", "false");
});

test("completar todas las misiones con la fila marca el paso", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  for (const name of ["Cofrología", "Tesorfanato", "El maleficio del cofre", "Las grandes galerías"]) {
    await clickRow(quest(page, name));
    await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
  }
  await clickRow(quest(page, "Espionaje industrial"));
  await expect(page.locator('.diary-row[data-n="12"]')).toHaveClass(/\bdone\b/);
  // Deshacer una con la fila desmarca el paso
  await clickRow(quest(page, "Las grandes galerías"));
  await expect(page.locator('.diary-row[data-n="12"]')).not.toHaveClass(/\bdone\b/);
});

test("una misión con la línea de «hasta dónde» va abierta; su fila la completa y la pliega, y otra vez la deshace y la abre (paso 5)", async ({ page, context }) => {
  await stubGuides(context);
  const errors = await openApp(page, { "silvestre:done": upTo(4) });
  await openStep(page, 5);
  const comp = quest(page, "¿Dónde se ha ido la 7.ª compañía?");
  const check = comp.locator(".q-check");
  // Sin hacer, abierta: sus objetivos y la parada a la vista
  await expect(comp.locator(".obj-stop")).toBeVisible();
  await expect(comp.locator(".obj-list.route > .obj-row").first()).toBeVisible();
  // El título enlaza a la guía y no la completa
  const title = comp.locator("a.q-name");
  await expect(title).toHaveAttribute("href", /^https:\/\/www\.torrentearcano\.com\//);
  const [guide] = await Promise.all([context.waitForEvent("page"), title.click()]);
  await guide.close();
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await expect(comp.locator(".obj-stop")).toBeVisible();
  // Pulsar la cabecera la completa y la pliega
  await clickRow(comp);
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect(comp.locator(".obj-list")).toHaveCount(0);
  expect((await readLS(page, "silvestre:questObjective"))["703"]).toBe(8);
  // Otra vez: sin hacer y abierta, desde su inicio
  await clickRow(comp);
  await expect(check).toHaveAttribute("aria-pressed", "false");
  await expect(comp.locator(".obj-stop")).toBeVisible();
  // La ✓ hace lo mismo
  await check.click();
  await expect(comp.locator(".obj-list")).toHaveCount(0);
  await check.click();
  await expect(comp.locator(".obj-list")).toHaveCount(1);
  // Sus demás misiones del paso, sin parada, no llevan etapas
  await expect(quest(page, "Las primeras impresiones son engañosas").locator(".obj-list")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("los objetivos de una misión abierta se siguen marcando uno a uno; el último la completa y la pliega", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(4), "silvestre:questPos": { 5: 1 } });
  await openStep(page, 5);
  const comp = quest(page, "¿Dónde se ha ido la 7.ª compañía?");
  const rows = comp.locator(".obj-list.route > .obj-row");
  await rows.nth(2).locator("button.obj-med").click();
  expect((await readLS(page, "silvestre:questObjective"))["703"]).toBe(3);
  await expect(comp.locator(".q-check")).toHaveAttribute("aria-pressed", "false");
  await rows.last().locator("button.obj-med").click();
  await expect(comp.locator(".q-check")).toHaveAttribute("aria-pressed", "true");
  await expect(comp.locator(".obj-list")).toHaveCount(0);
});

test("una misión con la línea verde de dónde se retoma también va abierta (paso 34)", async ({ page }) => {
  await openApp(page);
  await openStep(page, 34);
  const arak = quest(page, "Arak-hais, ¿dónde vais?");
  await expect(arak.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/arak-hais-donde-vais");
  await expect(arak.locator(".obj-resume")).toBeVisible();
});

test("la misma misión va abierta en el paso que la para y no en otro (41 frente al 91)", async ({ page }) => {
  await openApp(page);
  await openStep(page, 41);
  await expect(quest(page, "Hasta el final del sueño").locator(".obj-stop")).toBeVisible();
  await page.click('.diary-row[data-n="91"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("91");
  const sueno = quest(page, "Hasta el final del sueño");
  if (await sueno.count()) await expect(sueno.locator(".obj-list")).toHaveCount(0);
});

test("en pantalla baja, la fila también completa la misión y el título enlaza", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  await expect(page.locator("#journal.is-compact")).toHaveCount(1);
  const cofre = quest(page, "Cofrología");
  await expect(cofre.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/cofrologia");
  await clickRow(cofre);
  await expect(cofre.locator(".q-check")).toHaveAttribute("aria-pressed", "true");
});
