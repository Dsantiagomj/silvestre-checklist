import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const ALL_PREREQS = Object.fromEntries(
  ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "o1", "o2", "o3", "o4", "o5", "o6", "h1", "h2", "h3"].map(id => [id, true]));
// Pasos 1 a 40 hechos y prerrequisitos completos: lo siguiente son los pasos 41 a 45
const MID = { "silvestre:done": range(1, 40), "silvestre:prereqs": ALL_PREREQS };

test("una sección con dos pestañas: prerrequisitos y objetos", async ({ page }) => {
  await openApp(page);
  const needs = page.locator("#needs");
  await expect(needs.locator(".section-title")).toContainText("Lo que necesitas");
  // Con prerrequisitos pendientes se abre en esa pestaña
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#prereqsCount")).toHaveText("0/18");
  await page.click("#tabItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#items")).toBeVisible();
  await expect(page.locator("#prereqs")).toBeHidden();
});

test("los prerrequisitos son tarjetas que se marcan, con sus objetos debajo", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#prereqs .pr-card")).toHaveCount(18);
  await page.click('.pr-card[data-id="o1"]');
  await expect(page.locator('.pr-card[data-id="o1"]')).toHaveClass(/\bdone\b/);
  await expect(page.locator("#prereqsCount")).toHaveText("1/18");
  // Los 17 objetos que piden los prerrequisitos
  await expect(page.locator("#prereqs .slot")).toHaveCount(17);
});

test("marcar todo y limpiar en prerrequisitos, con deshacer", async ({ page }) => {
  await openApp(page);
  await page.click("#needsMarkAll");
  await expect(page.locator("#prereqsCount")).toHaveText("18/18");
  await page.click("#needsClear");
  await expect(page.locator("#prereqsCount")).toHaveText("0/18");
  await page.click("#toastAction");
  await expect(page.locator("#prereqsCount")).toHaveText("18/18");
});

test("Pronto reúne lo de los próximos 5 pasos y reparte las cantidades", async ({ page }) => {
  await openApp(page, MID);
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
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
  await openApp(page);
  await page.click("#tabItems");
  await page.click('.needs-sort [data-sort="qty"]');
  await expect(page.locator("#bandSoon")).toHaveCount(0);
  // Sin progreso: la guía entera, una casilla por objeto
  await expect(page.locator("#items .slot")).toHaveCount(420);
  await expect(page.locator("#items .slot").first()).toHaveAttribute("data-id", "14635");
  await page.click('.needs-sort [data-sort="az"]');
  await expect(page.locator("#items .slot .q").first()).toBeVisible();
});

test("las categorías filtran y cuentan objetos distintos", async ({ page }) => {
  await openApp(page);
  await page.click("#tabItems");
  const counts = { todo: 420, recursos: 335, consumibles: 48, equipables: 18, almas: 9, criaturas: 9, cosmeticos: 1 };
  for (const [cat, n] of Object.entries(counts)) {
    await expect(page.locator(`.needs-cat[data-cat="${cat}"] .n`)).toHaveText(String(n));
  }
  await page.click('.needs-cat[data-cat="almas"]');
  await page.click('.needs-sort [data-sort="az"]');
  await expect(page.locator("#items .slot")).toHaveCount(9);
});

test("el buscador resalta coincidencias sin quitar casillas y entiende sin tildes", async ({ page }) => {
  await openApp(page);
  await page.click("#tabItems");
  await page.click('.needs-sort [data-sort="az"]');
  await page.fill("#needsSearch", "bambu");
  await expect(page.locator("#needsMatches")).toHaveText(/^\d+ de 420$/);
  const matches = page.locator("#items .slot.match");
  await expect(matches.first()).toBeVisible();
  await expect(page.locator("#items .slot")).toHaveCount(420);
  expect(await page.locator("#items .slot.dim").count()).toBe(420 - await matches.count());
  // Los recuentos pasan a contar coincidencias ("bambu" también encuentra criaturas de bambú)
  await expect(page.locator('.needs-cat[data-cat="todo"] .n')).toHaveText(String(await matches.count()));
  await expect(page.locator('.needs-cat[data-cat="criaturas"] .n')).not.toHaveText("0");
  await page.click("#needsSearchClear");
  await expect(page.locator("#needsSearch")).toHaveValue("");
  await expect(page.locator("#items .slot.dim")).toHaveCount(0);
});

test("la tecla / lleva al buscador de objetos", async ({ page }) => {
  await openApp(page);
  await page.locator("body").press("/");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needsSearch")).toBeFocused();
});

test("copiar el nombre de un objeto no lo marca", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await page.click("#tabItems");
  const slot = page.locator('#items .slot[data-id="14635"]').first();
  await slot.hover();
  await slot.locator(".slot-copy").click();
  await expect(slot).toContainText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Pepita");
  await expect(slot).not.toHaveClass(/\bowned\b/);
});

test("marcar todo y limpiar actúan sobre lo que se ve", async ({ page }) => {
  await openApp(page);
  await page.click("#tabItems");
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

test("las tarjetas del hero abren su pestaña", async ({ page }) => {
  await openApp(page, MID);
  await page.click("#heroWarn");
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needs")).toBeInViewport();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click("#heroItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needs")).toBeInViewport();
});

test("en móvil la sección cabe en el ancho de la pantalla", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openApp(page, MID);
  await page.click("#tabItems");
  await page.locator("#needs").scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  const box = await page.locator("#bandSoon").boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  // Y la de prerrequisitos: ninguna tarjeta se sale por la derecha
  await page.click("#tabPrereqs");
  const panel = await page.locator("#prereqs").boundingBox();
  const rights = await page.locator(".pr-card").evaluateAll(els => els.map(el => el.getBoundingClientRect().right));
  expect(Math.max(...rights)).toBeLessThanOrEqual(panel.x + panel.width + 0.5);
  await ctx.close();
});

test("lo que necesitas va antes de la aclaración y del tablero de pasos", async ({ page }) => {
  await openApp(page);
  // La aclaración explica cómo leer los pasos: va pegada al tablero, debajo de lo que necesitas
  const order = await page.evaluate(() => ["#needs", "#nota", ".grid-section"]
    .map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.locator("#needs .section-num")).toHaveText("01");
  await expect(page.locator(".grid-section .section-num")).toHaveText("02");
});

test("el buscador es ancho y los controles van juntos a la izquierda", async ({ page }) => {
  await openApp(page);
  await page.click("#tabItems");
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
  await openApp(page);
  await expect(page.locator("#needsHint")).toContainText("18 prerrequisitos");
  await page.click("#tabItems");
  await expect(page.locator("#needsHint")).toContainText("lo que ves");
  await expect(page.locator("#needsHint")).toContainText("solo quita lo que marcaste a mano");
});

test("la vista de lista muestra lo mismo que la cuadrícula, con nombre y pasos a la vista", async ({ page }) => {
  await openApp(page, MID);
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
  await openApp(page, { ...MID, "silvestre:itemsView": "list" });
  await page.click("#tabItems");
  const row = page.locator("#items .slot.list", { hasText: "Artefacto pandawushu de madera" }).first();
  const name = await row.locator(".slot-name").boundingBox();
  const qty = await row.locator(".q").boundingBox();
  expect(name.x + name.width).toBeLessThanOrEqual(qty.x);
  await ctx.close();
});

test("las tarjetas de prerrequisitos separan zona, título y nivel, con iconos grandes", async ({ page }) => {
  await openApp(page, { "silvestre:prereqs": { l1: true, l3: true } });
  await expect(page.locator(".pr-group h3").first()).toContainText("2/9");
  const otomai = page.locator('.pr-card[data-id="l4"]');
  await expect(otomai.locator(".pr-zone")).toHaveText("Isla de Otomaï");
  await expect(otomai.locator(".pr-title")).toHaveText('Logro "El gran Guarrok". (Completo)');
  // Nivel y obligatoriedad en palabras, bajo el nombre (no en una etiqueta suelta)
  await expect(page.locator(".pr-badge")).toHaveCount(0);
  await expect(page.locator('.pr-card[data-id="o5"] .pr-title')).toHaveText("Campesino");
  await expect(page.locator('.pr-card[data-id="o5"] .pr-sub')).toHaveText("Nivel 100");
  await expect(page.locator('.pr-card[data-id="o6"] .pr-sub')).toHaveText("Nivel 200 · campesino, alquimista, leñador, pescador, etc.");
  await expect(page.locator('.pr-card[data-id="h1"] .pr-sub')).toHaveText("Obligatorio");
  await expect(page.locator('.pr-card[data-id="h3"] .pr-sub')).toHaveText("Opcional · útil para el paso 64");
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
  await openApp(page);
  await page.click("#tabItems");
  const total = await page.locator('.needs-cat[data-cat="todo"] .n').textContent();
  await expect(page.locator("#itemsCount")).toHaveText(`0/${total}`);
  await expect(page.locator("#heroItems .hero-req-count")).toHaveText(`0/${total}`);
});

test("la lista se pagina: 25 por defecto, se puede cambiar y se recuerda", async ({ page }) => {
  await openApp(page, { "silvestre:itemsView": "list" });
  await page.click("#tabItems");
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
  await openApp(page, { "silvestre:itemsView": "list" });
  await page.click("#tabItems");
  await page.fill("#needsSearch", "bambu");
  await expect(page.locator("#items .slot.list.dim")).toHaveCount(0);
  const n = await page.locator("#items .slot.list").count();
  expect(n).toBeGreaterThan(0);
  await expect(page.locator("#items .slot.list:not(.match)")).toHaveCount(0);
});

const ALL_DONE = range(1, 100);

test("al 100 % la sección se contrae en una franja y se despliega en dos niveles", async ({ page }) => {
  await openApp(page, { "silvestre:done": ALL_DONE });
  const needs = page.locator("#needs");
  // Franja: todo reunido, sin pestañas ni listas
  await expect(needs.locator(".needs-done-title")).toHaveText("Todo reunido");
  await expect(needs.locator(".needs-done-chip")).toHaveText(["18 prerrequisitos", "420 objetos"]);
  await expect(page.locator("#tabItems")).toHaveCount(0);
  await expect(page.locator(".needs-summary")).toHaveCount(0);
  // Primer nivel: el resumen de lo reunido
  await page.click("#needsShowSummary");
  const summary = page.locator(".needs-summary");
  await expect(summary.locator(".needs-sum-total")).toHaveText("6.770");
  await expect(summary.locator(".needs-sum-top li")).toHaveCount(6);
  await expect(summary.locator(".needs-sum-top li").first()).toContainText("Pepita");
  await expect(summary.locator(".needs-sum-top li").first()).toContainText("2.202");
  await expect(summary.locator(".needs-sum-cats")).toContainText("1 cosmético");
  await expect(summary.locator(".needs-sum-cats")).not.toContainText("1 cosméticos");
  // Segundo nivel: las listas completas, y se puede volver a contraer
  await page.click("#needsShowLists");
  await expect(page.locator("#tabPrereqs")).toBeVisible();
  await expect(page.locator("#prereqsCount")).toHaveText("18/18");
  await page.click("#needsCollapse");
  await expect(page.locator("#tabItems")).toHaveCount(0);
  await expect(needs.locator(".needs-done-title")).toBeVisible();
});

test("si se baja del 100 % la sección vuelve a su forma normal", async ({ page }) => {
  const almost = { ...ALL_DONE };
  delete almost[100];
  await openApp(page, { "silvestre:done": almost });
  await expect(page.locator(".needs-done-title")).toHaveCount(0);
  await expect(page.locator("#tabPrereqs")).toBeVisible();
});
