import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Las misiones del diario: el título enlaza a su guía de Torrente Arcano; pulsar la fila
// la completa (y otra vez la deshace) sin desplegar nada. Solo se despliegan, con sus
// objetivos, las que llevan en el paso la línea de «hasta dónde» (aquí se detiene) o la
// verde de dónde se retoma
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

test("el título de la misión es el enlace a su guía y no hay botón «Guía»", async ({ page, context }) => {
  await stubGuides(context);
  const errors = await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  await expect(page.locator("#journal .q-guide")).toHaveCount(0);
  await expect(page.locator("#journal .q-item", { hasText: "Guía" })).toHaveCount(0);
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
  await expect(cofre.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "false");
  expect((await readLS(page, "silvestre:questObjective")) || {}).toEqual({});
  expect(errors).toEqual([]);
});

test("pulsar la fila de una misión la completa y otra vez la deshace, sin desplegarla", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  const cofre = quest(page, "Cofrología");
  const btn = cofre.locator(".q-done-btn");
  // Ni se despliega ni lleva objetivos
  await expect(cofre.locator("summary")).toHaveCount(0);
  await expect(cofre.locator(".obj-list")).toHaveCount(0);
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(btn).toHaveText("Completar");
  // En cualquier punto de la fila que no sea el título: el nivel, por ejemplo
  await clickRow(cofre);
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await expect(btn).toHaveText("✓ Completada");
  await expect(cofre).toHaveClass(/\bis-done\b/);
  expect((await readLS(page, "silvestre:questObjective"))["1504"]).toBe(16);
  expect((await readLS(page, "silvestre:questPos"))["12"]).toBe(1);
  await expect(cofre.locator(".obj-list")).toHaveCount(0);
  // Otra vez: vuelve a pendiente
  await clickRow(cofre, ".q-mark");
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(cofre).not.toHaveClass(/\bis-done\b/);
  expect((await readLS(page, "silvestre:questPos"))["12"]).toBe(0);
  expect(errors).toEqual([]);
});

test("la fila es un interruptor con el teclado: Intro y espacio", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  const btn = quest(page, "Cofrología").locator(".q-done-btn");
  await btn.focus();
  await page.keyboard.press("Enter");
  await expect(btn).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Space");
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  // El título, con el foco, es su propio enlace (no va dentro del botón)
  await expect(quest(page, "Cofrología").locator(".q-done-btn a, button a")).toHaveCount(0);
});

test("completar todas las misiones con la fila marca el paso, como «Completar»", async ({ page }) => {
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

test("una misión con la línea de «hasta dónde» se despliega con sus objetivos (paso 5)", async ({ page, context }) => {
  await stubGuides(context);
  await openApp(page, { "silvestre:done": upTo(4) });
  await openStep(page, 5);
  const comp = quest(page, "¿Dónde se ha ido la 7.ª compañía?");
  await expect(comp.locator("summary")).toHaveCount(1);
  await expect(comp.locator(".obj-stop")).toHaveCount(1);
  // El título enlaza a la guía y no la despliega
  const title = comp.locator("summary a.q-name");
  await expect(title).toHaveAttribute("href", /^https:\/\/www\.torrentearcano\.com\//);
  await expect(title).toHaveAttribute("target", "_blank");
  const [guide] = await Promise.all([context.waitForEvent("page"), title.click()]);
  await guide.close();
  await expect(comp).not.toHaveAttribute("open", "");
  // La fila sí la despliega, con sus objetivos y la parada
  await comp.locator("summary .q-lv").click();
  await expect(comp).toHaveAttribute("open", "");
  await expect(comp.locator(".obj-stop")).toBeVisible();
  await expect(comp.locator(".obj-list.route > .obj-row").first()).toBeVisible();
  // Sus demás misiones del paso, sin parada, no se despliegan
  const others = page.locator("#journal .q-item:not(:has(.obj-stop, .obj-resume))");
  expect(await others.count()).toBeGreaterThan(0);
  await expect(others.locator("summary")).toHaveCount(0);
});

test("una misión con la línea verde de dónde se retoma también se despliega (paso 34)", async ({ page }) => {
  await openApp(page);
  await openStep(page, 34);
  const arak = quest(page, "Arak-hais, ¿dónde vais?");
  await expect(arak.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/arak-hais-donde-vais");
  await arak.locator("summary .q-mark").click();
  await expect(arak).toHaveAttribute("open", "");
  await expect(arak.locator(".obj-resume")).toBeVisible();
});

test("la misma misión se despliega en el paso que la para y no en otro (41 frente al 91)", async ({ page }) => {
  await openApp(page);
  await openStep(page, 41);
  await expect(quest(page, "Hasta el final del sueño").locator("summary")).toHaveCount(1);
  await expect(quest(page, "Hasta el final del sueño").locator(".obj-stop")).toHaveCount(1);
  await page.click('.diary-row[data-n="91"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("91");
  const sueno = quest(page, "Hasta el final del sueño");
  if (await sueno.count()) await expect(sueno.locator("summary")).toHaveCount(0);
});

test("en pantalla baja, la fila también completa la misión y el título enlaza", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 640 });
  await openApp(page, { "silvestre:done": upTo(11) });
  await openStep(page, 12);
  await expect(page.locator("#journal.is-compact")).toHaveCount(1);
  const cofre = quest(page, "Cofrología");
  await expect(cofre.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/cofrologia");
  await clickRow(cofre);
  await expect(cofre.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
});
