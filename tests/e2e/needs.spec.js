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
  await ctx.close();
});

test("lo que necesitas va antes del tablero de pasos", async ({ page }) => {
  await openApp(page);
  const order = await page.evaluate(() => {
    const needs = document.getElementById("needs");
    const board = document.querySelector(".grid-section");
    return needs.compareDocumentPosition(board) & Node.DOCUMENT_POSITION_FOLLOWING ? "antes" : "después";
  });
  expect(order).toBe("antes");
  await expect(page.locator("#needs .section-num")).toHaveText("01");
  await expect(page.locator(".grid-section .section-num")).toHaveText("02");
});
