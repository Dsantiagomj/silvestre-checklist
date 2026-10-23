import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, readLS } from "./helpers.js";

// Los recuentos de la ventana de objetos salen de los datos, no van escritos: la
// sincronización con Torrente Arcano añade y quita objetos. Sin progreso la app cuenta un
// objeto distinto por fila (k) de todos los pasos, sin las de un caso concreto (x)
const RESOURCES = JSON.parse(fs.readFileSync(new URL("../../src/data/resources.json", import.meta.url), "utf8"));
const ITEM_CAT = new Map();
for (const rows of Object.values(RESOURCES.steps)) {
  for (const row of rows) if (!row.x && !ITEM_CAT.has(row.k)) ITEM_CAT.set(row.k, row.c);
}
const ITEMS = ITEM_CAT.size;
const ITEMS_BY_CAT = { todo: ITEMS };
for (const c of ITEM_CAT.values()) ITEMS_BY_CAT[c] = (ITEMS_BY_CAT[c] || 0) + 1;

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const ALL_PREREQS = Object.fromEntries(
  ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l10", "l11", "l12", "o1", "o2", "o3", "o4", "o5", "o6", "h1", "h2", "h3"].map(id => [id, true]));
// Pasos 1 a 40 hechos y prerrequisitos completos: lo siguiente son los pasos 41 a 45
const MID = { "silvestre:done": range(1, 40), "silvestre:prereqs": ALL_PREREQS };
// La ventana de pasos abierta en la pestaña de prerrequisitos
const openPre = (page, seed = null) => openApp(page, seed, { view: "prereqs" });
// Y en la de objetos
const openItems = (page, seed = null) => openApp(page, seed, { view: "items" });
/**
 * La ventana entera a la vista, sin desplazamiento suave: un clic a mitad de camino
 * caería en otro sitio. En escritorio su barra de herramientas va fija dentro.
 */
const showWindow = page => page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));

test("prerrequisitos y objetos son pestañas de la ventana de pasos, con lo que falta", async ({ page }) => {
  await openApp(page);
  // Ya no hay una sección aparte: van en la misma ventana que el mapa y el diario
  await expect(page.locator(".wrap > .needs")).toHaveCount(0);
  const tabs = page.locator("#diary .steps-win [role=tab]");
  await expect(tabs).toHaveText([/Mapa/, /Diario/, /Prerrequisitos/, /Objetos/]);
  // Cada una dice cuántos le faltan
  await expect(page.locator("#prereqsCount")).toHaveText("20");
  await expect(page.locator("#itemsCount")).toHaveText(String(ITEMS));
  await page.click("#tabPrereqs");
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "false");
  await expect(page.locator("#prereqs")).toBeVisible();
  await expect(page.locator(".diary-row")).toHaveCount(0);
  await page.click("#tabItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#items")).toBeVisible();
  await expect(page.locator("#prereqs")).toBeHidden();
  // Se recuerda, como la vista de los pasos
  await page.reload();
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await page.click("#stepsViewDiary");
  await expect(page.locator(".diary-row")).toHaveCount(100);
});

test("los prerrequisitos son tarjetas que se marcan, con sus objetos debajo", async ({ page }) => {
  await openPre(page);
  await expect(page.locator("#prereqs .pr-card")).toHaveCount(20);
  await page.click('.pr-card[data-id="o1"]');
  await expect(page.locator('.pr-card[data-id="o1"]')).toHaveClass(/\bdone\b/);
  await expect(page.locator("#prereqsCount")).toHaveText("19");
  // Los 17 objetos que piden los prerrequisitos
  await expect(page.locator("#prereqs .slot")).toHaveCount(19);
});

test("marcar todo y limpiar en prerrequisitos, con deshacer", async ({ page }) => {
  await openPre(page);
  await page.click("#needsMarkAll");
  // Sin nada pendiente, la pestaña lleva una ✓ en vez del número
  await expect(page.locator("#prereqsCount")).toHaveText("✓");
  await page.click("#needsClear");
  await expect(page.locator("#prereqsCount")).toHaveText("20");
  await page.click("#toastAction");
  await expect(page.locator("#prereqsCount")).toHaveText("✓");
});

test("el orden por paso se llama «Por paso» y la banda no repite «Pronto»", async ({ page }) => {
  await openApp(page, null, { view: "items" });
  await expect(page.locator('.needs-sort [data-sort="soon"]')).toHaveText("Por paso");
  await expect(page.locator("#items .band-pill")).toHaveCount(0);
  await expect(page.locator("#items", { hasText: /Pronto/ })).toHaveCount(0);
});

test("Pronto reúne lo de los próximos 5 pasos y reparte las cantidades", async ({ page }) => {
  await openApp(page, MID, { view: "items" });
  const soon = page.locator("#bandSoon");
  await expect(soon.locator(".band-steps")).toHaveText(["41", "42", "43", "44", "45"].join(""));
  // Pepita: 100 para el paso 42 arriba, el resto más adelante
  const pepitaSoon = soon.locator('.slot[data-id="14635"]');
  await expect(pepitaSoon.locator(".q")).toHaveText("100");
  await expect(pepitaSoon.locator(".st")).toHaveText("42");
  const pepitaLater = page.locator('#bandLater .slot[data-id="14635"]');
  await expect(pepitaLater.locator(".q")).toHaveText("2102");
  // Marcar en Pronto marca solo esa parte
  await pepitaSoon.locator(".slot-main").click();
  await expect(pepitaSoon).toHaveClass(/\bowned\b/);
  await expect(pepitaLater).not.toHaveClass(/\bowned\b/);
  expect(await readLS(page, "silvestre:owned")).toEqual({ "14635#42": true });
});

test("ordenar por cantidad o A–Z quita las franjas", async ({ page }) => {
  await openItems(page);
  await page.click('.needs-sort [data-sort="qty"]');
  await expect(page.locator("#bandSoon")).toHaveCount(0);
  // Sin progreso: la guía entera, una casilla por objeto
  await expect(page.locator("#items .slot")).toHaveCount(ITEMS);
  await expect(page.locator("#items .slot").first()).toHaveAttribute("data-id", "14635");
  await page.click('.needs-sort [data-sort="az"]');
  await expect(page.locator("#items .slot .q").first()).toBeVisible();
});

test("las categorías filtran y cuentan objetos distintos", async ({ page }) => {
  await openItems(page);
  for (const [cat, n] of Object.entries(ITEMS_BY_CAT)) {
    await expect(page.locator(`.needs-cat[data-cat="${cat}"] .n`)).toHaveText(String(n));
  }
  await page.click('.needs-cat[data-cat="almas"]');
  await page.click('.needs-sort [data-sort="az"]');
  await expect(page.locator("#items .slot")).toHaveCount(ITEMS_BY_CAT.almas);
});

test("el buscador resalta coincidencias sin quitar casillas y entiende sin tildes", async ({ page }) => {
  await openItems(page);
  await page.click('.needs-sort [data-sort="az"]');
  await page.fill("#needsSearch", "bambu");
  await expect(page.locator("#needsMatches")).toHaveText(new RegExp(`^\\d+ de ${ITEMS}$`));
  const matches = page.locator("#items .slot.match");
  await expect(matches.first()).toBeVisible();
  await expect(page.locator("#items .slot")).toHaveCount(ITEMS);
  expect(await page.locator("#items .slot.dim").count()).toBe(ITEMS - await matches.count());
  // Los recuentos pasan a contar coincidencias ("bambu" también encuentra criaturas de bambú)
  await expect(page.locator('.needs-cat[data-cat="todo"] .n')).toHaveText(String(await matches.count()));
  await expect(page.locator('.needs-cat[data-cat="criaturas"] .n')).not.toHaveText("0");
  await page.click("#needsSearchClear");
  await expect(page.locator("#needsSearch")).toHaveValue("");
  await expect(page.locator("#items .slot.dim")).toHaveCount(0);
});

test("la tecla / lleva al buscador de objetos", async ({ page }) => {
  // Desde el diario: la ventana pasa a la pestaña de objetos
  await openApp(page);
  await page.locator("body").press("/");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needsSearch")).toBeFocused();
});

test("copiar el nombre de un objeto no lo marca", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openItems(page);
  const slot = page.locator('#items .slot[data-id="14635"]').first();
  await slot.hover();
  await slot.locator(".slot-copy").click();
  await expect(slot).toContainText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Pepita");
  await expect(slot).not.toHaveClass(/\bowned\b/);
});

test("marcar todo y limpiar actúan sobre lo que se ve", async ({ page }) => {
  await openItems(page);
  await page.click('.needs-cat[data-cat="almas"]');
  await page.click("#needsMarkAll");
  await expect(page.locator("#items .slot:not(.owned)")).toHaveCount(0);
  await expect(page.locator("#toastTxt")).toContainText("9");
  // Solo las almas: el resto sigue igual
  await page.click('.needs-cat[data-cat="todo"]');
  await page.click('.needs-sort [data-sort="az"]');
  await expect(page.locator("#items .slot.owned")).toHaveCount(9);
  await page.click("#toastAction");
  await expect(page.locator("#items .slot.owned")).toHaveCount(0);
  await page.click('.needs-cat[data-cat="almas"]');
  await page.click("#needsMarkAll");
  await page.click("#needsClear");
  await expect(page.locator("#items .slot.owned")).toHaveCount(0);
});

test("en móvil la sección cabe en el ancho de la pantalla", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openItems(page, MID);
  await page.locator("#needs").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const box = await page.locator("#bandSoon").boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  // Y la de prerrequisitos: ninguna tarjeta se sale por la derecha
  await page.click("#tabPrereqs");
  // Ya en su sitio: mientras entra se desliza de lado
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1);
  await page.waitForTimeout(100);
  const panel = await page.locator("#prereqs").boundingBox();
  const rights = await page.locator(".pr-card").evaluateAll(els => els.map(el => el.getBoundingClientRect().right));
  expect(Math.max(...rights)).toBeLessThanOrEqual(panel.x + panel.width + 0.5);
  await ctx.close();
});

test("la aclaración va antes de la ventana de pasos, que ya no lleva número", async ({ page }) => {
  await openApp(page);
  // En pantalla alta (la de la suite), la nota de las pausas va antes de la ventana
  const order = await page.evaluate(() => ["#nota", "#diary"]
    .map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  // Sin la sección 01, la numeración sobra
  await expect(page.locator(".section-num")).toHaveCount(0);
  await expect(page.locator("#diaryTitle")).toHaveText("Los 100 pasos");
});

test("el buscador es ancho y los controles van juntos a la izquierda", async ({ page }) => {
  await openItems(page);
  const search = await page.locator("#needsSearch").boundingBox();
  expect(search.width).toBeGreaterThanOrEqual(400);
  // Sin huecos grandes entre controles: nada empujado al otro extremo
  const boxes = await page.locator(".needs-toolbar > *").evaluateAll(els => els.map(el => el.getBoundingClientRect())
    .map(r => ({ left: r.left, right: r.right, top: r.top })));
  for (let i = 1; i < boxes.length; i++) {
    if (Math.abs(boxes[i].top - boxes[i - 1].top) < 10) expect(boxes[i].left - boxes[i - 1].right).toBeLessThan(40);
  }
});

test("un aviso explica qué hacen marcar todo y limpiar en cada pestaña", async ({ page }) => {
  await openPre(page);
  await expect(page.locator("#needsHint")).toContainText("20 prerrequisitos");
  await page.click("#tabItems");
  await expect(page.locator("#needsHint")).toContainText("lo que ves");
  await expect(page.locator("#needsHint")).toContainText("solo quita lo que marcaste a mano");
});

test("la vista de lista muestra lo mismo que la cuadrícula, con nombre y pasos a la vista", async ({ page }) => {
  await openItems(page, MID);
  // "Pronto" no se pagina: la lista enseña los mismos objetos que la cuadrícula
  const grid = await page.locator("#bandSoon .slot").count();
  await page.click('.needs-view [data-view="list"]');
  await expect(page.locator("#bandSoon .slot.list")).toHaveCount(grid);
  const pepita = page.locator('#bandSoon .slot.list[data-id="14635"]');
  await expect(pepita).toContainText("Pepita");
  await expect(pepita).toContainText("Paso 42");
  await expect(pepita.locator(".q")).toHaveText("×100");
  await expect(pepita.locator(".slot-copy")).toBeVisible();
  await pepita.locator(".slot-main").click();
  await expect(pepita).toHaveClass(/\bowned\b/);
  // La vista elegida se recuerda
  await page.reload();
  await page.click("#tabItems");
  await expect(page.locator('.needs-view [data-view="list"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#items .slot.list").first()).toBeVisible();
});

test("en la lista el nombre largo se corta y no tapa la cantidad", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openItems(page, { ...MID, "silvestre:itemsView": "list" });
  const row = page.locator("#items .slot.list", { hasText: "Artefacto pandawushu de madera" }).first();
  const name = await row.locator(".slot-name").boundingBox();
  const qty = await row.locator(".q").boundingBox();
  expect(name.x + name.width).toBeLessThanOrEqual(qty.x);
  await ctx.close();
});

test("las tarjetas de prerrequisitos separan zona, título y nivel, con iconos grandes", async ({ page }) => {
  await openPre(page, { "silvestre:prereqs": { l1: true, l3: true } });
  await expect(page.locator(".pr-group h3").first()).toContainText("2/11");
  const otomai = page.locator('.pr-card[data-id="l4"]');
  await expect(otomai.locator(".pr-zone")).toHaveText("Isla de Otomaï");
  await expect(otomai.locator(".pr-title")).toHaveText('Logro "El gran Guarrok". (Completo)');
  // Nivel y obligatoriedad en palabras, bajo el nombre (no en una etiqueta suelta)
  await expect(page.locator(".pr-badge")).toHaveCount(0);
  await expect(page.locator('.pr-card[data-id="o5"] .pr-title')).toHaveText("Campesino");
  await expect(page.locator('.pr-card[data-id="o5"] .pr-sub')).toHaveText("Nivel 100");
  await expect(page.locator('.pr-card[data-id="o6"] .pr-sub')).toHaveText("Nivel 200 · campesino, alquimista, leñador, pescador, etc.");
  await expect(page.locator('.pr-card[data-id="h1"] .pr-sub')).toHaveText("Obligatorio");
  await expect(page.locator('.pr-card[data-id="h3"] .pr-tag.optional')).toHaveText("Opcional");
  await expect(page.locator('.pr-card[data-id="h3"] .pr-sub')).toHaveText("Útil para el paso 64");
  // Los iconos del juego ya traen marco: sin losa propia alrededor
  expect(await page.locator('.pr-card[data-id="o5"] .pr-icons').evaluate(el => getComputedStyle(el).borderTopStyle)).toBe("none");
  const icon = await page.locator('.pr-card[data-id="l4"] .pr-icons img').boundingBox();
  expect(icon.width).toBeGreaterThanOrEqual(36);
  // Tres columnas en escritorio
  const tops = await page.locator(".pr-group").first().locator(".pr-card").evaluateAll(els => els.slice(0, 4).map(el => Math.round(el.getBoundingClientRect().top)));
  expect(tops[0]).toBe(tops[2]);
  expect(tops[3]).toBeGreaterThan(tops[0]);
});

test("el contador de objetos usa el mismo total que la lista", async ({ page }) => {
  await openItems(page);
  const total = await page.locator('.needs-cat[data-cat="todo"] .n').textContent();
  // La pestaña dice cuántos faltan: todos
  await expect(page.locator("#itemsCount")).toHaveText(total);
});

test("la lista se pagina: 25 por defecto, se puede cambiar y se recuerda", async ({ page }) => {
  await openItems(page, { "silvestre:itemsView": "list" });
  const later = page.locator("#bandLater .slot.list");
  const pager = page.locator("#bandLater .pager");
  const total = Number((await pager.locator(".pager-range").textContent()).match(/de (\d+)/)[1]);
  expect(total).toBeGreaterThan(100);
  await expect(later).toHaveCount(25);
  await expect(pager.locator(".pager-range")).toHaveText(`1–25 de ${total}`);
  await pager.locator('[data-page="next"]').click();
  await expect(pager.locator(".pager-range")).toHaveText(`26–50 de ${total}`);
  await expect(later).toHaveCount(25);
  await pager.locator('.pager-size [data-size="10"]').click();
  await expect(later).toHaveCount(10);
  await expect(pager.locator(".pager-range")).toHaveText(`1–10 de ${total}`);
  await pager.locator('.pager-size [data-size="all"]').click();
  await expect(later).toHaveCount(total);
  // La cuadrícula no se pagina
  await page.click('.needs-view [data-view="grid"]');
  await expect(page.locator(".pager")).toHaveCount(0);
  await page.click('.needs-view [data-view="list"]');
  // El tamaño elegido se recuerda; cambiar de categoría vuelve a la página 1
  await pager.locator('.pager-size [data-size="10"]').click();
  await pager.locator('[data-page="next"]').click();
  await page.reload();
  await page.click("#tabItems");
  await expect(later).toHaveCount(10);
  await expect(pager.locator(".pager-range")).toHaveText(`1–10 de ${total}`);
});

test("en la lista la búsqueda filtra en vez de atenuar", async ({ page }) => {
  await openItems(page, { "silvestre:itemsView": "list" });
  await page.fill("#needsSearch", "bambu");
  await expect(page.locator("#items .slot.list.dim")).toHaveCount(0);
  const n = await page.locator("#items .slot.list").count();
  expect(n).toBeGreaterThan(0);
  await expect(page.locator("#items .slot.list:not(.match)")).toHaveCount(0);
});

const ALL_DONE = range(1, 100);

test("con la guía completa las dos pestañas quedan sin nada pendiente", async ({ page }) => {
  await openApp(page, { "silvestre:done": ALL_DONE });
  await expect(page.locator("#prereqsCount")).toHaveText("✓");
  await expect(page.locator("#itemsCount")).toHaveText("✓");
  await page.click("#tabPrereqs");
  await expect(page.locator(".pr-card:not(.done)")).toHaveCount(0);
});

test("Marcar todo y Limpiar van junto a su explicación", async ({ page }) => {
  await openPre(page, MID);
  // Misma fila en las dos pestañas: la explicación a la izquierda y las acciones a la
  // derecha (en Prerrequisitos, en la fila de herramientas de la ventana; en Objetos,
  // sobre la lista, porque esa fila es del buscador)
  for (const [tab, where] of [["#tabPrereqs", ".win-tools"], ["#tabItems", ".needs"]]) {
    await page.click(tab);
    await expect(page.locator(`${where} .needs-bar #needsMarkAll`)).toBeVisible();
    const [hint, mark, clear] = await Promise.all(["#needsHint", "#needsMarkAll", "#needsClear"]
      .map(sel => page.locator(`.needs-bar ${sel}`).boundingBox()));
    expect(hint.x + hint.width).toBeLessThanOrEqual(mark.x);
    expect(Math.abs((mark.y + mark.height / 2) - (hint.y + hint.height / 2))).toBeLessThan(12);
    expect(clear.x).toBeGreaterThan(mark.x);
  }
  await expect(page.locator(".needs-toolbar .needs-act")).toHaveCount(0);
});

test("el crédito a Sandglass encabeza las dos pestañas", async ({ page }) => {
  await openPre(page, MID);
  const intro = page.locator("#needsIntro");
  await expect(intro).toHaveText(/^Esta guía está hecha por Sandglass.*nivel 150/);
  const top = sel => page.locator(sel).evaluate(el => el.getBoundingClientRect().top);
  // En Prerrequisitos los botones van en la fila de herramientas, encima; el crédito abre la lista
  expect(await top("#tabPrereqs")).toBeLessThan(await top(".win-tools .needs-bar"));
  expect(await top(".win-tools .needs-bar")).toBeLessThan(await top("#needsIntro"));
  expect(await top("#needsIntro")).toBeLessThan(await top(".prereqs-panel"));
  await page.click("#tabItems");
  await expect(intro).toBeVisible();
  // En Objetos, el crédito y debajo, sobre la lista, los botones con su explicación
  expect(await top("#needsIntro")).toBeLessThan(await top(".needs .needs-bar"));
  await page.click("#tabPrereqs");
  await expect(intro).toBeVisible();
  await expect(page.locator(".pr-intro")).toHaveCount(0);
});

test("las pestañas y el atajo / cambian la ventana desde el mapa", async ({ page }) => {
  await openApp(page, MID, { view: "map" });
  await page.click("#tabItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(100);
  await page.locator("body").press("/");
  await expect(page.locator("#needsSearch")).toBeFocused();
});

test("los prerrequisitos siguen la lista actual de Torrente Arcano", async ({ page }) => {
  await openPre(page);
  const card = id => page.locator(`#prereqs .pr-card[data-id="${id}"]`);
  await expect(card("l10")).toContainText("Altos vuelos");
  await expect(card("l10").locator(".pr-tag.optional")).toHaveText("Opcional");
  await expect(card("l10").locator(".pr-sub")).toHaveText("Útil");
  await expect(card("l10")).not.toContainText("(Opcional");
  // La guía escribe "El despetar"; la misión del juego es "El despertar de Pandala"
  await expect(card("l11")).toContainText("El despertar de Pandala");
  await expect(card("l12")).toContainText("Ángeles y demonios");
  await expect(card("l12").locator(".pr-tag.optional")).toHaveText("Opcional");
  // Van en el mismo orden que en la guía
  const ids = await page.locator("#prereqs .pr-group").first().locator(".pr-card").evaluateAll(els => els.map(e => e.dataset.id));
  expect(ids).toEqual(["l1", "l2", "l3", "l4", "l5", "l10", "l6", "l11", "l7", "l8", "l12"]);
  // «La tierra banquisa» es la primera misión del paso 23: no se repite como prerrequisito
  await expect(card("l9")).toHaveCount(0);
});

test("los prerrequisitos recomiendan empezar el Dofus Ocre cuanto antes", async ({ page }) => {
  await openPre(page);
  const ocre = page.locator("#prereqs .pr-ocre");
  await expect(ocre).toContainText("Dofus Ocre");
  await expect(ocre).toContainText("paso 79");
  // Lo da la misión "La eterna cosecha", que la guía termina en el paso 79
  await expect(ocre).toContainText("La eterna cosecha");
  await expect(ocre).toContainText("El fin de la eternidad");
  await expect(ocre.locator("img")).toHaveAttribute("src", /items\/23012\.png$/);
});

test("los prerrequisitos que son misiones llevan el símbolo de misión del juego", async ({ page }) => {
  await openPre(page);
  // Las misiones sin icono propio (el l6, koalaks, sí tiene el suyo)
  for (const id of ["l7", "l11"]) {
    await expect(page.locator(`#prereqs .pr-card[data-id="${id}"] .pr-icons .quest-mark`)).toHaveCount(1);
  }
  await expect(page.locator("#prereqs")).not.toContainText("📜");
});

test("el símbolo de misión ocupa el mismo marco que los iconos de logro", async ({ page }) => {
  await openPre(page);
  const size = sel => page.locator(sel).evaluate(el => Math.round(el.getBoundingClientRect().width));
  expect(await size('#prereqs .pr-card[data-id="l11"] .pr-quest'))
    .toBe(await size('#prereqs .pr-card[data-id="l1"] .pr-icons img'));
});

test("el aviso del Dofus Ocre lleva al paso 79, donde se consigue", async ({ page }) => {
  await openPre(page);
  const ocre = page.locator("#prereqs .pr-ocre");
  await expect(page.locator("#ocreToggle")).toHaveCount(0);
  await ocre.locator('.step-ref[data-n="79"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("79");
});

test("cada prerrequisito lleva el icono de lo que pide: misión o logro completo", async ({ page }) => {
  await openPre(page);
  const card = id => page.locator(`#prereqs .pr-card[data-id="${id}"]`);
  // Piden misiones concretas (aunque sean de un logro): la «!» del juego
  for (const id of ["l5", "l10", "l6", "l11", "l7", "l8", "l12"]) {
    await expect(card(id).locator(".pr-icons .quest-mark"), id).toHaveCount(1);
    await expect(card(id).locator(".pr-icons img"), id).toHaveCount(0);
  }
  // Piden el logro completo: el librito con trofeo
  for (const id of ["l3", "l4"]) {
    await expect(card(id).locator(".pr-icons img"), id).toHaveAttribute("src", /achievements\/273\.png$/);
  }
});

test("lo opcional se distingue con su propia etiqueta", async ({ page }) => {
  await openPre(page);
  const tags = page.locator("#prereqs .pr-tag.optional");
  await expect(tags).toHaveCount(3);
  await expect(page.locator("#prereqs .pr-card.optional")).toHaveCount(3);
});

test("completar un prerrequisito da por usados los objetos que pide", async ({ page }) => {
  await openPre(page);
  const slot = k => page.locator(`#prereqs .slot[data-id="${k}"]`);
  // Intrusión en el territorio wabbit pide las cuatro alas de escarahoja
  for (const k of ["1455", "1456", "1457", "1458"]) await expect(slot(k)).not.toHaveClass(/owned/);
  await page.click('#prereqs .pr-card[data-id="l7"]');
  for (const k of ["1455", "1456", "1457", "1458"]) await expect(slot(k)).toHaveClass(/owned/);
  // Los de otros prerrequisitos siguen pendientes
  await expect(slot("421")).not.toHaveClass(/owned/);
  // El casco y las alas de madera son para el cañón de la isla de Moon (Pan Koko Mío)
  await page.click('#prereqs .pr-card[data-id="l10"]');
  for (const k of ["1019", "1021"]) await expect(slot(k)).not.toHaveClass(/owned/);
  await page.click('#prereqs .pr-card[data-id="l8"]');
  for (const k of ["1019", "1021"]) await expect(slot(k)).toHaveClass(/owned/);
});

test("lo de un prerrequisito opcional va con su aviso y cuenta como usado al completarlo", async ({ page }) => {
  await openPre(page);
  // Altos vuelos (opcional) pide el casco y las alas mejorados
  const slot = id => page.locator(`#prereqs .slot[data-id^="${id}@"]`);
  for (const id of ["8918", "8919"]) {
    await expect(slot(id).locator(".slot-tag")).toHaveText("Opc.");
    await expect(slot(id).locator(".slot-tip-when")).toHaveText("Para «Altos vuelos» (opcional)");
    await expect(slot(id)).not.toHaveClass(/owned/);
  }
  await page.click('#prereqs .pr-card[data-id="l10"]');
  for (const id of ["8918", "8919"]) await expect(slot(id)).toHaveClass(/owned/);
});

test("marcar un objeto no completa su prerrequisito: se puede comprar antes", async ({ page }) => {
  await openPre(page);
  await page.locator('#prereqs .slot[data-id="421"] .slot-main').click();
  await expect(page.locator('#prereqs .slot[data-id="421"]')).toHaveClass(/owned/);
  await expect(page.locator('#prereqs .pr-card[data-id="l11"]')).not.toHaveClass(/done/);
  await expect(page.locator("#prereqsCount")).toHaveText("20");
});

test("lo cogido para un paso se descuenta de la cantidad de «Pronto»", async ({ page }) => {
  // Hechos los pasos 1 a 11 y los prerrequisitos: «Pronto» son los pasos 12 a 16
  await openApp(page, { "silvestre:done": range(1, 11), "silvestre:prereqs": ALL_PREREQS });
  // El Agua potable la piden el paso 13 (1) y el 16 (10): en «Pronto» sale ×11
  await page.click("#tabItems");
  const agua = page.locator('#items .band.soon .slot[data-id="311"]');
  await expect(agua.locator(".q")).toHaveText("11");
  // Cogida para el paso 13 desde el diario: quedan 10 y sigue sin estar completa
  await page.click("#stepsViewDiary");
  // En el título: el centro de la fila puede caer en la etiqueta que lleva a otro paso
  await page.click('.diary-row[data-n="13"] .row-title');
  const inJournal = page.locator('#journal .journal-needs .slot[data-id="311"] .slot-main');
  await inJournal.click();
  await page.click("#tabItems");
  await expect(agua.locator(".q")).toHaveText("10");
  await expect(agua.locator(".slot-main")).toHaveAttribute("aria-pressed", "false");
  await expect(agua.locator(".slot-main")).toHaveAttribute("aria-label", /Agua potable, faltan 10 de 11/);
  // Completarla allí la da por cogida entera, con su cantidad total
  await agua.locator(".slot-main").click();
  await expect(agua.locator(".slot-main")).toHaveAttribute("aria-pressed", "true");
  await expect(agua.locator(".q")).toHaveText("11");
  // Y desmarcar el paso 13 en el diario vuelve a dejar 1 pendiente
  await page.click("#stepsViewDiary");
  await inJournal.click();
  await page.click("#tabItems");
  await expect(agua.locator(".q")).toHaveText("1");
});

test("los prerrequisitos con guía en Torrente Arcano la enlazan; abrirla no los marca", async ({ page }) => {
  await openPre(page);
  const guide = id => page.locator(`#prereqs .pr-item[data-id="${id}"] .pr-guide`);
  // Al logro, aunque el prerrequisito pida solo algunas de sus misiones
  await expect(guide("l5")).toHaveAttribute("href", "https://www.torrentearcano.com/turbera-maldita");
  await expect(guide("l5")).toHaveAttribute("target", "_blank");
  for (const [id, slug] of [["l4", "el-gran-guarrok"], ["l10", "altos-vuelos"], ["l8", "pan-koko-mio"], ["l12", "angeles-y-demonios"]]) {
    await expect(guide(id)).toHaveAttribute("href", `https://www.torrentearcano.com/${slug}`);
  }
  // Los que son una misión suelta enlazan la guía de la misión
  await expect(guide("l11")).toHaveAttribute("href", "https://www.torrentearcano.com/el-despertar-de-pandala");
  await expect(guide("l7")).toHaveAttribute("href", "https://www.torrentearcano.com/intrusion-en-el-territorio-wabbit");
  // Sin página en Torrente Arcano (Primeriza, El cementerio primitivo): sin enlace
  await expect(guide("l1")).toHaveCount(0);
  await expect(guide("l6")).toHaveCount(0);
  // El enlace no está dentro del botón de la tarjeta y abrirlo no la marca
  await expect(page.locator("#prereqs .pr-card .pr-guide")).toHaveCount(0);
  // La guía se abre en otra pestaña; sin salir a la red
  await page.context().route(/torrentearcano\.com/, route => route.fulfill({ body: "" }));
  const popup = page.waitForEvent("popup");
  await guide("l5").click();
  await (await popup).close();
  await expect(page.locator('#prereqs .pr-card[data-id="l5"]')).toHaveAttribute("aria-pressed", "false");
});

const PRE_ROWS = ["421", "885", "7904", "429", "399", "1455", "1456", "1457", "1458", "8759", "2553", "2618", "2551", "2617", "1002", "1021", "1019"];
const chips = page => page.locator("#bandSoon .band-steps i");
const badges = page => page.locator("#bandSoon .slot").evaluateAll(els =>
  els.map(el => el.querySelector(".st")?.textContent ?? null));

test("«Pronto» son los prerrequisitos y 5 pasos, y avanza al completar pasos", async ({ page }) => {
  await openItems(page);
  await expect(chips(page)).toHaveText(["Pre", "1", "2", "3", "4", "5"]);
  // Prerrequisitos completos: sus objetos ya no están y quedan 5 pasos
  await openItems(page, { "silvestre:prereqs": ALL_PREREQS });
  await expect(chips(page)).toHaveText(["1", "2", "3", "4", "5"]);
  expect(await badges(page)).not.toContain("Pre");
  // Paso 1 hecho: del 2 al 6; y con el 2, del 3 al 7
  await openItems(page, { "silvestre:prereqs": ALL_PREREQS, "silvestre:done": { 1: true } });
  await expect(chips(page)).toHaveText(["2", "3", "4", "5", "6"]);
  await openItems(page, { "silvestre:prereqs": ALL_PREREQS, "silvestre:done": { 1: true, 2: true } });
  await expect(chips(page)).toHaveText(["3", "4", "5", "6", "7"]);
});

test("«Más adelante» también va por paso: cada objeto en el primer paso que lo pide", async ({ page }) => {
  await openItems(page, { "silvestre:done": { 1: true, 2: true, 3: true } });
  const firsts = await page.locator("#bandLater .slot").evaluateAll(els => els.map(el => Number(el.dataset.first)));
  expect(firsts.length).toBeGreaterThan(20);
  expect(firsts).toEqual([...firsts].sort((a, b) => a - b));
  // Después de los próximos pasos: el primero de «Más adelante» es posterior a ellos
  expect(firsts[0]).toBeGreaterThan(8);
});

test("en «Pronto» los objetos van por paso: prerrequisitos, 1, 2, 3…", async ({ page }) => {
  await openItems(page);
  const order = (await badges(page)).map(b => (b === "Pre" ? 0 : Number(b)));
  expect(order[0]).toBe(0);
  expect(order).toEqual([...order].sort((a, b) => a - b));
});

test("la etiqueta de un paso se marca cuando todo lo suyo está reunido", async ({ page }) => {
  await openItems(page, { "silvestre:owned": Object.fromEntries(PRE_ROWS.map(k => [`${k}#0`, true])) });
  await expect(chips(page).nth(0)).toHaveClass(/\bdone\b/);
  await expect(chips(page).nth(0)).toHaveAttribute("title", /reunido/);
  // El paso 1 aún no
  await expect(chips(page).nth(1)).not.toHaveClass(/\bdone\b/);
  // Un paso sin objetos no se marca: se atenúa
  await expect(chips(page).nth(2)).toHaveClass(/\bempty\b/);
  await expect(chips(page).nth(2)).toHaveAttribute("title", "Paso 2: sin objetos que reunir");
  // Al coger lo del paso 1 desde «Pronto», su etiqueta se marca
  for (const k of ["2268", "9318", "746"]) await page.locator(`#bandSoon .slot[data-id="${k}"] .slot-main`).click();
  await expect(chips(page).nth(1)).toHaveClass(/\bdone\b/);
});

test("lo de un prerrequisito completo sale de «Pronto» aunque falten otros", async ({ page }) => {
  // El despertar de Pandala (l11) hecho: su Ortiga ya se gastó; El gran Guarrok (l4) no
  await openItems(page, { "silvestre:prereqs": { l11: true } });
  await expect(chips(page).first()).toHaveText(/Pre/);
  await expect(page.locator('#bandSoon .slot[data-id="421"]')).toHaveCount(0);
  await expect(page.locator('#bandSoon .slot[data-id="399"]')).toHaveCount(1);
  // Con el filtro de pendientes encendido, lo gastado no se ve en ningún sitio
  await expect(page.locator('#items .slot[data-id="421"]')).toHaveCount(0);
  await expect(page.locator("#bandUsed")).toHaveCount(0);
});

test("con el filtro apagado, «Ya utilizados» muestra lo gastado y el resto, lo que queda", async ({ page }) => {
  // Hechos los prerrequisitos y los pasos 1 a 13: el Agua potable del 13 (1) ya se usó,
  // la del 16 (10) no
  await openItems(page, { "silvestre:done": range(1, 13), "silvestre:prereqs": ALL_PREREQS });
  // A la vista antes de pulsar: el desplazamiento de la página es suave y el clic
  // caería a mitad de camino
  await showWindow(page);
  await page.locator("#shopPendingToggle").uncheck({ force: true });
  const used = page.locator("#bandUsed");
  await expect(used.locator(".later-h")).toContainText("Ya utilizados");
  await expect(used.locator('.slot[data-id="311"] .q')).toHaveText("1");
  await expect(page.locator('#bandSoon .slot[data-id="311"] .q')).toHaveText("10");
  // La Ortiga de los prerrequisitos, gastada entera: solo en «Ya utilizados»
  await expect(used.locator('.slot[data-id="421"] .q')).toHaveText("50");
  await expect(page.locator('#bandSoon .slot[data-id="421"], #bandLater .slot[data-id="421"]')).toHaveCount(0);
  // Va debajo de «Más adelante»
  const below = await page.evaluate(() => !!(document.getElementById("bandLater")
    .compareDocumentPosition(document.getElementById("bandUsed")) & Node.DOCUMENT_POSITION_FOLLOWING));
  expect(below).toBe(true);
  // Al encender el filtro desaparece
  await showWindow(page);
  await page.locator("#shopPendingToggle").check({ force: true });
  await expect(used).toHaveCount(0);
});

test("cada objeto de los prerrequisitos dice para qué prerrequisito es", async ({ page }) => {
  await openPre(page);
  const tip = k => page.locator(`#prereqs .slot[data-id^="${k}"] .slot-tip-when`).first();
  await expect(tip("1457")).toHaveText("Para «Intrusión en el territorio wabbit»");
  await expect(tip("421")).toHaveText("Para «El despertar de Pandala»");
  await expect(tip("1019")).toHaveText("Para «Pan Koko Mío»");
  await expect(tip("8918@")).toHaveText("Para «Altos vuelos» (opcional)");
  // También en «Pronto»
  await page.click("#tabItems");
  await expect(page.locator('#bandSoon .slot[data-id="7904"] .slot-tip-when').first()).toHaveText("Para «El cementerio primitivo»");
});

test("el aviso de un objeto al final de la lista se ve entero", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openPre(page);
  // La última fila de objetos de los prerrequisitos, al fondo de la lista que se
  // desplaza dentro de la ventana: debajo no cabe y el aviso sube encima
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  await page.locator(".prereqs-panel").evaluate(el => el.scrollTo(0, el.scrollHeight));
  const slot = page.locator("#prereqs .slot").last();
  await slot.locator(".slot-main").hover();
  const tip = slot.locator(".slot-tip");
  await expect(tip).toBeVisible();
  await page.waitForTimeout(500);
  const seen = await tip.evaluate(el => {
    // El aviso no recibe el ratón (pointer-events: none) y elementFromPoint lo saltaría
    el.style.pointerEvents = "auto";
    const r = el.getBoundingClientRect();
    return [r.top + 6, r.bottom - 6].map(y => el.contains(document.elementFromPoint(r.left + r.width / 2, y)));
  });
  expect(seen).toEqual([true, true]);
});

test("en «Ya utilizados» el aviso también dice para qué prerrequisito era", async ({ page }) => {
  await openItems(page, { "silvestre:prereqs": ALL_PREREQS });
  await showWindow(page);
  await page.locator("#shopPendingToggle").uncheck({ force: true });
  await expect(page.locator('#bandUsed .slot[data-id^="8918@"] .slot-tip').first()).toContainText("«Altos vuelos»");
  await expect(page.locator('#bandUsed .slot[data-id="1019"] .slot-tip')).toContainText("«Pan Koko Mío»");
});

test("cada objeto de los pasos dice para qué misión es", async ({ page }) => {
  await openItems(page);
  // En «Pronto»: lo del paso 1 es para la misión que «Ver a Dark Vlad» pide antes
  await expect(page.locator('#bandSoon .slot[data-id="2268"] .slot-tip-quest')).toHaveText("«Un péndulo para guiar sus pasos»");
  // Y en el detalle del paso 5, la misión que lo consume (DofusDB y su guía)
  await page.click("#stepsViewDiary");
  // En el título: el centro de la fila puede caer en la etiqueta que lleva a otro paso
  await page.click('.diary-row[data-n="5"] .row-title');
  await expect(page.locator('#journal .journal-needs .slot[data-id="384"] .slot-tip-quest')).toHaveText("«Las primeras impresiones son engañosas»");
  // El 12: lo que piden las misiones previas a «Espionaje industrial»
  await page.click('.diary-row[data-n="12"] .row-title');
  await expect(page.locator('#journal .journal-needs .slot[data-id="15278"] .slot-tip-quest')).toHaveText("«El maleficio del cofre»");
  await expect(page.locator('#journal .journal-needs .slot[data-id="9687"] .slot-tip-quest')).toHaveText("«Cofrología»");
});

test("el aviso de un objeto dice lo mismo en todas las secciones", async ({ page }) => {
  // Completos El despertar de Pandala y Altos vuelos: su Ortiga y el casco mejorado
  // salen en «Ya utilizados»; la pestaña de prerrequisitos sigue abierta
  await openPre(page, { "silvestre:prereqs": { l11: true, l10: true } });
  const lines = loc => loc.evaluate(el => [...el.children].map(c => `${c.className}|${c.textContent}`));
  const prereqTip = await lines(page.locator('#prereqs .slot[data-id="421"] .slot-tip'));
  await page.click("#tabItems");
  await showWindow(page);
  await page.locator("#shopPendingToggle").uncheck({ force: true });
  const usedTip = await lines(page.locator('#bandUsed .slot[data-id="421"] .slot-tip'));
  expect(usedTip).toEqual(prereqTip);
  expect(usedTip[1]).toBe("slot-tip-when|Para «El despertar de Pandala»");
  // Lo opcional no repite el nombre en otra línea
  const opt = await lines(page.locator('#bandUsed .slot[data-id^="8918@"] .slot-tip'));
  expect(opt.filter(l => l.includes("Altos vuelos"))).toEqual(["slot-tip-when|Para «Altos vuelos» (opcional)"]);
});

test("al buscar, las coincidencias suben al principio de su franja", async ({ page }) => {
  await openItems(page);
  await page.fill("#needsSearch", "bambu");
  // En cada franja, primero lo que coincide y después lo atenuado
  for (const band of ["#bandSoon", "#bandLater"]) {
    const kinds = await page.locator(`${band} .slot`).evaluateAll(els => els.map(el => (el.classList.contains("match") ? "m" : "d")));
    expect(kinds.join("")).toMatch(/^m*d*$/);
  }
  expect(await page.locator("#bandLater .slot").first().getAttribute("class")).toContain("match");
  // Al borrar la búsqueda vuelve el orden de siempre
  const before = await page.locator("#bandLater .slot").first().getAttribute("data-id");
  await page.click("#needsSearchClear");
  await expect(page.locator("#bandLater .slot").first()).not.toHaveAttribute("data-id", before);
});

test("prerrequisitos y objetos van dentro de la tarjeta de la ventana de pasos", async ({ page }) => {
  await openPre(page);
  const card = await page.locator("#needs").evaluate(el => {
    const st = getComputedStyle(el.closest(".steps-win"));
    return { bg: st.backgroundColor, border: st.borderTopWidth, radius: st.borderTopLeftRadius };
  });
  expect(card.bg).not.toBe("rgba(0, 0, 0, 0)");
  expect(card.border).toBe("1px");
  expect(card.radius).toBe("16px");
});

test("el aviso del primer objeto del paso no se corta por el borde del detalle", async ({ page }) => {
  await page.setViewportSize({ width: 1504, height: 1104 });
  await openApp(page);
  await page.click("#stepsViewDiary");
  await page.click('.diary-row[data-n="17"] .row-title');
  // El primero de la fila arriba a la izquierda: centrado en él, el aviso salía del detalle
  const slot = page.locator("#journal .journal-needs .slot").first();
  await slot.locator(".slot-main").hover();
  const tip = slot.locator(".slot-tip");
  await expect(tip).toBeVisible();
  await page.waitForTimeout(500);
  const seen = await tip.evaluate(el => {
    el.style.pointerEvents = "auto";
    const r = el.getBoundingClientRect();
    const y = r.top + r.height / 2;
    return [r.left + 6, r.right - 6].map(x => el.contains(document.elementFromPoint(x, y)));
  });
  expect(seen).toEqual([true, true]);
});
