import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);

test("el diario lista los 100 pasos agrupados por el Dofus al que llevan", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#diary .section-num")).toHaveText("02");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  const groups = page.locator(".diary-group-head");
  await expect(groups.first()).toContainText("Dofawa");
  await expect(groups.last()).toContainText("Dofus Silvestre");
  // Cada fila: número, título y zona
  await expect(row(page, 34).locator(".row-num")).toHaveText("34");
  await expect(row(page, 34).locator(".row-title")).toHaveText("El árbol que esconde el bosque");
  await expect(row(page, 34).locator(".row-zone")).toContainText("Reino de Amakna");
});

test("sin nada seleccionado, el detalle muestra el siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 33) });
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
  await expect(row(page, 34)).toHaveAttribute("aria-current", "step");
});

test("el detalle del 34 muestra jefe, avisos de la guía y los pasos que cierra", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-main").click();
  const j = page.locator("#journal");
  await expect(j.locator(".journal-num")).toHaveText("34");
  await expect(j.locator(".journal-title")).toHaveText("El árbol que esconde el bosque");
  await expect(j.locator(".journal-show-name")).toHaveText("Lasoberaña");
  await expect(j.locator(".journal-base")).toHaveText(/hasta la misión 2: Arak-hais, ¿dónde vais\?$/);
  await expect(j.locator(".call.stop")).toContainText("Hasta tener que pasar Lasoberaña");
  await expect(j.locator(".call.tip")).toContainText("primeras 4 salas");
  await expect(j.locator(".call.done")).toContainText("Se pasa Lasoberaña");
  // Las fichas del verde llevan a esos pasos
  await j.locator('.call.done .step-chip[data-n="33"]').click();
  await expect(j.locator(".journal-num")).toHaveText("33");
});

test("en la lista, un paso que se termina más adelante lo dice", async ({ page }) => {
  await openApp(page);
  await expect(row(page, 33).locator(".row-closed")).toHaveText("se cierra en el 34");
  await expect(row(page, 34).locator(".row-closed")).toHaveCount(0);
});

test("la línea de parada cae justo antes de vencer a Lasoberaña", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-main").click();
  const quest = page.locator("#journal .q-item", { hasText: "Arak-hais, ¿dónde vais?" });
  await expect(quest.locator(".obj-stop")).toHaveCount(1, { timeout: 15_000 });
  const next = quest.locator(".obj-stop + .obj-row");
  await expect(next).toContainText("Vence a 1 x Lasoberaña");
});

test("«Paso hecho» marca el paso y salta al siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#toggleBtn")).toContainText("Paso hecho · ir al 35");
  await page.click("#toggleBtn");
  await expect(row(page, 34)).toHaveClass(/done/);
  await expect(page.locator("#journal .journal-num")).toHaveText("35");
  expect((await readLS(page, "silvestre:done"))["34"]).toBe(true);
});

test("si el paso cierra otros pendientes, ofrece marcarlos también", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#closesBtn")).toHaveText("Marcar el 33 también");
  await page.click("#closesBtn");
  await expect(row(page, 33)).toHaveClass(/done/);
  await expect(page.locator("#closesBtn")).toHaveCount(0);
  // Sigue en el mismo paso
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
});

test("la casilla de cada fila marca el paso sin cambiar lo que se ve", async ({ page }) => {
  await openApp(page);
  await row(page, 50).locator(".row-main").click();
  await row(page, 10).locator(".row-check").click();
  await expect(row(page, 10)).toHaveClass(/done/);
  await expect(page.locator("#journal .journal-num")).toHaveText("50");
});

test("las pestañas filtran pendientes, hechos y todos", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 30) });
  await expect(page.locator("#diaryTabPending")).toContainText("70");
  await expect(page.locator("#diaryTabDone")).toContainText("30");
  await page.click("#diaryTabPending");
  await expect(page.locator(".diary-row")).toHaveCount(70);
  await page.click("#diaryTabDone");
  await expect(page.locator(".diary-row")).toHaveCount(30);
  await page.click("#diaryTabAll");
  await expect(page.locator(".diary-row")).toHaveCount(100);
});

test("los sellos de zona muestran su avance y filtran la lista", async ({ page }) => {
  // Astrub son los pasos 2 y 3
  await openApp(page, { "silvestre:done": range(1, 3) });
  const seals = page.locator("#zoneSeals .seal");
  await expect(seals).toHaveCount(18);
  await expect(seals.first()).toContainText("Todas");
  await expect(seals.first()).toHaveAttribute("aria-pressed", "true");
  const astrub = page.locator('#zoneSeals .seal[data-zone="Astrub"]');
  await expect(astrub.locator(".seal-count")).toHaveText("2/2");
  await expect(astrub).toHaveClass(/full/);
  const frigost = page.locator('#zoneSeals .seal[data-zone="Isla de Frigost"]');
  await frigost.click();
  await expect(frigost).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".diary-row")).toHaveCount(16);
  await expect(page.locator(".diary-row .row-zone").first()).toHaveText("Isla de Frigost");
  // Otra zona sustituye a la anterior; «Todas» vuelve a la lista entera
  await astrub.click();
  await expect(page.locator(".diary-row")).toHaveCount(2);
  await seals.first().click();
  await expect(page.locator(".diary-row")).toHaveCount(100);
});

test("el sello de la zona del paso abierto lo indica", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await expect(page.locator('#zoneSeals .seal[data-zone="Reino de Amakna"]')).toHaveClass(/here/);
  await expect(page.locator("#zoneSeals .seal.here")).toHaveCount(1);
});

test("la barra del diario busca y lleva al siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await expect(page.locator("#diaryNext")).toContainText("33");
  await page.click('.diary-row[data-n="60"] .row-main');
  await page.click("#diaryNext");
  await expect(page.locator("#journal .journal-num")).toHaveText("33");
  await page.fill("#searchInput", "Lasoberaña");
  await expect.poll(() => page.locator(".diary-row").count()).toBeLessThan(6);
});

test("misiones y logros enlazan a su guía en Torrente Arcano", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  const j = page.locator("#journal");
  const mission = j.locator('.journal-base a[href="https://www.torrentearcano.com/arak-hais-donde-vais"]');
  await expect(mission).toHaveText("Arak-hais, ¿dónde vais?");
  await expect(mission).toHaveAttribute("target", "_blank");
  await expect(j.locator('.journal-base a[href="https://www.torrentearcano.com/el-arbol-que-esconde-el-bosque"]')).toHaveCount(1);
  // La misión del paso lleva su guía también en la lista de misiones
  const quest = j.locator(".q-item", { hasText: "Arak-hais, ¿dónde vais?" });
  await expect(quest.locator(".q-guide")).toHaveAttribute("href", "https://www.torrentearcano.com/arak-hais-donde-vais");
});

test("las referencias a otros incisos llevan a esos pasos", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="77"] .row-main');
  await page.locator('#journal .call.stop .step-ref[data-n="78"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("78");
});

test("pulsar un objeto de «Necesitas» copia su nombre para el mercadillo", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await page.locator("#journal .req-item").first().click();
  await expect(page.locator("#journal .req-copied")).toContainText("Glándula de arak-hai");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Glándula de arak-hai");
});

test("las misiones del paso y los pasos sin imagen usan el mismo símbolo de misión", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await expect(page.locator("#journal .q-item summary .quest-mark")).toHaveCount(2, { timeout: 15_000 });
  // Los 4 pasos sin icono propio no quedan en blanco
  await expect(page.locator(".diary-row .row-art .quest-mark")).toHaveCount(4);
});

test("un paso que pide el logro completo lo dice en la cabecera, no como consejo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="18"] .row-main');
  await expect(page.locator("#journal .journal-meta .is-complete")).toHaveText("Logro completo");
  await expect(page.locator("#journal .call", { hasText: /^\W*Consejo\s*Completo$/ })).toHaveCount(0);
  await page.click('.diary-row[data-n="34"] .row-main');
  await expect(page.locator("#journal .journal-meta .is-complete")).toHaveCount(0);
});
