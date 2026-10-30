import { test, expect } from "@playwright/test";

// Prueba de humo de la guía global de progresión: lo que cambia respecto al Silvestre (sus
// datos, sus textos y su sitio en global/). La app es la misma: el resto lo prueba tests/e2e

const STEPS = 219;

/** Abre la guía, en el diario o en el mapa, y recoge los errores de la página. */
async function openGlobal(page, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(v => {
    if (localStorage.getItem("global:stepsView") == null) localStorage.setItem("global:stepsView", v);
  }, view);
  await page.goto("");
  await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(STEPS);
  return errors;
}

test("los pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openGlobal(page);
  await expect(page).toHaveTitle("Guía global · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los pasos de la guía global");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(STEPS);
  expect(errors).toEqual([]);
});

test("lleva encima la cabecera del sitio, con la guía global como página actual", async ({ page }) => {
  await openGlobal(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  const current = shell.getByRole("navigation").getByRole("link", { name: "Guía global" });
  await expect(current).toHaveAttribute("aria-current", "page");
  expect(await current.getAttribute("href")).toBe("/global/");
});

/** El texto de la app sin la cabecera del sitio (que enlaza a los otros checklists). */
const appText = page => page.evaluate(() => [...document.body.children]
  .filter(el => !el.matches(".dt-shell")).map(el => el.textContent).join(" "));

test("el primer paso abre en el diario con sus misiones, la mazmorra y el farmeo del paso", async ({ page }) => {
  const errors = await openGlobal(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .journal-num")).toHaveText("1");
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  expect(await page.locator("#journal .q-item").count()).toBeGreaterThan(5);
  // La mazmorra y los farmeos del paso son avisos propios, no «lo que se resuelve» ni notas
  const dungeon = page.locator("#journal .call.dungeon").first();
  await expect(dungeon.locator("b").first()).toHaveText("Mazmorra");
  await expect(dungeon).toContainText("Pasa la mazmorra");
  const farm = page.locator("#journal .call.farm").first();
  await expect(farm.locator("b").first()).toHaveText("Farmeo");
  await expect(farm).toContainText("Farmea en");
  // Sin icono generado, el medallón va vacío: ninguna imagen rota
  expect(await page.locator("#journal .call i img").evaluateAll(imgs => imgs.filter(i => i.complete && i.naturalWidth === 0).length)).toBe(0);
  expect(errors).toEqual([]);
});

test("sin Dofus ni guía de Torrente Arcano: ni franja de Dofus del camino ni enlaces a guías", async ({ page }) => {
  await openGlobal(page);
  await page.click('.diary-row[data-n="1"] .row-num');
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator("#winRoad, .road-head, .road-menu")).toHaveCount(0);
  await expect.poll(() => appText(page)).not.toMatch(/Dofus del camino|Torrente Arcano/);
  // Los nombres de las misiones no son enlaces: no hay guía a la que llevar
  await expect(page.locator("#journal a.q-name")).toHaveCount(0);
  await expect(page.locator("#journal .q-howto")).toHaveText("Pulsa una misión para darla por hecha.");
  // Tampoco la nota de las pausas: la guía no la tiene
  await expect(page.locator("#notaDialog, #notaOpen, .nota-open")).toHaveCount(0);
});

// El bando del jugador (Bonta o Brakmar): las misiones de alineamiento del otro bando no se
// hacen, así que el selector de la barra las quita. El paso 14 lleva misiones de los dos
// bandos y una sin bando (STEP_QUESTS[14] → QUESTS[id].side en src/dofus/global/quests.json):
// «El destino» y «Un jabalí demasiado agresivo...» (Bonta), «La fatalidad» (Brakmar) y
// «Kartier Tremai confiesa» (ninguno)
const MIXED_STEP = 14;

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });

test("el selector de bando ofrece Bonta y Brakmar, sin ninguno elegido al empezar", async ({ page }) => {
  const errors = await openGlobal(page);
  const sw = page.locator("#sideSwitch");
  await expect(sw).toBeVisible();
  await expect(sw).toHaveAttribute("role", "radiogroup");
  await expect(sw).toContainText("Bando");
  await expect(page.locator("#sideBonta")).toHaveText("Bonta");
  await expect(page.locator("#sideBrakmar")).toHaveText("Brakmar");
  await expect(page.locator("#sideBonta")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("#sideBrakmar")).toHaveAttribute("aria-checked", "false");
  // Sin bando se ven todas las misiones, con la etiqueta de su bando
  await openStep(page, MIXED_STEP);
  await expect(page.locator("#journal .q-item")).toHaveCount(4);
  await expect(quest(page, "El destino").locator(".q-side")).toHaveText("Bonta");
  await expect(quest(page, "La fatalidad").locator(".q-side")).toHaveText("Brakmar");
  await expect(quest(page, "Kartier Tremai confiesa").locator(".q-side")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("elegir Brakmar quita las misiones de Bonta y deja las de Brakmar y las sin bando", async ({ page }) => {
  const errors = await openGlobal(page);
  await openStep(page, MIXED_STEP);
  await page.click("#sideBrakmar");
  await expect(page.locator("#sideBrakmar")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#sideBonta")).toHaveAttribute("aria-checked", "false");
  await expect(page.locator("#journal .q-item")).toHaveCount(2);
  await expect(quest(page, "El destino")).toHaveCount(0);
  await expect(quest(page, "Un jabalí demasiado agresivo...")).toHaveCount(0);
  await expect(quest(page, "La fatalidad")).toHaveCount(1);
  await expect(quest(page, "La fatalidad").locator(".q-side")).toBeVisible();
  await expect(quest(page, "Kartier Tremai confiesa")).toHaveCount(1);
  // El recuento de misiones del paso sigue al filtro
  await expect(page.locator("#journal .journal-h .n")).toHaveText("(2)");
  // Y Bonta, al revés
  await page.click("#sideBonta");
  await expect(page.locator("#journal .q-item")).toHaveCount(3);
  await expect(quest(page, "La fatalidad")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("el bando se guarda en global:side y al recargar sigue elegido", async ({ page }) => {
  await openGlobal(page);
  await page.click("#sideBrakmar");
  expect(await page.evaluate(() => localStorage.getItem("global:side"))).toBe("brakmar");
  await page.reload();
  await expect(page.locator(".diary-row")).toHaveCount(STEPS);
  await expect(page.locator("#sideBrakmar")).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("#sideBonta")).toHaveAttribute("aria-checked", "false");
  await openStep(page, MIXED_STEP);
  await expect(page.locator("#journal .q-item")).toHaveCount(2);
});
