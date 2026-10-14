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
  // Los incisos del verde llevan a esos pasos
  await j.locator('.call.done .step-ref[data-n="33"]').click();
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
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Paso hecho");
  await expect(page.locator("#toggleBtn")).toHaveAttribute("title", "Marca el paso y abre el 35");
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
  // Se marca con un marcador de ubicación encima del medallón, no con otro anillo:
  // el anillo es del filtro activo y los dos pueden coincidir en el mismo sello
  const here = page.locator('#zoneSeals .seal.here');
  await expect(here.locator(".seal-pin")).toBeVisible();
  await expect.poll(() => here.locator(".seal-ring").evaluate(el => getComputedStyle(el).outlineStyle)).toBe("none");
  await here.click();
  await expect(here).toHaveAttribute("aria-pressed", "true");
  const [pin, ring] = await Promise.all([here.locator(".seal-pin").boundingBox(), here.locator(".seal-ring").boundingBox()]);
  // El marcador queda por encima del medallón (y de su anillo de filtro, 3px), sin taparlo
  expect(pin.y + pin.height).toBeLessThanOrEqual(ring.y + 8);
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

test("el botón de copiar de un objeto de «Necesitas» copia su nombre para el mercadillo", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  const slot = page.locator("#journal .journal-needs .slot").first();
  await slot.hover();
  await slot.locator(".slot-copy").click();
  await expect(slot.locator(".slot-copied")).toHaveText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Glándula de arak-hai");
  // Copiar no lo marca como cogido
  await expect(slot.locator(".slot-main")).toHaveAttribute("aria-pressed", "false");
});

test("en el detalle, los objetos van antes que las misiones y se marcan como en «Lo que necesitas»", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  const j = page.locator("#journal");
  await expect(j.locator(".journal-quests")).toBeVisible({ timeout: 15_000 });
  const before = await j.evaluate(el => {
    const needs = el.querySelector(".journal-needs"), quests = el.querySelector(".journal-quests");
    return !!(needs.compareDocumentPosition(quests) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(before).toBe(true);
  await expect(j.locator(".journal-needs .journal-h")).toContainText("(5)");

  // Pulsar el objeto lo marca como cogido y «Lo que necesitas» lo refleja (uno que solo
  // pide este paso: los compartidos salen sumados allí y marcar una parte no los completa)
  const k = "2268";
  const slot = j.locator(`.journal-needs .slot[data-id="${k}"]`);
  await slot.locator(".slot-main").click();
  await expect(slot.locator(".slot-main")).toHaveAttribute("aria-pressed", "true");
  await page.click("#tabItems");
  const there = page.locator(`#items .band.soon .slot[data-id="${k}"] .slot-main`);
  await expect(there).toHaveAttribute("aria-pressed", "true");

  // Y al revés: desmarcarlo allí lo desmarca en el detalle
  await there.click();
  await expect(slot.locator(".slot-main")).toHaveAttribute("aria-pressed", "false");
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

test("el paso 79 da el Dofus Ocre", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="79"] .row-main');
  await expect(page.locator("#journal .journal-show-label")).toHaveText("Recompensa");
  await expect(page.locator("#journal .journal-show-name")).toHaveText("Dofus Ocre");
  await expect(page.locator("#journal .call.ocre")).toHaveCount(0);
});

test("los avisos usan iconos del juego, no emojis", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  const icon = kind => page.locator(`#journal .call.${kind} i img`);
  await expect(icon("stop")).toHaveAttribute("src", /items\/84228\.png$/);
  await expect(icon("done")).toHaveAttribute("src", /achievements\/273\.png$/);
  await expect(icon("tip")).toHaveAttribute("src", /items\/25019\.png$/);
  expect(await page.locator("#journal .call i").allInnerTexts()).toEqual(["", "", ""]);
});

test("cada tipo de aviso azul tiene su nombre y su icono", async ({ page }) => {
  await openApp(page);
  const call = (kind) => page.locator(`#journal .call.${kind}`);
  await page.click('.diary-row[data-n="1"] .row-main');
  await expect(call("includes").locator("b")).toHaveText("Incluye");
  await expect(call("includes").locator("i img")).toHaveAttribute("src", /items\/24041\.png$/);
  await expect(page.locator("#journal .call.tip")).toHaveCount(0);
  await page.click('.diary-row[data-n="54"] .row-main');
  await expect(call("must").locator("b")).toHaveText("También hay que");
  // Lo que también hay que hacer es una misión: lleva la «!» del juego
  await expect(call("must").locator("i .quest-mark")).toHaveCount(1);
  await page.click('.diary-row[data-n="50"] .row-main');
  await expect(call("note").locator("b")).toHaveText("Nota");
  await expect(call("note").locator("i img")).toHaveAttribute("src", /items\/24055\.png$/);
});

test("el paso 99 da la Piñata de pino", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="99"] .row-main');
  await expect(page.locator("#journal .journal-show-label")).toHaveText("Recompensa");
  await expect(page.locator("#journal .journal-show-name")).toHaveText("Piñata de pino");
});

test("las misiones de cada paso son las de su logro, en su orden", async ({ page }) => {
  await openApp(page);
  const quests = n => page.click(`.diary-row[data-n="${n}"] .row-main`)
    .then(() => page.locator("#journal .q-item").first().waitFor({ timeout: 15_000 }))
    .then(() => page.locator("#journal .q-item summary").allInnerTexts());
  // Un aviso que nombra otro logro no mete sus misiones
  expect((await quests(38)).join(" ")).not.toContain("El destino de Kalisto");
  // Una nota en medio del texto no corta las misiones citadas
  expect((await quests(54)).join(" ")).toContain("Cuando se caldean las ánimas");
  // El logro del Dofus Ocre es terminar «La eterna cosecha»
  expect((await quests(79)).join(" ")).toContain("La eterna cosecha");
  // La misión 14 de «Seis de seis» es del paso 97, no del 96
  expect((await quests(96)).join(" ")).not.toContain("El fin... o el comienzo");
  // Lo que el paso «incluye» son sus requisitos: va antes, en el orden de la guía
  const first = await quests(1);
  const at = name => first.findIndex(t => t.includes(name));
  expect(at("Respuestas para todo")).toBe(0);
  expect(at("Destino Astrub")).toBeLessThan(at("Archi y sus principios"));
  expect(at("Paseo por el bosque")).toBeLessThan(at("El receptáculo de los dofus"));
});

test("la misión de clase sale como una sola fila con su guía, no la de una clase", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  const j = page.locator("#journal");
  const quest = j.locator(".q-item", { hasText: "Misión de clase" });
  await expect(quest).toHaveCount(1, { timeout: 15_000 });
  await expect(quest.locator(".q-guide")).toHaveAttribute("href", "https://www.torrentearcano.com/mision-de-clase");
  await expect(j.locator(".q-item", { hasText: "Recibimiento de wauwaus" })).toHaveCount(0);
  // Va donde la pide el logro: tras «Consejo de clase»
  const names = await j.locator(".q-item .q-name").allInnerTexts();
  expect(names.indexOf("Misión de clase")).toBe(names.indexOf("Consejo de clase") + 1);
});
