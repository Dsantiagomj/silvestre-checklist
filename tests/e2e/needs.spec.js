import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const ALL_PREREQS = Object.fromEntries(
  ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10", "l11", "l12", "o1", "o2", "o3", "o4", "o5", "o6", "h1", "h2", "h3"].map(id => [id, true]));
// Pasos 1 a 40 hechos y prerrequisitos completos: lo siguiente son los pasos 41 a 45
const MID = { "silvestre:done": range(1, 40), "silvestre:prereqs": ALL_PREREQS };

test("una sección con dos pestañas: prerrequisitos y objetos", async ({ page }) => {
  await openApp(page);
  const needs = page.locator("#needs");
  await expect(needs.locator(".section-title")).toContainText("Lo que necesitas");
  // Con prerrequisitos pendientes se abre en esa pestaña
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#prereqsCount")).toHaveText("0/21");
  await page.click("#tabItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#items")).toBeVisible();
  await expect(page.locator("#prereqs")).toBeHidden();
});

test("los prerrequisitos son tarjetas que se marcan, con sus objetos debajo", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#prereqs .pr-card")).toHaveCount(21);
  await page.click('.pr-card[data-id="o1"]');
  await expect(page.locator('.pr-card[data-id="o1"]')).toHaveClass(/\bdone\b/);
  await expect(page.locator("#prereqsCount")).toHaveText("1/21");
  // Los 17 objetos que piden los prerrequisitos
  await expect(page.locator("#prereqs .slot")).toHaveCount(17);
});

test("marcar todo y limpiar en prerrequisitos, con deshacer", async ({ page }) => {
  await openApp(page);
  await page.click("#needsMarkAll");
  await expect(page.locator("#prereqsCount")).toHaveText("21/21");
  await page.click("#needsClear");
  await expect(page.locator("#prereqsCount")).toHaveText("0/21");
  await page.click("#toastAction");
  await expect(page.locator("#prereqsCount")).toHaveText("21/21");
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
  const order = await page.evaluate(() => ["#needs", "#nota", "#diary"]
    .map(sel => document.querySelector(sel).getBoundingClientRect().top + scrollY));
  expect(order).toEqual([...order].sort((a, b) => a - b));
  await expect(page.locator("#needs .section-num")).toHaveText("01");
  await expect(page.locator("#diary .section-num")).toHaveText("02");
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
  await expect(page.locator("#needsHint")).toContainText("21 prerrequisitos");
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
  await expect(page.locator(".pr-group h3").first()).toContainText("2/12");
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
  await expect(needs.locator(".needs-done-chip")).toHaveText(["21 prerrequisitos", "420 objetos"]);
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
  await expect(page.locator("#prereqsCount")).toHaveText("21/21");
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

test("la sección se puede contraer siempre, con lo esencial a la vista, y se recuerda", async ({ page }) => {
  await openApp(page, MID);
  await page.click("#needsCollapse");
  const strip = page.locator("#needs .needs-strip");
  // Los objetos de los pasos 1 a 40 ya cuentan como cubiertos
  await expect(strip.locator(".needs-meter b")).toHaveText(["21/21", /^\d+\/420$/]);
  await expect(strip.locator(".needs-meter b").nth(1)).toHaveText(await page.locator("#heroItems .hero-req-count").textContent());
  await expect(strip.locator(".needs-strip-title")).toHaveText(/^Pronto: \d+ objetos para tus próximos pasos$/);
  // Los objetos de "Pronto" con nombre y cantidad, los que quepan en una fila y el resto en "+N"
  const soon = Number((await strip.locator(".needs-strip-title").textContent()).match(/\d+/)[0]);
  const chips = strip.locator(".needs-strip-peek > .soon-chip");
  await expect(chips.first()).toHaveText(/^.+×\d+$/);
  const shown = await chips.count();
  expect(shown).toBeGreaterThan(3);
  await expect(strip.locator(".needs-strip-peek > .more")).toHaveText(`+${soon - shown}`);
  const peek = strip.locator(".needs-strip-peek");
  expect(await peek.evaluate(el => {
    const box = el.getBoundingClientRect();
    return [...el.children].filter(c => !c.classList.contains("needs-strip-ghost"))
      .every(c => c.getBoundingClientRect().right <= box.right + 0.5);
  })).toBe(true);
  await expect(page.locator("#tabItems")).toHaveCount(0);
  // Se recuerda
  await page.reload();
  await expect(page.locator("#needs .needs-strip")).toBeVisible();
  await page.click("#needsExpand");
  await expect(page.locator("#tabItems")).toBeVisible();
  await page.reload();
  await expect(page.locator("#tabItems")).toBeVisible();
});

test("Marcar todo y Limpiar van junto a su explicación, no junto a Ocultar", async ({ page }) => {
  await openApp(page, MID);
  await expect(page.locator(".needs-head .needs-act")).toHaveCount(0);
  await expect(page.locator("#needsCollapse")).toHaveText(/^Ocultar/);
  // Misma fila en las dos pestañas: la explicación a la izquierda y las acciones a la derecha
  for (const tab of ["#tabPrereqs", "#tabItems"]) {
    await page.click(tab);
    const [hint, mark, clear] = await Promise.all(["#needsHint", "#needsMarkAll", "#needsClear"]
      .map(sel => page.locator(`.needs-bar ${sel}`).boundingBox()));
    expect(hint.x + hint.width).toBeLessThanOrEqual(mark.x);
    expect(Math.abs((mark.y + mark.height / 2) - (hint.y + hint.height / 2))).toBeLessThan(12);
    expect(clear.x).toBeGreaterThan(mark.x);
  }
  await expect(page.locator(".needs-toolbar .needs-act")).toHaveCount(0);
});

test("el crédito a Sandglass va bajo el título y se ve en las dos pestañas", async ({ page }) => {
  await openApp(page, MID);
  const intro = page.locator("#needsIntro");
  await expect(intro).toHaveText(/^Esta guía está hecha por Sandglass.*nivel 150/);
  const order = await page.evaluate(() => {
    const ids = ["needsTitle", "needsIntro", "tabPrereqs"];
    return ids.map(id => document.getElementById(id).getBoundingClientRect().top);
  });
  expect(order[0]).toBeLessThan(order[1]);
  expect(order[1]).toBeLessThan(order[2]);
  await page.click("#tabItems");
  await expect(intro).toBeVisible();
  await page.click("#tabPrereqs");
  await expect(intro).toBeVisible();
  await expect(page.locator(".pr-intro")).toHaveCount(0);
});

test("las tarjetas del hero y el atajo / despliegan la sección contraída", async ({ page }) => {
  await openApp(page, MID);
  await page.click("#needsCollapse");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click("#heroItems");
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await page.click("#needsCollapse");
  await page.locator("body").press("/");
  await expect(page.locator("#needsSearch")).toBeFocused();
});

test("los prerrequisitos siguen la lista actual de Torrente Arcano", async ({ page }) => {
  await openApp(page);
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
  expect(ids).toEqual(["l1", "l2", "l3", "l4", "l5", "l10", "l6", "l11", "l7", "l8", "l9", "l12"]);
});

test("los prerrequisitos recomiendan empezar el Dofus Ocre cuanto antes", async ({ page }) => {
  await openApp(page);
  const ocre = page.locator("#prereqs .pr-ocre");
  await expect(ocre).toContainText("Dofus Ocre");
  await expect(ocre).toContainText("paso 79");
  // Lo da la misión "La eterna cosecha", que la guía termina en el paso 79
  await expect(ocre).toContainText("La eterna cosecha");
  await expect(ocre).toContainText("El fin de la eternidad");
  await expect(ocre.locator("img")).toHaveAttribute("src", /items\/23012\.png$/);
});

test("los prerrequisitos que son misiones llevan el símbolo de misión del juego", async ({ page }) => {
  await openApp(page);
  // Las misiones sin icono propio (el l6, koalaks, sí tiene el suyo)
  for (const id of ["l7", "l11"]) {
    await expect(page.locator(`#prereqs .pr-card[data-id="${id}"] .pr-icons .quest-mark`)).toHaveCount(1);
  }
  await expect(page.locator("#prereqs")).not.toContainText("📜");
});

test("el símbolo de misión ocupa el mismo marco que los iconos de logro", async ({ page }) => {
  await openApp(page);
  const size = sel => page.locator(sel).evaluate(el => Math.round(el.getBoundingClientRect().width));
  expect(await size('#prereqs .pr-card[data-id="l11"] .pr-quest'))
    .toBe(await size('#prereqs .pr-card[data-id="l1"] .pr-icons img'));
});

test("el aviso del Dofus Ocre lleva al paso 79, donde se consigue", async ({ page }) => {
  await openApp(page);
  const ocre = page.locator("#prereqs .pr-ocre");
  await expect(page.locator("#ocreToggle")).toHaveCount(0);
  await ocre.locator('.step-ref[data-n="79"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("79");
});

test("cada prerrequisito lleva el icono de lo que pide: misión o logro completo", async ({ page }) => {
  await openApp(page);
  const card = id => page.locator(`#prereqs .pr-card[data-id="${id}"]`);
  // Piden misiones concretas (aunque sean de un logro): la «!» del juego
  for (const id of ["l5", "l10", "l6", "l11", "l7", "l8", "l9", "l12"]) {
    await expect(card(id).locator(".pr-icons .quest-mark"), id).toHaveCount(1);
    await expect(card(id).locator(".pr-icons img"), id).toHaveCount(0);
  }
  // Piden el logro completo: el librito con trofeo
  for (const id of ["l3", "l4"]) {
    await expect(card(id).locator(".pr-icons img"), id).toHaveAttribute("src", /achievements\/273\.png$/);
  }
});

test("lo opcional se distingue con su propia etiqueta", async ({ page }) => {
  await openApp(page);
  const tags = page.locator("#prereqs .pr-tag.optional");
  await expect(tags).toHaveCount(3);
  await expect(page.locator("#prereqs .pr-card.optional")).toHaveCount(3);
});

test("completar un prerrequisito da por usados los objetos que pide", async ({ page }) => {
  await openApp(page);
  const slot = k => page.locator(`#prereqs .slot[data-id="${k}"]`);
  // Intrusión en el territorio wabbit pide las cuatro alas de escarahoja
  for (const k of ["1455", "1456", "1457", "1458"]) await expect(slot(k)).not.toHaveClass(/owned/);
  await page.click('#prereqs .pr-card[data-id="l7"]');
  for (const k of ["1455", "1456", "1457", "1458"]) await expect(slot(k)).toHaveClass(/owned/);
  // Los de otros prerrequisitos siguen pendientes
  await expect(slot("421")).not.toHaveClass(/owned/);
  // Altos vuelos: el casco y las alas de madera (se mejoran para el Escaeroplano)
  await page.click('#prereqs .pr-card[data-id="l10"]');
  for (const k of ["1019", "1021"]) await expect(slot(k)).toHaveClass(/owned/);
});

test("marcar un objeto no completa su prerrequisito: se puede comprar antes", async ({ page }) => {
  await openApp(page);
  await page.locator('#prereqs .slot[data-id="421"] .slot-main').click();
  await expect(page.locator('#prereqs .slot[data-id="421"]')).toHaveClass(/owned/);
  await expect(page.locator('#prereqs .pr-card[data-id="l11"]')).not.toHaveClass(/done/);
  await expect(page.locator("#prereqsCount")).toHaveText("0/21");
});

test("lo cogido para un paso se descuenta de la cantidad de «Pronto»", async ({ page }) => {
  await openApp(page);
  // La Ortiga la piden los prerrequisitos (50) y el paso 1 (50): en «Pronto» sale ×100
  await page.click("#tabItems");
  const ortiga = page.locator('#items .band.soon .slot[data-id="421"]');
  await expect(ortiga.locator(".q")).toHaveText("100");
  // Cogida para el paso 1 desde el diario: quedan 50 y sigue sin estar completa
  await page.click('.diary-row[data-n="1"] .row-main');
  await page.locator('#journal .journal-needs .slot[data-id="421"] .slot-main').click();
  await expect(ortiga.locator(".q")).toHaveText("50");
  await expect(ortiga.locator(".slot-main")).toHaveAttribute("aria-pressed", "false");
  await expect(ortiga.locator(".slot-main")).toHaveAttribute("aria-label", /Ortiga, faltan 50 de 100/);
  // Completarla allí la da por cogida entera, con su cantidad total
  await ortiga.locator(".slot-main").click();
  await expect(ortiga.locator(".slot-main")).toHaveAttribute("aria-pressed", "true");
  await expect(ortiga.locator(".q")).toHaveText("100");
  // Y desmarcar el paso 1 en el diario vuelve a dejar 50 pendientes
  await page.locator('#journal .journal-needs .slot[data-id="421"] .slot-main').click();
  await expect(ortiga.locator(".q")).toHaveText("50");
});
