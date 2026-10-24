import { test, expect } from "@playwright/test";
import { HUB } from "../../src/hub/manifest.js";
import { PAGE_FIXTURE, hub, openHub, openHubPreview } from "./hub-harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const cards = page => hub(page).locator(".card");
const SOON_I = HUB.dofus.length;

test("el hub se monta en una shadow root con una carta por Dofus y la de Próximamente", async ({ page }) => {
  const errors = await openHub(page);
  expect(await hub(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada del hub en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".card, .cards").length)).toBe(0);
  await expect(cards(page)).toHaveCount(HUB.dofus.length + 1);
  // Un título encima de las cartas, que nombra la sección
  await expect(hub(page).getByRole("heading", { level: 2, name: HUB.title })).toBeVisible();
  await expect(hub(page).getByRole("region", { name: HUB.title })).toHaveCount(1);
  // Cada carta es un enlace con el nombre del Dofus
  await expect(hub(page).getByRole("link", { name: "Dofus Silvestre · Ver checklist" })).toHaveCount(1);
  await expect(hub(page).getByRole("link", { name: "Dofus de los Hielos · Ver checklist" })).toHaveCount(1);
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  // Las imágenes salen de GitHub Pages, no de Squarespace ni de DofusDB; son decorativas
  const imgs = await hub(page).locator("img").evaluateAll(list => list.map(i => ({ src: i.src, alt: i.alt })));
  expect(imgs.length).toBeGreaterThan(0);
  for (const { src, alt } of imgs) {
    expect(src).toMatch(/^https:\/\/dsantiagomj\.github\.io\/silvestre-checklist\/img\/hub\//);
    expect(alt).toBe("");
  }
  await expect.poll(() => hub(page).locator("img").evaluateAll(list => list.every(i => i.complete && i.naturalWidth > 0))).toBe(true);
  expect(errors).toEqual([]);
});

test("las cartas siguen el orden del manifiesto y cada una lleva a su checklist", async ({ page }) => {
  await openHub(page);
  for (const [i, d] of HUB.dofus.entries()) {
    const card = cards(page).nth(i);
    expect(await card.evaluate(el => el.tagName)).toBe("A");
    await expect(card).toHaveAttribute("href", d.url);
    await expect(card).toHaveAttribute("data-id", d.id);
    // Sin rótulo: el título de la sección ya dice que son checklists
    await expect(card.locator(".kick")).toHaveCount(0);
    await expect(card.locator(".name")).toHaveText(d.name);
    await expect(card.locator(".lead")).toHaveText(d.lead);
    await expect(card).toHaveAccessibleDescription(d.lead);
    // Sin progreso: la carta solo invita a entrar
    await expect(card).not.toContainText(/%|Guardián/);
  }
  expect(HUB.dofus[0].url).toBe("https://www.torrentearcano.com/checklist-silvestre");
});

test("la carta de Próximamente no es un enlace: gris, su huevo en silueta y «???»", async ({ page }) => {
  await openHub(page);
  const soon = cards(page).nth(SOON_I);
  await expect(soon).toHaveClass(/\block\b/);
  expect(await soon.evaluate(el => el.tagName)).toBe("DIV");
  await expect(soon).not.toHaveAttribute("href", /.*/);
  await expect(soon).toHaveAttribute("aria-disabled", "true");
  await expect(soon.locator(".kick")).toHaveText("En camino");
  await expect(soon.locator(".name")).toHaveText("???");
  await expect(soon.locator(".lead")).toHaveText("Torre está preparando el siguiente checklist.");
  await expect(soon.locator(".lead")).toBeVisible();
  expect(await style(soon.locator(".egg"), "filter")).toMatch(/brightness\(0\)/);
  expect(await style(soon, "filter")).toMatch(/grayscale\(1\)/);
  // Tab pasa por las cartas con enlace y no se para en la bloqueada
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(soon).not.toBeFocused();
});

test("con el teclado: Tab recorre las cartas en orden con un anillo de foco visible", async ({ page }) => {
  await openHub(page);
  await cards(page).nth(0).focus();
  await expect(cards(page).nth(0)).toBeFocused();
  expect(await style(cards(page).nth(0), "outlineStyle")).not.toBe("none");
  await page.keyboard.press("Tab");
  await expect(cards(page).nth(1)).toBeFocused();
  expect(await style(cards(page).nth(1), "outlineStyle")).not.toBe("none");
});

/** Mueve el ratón a una fracción (fx, fy) de la carta. */
async function pointAt(page, card, fx, fy) {
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 4 });
}

test("la carta se inclina hacia el ratón, el brillo lo sigue y al salir vuelve a su sitio", async ({ page }) => {
  await openHub(page);
  const card = cards(page).nth(0);
  await pointAt(page, card, .9, .2);
  await expect.poll(() => style(card, "transform")).toMatch(/^matrix3d/);
  expect(await card.evaluate(el => el.style.getPropertyValue("--fx"))).toMatch(/%$/);
  await page.mouse.move(2, 2);
  await expect.poll(() => card.evaluate(el => el.style.transform)).toBe("");
  // La bloqueada no se mueve
  await pointAt(page, cards(page).nth(SOON_I), .9, .2);
  expect(await cards(page).nth(SOON_I).evaluate(el => el.style.transform)).toBe("");
});

test("con movimiento reducido las cartas no se inclinan ni mueven el brillo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openHub(page);
  const card = cards(page).nth(0);
  await pointAt(page, card, .9, .2);
  await pointAt(page, card, .1, .8);
  expect(await style(card, "transform")).toBe("none");
  expect(await card.evaluate(el => el.style.getPropertyValue("--fx"))).toBe("");
  expect(await style(card, "transitionDuration")).toMatch(/^0s/);
});

test("el CSS de la página no entra en el hub ni el del hub sale a la página", async ({ page }) => {
  await openHub(page);
  const first = cards(page).nth(0);
  expect(await style(first.locator(".lead"), "fontFamily")).toMatch(/Barlow/);
  expect(await style(first.locator(".name"), "fontFamily")).toMatch(/Barlow Condensed/);
  expect(await style(first.locator(".lead"), "textTransform")).toBe("none");
  expect(await style(first, "boxSizing")).toBe("border-box");
  // `a { color: orange }` de la página: el nombre va en el color de su Dofus
  expect(await style(first.locator(".name"), "color")).toBe("rgb(183, 220, 105)");
  expect(await style(first, "textDecorationLine")).toBe("none");
  // `img { max-width: 50%; border }`: el huevo no se encoge ni lleva su borde
  expect(await style(first.locator(".egg"), "borderTopWidth")).toBe("0px");
  expect(await style(first.locator(".egg"), "maxWidth")).not.toBe("50%");
  // Y la página sigue como estaba
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  expect(await style(page.locator("#below p"), "fontFamily")).toBe("serif");
  expect(await style(page.locator("#below p"), "color")).toBe("rgb(204, 0, 0)");
});

const stage = page => hub(page).locator(".cards");
const noScroll = page => page.evaluate(() => document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test("en escritorio cabe entre la cabecera y el pie de la página, de borde a borde y sin scroll", async ({ page }) => {
  for (const [w, h, header, footer] of [[1440, 900, 90, 223], [1280, 720, 90, 223]]) {
    await page.setViewportSize({ width: w, height: h });
    await openHub(page, PAGE_FIXTURE);
    await expect.poll(() => noScroll(page)).toBe(true);
    const box = await stage(page).boundingBox();
    expect(Math.abs(box.x)).toBeLessThan(1);
    expect(Math.abs(box.width - w)).toBeLessThan(1);
    expect(Math.abs(box.y - header)).toBeLessThan(2);
    expect(Math.abs(box.height - (h - header - footer))).toBeLessThan(2);
    // El pie se ve entero, justo debajo
    const foot = await page.locator("#footer-sections").boundingBox();
    expect(Math.abs(foot.y + foot.height - h)).toBeLessThan(2);
    // Las cartas en una fila centrada, enteras dentro del hub
    const boxes = await cards(page).evaluateAll(list => list.map(c => c.getBoundingClientRect().toJSON()));
    for (const b of boxes) {
      expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(1);
      expect(b.y).toBeGreaterThanOrEqual(box.y);
      expect(b.bottom).toBeLessThanOrEqual(box.y + box.height);
    }
    const mid = (boxes[0].left + boxes.at(-1).right) / 2;
    expect(Math.abs(mid - w / 2)).toBeLessThan(2);
  }
});

test("sigue el tamaño de la ventana", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHub(page, PAGE_FIXTURE);
  await page.setViewportSize({ width: 1440, height: 800 });
  await expect.poll(async () => (await stage(page).boundingBox()).height).toBeLessThan(800 - 90 - 223 + 2);
  await expect.poll(() => noScroll(page)).toBe(true);
});

test("en un móvil el pie no cabe: el hub llena la pantalla bajo la cabecera y el pie va debajo", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHub(page, PAGE_FIXTURE);
  const box = await stage(page).boundingBox();
  expect(Math.abs(box.x)).toBeLessThan(1);
  expect(Math.abs(box.y - 84)).toBeLessThan(2);
  expect(Math.abs(box.height - (844 - 84))).toBeLessThan(2);
});

test("en móvil las cartas van de dos en dos, legibles y dentro del ancho", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openHub(page);
  const host = await hub(page).boundingBox();
  const boxes = await Promise.all([0, 1, 2].map(i => cards(page).nth(i).boundingBox()));
  // Dos en la primera fila y la tercera debajo
  expect(Math.abs(boxes[1].y - boxes[0].y)).toBeLessThan(2);
  expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].width - 1);
  expect(boxes[2].y).toBeGreaterThan(boxes[0].y + boxes[0].height - 1);
  for (const b of boxes) {
    expect(b.width).toBeGreaterThanOrEqual(150);
    expect(b.x).toBeGreaterThanOrEqual(host.x - 1);
    expect(b.x + b.width).toBeLessThanOrEqual(host.x + host.width + 1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // El texto cabe en la carta
  for (const i of [0, 1, 2]) {
    const lead = await cards(page).nth(i).locator(".lead").boundingBox();
    expect(lead.y + lead.height).toBeLessThanOrEqual(boxes[i].y + boxes[i].height);
  }
});

test("la vista previa en GitHub Pages (/checklists/) monta el hub con el mismo snippet", async ({ page }) => {
  const errors = await openHubPreview(page);
  await expect(page).toHaveTitle(/Checklists/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  // Solo las cartas entre la cabecera y el pie de Torrente Arcano: sin título ni scroll
  await expect(page.locator("h1")).toHaveCount(0);
  await expect(page.locator("#header")).toBeVisible();
  await expect(page.locator("#footer-sections")).toBeVisible();
  await expect.poll(() => noScroll(page)).toBe(true);
  await expect(cards(page)).toHaveCount(3);
  await expect(cards(page).nth(0)).toHaveAttribute("href", HUB.dofus[0].url);
  expect(await page.locator('script[type="module"]').getAttribute("src")).toMatch(/embed\/checklists\.js$/);
  expect(errors).toEqual([]);
});
