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
  // Se resuelve en el mismo paso: sin aviso rojo, la línea verde va en la ruta
  await expect(j.locator(".call.stop")).toHaveCount(0);
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

test("donde el paso se resuelve, la línea es verde y dice qué se termina, justo antes de vencer a Lasoberaña", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-main").click();
  const quest = page.locator("#journal .q-item", { hasText: "Arak-hais, ¿dónde vais?" });
  await expect(quest.locator(".obj-resume")).toHaveCount(1, { timeout: 15_000 });
  await expect(quest.locator(".obj-stop")).toHaveCount(0);
  await expect(quest.locator(".obj-resume")).toContainText("Se pasa Lasoberaña");
  await expect(quest.locator(".obj-resume + .obj-row")).toContainText("Vence a 1 x Lasoberaña");
});

test("en un paso que se resuelve solo, lo que el rojo añadía queda como nota", async ({ page }) => {
  await openApp(page);
  await row(page, 22).locator(".row-main").click();
  await expect(page.locator("#journal .call.stop")).toHaveCount(0);
  await expect(page.locator("#journal .obj-resume").first()).toContainText("Se pasa Nelwynn", { timeout: 15_000 });
  // El 54 decía más en el rojo: eso no se pierde
  await row(page, 54).locator(".row-main").click();
  await expect(page.locator("#journal .call.stop")).toHaveCount(0);
  await expect(page.locator("#journal .call.note")).toContainText("Retomar sala 5");
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
  // La Ortiga y la Lana de «El despertar de Pandala» van en los prerrequisitos (l11), no aquí
  await expect(j.locator(".journal-needs .journal-h")).toContainText("(3)");
  await expect(j.locator('.journal-needs .slot[data-id="421"]')).toHaveCount(0);

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
  // Lo que se resuelve: el jefe que se pasa (Lasoberaña), no un logro
  await expect(icon("done")).toHaveAttribute("src", /monsters\/1267\.png$/);
  await expect(icon("tip")).toHaveAttribute("src", /items\/25019\.png$/);
  expect(await page.locator("#journal .call i").allInnerTexts()).toEqual(["", ""]);
  // Sin jefe, la espada del juego
  await page.click('.diary-row[data-n="38"] .row-main');
  await expect(icon("done")).toHaveAttribute("src", /items\/6009\.png$/);
  // El rojo, en un paso que se queda a medias
  await page.click('.diary-row[data-n="77"] .row-main');
  await expect(icon("stop")).toHaveAttribute("src", /items\/84228\.png$/);
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

test("las misiones del paso enlazan su guía de Torrente Arcano aunque el texto no las nombre", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  const q = name => page.locator("#journal .q-item", { has: page.locator(".q-name", { hasText: new RegExp(`^${name}$`) }) });
  await expect(q("Destino Astrub").locator(".q-guide")).toHaveAttribute("href", "https://www.torrentearcano.com/destino-astrub", { timeout: 15_000 });
  await expect(q("Ver a Dark Vlad y morir\\.\\.\\. o no").locator(".q-guide")).toHaveAttribute("href", "https://www.torrentearcano.com/ver-a-dark-vlad-y-morir-o-no");
  // Todas menos «Respuestas para todo», que no tiene página
  await expect(page.locator("#journal .q-item .q-guide")).toHaveCount(15);
  await expect(q("Respuestas para todo").locator(".q-guide")).toHaveCount(0);
});

test("los objetos del paso 5 van en el 5, no en el 4 (Barnabé solo pide un combate)", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-main');
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(page.locator("#journal .journal-needs")).toHaveCount(0);
  await page.click('.diary-row[data-n="5"] .row-main');
  const needs = page.locator("#journal .journal-needs");
  await expect(needs.locator(".slot")).toHaveCount(2);
  for (const k of ["384", "12073"]) await expect(needs.locator(`.slot[data-id="${k}"]`)).toHaveCount(1);
});

test("los objetivos de una misión son una ruta de medallones con su avance", async ({ page }) => {
  // Paso 5, primera misión («Las primeras impresiones son engañosas», 894): vas por el 4.º objetivo
  await openApp(page, { "silvestre:questPos": { 5: 0 }, "silvestre:questObjective": { 894: 3 } });
  await page.click('.diary-row[data-n="5"] .row-main');
  const quest = page.locator("#journal .q-item", { hasText: "Las primeras impresiones" });
  await quest.evaluate(e => { e.open = true; });
  const rows = quest.locator(".obj-list.route > .obj-row");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  // Medallón con un objeto del juego por tipo: carta para hablar, espada para combatir…
  await expect(rows.first().locator(".obj-med img")).toHaveAttribute("src", /items\/24065\.png$/);
  await expect(rows.filter({ hasText: "Vence" }).locator(".obj-med img")).toHaveAttribute("src", /items\/6009\.png$/);
  await expect(rows.filter({ hasText: "Lana de jalató" }).locator(".obj-med img")).toHaveAttribute("src", /items\/141012\.png$/);
  await expect(quest.locator(".obj-med svg")).toHaveCount(0);
  // Avance: los tres primeros hechos, el cuarto es el actual
  const states = await rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")));
  expect(states.join("")).toMatch(/^dddn-+$/);
  // Lo que se entrega va como casilla con el icono del objeto
  const bring = rows.filter({ hasText: "Lana de jalató" });
  await expect(bring.locator(".obj-item img")).toHaveAttribute("src", /items\/57056\.png$/);
  await expect(bring.locator(".obj-item")).toContainText("5 × Lana de jalató");
});

test("con el paso hecho, todos sus objetivos salen hechos", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 4: true, 5: true } });
  await page.click('.diary-row[data-n="5"] .row-main');
  const rows = page.locator("#journal .q-item").first().locator(".obj-list.route > .obj-row");
  await page.locator("#journal .q-item").first().evaluate(e => { e.open = true; });
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.evaluateAll(els => els.every(el => el.classList.contains("done")))).toBe(true);
});

const routeStates = rows => rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")).join(""));

test("los objetivos se marcan desde el diario pulsando su medallón, y se pueden desmarcar", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="5"] .row-main');
  const quest = page.locator("#journal .q-item").first();
  await quest.evaluate(e => { e.open = true; });
  const rows = quest.locator(".obj-list.route > .obj-row");
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await routeStates(rows)).toMatch(/^n-+$/);
  // Pulsar el tercero: hechos hasta él, el cuarto es el actual (y lo ve el overlay)
  await rows.nth(2).locator("button.obj-med").click();
  expect(await routeStates(rows)).toMatch(/^dddn-+$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:questObjective"))["894"])).toBe(3);
  // Pulsar uno hecho vuelve a él
  await rows.nth(1).locator("button.obj-med").click();
  expect(await routeStates(rows)).toMatch(/^dn-+$/);
  // El último de la misión la termina y pasa a la siguiente del paso, que se abre
  await rows.last().locator("button.obj-med").click();
  expect(await routeStates(rows)).toMatch(/^d+$/);
  await expect(page.locator("#journal .q-item").nth(1)).toHaveAttribute("open", "");
});

test("la misión en curso del paso se abre sola", async ({ page }) => {
  await openApp(page, { "silvestre:questPos": { 5: 1 } });
  await page.click('.diary-row[data-n="5"] .row-main');
  await expect(page.locator("#journal .q-item").nth(1)).toHaveAttribute("open", "", { timeout: 15_000 });
});

test("«hasta que puedas entrar a la mazmorra» pone la parada antes de entrar en ella", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="5"] .row-main');
  const quest = page.locator("#journal .q-item", { hasText: "7.ª compañía" });
  await expect(quest.locator(".obj-stop")).toHaveCount(1, { timeout: 15_000 });
  await expect(quest.locator(".obj-stop + .obj-row")).toContainText("Bodega del albergue");
});

test("«se cierra en» se lee entero y lleva al paso que lo cierra, y al revés", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openApp(page);
  const badge = row(page, 5).locator(".row-closed");
  await expect(badge).toHaveText("se cierra en el 22");
  // No se corta: cabe entero en su línea
  const fits = await badge.evaluate(el => el.getBoundingClientRect().right <= el.parentElement.getBoundingClientRect().right + 0.5);
  expect(fits).toBe(true);
  await badge.click();
  await expect(page.locator("#journal .journal-num")).toHaveText("22");
  // El 22 dice qué cierra y lleva de vuelta
  await row(page, 22).locator(".row-closes").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("5");
  // En el detalle, como botones de verdad
  await page.locator("#journal .badge.closed-in").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("22");
  await page.locator('#journal .badge.closes[data-n="5"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("5");
});

test("las coordenadas llevan la brújula del juego, no un símbolo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="5"] .row-main');
  const chip = page.locator("#journal .coord-chip").first();
  await expect(chip.locator("img")).toHaveAttribute("src", /items\/126014\.png$/, { timeout: 15_000 });
  await expect(chip).not.toContainText("⌖");
});
