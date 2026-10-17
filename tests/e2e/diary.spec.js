import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/data/weights.json", import.meta.url), "utf8"));
const sum = xs => xs.reduce((a, x) => a + x, 0);
const TOTAL = sum(Object.values(WEIGHTS).map(x => x.w));
// El mismo redondeo que el hero: un decimal
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
/** Las misiones del paso abierto, ya cargadas (llegan en diferido). */
const waitQuests = page => expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });

test("el diario lista los 100 pasos seguidos, sin capítulos por Dofus", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#diaryTitle")).toHaveText("Los 100 pasos");
  await expect(page.locator(".diary-row")).toHaveCount(100);
  await expect(page.locator(".diary-group-head")).toHaveCount(0);
  const nums = await page.locator(".diary-row .row-num").allInnerTexts();
  expect(nums.map(Number)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  // Cada fila: número, título y zona
  await expect(row(page, 34).locator(".row-num")).toHaveText("34");
  await expect(row(page, 34).locator(".row-title")).toHaveText("El árbol que esconde el bosque");
  await expect(row(page, 34).locator(".row-zone")).toContainText("Reino de Amakna");
  // Sin el esfuerzo del paso: ni en la fila ni en la ficha del mapa
  await expect(page.locator(".row-effort")).toHaveCount(0);
  await expect(page.locator(".diary-row", { hasText: /Trivial|Corto|Medio|Largo|Épico/ })).toHaveCount(0);
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
  // El título no enlaza: la guía del logro ya va enlazada en el texto de la guía
  await expect(j.locator(".journal-title a")).toHaveCount(0);
  await expect(j.locator('.journal-base a[href="https://www.torrentearcano.com/el-arbol-que-esconde-el-bosque"]')).toHaveCount(1);
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

test("«Completar paso N» marca el paso y salta al siguiente pendiente", async ({ page }) => {
  // Con el 33 hecho, el 34 ya no cierra nada pendiente: sin la línea «Además»
  await openApp(page, { "silvestre:done": range(1, 33) });
  await row(page, 34).locator(".row-main").click();
  await waitQuests(page);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 34");
  await expect(page.locator("#toggleBtn")).toHaveAttribute("title", "Marca el paso y abre el 35");
  await expect(page.locator("#journal .cta-also")).toHaveCount(0);
  await page.click("#toggleBtn");
  await expect(row(page, 34)).toHaveClass(/done/);
  await expect(page.locator("#journal .journal-num")).toHaveText("35");
  expect((await readLS(page, "silvestre:done"))["34"]).toBe(true);
  // Hecho, el botón lo dice y lo deshace
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#toggleBtn")).toHaveText("Paso completado · deshacer");
  await page.click("#toggleBtn");
  await expect(row(page, 34)).not.toHaveClass(/done/);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 34");
});

test("si el paso cierra otros pendientes, «Completar» termina lo que les queda y una línea aparte lo dice", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  await row(page, 34).locator(".row-main").click();
  await waitQuests(page);
  // Un solo botón, con el número del paso; lo que termina en el 33 va debajo
  await expect(page.locator("#closesBtn")).toHaveCount(0);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 34");
  await expect(page.locator("#journal .cta-also")).toHaveText("Además: en el 33 completa «Muchos cuerboks en la cabeza».");
  await page.click("#toggleBtn");
  await expect(row(page, 34)).toHaveClass(/done/);
  // El 33 tiene tres misiones antes de su parada: sigue pendiente
  await expect(row(page, 33)).not.toHaveClass(/done/);
  await expect(page.locator("#toastTxt")).toHaveText("El 33 sigue pendiente: le faltan 3 misiones.");
  await expect(page.locator("#journal .journal-num")).toHaveText("35");
  await page.click("#toastAction");
  await expect(row(page, 33)).toHaveClass(/done/);
  // Hecho el 34, sin la línea; con lo cerrado ya hecho, al deshacerlo tampoco
  await row(page, 34).locator(".row-main").click();
  await expect(page.locator("#journal .cta-also")).toHaveCount(0);
  await page.click("#toggleBtn");
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 34");
  await expect(page.locator("#journal .cta-also")).toHaveCount(0);
});

test("un paso que cierra varios los nombra todos en la línea «Además» y avisa de los que siguen pendientes", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 24) });
  await row(page, 28).locator(".row-main").click();
  await waitQuests(page);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 28");
  await expect(page.locator("#journal .cta-also"))
    .toHaveText("Además: en el 25 completa «Los cazadores», en el 26 completa «El recadero» y el 27 queda completado.");
  await page.click("#toggleBtn");
  // El 27 solo tenía pendiente lo de tras su parada (la otra es opcional); el 25 y el 26, no
  for (const n of [27, 28]) await expect(row(page, n)).toHaveClass(/done/);
  for (const n of [25, 26]) await expect(row(page, n)).not.toHaveClass(/done/);
  await expect(page.locator("#toastTxt")).toHaveText("El 25 y el 26 siguen pendientes: les faltan misiones.");
  await expect(page.locator("#toastAction")).toHaveText("Las hice, marcar el 25 y 26");
  await page.click("#toastAction");
  for (const n of [25, 26]) await expect(row(page, n)).toHaveClass(/done/);
});

test("la línea «Además» cuenta las misiones si en un paso cerrado se completan varias", async ({ page }) => {
  // El 80 cierra el 77 y el 78
  await openApp(page, { "silvestre:done": range(1, 76) });
  await row(page, 80).locator(".row-main").click();
  await waitQuests(page);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 80");
  await expect(page.locator("#journal .cta-also")).toHaveText(/^Además: .*\bel 77\b.* y .*\bel 78\b.*\.$/);
});

// El 22 cierra el 5: «¿Dónde se ha ido la 7.ª compañía?» lleva la parada del 5 y se
// termina en el 22; «Las primeras impresiones son engañosas» se hace en el propio 5
const BUT_5 = () => {
  const done = range(1, 21);
  delete done[5];
  return done;
};
const questBtn = (page, name) => page.locator("#journal .q-item", { hasText: name }).locator(".q-done-btn");

test("«Completar» en el 22 termina la misión del 5 tras su parada y avisa de la que falta", async ({ page }) => {
  await openApp(page, { "silvestre:done": BUT_5() });
  await row(page, 22).locator(".row-main").click();
  await waitQuests(page);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 22");
  await expect(page.locator("#journal .cta-also")).toHaveText("Además: en el 5 completa «¿Dónde se ha ido la 7.ª compañía?».");
  await page.click("#toggleBtn");
  await expect(row(page, 22)).toHaveClass(/done/);
  await expect(row(page, 5)).not.toHaveClass(/done/);
  await expect(page.locator("#toastTxt")).toHaveText("El 5 sigue pendiente: falta «Las primeras impresiones son engañosas».");
  await expect(page.locator("#toastAction")).toHaveText("Las hice, marcar el 5");
  await expect(page.locator("#journal .journal-num")).toHaveText("23");
  const obj = await readLS(page, "silvestre:questObjective");
  expect(obj["703"]).toBe(8);
  expect(obj["894"]).toBeUndefined();
  await page.click("#toastAction");
  await expect(row(page, 5)).toHaveClass(/done/);
});

test("con lo anterior del 5 ya hecho, «Completar» en el 22 marca el 5 sin avisar", async ({ page }) => {
  await openApp(page, { "silvestre:done": BUT_5(), "silvestre:questObjective": { 894: 11 } });
  await row(page, 22).locator(".row-main").click();
  await waitQuests(page);
  await expect(page.locator("#journal .cta-also")).toHaveText("Además: el 5 queda completado.");
  await page.click("#toggleBtn");
  for (const n of [5, 22]) await expect(row(page, n)).toHaveClass(/done/);
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
});

test("lo que termina el 22 en el 5 se ve en su detalle y suma al porcentaje", async ({ page }) => {
  await openApp(page, { "silvestre:done": BUT_5() });
  const base = sum(Object.keys(BUT_5()).map(n => WEIGHTS[n].w));
  await expect(page.locator("#heroPct")).toHaveText(`${pctOf(base)}%`);
  await row(page, 22).locator(".row-main").click();
  await waitQuests(page);
  await page.click("#toggleBtn");
  // Con el 22 hecho, «Veneno de scorbuto para la prisión», que también lleva el 36, cuenta allí
  await expect(page.locator("#heroPct")).toHaveText(`${pctOf(base + WEIGHTS[22].w + WEIGHTS[5].q[1] + WEIGHTS[36].q[0])}%`);
  await row(page, 5).locator(".row-main").click();
  await waitQuests(page);
  await expect(questBtn(page, "7.ª compañía")).toHaveAttribute("aria-pressed", "true");
  await expect(questBtn(page, "Las primeras impresiones")).toHaveAttribute("aria-pressed", "false");
});

test("Intro sobre un paso que cierra otros hace lo mismo que «Hecho»", async ({ page }) => {
  await openApp(page, { "silvestre:done": BUT_5() });
  await row(page, 22).locator(".row-main").click();
  await waitQuests(page);
  await page.keyboard.press("Enter");
  await expect(row(page, 22)).toHaveClass(/done/);
  await expect(row(page, 5)).not.toHaveClass(/done/);
  await expect(page.locator("#toastTxt")).toHaveText("El 5 sigue pendiente: falta «Las primeras impresiones son engañosas».");
  expect((await readLS(page, "silvestre:questObjective"))["703"]).toBe(8);
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

test("el desplegable de zona muestra los sellos con su avance y filtra la lista", async ({ page }) => {
  // Astrub son los pasos 2 y 3
  await openApp(page, { "silvestre:done": range(1, 3) });
  const btn = page.locator("#zoneBtn");
  // Cerrado: solo el botón, con la zona elegida y su avance
  await expect(btn).toHaveText(/Zona: Todas · 3\/100/);
  await expect(btn).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#zoneSeals")).toHaveCount(0);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-expanded", "true");
  const seals = page.locator("#zoneSeals .seal");
  await expect(seals).toHaveCount(18);
  await expect(seals.first()).toContainText("Todas");
  await expect(seals.first()).toHaveAttribute("aria-pressed", "true");
  const astrub = page.locator('#zoneSeals .seal[data-zone="Astrub"]');
  await expect(astrub.locator(".seal-count")).toHaveText("2/2");
  await expect(astrub).toHaveClass(/full/);
  // Elegir una zona filtra la lista y cierra el desplegable
  await page.locator('#zoneSeals .seal[data-zone="Isla de Frigost"]').click();
  await expect(page.locator("#zoneSeals")).toHaveCount(0);
  await expect(btn).toHaveText(/Zona: Isla de Frigost · 0\/16/);
  await expect(page.locator(".diary-row")).toHaveCount(16);
  await expect(page.locator(".diary-row .row-zone").first()).toHaveText("Isla de Frigost");
  // Otra zona sustituye a la anterior; «Todas» vuelve a la lista entera
  await btn.click();
  await expect(page.locator('#zoneSeals .seal[data-zone="Isla de Frigost"]')).toHaveAttribute("aria-pressed", "true");
  await astrub.click();
  await expect(page.locator(".diary-row")).toHaveCount(2);
  await btn.click();
  await seals.first().click();
  await expect(page.locator(".diary-row")).toHaveCount(100);
});

test("el desplegable de zona se cierra con Escape o pulsando fuera", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await page.click("#zoneBtn");
  await expect(page.locator("#zoneSeals")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#zoneSeals")).toHaveCount(0);
  // Escape cierra el desplegable, no el paso abierto
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
  await page.click("#zoneBtn");
  await page.locator("#diaryTitle").click();
  await expect(page.locator("#zoneSeals")).toHaveCount(0);
});

test("el sello de la zona del paso abierto lo indica", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await page.click("#zoneBtn");
  await expect(page.locator('#zoneSeals .seal[data-zone="Reino de Amakna"]')).toHaveClass(/here/);
  await expect(page.locator("#zoneSeals .seal.here")).toHaveCount(1);
  // Se marca con un marcador de ubicación encima del medallón, no con otro anillo:
  // el anillo es del filtro activo y los dos pueden coincidir en el mismo sello
  const here = page.locator('#zoneSeals .seal.here');
  await expect(here.locator(".seal-pin")).toBeVisible();
  await expect.poll(() => here.locator(".seal-ring").evaluate(el => getComputedStyle(el).outlineStyle)).toBe("none");
  await here.click();
  await page.click("#zoneBtn");
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

test("el paso 64 llega en «De la mano» hasta entregar la cerveza fuerte, y una nota dice por qué", async ({ page }) => {
  await openApp(page);
  await row(page, 64).locator(".row-main").click();
  await waitQuests(page);
  const j = page.locator("#journal");
  // La misión 2 (paso 66) pide «De la mano» pasada la entrega de la cerveza
  const quest = j.locator(".q-item", { has: page.locator(".q-name", { hasText: "De la mano" }) });
  await quest.locator("summary .q-name").click();
  await expect(quest.locator(".obj-stop")).toHaveCount(1);
  await expect(quest.locator(".obj-stop")).toHaveText("Hasta poder entrar en la taberna");
  await expect(quest.locator(".obj-stop + .obj-row")).toContainText("Habla con la diosa Pandawa a través de Pandawelo");
  await expect(quest.locator(".obj-stop").locator("xpath=preceding-sibling::*[1]")).toContainText(/Entrégale a Pandawelo.*Cerveza fuerte/);
  // La nota, con las guías de las dos misiones y fichas a los pasos 66 y 67
  const note = j.locator(".call.note", { hasText: "Para empezar la misión 2" });
  await expect(note).toHaveCount(1);
  await expect(note.locator("b")).toHaveText("Nota");
  await expect(note).toContainText("Para empezar la misión 2, «Dos alientos, una inspiración» (paso 66), hay que llegar hasta entregarle la cerveza fuerte a Pandawelo. «De la mano» se termina en el paso 67, con el logro completo.");
  await expect(note.locator("a.guide-link", { hasText: "Dos alientos, una inspiración" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/dos-alientos-una-inspiracion");
  await expect(note.locator("a.guide-link", { hasText: "De la mano" })).toHaveAttribute("href", "https://www.torrentearcano.com/de-la-mano");
  await expect(note.locator(".step-ref")).toHaveCount(2);
  await note.locator('.step-ref[data-n="66"]').click();
  await expect(j.locator(".journal-num")).toHaveText("66");
  await row(page, 64).locator(".row-main").click();
  await expect(j.locator(".journal-num")).toHaveText("64");
  await j.locator('.call.note .step-ref[data-n="67"]').click();
  await expect(j.locator(".journal-num")).toHaveText("67");
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
  await page.click("#stepsViewDiary");
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

test("el «Prólogo invernal» del 63 depende del alineamiento: no es la misión de clase del 1", async ({ page }) => {
  // Hecho el 1, su misión de clase está terminada; la del 63 sigue pendiente
  await openApp(page, { "silvestre:done": { 1: true } });
  await row(page, 63).locator(".row-main").click();
  await waitQuests(page);
  const j = page.locator("#journal");
  const names = await j.locator(".q-item .q-name").allInnerTexts();
  expect(names[0]).toBe("Prólogo invernal");
  expect(names).not.toContain("Misión de clase");
  const q = j.locator(".q-item").first();
  await expect(q.locator(".q-lv")).toHaveText("Niv. 50");
  await expect(q.locator(".q-start")).toHaveText(
    "Depende de tu alineamiento: El destino (Bonta), La fatalidad (Brakmar) o La rivalidad (sin alineamiento o neutral).");
  for (const [name, slug] of [["El destino", "el-destino"], ["La fatalidad", "la-fatalidad"], ["La rivalidad", "la-rivalidad"]]) {
    await expect(q.locator(".q-start a", { hasText: name })).toHaveAttribute("href", `https://www.torrentearcano.com/${slug}`);
  }
  const btn = q.locator(".q-done-btn");
  await expect(btn).toHaveAttribute("aria-pressed", "false");
  await expect(btn).toBeEnabled();
  // Pesa como una misión de nivel 50 con 6 objetivos
  expect(WEIGHTS[63].ids[0]).not.toBe("clase");
  expect(WEIGHTS[63].q[0]).toBeCloseTo(50 * Math.sqrt(6), 1);
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

test("«se retoma más adelante» lleva al paso que actualiza la misión, y va antes de «se termina»", async ({ page }) => {
  await openApp(page);
  // El 54 pasa Kumijo y actualiza la misión del 53: el 53 lo dice y lleva al 54
  await row(page, 53).locator(".row-main").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("53");
  const resumed = page.locator("#journal .call.resumedin");
  await expect(resumed).toHaveCount(1);
  await expect(resumed).toContainText("Se retoma más adelante");
  await expect(resumed.locator("img")).toHaveAttribute("src", /\.png$/);
  await resumed.locator('.step-ref[data-n="54"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("54");
  // El 54 no se retoma en ningún otro
  await expect(page.locator("#journal .call.resumedin")).toHaveCount(0);
  // El 58 se retoma en el 59 y se termina en el 61: las dos líneas, en orden de paso
  await row(page, 58).locator(".row-main").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("58");
  const later = page.locator("#journal .call.resumedin, #journal .call.closedin");
  await expect(later).toHaveCount(2);
  await expect(later.nth(0)).toHaveClass(/resumedin/);
  await expect(later.nth(0).locator(".step-ref")).toHaveAttribute("data-n", "59");
  await expect(later.nth(1)).toHaveClass(/closedin/);
  await expect(later.nth(1).locator(".step-ref")).toHaveAttribute("data-n", "61");
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
  // Por el número: en el centro de la fila puede caer la etiqueta "cierra el…", que lleva a otro paso
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
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
  // El 89, la misión de orden 5, que da Elviana Tirips y pide nivel de alineamiento 100: antes
  // va la misión 100 de Bonta, «El exorcista» (el 85 llega a la 99). El estandarte sigue
  // siendo el de la misión de orden
  expect((await stepData(page, 89)).quests).toEqual(["El exorcista", "Aprendizaje: Guardián del conocimiento"]);
  expect(await figure(page)).toBe("Inicia el paso:Elviana Tirips");
  await expect(page.locator("#journal .journal-title")).toContainText("Misión de orden 5");
});

test("el paso 12 lleva las misiones que exige «Espionaje industrial» antes de ella", async ({ page }) => {
  await openApp(page);
  expect((await stepData(page, 12)).quests).toEqual(["Cofrología", "Tesorfanato", "El maleficio del cofre",
    "Las grandes galerías", "Espionaje industrial"]);
});

test("las misiones de «Abono de peaje» van en el paso que las pide, antes de la misión que las exige", async ({ page }) => {
  await openApp(page);
  // «Prefiere morir en el mar» pide «Antimonárquico» y «Las joyas de la corona»
  expect((await stepData(page, 31)).quests).toEqual(["Antimonárquico", "Las joyas de la corona", "Prefiere morir en el mar"]);
  // «Calefacción a bajo coste» y «En busca de Javi Vito» piden «Duerme y tendrás un pastel»
  expect((await stepData(page, 40)).quests).toEqual(["Duerme y tendrás un pastel", "Calefacción a bajo coste", "En busca de Javi Vito"]);
  // «Quién saca beneficio del jalamut» pide «Lavandería automática»; «Almacén de avituallamiento», «Hace fresco…»
  expect((await stepData(page, 52)).quests).toEqual(["Lavandería automática", "Hace fresco, pero no importa",
    "Quién saca beneficio del jalamut", "Almacén de avituallamiento", "El S.L.I.P. está que arde"]);
  // «Llama, amigo y entra» pide «Canozzirujana»; «La guardia muere…», «Allá arriba, en el pico helado…»
  expect((await stepData(page, 83)).quests.slice(0, 2)).toEqual(["Canozzirujana", "Llama, amigo y entra"]);
  expect((await stepData(page, 86)).quests).toEqual(["Allá arriba, en el pico helado...", "La guardia muere, pero no se rinde"]);
  // Van bajo su logro, y el estandarte sigue en la misión del paso
  await expect(page.locator("#journal .q-group-name").first()).toHaveText("Abono de peaje");
  expect(await figure(page)).toBe("Inicia el paso:Pescador del Día sin Fin");
  for (const [n, who] of [[31, "Germán Onelsako"], [40, "Hipólito Thermya"], [52, "Eko Lojista"], [83, "Jemor Monte"]]) {
    await stepData(page, n);
    expect(await figure(page)).toBe(`Inicia el paso:${who}`);
  }
});

test("el 29 lleva las tres misiones de Mel que nombra y el 100, «Flovoración» tras la misión del logro", async ({ page }) => {
  await openApp(page);
  // «Misión: La pesca de Mel, Misión: Mel odiosa, Misión: Mel, o «dramática».», en ese orden
  expect((await stepData(page, 29)).quests).toEqual(["La pesca de Mel", "Mel odiosa", "Mel, o «dramática»"]);
  // «Se debe hacer la misión Flovoración en algún punto de esta»: la nota sigue con su enlace
  expect((await stepData(page, 100)).quests).toEqual(["¿Quién nos protege del protector?", "Flovoración"]);
  await expect(page.locator("#journal .call.must", { hasText: "Se debe hacer la misión Flovoración" })
    .locator("a.guide-link", { hasText: "Flovoración" })).toHaveCount(1);
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

  // El 39 pasa Tynril y Morsagüino y deja Funoroshi para el 48: Funoroshi va tras la línea
  await after(39, "La bendición de Viti", /Vence a 1 x Funoroshi/);
  const objs = page.locator("#journal .q-item", { hasText: "La bendición de Viti" }).locator(".obj-row");
  await expect(objs).toHaveText([/Tynril/, /Morsagüino/, /Funoroshi/, /Vuelve a ver/]);
});

test("la línea del 61 va en el combate contra Cil, no en «Hoticili»; el 50 y el 58 dejan sus jefes pendientes tras ella", async ({ page }) => {
  await openApp(page);
  const quest = name => page.locator("#journal .q-item", { has: page.locator(".q-name").getByText(name, { exact: true }) });
  const line = ":is(.obj-stop, .obj-resume)";
  // 61: «Hasta tener que pasar Cil» es el combate de «Un frío que hiela las piedras»
  await stepData(page, 61);
  await expect(quest("Un frío que hiela las piedras").locator(`${line} + .obj-row`)).toHaveText(/Vence a 1 x Cil en el mapa/);
  await expect(quest("Curiosos testigos").locator(line)).toHaveCount(0);
  await expect(page.locator(`#journal ${line}`)).toHaveCount(1);
  // 50: pasa Roca negra (Ben el Ripata), Kimbo y Obsidiantre; Sfinter Cell queda tras la línea
  await stepData(page, 50);
  const thomahon = quest("La bendición de Thomahon");
  await expect(thomahon.locator(".obj-row")).toHaveText([/Ben el Ripata/, /Kimbo/, /Obsidiantre/, /Sfinter Cell/, /Vuelve a ver/]);
  await expect(thomahon.locator(`${line} + .obj-row`)).toHaveText(/Vence a 1 x Sfinter Cell/);
  // 58: pasa Perfósil; Kanígrula y Cil quedan tras la línea
  await stepData(page, 58);
  const foluk = quest("La bendición de Foluk");
  await expect(foluk.locator(".obj-row")).toHaveText([/Perfósil/, /Kanígrula/, /Cil/, /Vuelve a ver/]);
  await expect(foluk.locator(`${line} + .obj-row`)).toHaveText(/Vence a 1 x Kanígrula/);
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

test("en la fila, el título usa todo el ancho y a la derecha van el Dofus o el jefe y las etiquetas de cierre", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const box = (n, sel) => row(page, n).locator(sel).boundingBox();
  // Las etiquetas salen de debajo del título y van a la derecha, antes del retrato
  for (const [n, tag] of [[5, ".row-closed"], [22, ".row-closes"]]) {
    await expect(row(page, n).locator(`.row-sub ${tag}`)).toHaveCount(0);
    await expect(row(page, n).locator(`.row-tags ${tag}`)).toHaveCount(1);
    const [text, tags] = [await box(n, ".row-text"), await box(n, ".row-tags")];
    expect(tags.x).toBeGreaterThanOrEqual(text.x + text.width - 0.5);
  }
  const [tags, art] = [await box(22, ".row-tags"), await box(22, ".row-art img")];
  expect(art.x).toBeGreaterThanOrEqual(tags.x + tags.width - 0.5);
  // El retrato, más grande que antes
  expect(art.width).toBeGreaterThanOrEqual(36);
  // Sin etiquetas, el título llega hasta el retrato: el del 2 se lee entero
  const title = row(page, 2).locator(".row-title");
  expect(await title.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
});

test("en móvil, la fila sigue entera: el retrato a la derecha y las etiquetas bajo el título", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApp(page);
  const r = row(page, 22);
  const [main, art, tags, title] = await Promise.all(
    [".row-main", ".row-art img", ".row-closes", ".row-title"].map(sel => r.locator(sel).boundingBox()));
  // Nada se sale de la fila
  expect(art.x + art.width).toBeLessThanOrEqual(main.x + main.width + 0.5);
  expect(tags.x + tags.width).toBeLessThanOrEqual(art.x + 0.5);
  // La etiqueta, debajo del título y entera
  expect(tags.y).toBeGreaterThanOrEqual(title.y + title.height - 0.5);
  expect(await r.locator(".row-closes").evaluate(el => el.scrollWidth <= el.clientWidth + 0.5)).toBe(true);
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
  // El fondo: el mapa del juego donde empieza la primera misión, alojado aquí
  await expect(page.locator("#journal .journal-banner .journal-bg"))
    .toHaveAttribute("style", /img\/maps\/start\/122421248\.jpg/);
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

test("la cabecera es corta: sin esfuerzo, «Incluye» en una línea y «Necesitas» en el cuerpo", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const goal = page.locator("#journal .journal-goal");
  // Sin etiquetas ni relojes de arena: bajo el título no se dice el esfuerzo
  await expect(goal.locator(".journal-meta, .badge, .goal-effort")).toHaveCount(0);
  // «Incluye», una línea bajo el texto de la guía
  await expect(goal.locator(".goal-calls .call.includes b")).toHaveText("Incluye");
  // «Necesitas» vuelve al cuerpo, antes de las misiones
  await expect(goal.locator(".journal-needs")).toHaveCount(0);
  await expect(page.locator("#journal .journal-body .journal-needs .slot")).toHaveCount(3);
  // Muchos objetos no alargan la cabecera: los 21 del 50 van todos en el cuerpo
  await stepData(page, 50);
  await expect(page.locator("#journal .journal-top .slot")).toHaveCount(0);
  expect(await page.locator("#journal .journal-body .journal-needs .slot").count()).toBeGreaterThan(10);
});

test("las misiones de un paso con varios logros van agrupadas por logro", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const groups = page.locator("#journal .q-group");
  await expect(groups.locator(".q-group-name")).toHaveText(["En marcha hacia la aventura", "Un ciudadano modelo", "¿Pero dónde están los dofus?"]);
  await expect(groups.locator(".q-item")).toHaveCount(16);
  expect(await groups.evaluateAll(gs => gs.map(g => g.querySelectorAll(".q-item").length))).toEqual([5, 6, 5]);
  // Todos los títulos llevan el icono de su logro, también los que el texto no nombra
  for (const n of [1, 12, 52]) {
    await stepData(page, n);
    const heads = page.locator("#journal .q-group-head");
    expect(await heads.count()).toBeGreaterThan(1);
    await expect(heads.locator("img")).toHaveCount(await heads.count());
  }
  // El 21 mezcla las 8 de su logro con una que no es de ninguno: va aparte, con la «!»
  await stepData(page, 21);
  await expect(groups.locator(".q-group-name")).toHaveText(["Púrpura profundo", "Fuera del logro"]);
  expect(await groups.evaluateAll(gs => gs.map(g => g.querySelectorAll(".q-item").length))).toEqual([8, 1]);
  await expect(groups.nth(1).locator(".q-item .q-name")).toHaveText("Cómo perder la pluma");
  await expect(groups.locator(".q-group-head").nth(1).locator(".quest-mark")).toHaveCount(1);
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

test("en escritorio el detalle crece con sus misiones: se desplaza la página y la barra de pasos queda pegada abajo", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  const detail = page.locator(".diary-detail");
  const body = page.locator("#journal .journal-body");
  // Ni el panel ni el cuerpo se desplazan por dentro: el panel mide lo que su contenido
  expect(await detail.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await body.evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  expect(await detail.evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(900);
  // La barra va fuera del cuerpo y, con el panel más alto que la pantalla, pegada al borde de abajo
  await expect(page.locator("#journal .journal-body .journal-cta")).toHaveCount(0);
  const cta = page.locator("#journal .journal-cta");
  const bottom = () => cta.evaluate(el => Math.round(el.getBoundingClientRect().bottom));
  await page.evaluate(() => scrollTo(0, document.querySelector(".diary-detail").getBoundingClientRect().top + scrollY - 80));
  await expect(cta).toBeInViewport({ ratio: 1 });
  expect(await bottom()).toBe(900);
  // Se desplaza la página, no el panel: la barra sigue en el mismo sitio y la lista a la vista
  await page.evaluate(() => scrollBy(0, 300));
  expect(await bottom()).toBe(900);
  await expect(page.locator(".diary-list")).toBeInViewport();
  const side = await page.locator(".diary-side").evaluate(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, header: document.querySelector("header").getBoundingClientRect().bottom };
  });
  expect(side.top).toBeGreaterThanOrEqual(side.header - 0.5);
  expect(side.bottom).toBeLessThanOrEqual(900.5);
  // Al final del panel la barra se queda en su sitio, al pie del detalle
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  const end = await page.evaluate(() => ({
    cta: document.querySelector("#journal .journal-cta").getBoundingClientRect().bottom,
    detail: document.querySelector(".diary-detail").getBoundingClientRect().bottom,
  }));
  expect(Math.abs(end.cta - end.detail)).toBeLessThanOrEqual(2);
});

test("pasar de paso desde la barra, al final de un paso largo, vuelve al principio del detalle", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="1"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
  await page.locator("#nextBtn").evaluate(el => el.click());
  await expect(page.locator("#journal .journal-num")).toHaveText("2");
  await expect(page.locator("#journal .journal-top")).toBeInViewport({ ratio: 1 });
  const top = await page.evaluate(() => document.querySelector(".diary-detail").getBoundingClientRect().top - document.querySelector("header").getBoundingClientRect().bottom);
  expect(top).toBeGreaterThanOrEqual(-0.5);
});

test("con la página arriba, la barra de pasos pegada no sube sobre la cabecera del paso", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await stepData(page, 12);
  await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => {
    const top = document.querySelector("#journal .journal-top").getBoundingClientRect();
    const body = document.querySelector("#journal .journal-body").getBoundingClientRect();
    const cta = document.querySelector("#journal .journal-cta").getBoundingClientRect();
    return { topEnd: top.bottom, bodyEnd: body.bottom, cta: cta.top };
  });
  // Como poco, 240 px de cuerpo a la vista antes de la barra (o el cuerpo entero, si es más corto)
  expect(r.cta).toBeGreaterThanOrEqual(Math.min(r.topEnd + 240, r.bodyEnd) - 0.5);
});

test("con poco contenido el panel llega al pie de la pantalla y la barra de pasos va abajo", async ({ page }) => {
  await openApp(page);
  await stepData(page, 4);
  await expect(page.locator("#journal .q-item")).toHaveCount(1);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => {
    const header = document.querySelector("header").getBoundingClientRect().bottom;
    scrollBy({ top: document.querySelector(".diary-detail").getBoundingClientRect().top - header, behavior: "instant" });
  });
  await page.waitForTimeout(100);
  const r = await page.evaluate(() => {
    const header = document.querySelector("header").getBoundingClientRect().bottom;
    const detail = document.querySelector(".diary-detail").getBoundingClientRect();
    const cta = document.querySelector("#journal .journal-cta").getBoundingClientRect();
    return { header, h: detail.height, detail: detail.bottom, cta: cta.bottom, vh: innerHeight };
  });
  // El panel mide al menos lo que la pantalla bajo la cabecera, con la barra al pie
  expect(r.h).toBeGreaterThanOrEqual(r.vh - r.header - 0.5);
  expect(Math.min(Math.abs(r.cta - r.vh), Math.abs(r.cta - r.detail))).toBeLessThanOrEqual(4);
});

test("a 1440×900, con el paso 12 abierto se leen todas sus misiones sin desplazar nada por dentro", async ({ page }) => {
  await openApp(page);
  await stepData(page, 12);
  const items = page.locator("#journal .q-item");
  await expect(items.first()).toBeAttached();
  await page.waitForLoadState("networkidle");
  // La página baja hasta dejar el detalle arriba, bajo la cabecera
  await page.evaluate(() => {
    const header = document.querySelector("header").getBoundingClientRect().bottom;
    scrollBy(0, document.querySelector(".diary-detail").getBoundingClientRect().top - header);
  });
  // El estandarte es compacto y el cuerpo no se desplaza por dentro
  const banner = await page.locator("#journal .journal-banner").boundingBox();
  expect(banner.height).toBeGreaterThanOrEqual(180);
  expect(banner.height).toBeLessThanOrEqual(215);
  expect(await page.locator("#journal .journal-body").evaluate(el => el.scrollHeight - el.clientHeight)).toBeLessThanOrEqual(1);
  for (const item of await items.all()) await expect(item).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
  // Y ninguna queda tapada por la barra de pasos, que va pegada abajo
  const ctaTop = await page.locator("#journal .journal-cta").evaluate(el => el.getBoundingClientRect().top);
  const bottoms = await items.evaluateAll(els => els.map(e => e.getBoundingClientRect().bottom));
  for (const b of bottoms) expect(b).toBeLessThanOrEqual(ctaTop + 0.5);
});

test("en el estandarte compacto, quien da el paso va en una línea bajo el objetivo", async ({ page }) => {
  await openApp(page);
  await stepData(page, 12);
  await expect(page.locator("#journal .journal-banner figcaption")).toBeHidden();
  const by = page.locator("#journal .journal-goal .goal-by");
  await expect(by).toBeVisible();
  await expect(by).toHaveText("Inicia el paso: Profesor Max Ymillán");
  await expect(by.locator("b")).toHaveText("Profesor Max Ymillán");
  // Con otras figuras, su propia etiqueta
  await stepData(page, 1);
  await expect(by).toHaveText("Se gana: Dofawa");
  // El estandarte guarda el número, la zona y la figura, sin recortar nada
  const fits = await page.locator("#journal .journal-banner").evaluate(b => {
    const r = b.getBoundingClientRect();
    return [".journal-num", ".banner-zone", ".journal-show img"].map(s => {
      const e = b.querySelector(s).getBoundingClientRect();
      return e.top >= r.top - 0.5 && e.bottom <= r.bottom + 0.5 && e.left >= r.left - 0.5 && e.right <= r.right + 0.5;
    });
  });
  expect(fits).toEqual([true, true, true]);
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
    // Sin el número del logro: en el 27 es la 2.ª del logro pero la 1.ª del paso
    await expect(page.locator("#journal .goal-calls .call.note")).toHaveText(new RegExp(`^Nota\\s*La misión «${name}» es opcional pero útil\\.$`, "i"));
    const optional = page.locator("#journal .q-item .q-optional");
    await expect(optional).toHaveCount(1);
    await expect(page.locator("#journal .q-item", { has: page.locator(".q-optional") }).locator(".q-name")).toHaveText(new RegExp(name, "i"));
    // La etiqueta va pegada al nombre, no al otro extremo de la fila
    const gap = await page.locator("#journal .q-optional").evaluate(el =>
      el.getBoundingClientRect().left - el.previousElementSibling.getBoundingClientRect().right);
    expect(gap).toBeLessThan(20);
    // Es una etiqueta (con borde), y el nivel sigue en su sitio: alineado con las demás filas
    expect(await page.locator("#journal .q-optional").evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("solid");
    const rights = await page.locator("#journal .q-item .q-lv").evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().right)));
    expect(Math.max(...rights) - Math.min(...rights)).toBeLessThanOrEqual(1);
  }
});

test("en el paso 100, «Flovoración» enlaza a su guía", async ({ page }) => {
  await openApp(page);
  await stepData(page, 100);
  await expect(page.locator('#journal .call.must a.guide-link', { hasText: "Flovoración" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/flovoracion");
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

test("la ventana de pasos abre con los Dofus del camino, conseguidos o apagados", async ({ page }) => {
  // Esmeralda (paso 18) y Púrpura (21); el 17 solo lleva "Verde esmeralda" hasta la misión 7
  await openApp(page, { "silvestre:done": { 17: true, 18: true, 21: true } });
  const road = page.locator("#diary .steps-win #winRoad");
  await expect(road.locator(".road-title")).toHaveText("Dofus del camino");
  await expect(road.locator(".road-count")).toHaveText("2/12");
  // Todos los de tipo Dofus, no solo los que se llaman así: Dofawa (misión del paso 1),
  // Domakuro y Dorigami (Pandala), en el orden en que se consiguen
  const dofus = road.locator(".road-dofus");
  await expect(dofus).toHaveCount(12);
  await expect(dofus.nth(0)).toHaveAttribute("title", "Dofawa · paso 1");
  await expect(dofus.nth(0)).not.toHaveClass(/\bobtained\b/);
  await expect(dofus.nth(1)).toHaveClass(/\bobtained\b/);
  await expect(dofus.nth(2)).toHaveClass(/\bobtained\b/);
  await expect(dofus.nth(3)).toHaveAttribute("title", "Domakuro · paso 49");
  await expect(dofus.nth(4)).toHaveAttribute("title", "Dorigami · paso 56");
  // El Ocre llega al terminar "La eterna cosecha": el logro "El fin de la eternidad" del paso 79
  await expect(dofus.nth(7)).toHaveAttribute("title", "Dofus Ocre · paso 79");
  await expect(dofus.nth(7)).not.toHaveClass(/\bobtained\b/);
  // La Piñata de pino se da por conseguida al completar el paso 99
  await expect(dofus.nth(11)).toHaveAttribute("title", "Piñata de pino · paso 99");
  // Los que faltan, en gris; los conseguidos, a todo color. Ninguno marca el siguiente
  const filter = i => dofus.nth(i).locator("img").evaluate(el => getComputedStyle(el).filter);
  expect(await filter(3)).toContain("grayscale");
  expect(await filter(1)).not.toContain("grayscale");
  await expect(road.locator(".road-step, .road-dofus.next")).toHaveCount(0);
  // Pulsar uno abre su paso
  await dofus.nth(3).click();
  await expect(page.locator("#journal .journal-num")).toHaveText("49");
});

test("la ventana de pasos muestra el progreso global y lleva al siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 32) });
  const pct = await page.locator("#heroPct").innerText();
  await expect(page.locator("#winPct")).toHaveText(pct);
  await expect(page.locator("#winDone")).toHaveText("32");
  const fill = await page.locator("#winFill").evaluate(el => el.style.width);
  expect(parseFloat(fill)).toBeCloseTo(parseFloat(pct), 1);
  await expect(page.locator(".steps-win #diaryNext")).toContainText("33");
  // Lleva al siguiente y deja la ventana a la vista, con su franja arriba
  await page.click("#diaryNext");
  await expect(page.locator("#journal .journal-num")).toHaveText("33");
  await expect(page.locator("#winRoad")).toBeInViewport();
});


test("al recargar, la ventana sigue en el paso abierto; el hero, en el siguiente pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": range(1, 10) });
  await row(page, 50).locator(".row-main").click();
  await expect(page.locator("#journal .journal-num")).toHaveText("50");
  await page.reload();
  await expect(page.locator("#journal .journal-num")).toHaveText("50");
  await expect(row(page, 50)).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#heroNext .journal-num")).toHaveText("11");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("silvestre:selectedStep")))).toBe(50);
  // En el mapa también: abre la ficha del paso en el que estaba
  await page.click("#stepsViewMap");
  await expect(page.locator("#mapCard .journal-num")).toHaveText("50");
  await page.reload();
  await expect(page.locator("#mapCard .journal-num")).toHaveText("50");
});

test("en el paso 38, «La sombra del reino» enlaza a su guía", async ({ page }) => {
  await openApp(page);
  await stepData(page, 38);
  await expect(page.locator('#journal .call.note a.guide-link', { hasText: "La sombra del reino" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/la-sombra-del-reino");
});

/** La misión del detalle por su nombre exacto (otras la nombran en sus objetivos). */
const questItem = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator("summary .q-name").getByText(name, { exact: true }) });

test("en el 93, la nota que empieza por «Misión N:» va dentro de esa misión, no entre los avisos", async ({ page }) => {
  const errors = await openApp(page);
  await stepData(page, 93);
  const calls = page.locator("#journal .goal-calls .call");
  await expect(calls.filter({ hasText: /Misión \d+:/ })).toHaveCount(0);
  // La entrada que solo las presentaba («…se actualizan algunas misiones:») tampoco queda
  await expect(calls).toHaveCount(1);
  await expect(calls.first()).toContainText("Con los cuatro sacrificios dropeados");
  await expect(calls.first().locator('.step-ref[data-n="7"]')).toHaveCount(1);
  // Siete notas, una por misión, y sin el «Misión N: Nombre.» delante
  await expect(page.locator("#journal .q-note")).toHaveCount(7);
  const blanco = questItem(page, "El dragón blanco");
  await blanco.locator("summary .q-name").click();
  await expect(blanco.locator(".q-note")).toHaveText("Se pasa Miauvisor y se dropea el tótem de sorpresa");
  await expect(blanco.locator(".q-note img")).toHaveAttribute("src", /\.png$/);
  // Arriba, junto a dónde empieza: antes de los objetivos
  expect(await blanco.locator(".q-note").evaluate(el => !!el.previousElementSibling?.matches(".q-start"))).toBe(true);
  // «Nordalia» en la guía, «Nordalía» en el juego: va por el número de la misión
  await expect(questItem(page, "Nordalía").locator(".q-note")).toContainText("Se pasa Tal Kasha");
  // Los incisos siguen enlazados
  const voz = questItem(page, "Una voz de cristal").locator(".q-note");
  await expect(voz.locator(".step-ref")).toHaveText(["84", "15"]);
  expect(errors).toEqual([]);
});

test("en el 94, la nota de «El dragón negro» va dentro de ella y el objetivo se queda sin avisos", async ({ page }) => {
  await openApp(page);
  await stepData(page, 94);
  await expect(page.locator("#journal .goal-calls")).toHaveCount(0);
  const negro = questItem(page, "El dragón negro");
  await negro.locator("summary .q-name").click();
  await expect(negro.locator(".q-note")).toHaveText("Se pasa Klim y se termina la misión del inciso 84");
  await expect(page.locator("#journal .q-note")).toHaveCount(1);
});

test("el estandarte no crece con el texto: el del 93 mide lo mismo que el del 12", async ({ page }) => {
  for (const [w, h] of [[1440, 900], [1280, 720]]) {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    // Alto y separación de la parte de arriba del detalle: arriba, en el mismo sitio
    const box = async n => {
      await stepData(page, n);
      return page.evaluate(() => {
        const top = document.querySelector("#journal .journal-top").getBoundingClientRect().top;
        const r = document.querySelector("#journal .journal-banner").getBoundingClientRect();
        return { h: r.height, top: r.top - top };
      });
    };
    const usual = await box(12);
    const tall = await box(93);
    expect(Math.abs(tall.h - usual.h), `${w}×${h}: ${tall.h} frente a ${usual.h}`).toBeLessThanOrEqual(2);
    expect(Math.abs(tall.top - usual.top)).toBeLessThanOrEqual(1);
  }
});

test("los nombres de misión de la guía no arrastran el «)» que cierra el resaltado, y enlazan en su aviso", async ({ page }) => {
  const GUIDES = JSON.parse(readFileSync(new URL("../../src/data/guides.json", import.meta.url), "utf8"));
  const unbalanced = Object.keys(GUIDES.missions).filter(k => (k.match(/\)/g) || []).length > (k.match(/\(/g) || []).length);
  expect(unbalanced).toEqual([]);
  await openApp(page);
  // 54: «(Se debe también completar la misión del Bosque maléfico: … misión 2: Detenla si puedes)»
  await stepData(page, 54);
  await expect(page.locator("#journal .call.must a.guide-link", { hasText: "Detenla si puedes" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/detenla-si-puedes");
  // 83: «(Hasta justo después de pasar Dazahk Martegel y obtener la misión: La biblia de los rencores)»
  await stepData(page, 83);
  await expect(page.locator("#journal .call.stop a.guide-link", { hasText: "La biblia de los rencores" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/la-biblia-de-los-rencores");
});

test("en el 1, los dos logros que incluye enlazan a su guía; «Respuestas para todo», sin página, no", async ({ page }) => {
  await openApp(page);
  await stepData(page, 1);
  const includes = page.locator("#journal .call.includes");
  await expect(includes.locator("a.guide-link", { hasText: "En marcha hacia la aventura" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/en-marcha-hacia-la-aventura");
  await expect(includes.locator("a.guide-link", { hasText: "Un ciudadano modelo" }))
    .toHaveAttribute("href", "https://www.torrentearcano.com/un-ciudadano-modelo");
  await expect(questItem(page, "Respuestas para todo").locator(".q-guide")).toHaveCount(0);
});

test("en el 16, «La huida es la mejor salida» va tras «Nuestros amigos los animalitos», que pide terminada", async ({ page }) => {
  await openApp(page);
  expect((await stepData(page, 16)).quests).toEqual(["Directo al mulaguabús", "Sin denominación de origen",
    "El vals de manuales", "Nuestros amigos los animalitos", "La huida es la mejor salida", "Shyriiwook", "Con las mismas armas"]);
});

test("las paradas del 54 y del 85 caen en el combate: la kitsu de nueve colas y Ilyzaelle", async ({ page }) => {
  await openApp(page);
  const line = ":is(.obj-stop, .obj-resume)";
  // 54: «Hasta tener que pasar Kumijo»; el combate es «Capta la atención…», antes del trato
  await stepData(page, 54);
  await expect(questItem(page, "Cuando se caldean las ánimas").locator(`${line} + .obj-row`))
    .toHaveText(/Capta la atención de la kitsu de nueve colas/);
  // 85: «Hasta tener que pasar Ilyzaelle»; no en el mapa de su mirador, sino en el combate
  await stepData(page, 85);
  await expect(questItem(page, "Inclemencias").locator(`${line} + .obj-row`)).toHaveText(/Vence a 1 x Ilyzaelle/);
});

test("el 38 lleva «La sombra del reino» tras «Esto parece el Sur», con una nota: se puede hacer hasta el paso 80", async ({ page }) => {
  const FIGURES = JSON.parse(readFileSync(new URL("../../src/data/figures.json", import.meta.url), "utf8"));
  const errors = await openApp(page);
  expect((await stepData(page, 38)).quests).toEqual(
    ["Extinción de los fuegos", "Esto parece el Sur", "La sombra del reino", "La bruja mala del Este"]);
  const sombra = questItem(page, "La sombra del reino");
  // Obligatoria: ni opcional ni solo tomarla, y con su «Completar»
  await expect(sombra.locator(".q-optional, .q-take")).toHaveCount(0);
  await expect(sombra.locator(".q-done-btn")).toHaveCount(1);
  await sombra.locator("summary .q-name").click();
  const note = sombra.locator(".q-note");
  await expect(note).toHaveText("Se puede hacer en cualquier momento antes del paso 80.");
  await note.locator('.step-ref[data-n="80"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("80");
  // El estandarte sigue siendo el de Meriana, que empieza el paso
  expect(FIGURES[38].f.name).toBe("Meriana");
  expect(errors).toEqual([]);
});

test("las misiones que la guía deja a medias y no retoma lo dicen dentro: 13, 15 y 83", async ({ page }) => {
  await openApp(page);
  const text = "La guía no la retoma: para el Silvestre basta con llegar hasta aquí.";
  for (const [n, name] of [[13, "El daño de Búril"], [15, "Su nombre es Ninguno"], [83, "Birk, hija de Bork"]]) {
    await stepData(page, n);
    const q = questItem(page, name);
    await q.locator("summary .q-name").click();
    await expect(q.locator(".q-note")).toHaveText(text);
    await expect(page.locator("#journal .q-note")).toHaveCount(1);
  }
});

test("el consejo «En el logro X, misión N: Nombre. = …» va dentro de esa misión, sin ese principio", async ({ page }) => {
  await openApp(page);
  await stepData(page, 77);
  await expect(page.locator("#journal .goal-calls .call.tip")).toHaveCount(0);
  const muerte = questItem(page, "Muerte y renovación");
  await muerte.locator("summary .q-name").click();
  await expect(muerte.locator(".q-note")).toHaveText(
    "Se puede encadenar la parte de matar monstruos de la zona con las primeras 4 salas de las mazmorras de Corrupción.");
  // Con el icono y el rótulo de consejo, no el de nota
  await expect(muerte.locator(".q-note img")).toHaveAttribute("title", "Consejo");
  // Lo mismo en el 75 y el 76
  await stepData(page, 75);
  await expect(questItem(page, "El barco con esclavos").locator(".q-note")).toContainText("Se puede encadenar");
  await expect(page.locator("#journal .goal-calls .call.tip")).toHaveCount(0);
});

test("el paso 47 pide el Filtro de amor, con su imagen, y no el Filtro de dragonalgas", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  // «En busca de un herrero» pide el objeto 33380 en DofusDB; la lista de la página lo llama de otra forma
  await page.click('.diary-row[data-n="47"] .row-main');
  const slot = page.locator('#journal .journal-needs .slot[data-id="33380"]');
  await expect(slot.locator("img")).toHaveAttribute("src", /items\//);
  await slot.hover();
  await slot.locator(".slot-copy").click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Filtro de amor");
  await expect(page.locator('#journal .journal-needs .slot[data-id="x:filtro de dragonalgas"]')).toHaveCount(0);
});

test("la lista del diario no lleva la miniatura de la zona y deja más ancho al detalle", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await expect(page.locator(".diary-row").first()).toBeVisible();
  await expect(page.locator(".diary-list .row-thumb")).toHaveCount(0);
  const side = await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().width);
  expect(side).toBeLessThanOrEqual(380);
  // El título sigue teniendo el mismo sitio que antes, sin la miniatura
  const title = await page.locator('.diary-row[data-n="4"] .row-title').evaluate(el => el.getBoundingClientRect().width);
  expect(title).toBeGreaterThanOrEqual(200);
});
