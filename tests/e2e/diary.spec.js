import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);

test("el diario lista los 100 pasos seguidos, sin capítulos por Dofus", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#diary .section-num")).toHaveText("02");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  await expect(page.locator(".diary-group-head")).toHaveCount(0);
  const nums = await page.locator(".diary-row .row-num").allInnerTexts();
  expect(nums.map(Number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
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
  await expect(j.locator(".journal-show-name")).toHaveText("Silvosse");
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
  // La glándula se gasta en el paso 35 («Munster descubre el misterio»)
  await page.click('.diary-row[data-n="35"] .row-main');
  const slot = page.locator('#journal .journal-needs .slot[data-id="16215"]');
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
  // En la lista, sin icono de relleno: lo que no da un Dofus ni resuelve un jefe va en blanco
  await expect(page.locator(".diary-row .row-art .quest-mark")).toHaveCount(0);
});

test("un paso que pide el logro completo lo dice en la cabecera, no como consejo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="18"] .row-main');
  await expect(page.locator("#journal .goal-ach .is-complete")).toHaveAttribute("title", "Logro completo");
  await expect(page.locator("#journal .call", { hasText: /^\W*Consejo\s*Completo$/ })).toHaveCount(0);
  await page.click('.diary-row[data-n="34"] .row-main');
  await expect(page.locator("#journal .goal-ach .is-complete")).toHaveCount(0);
});

test("el paso 79 da el Dofus Ocre", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="79"] .row-main');
  await expect(page.locator("#journal .journal-show-label")).toHaveText("Se gana");
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
  await expect(page.locator("#journal .journal-show-label")).toHaveText("Se gana");
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
  await quest.locator("summary").click();
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
  await page.locator("#journal .q-item").first().locator("summary").click();
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  expect(await rows.evaluateAll(els => els.every(el => el.classList.contains("done")))).toBe(true);
});

const routeStates = rows => rows.evaluateAll(els => els.map(el => (el.classList.contains("done") ? "d" : el.classList.contains("now") ? "n" : "-")).join(""));

test("los objetivos se marcan desde el diario pulsando su medallón, y se pueden desmarcar", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="5"] .row-main');
  const quest = page.locator("#journal .q-item").first();
  await quest.locator("summary").click();
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

test("al abrir un paso todas sus misiones salen plegadas, también la de la parada y la que va en curso", async ({ page }) => {
  // Paso 17: la primera misión es la que va en curso y otra lleva la línea verde
  await openApp(page, { "silvestre:questPos": { 17: 0 } });
  await page.click('.diary-row[data-n="17"] .row-main');
  const quests = page.locator("#journal .q-item");
  await expect(quests.first()).toBeVisible({ timeout: 15_000 });
  expect(await quests.evaluateAll(els => els.filter(e => e.open).length)).toBe(0);
  // Una sola misión, igual
  await page.click('.diary-row[data-n="4"] .row-main');
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(quests).toHaveCount(1);
  await expect(quests.first()).not.toHaveAttribute("open", "");
  // Desde el mapa, igual
  await page.click("#journal .journal-to-map");
  await page.locator('.map-node[data-n="17"]').click();
  await page.locator("#mapCard .map-card-open").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("17");
  await expect(quests.first()).toBeVisible({ timeout: 15_000 });
  expect(await quests.evaluateAll(els => els.filter(e => e.open).length)).toBe(0);
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
  // En el detalle, sin botones repetidos: el 5 dice en una línea dónde se termina, y el
  // 22 lleva al 5 desde la ficha de su aviso verde
  await expect(page.locator("#journal .badge.closed-in, #journal .badge.closes")).toHaveCount(0);
  await page.locator('#journal .call.closedin .step-ref[data-n="22"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("22");
  await page.locator('#journal .call.done .step-ref[data-n="5"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("5");
});

test("las coordenadas llevan la brújula del juego, no un símbolo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="5"] .row-main');
  const chip = page.locator("#journal .coord-chip").first();
  await expect(chip.locator("img")).toHaveAttribute("src", /items\/126014\.png$/, { timeout: 15_000 });
  await expect(chip).not.toContainText("⌖");
});

test("la parada de Maxilubo (paso 10) cae antes del hueso que se consigue venciéndolo", async ({ page }) => {
  await openApp(page);
  await row(page, 10).locator(".row-main").click();
  const quest = page.locator("#journal .q-item", { hasText: "Encender la mecha" });
  await expect(quest.locator(".obj-stop")).toHaveCount(1, { timeout: 15_000 });
  await expect(quest.locator(".obj-stop")).toContainText("Hasta tener que pasar Maxilubo");
  await expect(quest.locator(".obj-stop + .obj-row")).toContainText("Consigue un hueso de hierro");
});

/** Abre un paso y devuelve las casillas de «Necesitas» (ids) y los nombres de sus misiones. */
async function stepData(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-main`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await page.locator("#journal .journal-quests, #journal .asset-note").first().waitFor({ timeout: 15_000 });
  return {
    needs: await page.locator("#journal .journal-needs .slot").evaluateAll(els => els.map(e => e.dataset.id)),
    quests: await page.locator("#journal .q-item .q-name").allInnerTexts(),
  };
}

test("los objetos revisados con Torrente Arcano y DofusDB van en el paso donde se gastan", async ({ page }) => {
  await openApp(page);
  // 19 → 21: Calavera, Llave del Ring Eskarlata y Tallo de bambuto (misiones 5 y 6 de Púrpura profundo)
  expect((await stepData(page, 19)).needs).toEqual([]);
  expect((await stepData(page, 21)).needs).toEqual(expect.arrayContaining(["15444", "15477", "7290"]));
  // 34 → 35: la Glándula de arak-hai la consume «Munster descubre el misterio»
  expect((await stepData(page, 34)).needs).not.toContain("16215");
  expect((await stepData(page, 35)).needs).toContain("16215");
  // 75: las tablas y la cuerda eran un duplicado del 76
  const s75 = (await stepData(page, 75)).needs;
  for (const k of ["16496", "16494", "16499", "16492", "9935"]) expect(s75).not.toContain(k);
  expect(s75).toContain("1334");
  expect((await stepData(page, 76)).needs).toEqual(expect.arrayContaining(["16496", "16494", "16499", "16492", "9935"]));
});

test("el paso 78 lleva las misiones de orden hasta la 4 y el 80 empieza por «La última piedra»", async ({ page }) => {
  await openApp(page);
  const s78 = await stepData(page, 78);
  expect(s78.quests).toEqual(["Aprendizaje: Discípulo de Jiva", "Aprendizaje: Aprendiz iluminado",
    "Aprendizaje: adepto a las escrituras", "Aprendizaje: Maestro de los Pergaminos"]);
  // La parada de Ugah: antes de buscar la estatuilla en el templo del Gran Ugah
  const quest = page.locator("#journal .q-item", { hasText: "Maestro de los Pergaminos" });
  await expect(quest.locator(".obj-stop + .obj-row")).toContainText("Encuentra la estatuilla de Sumens");
  expect((await stepData(page, 80)).quests.slice(0, 2)).toEqual(["La última piedra", "Alma máster"]);
  // El 89, la misión de orden 5, que da Elviana Tirips
  expect((await stepData(page, 89)).quests).toEqual(["Aprendizaje: Guardián del conocimiento"]);
  expect(await figure(page)).toBe("Inicia el paso:Elviana Tirips");
});

test("las paradas revisadas en las guías caen en su objetivo, también cuando un paso tiene dos", async ({ page }) => {
  await openApp(page);
  const after = async (n, quest, text) => {
    await stepData(page, n);
    const q = page.locator("#journal .q-item", { has: page.locator(".q-name", { hasText: quest }) });
    // Una misión puede tener más de una línea (verde y luego roja): la que va antes de ese objetivo
    await expect(q.locator(":is(.obj-stop, .obj-resume) + .obj-row").filter({ hasText: text })).toHaveCount(1);
  };
  await after(25, "Los cazadores", "Registra la caverna en busca de Gerard");
  await after(87, "El juicio de la Muerte", /Entrégale a Maestro Cuerbok.*Fuego devorador/);
  // El 43 para en dos misiones
  await after(43, "El sauce del paseante", /Entrégale a Surivitna.*Esporas soporíferas/);
  await after(43, "Inmunda putrefacción", /Entrégale a Fhang.*Mildiu de Pandala/);
});

test("si el verde sigue «hasta tener que pasar X», esa nueva parada sale en rojo (paso 43, Kodámade)", async ({ page }) => {
  await openApp(page);
  await stepData(page, 43);
  const j = page.locator("#journal");
  // Avisos: lo que se resuelve y, después, hasta dónde llegar ahora
  await expect(j.locator(".call.stop").filter({ hasText: "Hasta tener que pasar Kodámade" })).toHaveCount(1);
  const quest = name => j.locator(".q-item", { has: page.locator(".q-name", { hasText: name }) });
  // Inmunda putrefacción: se termina al matar los monstruos (verde)
  await expect(quest("Inmunda putrefacción").locator(".obj-resume + .obj-row")).toContainText("Mildiu de Pandala");
  await expect(quest("Inmunda putrefacción").locator(".obj-stop")).toHaveCount(0);
  // El sauce del paseante: sigue tras los monstruos (verde) y para en Kodámade (rojo)
  const sauce = quest("El sauce del paseante");
  await expect(sauce.locator(".obj-resume + .obj-row")).toContainText("Esporas soporíferas");
  // La verde no repite la parada que dice la roja
  await expect(sauce.locator(".obj-resume")).not.toContainText("Kodámade");
  await expect(sauce.locator(".obj-stop")).toContainText("Hasta tener que pasar Kodámade");
  await expect(sauce.locator(".obj-stop + .obj-row")).toContainText("Hoja de Kodámade");
  // Lo mismo en el 72, con Ilyzaelle
  await stepData(page, 72);
  await expect(j.locator(".call.stop").filter({ hasText: "Hasta tener que pasar Ilyzaelle" })).toHaveCount(1);
});

test("en la lista, cada paso lleva solo el Dofus que da o el jefe que resuelve", async ({ page }) => {
  await openApp(page);
  const art = n => row(page, n).locator(".row-art img");
  await expect(page.locator(".diary-row .row-art img")).toHaveCount(32);
  // Un Dofus
  await expect(art(18)).toHaveAttribute("src", /items\//);
  // El jefe que nombra el verde (en el 84 se pasa Mizz Frizz, no Klim)
  await expect(art(34)).toHaveAttribute("src", /monsters\/1267\.png$/);
  await expect(art(84)).toHaveAttribute("alt", "Mizz Frizz");
  // Nada: un paso sin Dofus ni jefe resuelto, y el 43, que solo deja a Kodámade pendiente
  for (const n of [2, 4, 10, 43]) await expect(art(n)).toHaveCount(0);
});

/** La figura del estandarte del paso: "etiqueta:nombre". */
const figure = page => page.locator("#journal .journal-banner .journal-show").evaluate(f =>
  `${f.querySelector(".journal-show-label").textContent.trim()}:${f.querySelector(".journal-show-name").textContent.trim()}`);

test("el estandarte lleva lo más representativo del paso sobre el mapa donde empieza", async ({ page }) => {
  await openApp(page);
  // El Dofus que se gana, antes que nada
  await stepData(page, 1);
  expect(await figure(page)).toBe("Se gana:Dofawa");
  await stepData(page, 18);
  expect(await figure(page)).toBe("Se gana:Dofus Esmeralda");
  // Las líneas primordiales que empieza Meriana, con Meriana
  await stepData(page, 17);
  expect(await figure(page)).toBe("Inicia el paso:Meriana");
  // El fondo: el mapa del juego donde empieza la primera misión
  await expect(page.locator("#journal .journal-banner .journal-bg"))
    .toHaveAttribute("style", /maps\/0\.5\/122421248\.jpg/);
  // Figuras elegidas: el dragón de su Dofus, los jinetes, Draconiros y Silvosse
  for (const [n, want] of [[39, "Dragón primordial:Aguabrial"], [74, "Jinete del Selocalipsis:Guerra"],
    [68, "Selocalipsis:Draconiros"], [34, "Dofus Silvestre:Silvosse"], [64, "Inicia el paso:Pandawelo"]]) {
    await stepData(page, n);
    expect(await figure(page)).toBe(want);
  }
  // La figura es una imagen que carga
  await expect.poll(() => page.locator("#journal .journal-show img").evaluate(i => i.naturalWidth)).toBeGreaterThan(0);
});

test("una misión que da el PNJ de cada clase lo dice, y el paso no pone a uno cualquiera", async ({ page }) => {
  await openApp(page);
  await stepData(page, 7);
  // Sin PNJ único: la diosa Feca, con la que se habla en la misión
  expect(await figure(page)).toBe("La cólera de los dioses:Diosa Feca");
  const q = page.locator("#journal .q-item", { hasText: "La cólera de los dioses" });
  await expect(q.locator(".q-start")).toContainText("depende de tu clase");
  await expect(q.locator(".q-start")).not.toContainText("Rigal");
  // Sin punto de inicio, el primer PNJ al que se va: Pandawelo en «De la mano»
  await stepData(page, 64);
  await expect(page.locator("#journal .q-item", { hasText: "De la mano" }).locator(".q-start")).toContainText("Pandawelo");
});

test("la cabecera es corta: esfuerzo con relojes de arena, «Incluye» en una línea y «Necesitas» en el cuerpo", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const goal = page.locator("#journal .journal-goal");
  // Sin etiquetas: el esfuerzo son relojes de arena junto al título (largo: 4 de 5)
  await expect(goal.locator(".journal-meta, .badge")).toHaveCount(0);
  const effort = goal.locator(".goal-effort");
  await expect(effort).toHaveAttribute("title", "Esfuerzo: Largo");
  await expect(effort.locator("img")).toHaveCount(5);
  await expect(effort.locator("img.off")).toHaveCount(1);
  // «Incluye», una línea bajo el texto de la guía
  await expect(goal.locator(".goal-calls .call.includes b")).toHaveText("Incluye");
  // «Necesitas» vuelve al cuerpo, antes de las misiones
  await expect(goal.locator(".journal-needs")).toHaveCount(0);
  await expect(page.locator("#journal .journal-body .journal-needs .slot")).toHaveCount(3);
  // La cabecera mide igual con muchos objetos: el 50 pide 21
  const h1 = await page.locator("#journal .journal-top").evaluate(el => el.offsetHeight);
  await stepData(page, 50);
  const h50 = await page.locator("#journal .journal-top").evaluate(el => el.offsetHeight);
  expect(Math.abs(h50 - h1)).toBeLessThanOrEqual(40);
});

test("las misiones de un paso con varios logros van agrupadas por logro", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const groups = page.locator("#journal .q-group");
  await expect(groups.locator(".q-group-name")).toHaveText(["En marcha hacia la aventura", "Un ciudadano modelo", "¿Pero dónde están los dofus?"]);
  await expect(groups.locator(".q-item")).toHaveCount(16);
  expect(await groups.evaluateAll(gs => gs.map(g => g.querySelectorAll(".q-item").length))).toEqual([5, 6, 5]);
  // Un paso de un solo logro, sin títulos
  await stepData(page, 17);
  await expect(page.locator("#journal .q-group-name")).toHaveCount(0);
});

test("el marco dorado del estandarte sigue también la punta", async ({ page }) => {
  await openApp(page);
  await stepData(page, 17);
  const banner = page.locator("#journal .journal-banner");
  const frame = banner.locator("svg.banner-frame path");
  await expect(frame).toHaveCount(2);
  // La línea llega a la punta: su punto más bajo está en el centro, cerca del borde de abajo
  const ok = await banner.evaluate(b => {
    const r = b.getBoundingClientRect();
    return [...b.querySelectorAll("svg.banner-frame path")].map(p => {
      const box = p.getBoundingClientRect();
      const len = p.getTotalLength(); let low = { x: 0, y: -1 };
      for (let i = 0; i <= 200; i++) { const pt = p.getPointAtLength(len * i / 200); if (pt.y > low.y) low = pt; }
      const svg = p.ownerSVGElement.getBoundingClientRect();
      return Math.abs(svg.left + low.x - (r.left + r.width / 2)) < 3 && r.bottom - (svg.top + low.y) < 12 && box.width > r.width - 16;
    });
  });
  expect(ok).toEqual([true, true]);
});

test("en escritorio solo se desplazan avisos y misiones; la barra de pasos queda fija abajo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  const detail = page.locator(".diary-detail");
  const body = page.locator("#journal .journal-body");
  // El panel no se desplaza entero: lo hace solo el cuerpo
  expect(await detail.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await body.evaluate(el => el.scrollHeight > el.clientHeight + 50)).toBe(true);
  // La barra va fuera del cuerpo, pegada al fondo del panel, y no se mueve al desplazar
  await expect(page.locator("#journal .journal-body .journal-cta")).toHaveCount(0);
  const bottom = () => page.locator("#journal .journal-cta").evaluate(el => Math.round(el.getBoundingClientRect().bottom));
  const panelBottom = await detail.evaluate(el => Math.round(el.getBoundingClientRect().bottom));
  const before = await bottom();
  expect(Math.abs(before - panelBottom)).toBeLessThanOrEqual(2);
  await body.evaluate(el => el.scrollTo(0, el.scrollHeight));
  expect(await bottom()).toBe(before);
  // La cabecera (estandarte y objetivo) tampoco se mueve
  await expect(page.locator("#journal .journal-banner")).toBeInViewport();
});

test("el texto de la guía va con su rótulo, sin cita en cursiva ni flechas", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const guide = page.locator("#journal .goal-guide");
  await expect(guide.locator(".goal-guide-label")).toHaveText("Texto de la guía");
  await expect(guide.locator("img")).toHaveAttribute("src", /items\/25007\.png$/);
  const base = guide.locator(".journal-base");
  await expect(base).toHaveText("Misiones de mundo: Logro \"Pero ¿Dónde están los dofus?\"");
  expect(await base.evaluate(el => getComputedStyle(el).fontStyle)).toBe("normal");
  expect(await base.evaluate(el => getComputedStyle(el).borderLeftStyle)).toBe("none");
  expect(await base.evaluate(el => getComputedStyle(el, "::after").content)).toMatch(/^(none|normal)$/);
  expect(await base.locator(".guide-link").first().evaluate(el => getComputedStyle(el, "::after").content)).toMatch(/^(none|normal)$/);
});

test("«opcional pero útil» dice qué misión es y la marca en la lista", async ({ page }) => {
  await openApp(page);
  for (const [n, name] of [[27, "Star ski y Dutch"], [7, "Arma letal"]]) {
    await stepData(page, n);
    await expect(page.locator("#journal .goal-calls .call.note")).toHaveText(/Nota\s*La misión 2, «.+», es opcional pero útil\./i);
    const optional = page.locator("#journal .q-item .q-optional");
    await expect(optional).toHaveCount(1);
    await expect(page.locator("#journal .q-item", { has: page.locator(".q-optional") }).locator(".q-name")).toHaveText(new RegExp(name, "i"));
  }
});

test("el detalle del paso es el estandarte y su objetivo, con el texto de la guía una sola vez", async ({ page }) => {
  await openApp(page);
  await stepData(page, 17);
  const goal = page.locator("#journal .journal-goal");
  await expect(goal.locator(".journal-title")).toHaveText("Verde esmeralda");
  await expect(goal.locator(".goal-ach img")).toHaveAttribute("src", /achievements\//);
  // Lo que pide el paso se dice una vez: el texto de la guía, sin una frase que lo repita
  await expect(goal.locator(".goal-line, .goal-lines")).toHaveCount(0);
  await expect(goal.locator(".journal-base.is-source")).toContainText("hasta llegar a la misión 7");
  await expect(page.locator("#journal .step-line, #journal .tier-diamonds")).toHaveCount(0);
  // El esfuerzo, en su propia línea bajo el título
  expect(await goal.locator(".goal-effort").evaluate(el => el.closest(".journal-title"))).toBeNull();
  // El número y la zona, en el estandarte
  await expect(page.locator("#journal .journal-banner .journal-num")).toHaveText("17");
  await expect(page.locator("#journal .journal-banner .banner-zone")).toHaveText("Misiones de Mundo");
  // Los avisos van en la cabecera, como líneas; en el cuerpo solo «Necesitas» y las misiones
  await expect(goal.locator(".goal-calls .call.done")).toHaveCount(1);
  await expect(page.locator("#journal .journal-body .call")).toHaveCount(0);
  await stepData(page, 28);
  await expect(goal.locator(".goal-calls .call")).toHaveClass([/tip/, /done/, /must/]);
  await stepData(page, 84);
  await expect(page.locator("#journal .boss-row")).toHaveCount(0);
});
