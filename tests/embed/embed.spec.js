import { test, expect } from "@playwright/test";
import { app, openHarness, readLS } from "./harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);

test("la app se monta en una shadow root dentro del bloque, entre el contenido de la página", async ({ page }) => {
  const errors = await openHarness(page);
  expect(await app(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada de la app en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".diary-row, .hero, .wrap").length)).toBe(0);
  // El contenido de Torrente Arcano sigue arriba y abajo, en el flujo normal
  const [above, root, below] = await Promise.all(["#above", "#silvestre-root", "#below"].map(s =>
    page.locator(s).evaluate(el => el.getBoundingClientRect().top + scrollY)));
  expect(above).toBeLessThan(root);
  expect(root).toBeLessThan(below);
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("el CSS de la página no entra en la app ni el de la app sale a la página", async ({ page }) => {
  await openHarness(page);
  const row = app(page).locator('.diary-row[data-n="1"]');
  expect(await style(row, "fontFamily")).toMatch(/Barlow/);
  expect(await style(row, "boxSizing")).toBe("border-box");
  expect(await style(row, "textTransform")).toBe("none");
  // `button { all: unset }` de la página: los botones de la app conservan los suyos
  const overlay = app(page).locator("#overlayBtn");
  expect(await style(overlay, "cursor")).toBe("pointer");
  expect(await style(overlay, "display")).not.toBe("inline");
  // `img { max-width: 50% }`: el icono de la marca no se encoge ni lleva su borde
  const icon = app(page).locator("#brandIcon");
  expect(await style(icon, "borderTopWidth")).toBe("0px");
  expect(await style(icon, "maxWidth")).not.toBe("50%");
  // Las variables de la página (--bg, --header-h) no pisan las de la app
  expect(await style(app(page).locator("header").first(), "height")).not.toBe("300px");
  expect(await style(app(page).locator(".app-root"), "backgroundColor")).not.toBe("rgb(255, 0, 0)");
  // Y la página sigue como estaba: su fondo, su letra y sus botones
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  expect(await style(page.locator("#below p"), "fontFamily")).toBe("serif");
  expect(await style(page.locator("#below p"), "color")).toBe("rgb(204, 0, 0)");
  expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
});

test("marcar un paso funciona y se guarda", async ({ page }) => {
  await openHarness(page);
  await app(page).locator('.diary-row[data-n="1"] .row-check').click();
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
  expect(await readLS(page, "silvestre:done")).toEqual({ 1: true });
  await page.reload();
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
});

test("el tema cambia en la app y no en la página", async ({ page }) => {
  await openHarness(page);
  const root = app(page).locator(".app-root");
  await expect(root).toHaveAttribute("data-theme", "dark");
  const dark = await style(root, "backgroundColor");
  await app(page).locator("#themeBtn").click();
  await expect(root).toHaveAttribute("data-theme", "light");
  await expect.poll(() => style(root, "backgroundColor")).not.toBe(dark);
  expect(await page.evaluate(() => localStorage.getItem("silvestre:theme"))).toBe("light");
  expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  await page.reload();
  await expect(app(page).locator(".app-root")).toHaveAttribute("data-theme", "light");
});

test("el detalle del diario se desplaza por dentro y vuelve arriba al cambiar de paso", async ({ page }) => {
  await openHarness(page);
  await app(page).locator('.diary-row[data-n="1"] .row-main').click();
  await expect(app(page).locator("#journal .q-item")).toHaveCount(16, { timeout: 15_000 });
  const detail = app(page).locator(".diary-detail");
  await app(page).locator("#diary").evaluate(el => el.scrollIntoView({ block: "start" }));
  expect(await detail.evaluate(el => el.scrollHeight > el.clientHeight + 50)).toBe(true);
  const y = await page.evaluate(() => scrollY);
  await detail.evaluate(el => el.scrollTo(0, el.scrollHeight));
  expect(await detail.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await app(page).locator("#nextBtn").evaluate(el => el.click());
  await expect(app(page).locator("#journal .journal-num")).toHaveText("2");
  expect(await detail.evaluate(el => el.scrollTop)).toBe(0);
  expect(await page.evaluate(() => scrollY)).toBe(y);
});

test("la cabecera de la app queda bajo la cabecera fija de la página y la ventana de pasos se ve entera", async ({ page }) => {
  await openHarness(page);
  // «Continuar con el paso N» lleva la página hasta la ventana de los pasos
  await app(page).locator("#heroNextGo").click();
  // Cuando termina de bajar, la cabecera de la app queda pegada justo bajo la de la página
  const top = sel => app(page).locator(sel).first().evaluate(el => Math.round(el.getBoundingClientRect().top));
  let last = null;
  await expect.poll(async () => { const t = await top("#diary"); const still = t === last; last = t; return still; }, { timeout: 5_000 }).toBe(true);
  expect(await top("header")).toBe(80);
  const header = await app(page).locator("header").first().evaluate(el => el.getBoundingClientRect());
  const diary = await app(page).locator("#diary").evaluate(el => el.getBoundingClientRect());
  expect(diary.top).toBeGreaterThanOrEqual(header.bottom);
  expect(diary.bottom).toBeLessThanOrEqual(900);
});

test("las teclas y los clics dentro de la app llegan a su sitio", async ({ page }) => {
  await openHarness(page);
  // Un espacio en el buscador se escribe: no marca el paso abierto
  await app(page).locator('.diary-row[data-n="3"] .row-main').click();
  await app(page).locator("#searchInput").fill("");
  await app(page).locator("#searchInput").press("Space");
  await expect(app(page).locator('.diary-row[data-n="3"]')).not.toHaveClass(/done/);
  await app(page).locator("#searchInput").fill("");
  // Elegir una zona en su desplegable: el clic dentro no cuenta como «fuera»
  await app(page).locator("#zoneBtn").click();
  await app(page).locator("#zoneSeals .seal").nth(1).click();
  await expect.poll(() => app(page).locator(".diary-row").count()).toBeLessThan(100);
});

test("trae el progreso del checklist clásico de la misma página", async ({ page }) => {
  const checked = Array.from({ length: 100 }, (_, i) => i < 3);
  await openHarness(page, { dofus_silvestre_clean_v4: { checked, filter: "all", sortMode: "guide", prerequisitesOpen: false, darkMode: false } });
  await expect(app(page).locator(".diary-row.done")).toHaveCount(3);
  await expect(app(page).locator(".app-root")).toHaveAttribute("data-theme", "light");
});

test("el overlay se abre con los estilos de la app y sin los de la página", async ({ page, context }) => {
  await openHarness(page);
  // Playwright no tiene Picture-in-Picture: el overlay se abre como popup
  const [ov] = await Promise.all([context.waitForEvent("page"), app(page).locator("#overlayBtn").click()]);
  await expect(ov.locator(".ov")).toBeVisible({ timeout: 10_000 });
  await expect(ov.locator(".ov-num")).toHaveText("1");
  expect(await style(ov.locator(".ov"), "fontFamily")).toMatch(/Barlow/);
  expect(await style(ov.locator("body"), "backgroundColor")).not.toBe("rgb(250, 250, 250)");
  expect(await ov.evaluate(() => [...document.querySelectorAll("style")].some(s => s.textContent.includes("font-family: serif")))).toBe(false);
  // Marcar desde el overlay llega a la página
  await ov.locator("body").press("Enter");
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
});

test("en móvil el paso se abre en la hoja inferior sobre la página", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHarness(page);
  await app(page).locator('.diary-row[data-n="2"] .row-main').click();
  const sheet = app(page).locator(".sheet");
  await expect(sheet).toHaveClass(/open/);
  await expect(sheet).toBeInViewport();
  // La hoja va fija al pie de la ventana y su fondo oscuro tapa también la cabecera fija
  // de la página: lo que hay arriba del todo es la app, no #header
  await expect.poll(() => sheet.evaluate(el => Math.round(el.getBoundingClientRect().bottom))).toBe(844);
  expect(await page.evaluate(() => document.elementFromPoint(195, 40)?.id)).toBe("silvestre-root");
});

