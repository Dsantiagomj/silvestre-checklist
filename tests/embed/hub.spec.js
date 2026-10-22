import { test, expect } from "@playwright/test";
import { HUB } from "../../src/hub/manifest.js";
import { PAGE_FIXTURE, hub, openHub, openHubPreview } from "./hub-harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const panes = page => hub(page).locator(".pane");
const toggles = page => hub(page).locator(".pane-toggle");
const SILVESTRE = HUB.dofus[0];
const HIELOS = HUB.dofus[1];

test("el hub se monta en una shadow root con una franja por Dofus y la de Próximamente", async ({ page }) => {
  const errors = await openHub(page);
  expect(await hub(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada del hub en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".pane, .banners").length)).toBe(0);
  await expect(panes(page)).toHaveCount(3);
  await expect(toggles(page).nth(0)).toHaveAccessibleName("Dofus Silvestre");
  await expect(toggles(page).nth(1)).toHaveAccessibleName("Dofus de los Hielos");
  await expect(toggles(page).nth(2)).toHaveAccessibleName("Próximamente");
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  // Las imágenes salen de GitHub Pages, no de Squarespace ni de DofusDB
  const srcs = await hub(page).locator("img").evaluateAll(imgs => imgs.map(i => i.src));
  expect(srcs.length).toBeGreaterThan(0);
  for (const src of srcs) expect(src).toMatch(/^https:\/\/dsantiagomj\.github\.io\/silvestre-checklist\/img\/hub\//);
  await expect.poll(() => hub(page).locator("img").evaluateAll(imgs => imgs.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  expect(errors).toEqual([]);
});

test("la primera franja empieza abierta con su texto y su botón al checklist", async ({ page }) => {
  await openHub(page);
  const first = panes(page).nth(0);
  await expect(first).toHaveClass(/\bopen\b/);
  await expect(toggles(page).nth(0)).toHaveAttribute("aria-expanded", "true");
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "false");
  await expect(first.locator(".kick")).toHaveText("Checklist");
  await expect(first.locator(".name")).toHaveText("Dofus Silvestre");
  await expect(first.locator(".lead")).toHaveText("Silvosse te espera al final de 100 pasos por todo el Mundo de los Doce.");
  const cta = first.locator("a.cta");
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText("Ver checklist ›");
  await expect(cta).toHaveAttribute("href", "https://www.torrentearcano.com/checklist-silvestre");
  // Las cerradas no enseñan su botón
  await expect(panes(page).nth(1).locator("a.cta")).toBeHidden();
  expect(SILVESTRE.url).toBe("https://www.torrentearcano.com/checklist-silvestre");
});

test("pasar el ratón por otra franja la abre y cierra la anterior", async ({ page }) => {
  await openHub(page);
  await panes(page).nth(1).hover();
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(toggles(page).nth(0)).toHaveAttribute("aria-expanded", "false");
  const open = panes(page).nth(1);
  await expect(open.locator(".name")).toHaveText("Dofus de los Hielos");
  await expect(open.locator(".lead")).toHaveText("Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.");
  await expect(open.locator("a.cta")).toBeVisible();
  await expect(open.locator("a.cta")).toHaveAttribute("href", HIELOS.url);
  await expect(panes(page).nth(0).locator("a.cta")).toBeHidden();
  // La abierta crece y las cerradas quedan estrechas
  await expect.poll(async () => (await open.boundingBox()).width).toBeGreaterThan(500);
  await expect.poll(async () => (await panes(page).nth(0).boundingBox()).width * 3).toBeLessThan((await open.boundingBox()).width);
});

test("un clic abre la franja", async ({ page }) => {
  await openHub(page);
  await toggles(page).nth(1).dispatchEvent("click");
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect(toggles(page).nth(0)).toHaveAttribute("aria-expanded", "false");
});

test("con el teclado: el foco y las flechas abren las franjas, y Tab llega al botón", async ({ page }) => {
  await openHub(page);
  await toggles(page).nth(0).focus();
  await page.keyboard.press("ArrowRight");
  await expect(toggles(page).nth(1)).toBeFocused();
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight");
  await expect(toggles(page).nth(2)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowRight"); // vuelve a la primera
  await expect(toggles(page).nth(0)).toBeFocused();
  await page.keyboard.press("End");
  await expect(toggles(page).nth(2)).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowLeft");
  await expect(toggles(page).nth(2)).toHaveAttribute("aria-expanded", "true");
  // Enter sobre una franja la abre; Tab desde ella va a su botón al checklist
  await toggles(page).nth(1).focus();
  await page.keyboard.press("Enter");
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Tab");
  await expect(panes(page).nth(1).locator("a.cta")).toBeFocused();
});

test("la franja de Próximamente no lleva botón y su huevo es una silueta", async ({ page }) => {
  await openHub(page);
  const soon = panes(page).nth(2);
  await toggles(page).nth(2).dispatchEvent("click");
  await expect(soon).toHaveClass(/\block\b/);
  await expect(soon.locator(".kick")).toHaveText("En camino");
  await expect(soon.locator(".name")).toHaveText("???");
  await expect(soon.locator(".lead")).toHaveText("Torre está preparando el siguiente checklist.");
  await expect(soon.locator(".lead")).toBeVisible();
  await expect(soon.locator(".cta")).toHaveCount(0);
  expect(await style(soon.locator(".egg"), "filter")).toMatch(/brightness\(0\)/);
});

test("el CSS de la página no entra en el hub ni el del hub sale a la página", async ({ page }) => {
  await openHub(page);
  const first = panes(page).nth(0);
  expect(await style(first.locator(".lead"), "fontFamily")).toMatch(/Barlow/);
  expect(await style(first.locator(".name"), "fontFamily")).toMatch(/Barlow Condensed/);
  expect(await style(first.locator(".lead"), "textTransform")).toBe("none");
  expect(await style(first, "boxSizing")).toBe("border-box");
  // `a { color: orange }` y `button { all: unset }` de la página
  expect(await style(first.locator(".cta"), "color")).toBe("rgb(11, 12, 10)");
  expect(await style(first.locator(".cta"), "backgroundColor")).toBe("rgb(183, 220, 105)");
  expect(await style(toggles(page).nth(1), "cursor")).toBe("pointer");
  // `img { max-width: 50%; border }`: el huevo no se encoge ni lleva su borde
  expect(await style(first.locator(".egg"), "borderTopWidth")).toBe("0px");
  expect(await style(first.locator(".egg"), "maxWidth")).not.toBe("50%");
  // Texto claro sobre la sombra oscura
  expect(await style(first.locator(".name"), "color")).toBe("rgb(255, 255, 255)");
  // Y la página sigue como estaba
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  expect(await style(page.locator("#below p"), "fontFamily")).toBe("serif");
  expect(await style(page.locator("#below p"), "color")).toBe("rgb(204, 0, 0)");
});

const banners = page => hub(page).locator(".banners");
const noScroll = page => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test("en escritorio cabe entre la cabecera y el pie de la página, de borde a borde y sin scroll", async ({ page }) => {
  for (const [w, h, header, footer] of [[1440, 900, 90, 223], [1280, 720, 90, 223]]) {
    await page.setViewportSize({ width: w, height: h });
    await openHub(page, PAGE_FIXTURE);
    await expect.poll(() => noScroll(page)).toBe(true);
    const box = await banners(page).boundingBox();
    expect(Math.abs(box.x)).toBeLessThan(1);
    expect(Math.abs(box.width - w)).toBeLessThan(1);
    expect(Math.abs(box.y - header)).toBeLessThan(2);
    expect(Math.abs(box.height - (h - header - footer))).toBeLessThan(2);
    // El pie se ve entero, justo debajo
    const foot = await page.locator("#footer-sections").boundingBox();
    expect(Math.abs(foot.y + foot.height - h)).toBeLessThan(2);
  }
});

test("sigue el tamaño de la ventana", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHub(page, PAGE_FIXTURE);
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect.poll(async () => (await banners(page).boundingBox()).height).toBeLessThan(800 - 90 - 223 + 2);
  await expect.poll(() => noScroll(page)).toBe(true);
});

test("en un móvil el pie no cabe: el hub llena la pantalla bajo la cabecera y el pie va debajo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHub(page, PAGE_FIXTURE);
  const box = await banners(page).boundingBox();
  expect(Math.abs(box.x)).toBeLessThan(1);
  expect(Math.abs(box.y - 84)).toBeLessThan(2);
  expect(Math.abs(box.height - (844 - 84))).toBeLessThan(2);
  // La abierta llena lo que dejan las dos cerradas
  const open = await panes(page).nth(0).boundingBox();
  expect(open.height).toBeGreaterThan(box.height - 2 * 64 - 40);
});

test("en móvil las franjas van una debajo de otra y la abierta es la más alta", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHub(page);
  const boxes = await Promise.all([0, 1, 2].map(i => panes(page).nth(i).boundingBox()));
  // Apiladas: misma columna, cada una por debajo de la anterior
  expect(boxes[1].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1);
  expect(boxes[2].y).toBeGreaterThan(boxes[1].y + boxes[1].height - 1);
  expect(Math.abs(boxes[1].x - boxes[0].x)).toBeLessThan(2);
  expect(boxes[0].height).toBeGreaterThan(boxes[1].height * 3);
  // Cabe en el ancho del móvil
  const host = await hub(page).boundingBox();
  for (const b of boxes) expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1);
  await expect(panes(page).nth(0).locator("a.cta")).toBeVisible();
  // Tocar otra la abre
  await toggles(page).nth(1).dispatchEvent("click");
  await expect(toggles(page).nth(1)).toHaveAttribute("aria-expanded", "true");
  await expect.poll(async () => (await panes(page).nth(1).boundingBox()).height).toBeGreaterThan(boxes[0].height - 2);
});

test("con movimiento reducido no hay ken-burns, flotación, respiración ni brillo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHub(page);
  const first = panes(page).nth(0);
  for (const sel of [".bg", ".eggwrap", ".guard", ".foil"]) {
    expect(await style(first.locator(sel), "animationName"), sel).toBe("none");
  }
});

test("con movimiento normal la franja abierta se anima", async ({ page }) => {
  await openHub(page);
  const first = panes(page).nth(0);
  for (const sel of [".bg", ".eggwrap", ".guard", ".foil"]) {
    expect(await style(first.locator(sel), "animationName"), sel).not.toBe("none");
  }
});

test("la vista previa en GitHub Pages (/checklists/) monta el hub con el mismo snippet", async ({ page }) => {
  const errors = await openHubPreview(page);
  await expect(page).toHaveTitle(/Checklists/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  // Solo las franjas entre la cabecera y el pie de Torrente Arcano: sin título ni scroll
  await expect(page.locator("h1")).toHaveCount(0);
  await expect(page.locator("#header")).toBeVisible();
  await expect(page.locator("#footer-sections")).toBeVisible();
  await expect.poll(() => noScroll(page)).toBe(true);
  await expect(hub(page).locator(".pane")).toHaveCount(3);
  await expect(hub(page).locator(".pane").nth(0).locator("a.cta")).toBeVisible();
  expect(await page.locator('script[type="module"]').getAttribute("src")).toMatch(/embed\/checklists\.js$/);
  expect(errors).toEqual([]);
});
