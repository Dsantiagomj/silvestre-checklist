import { test, expect } from "@playwright/test";
import { SITE } from "./harness.js";
import { PAGE, SCRIPT, inicio, loadInicio, openInicio } from "./inicio-harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const big = page => inicio(page).locator(".card.wide");
const mid = page => inicio(page).locator(".card.mid");
const soon = page => inicio(page).locator(".chip");

// Las secciones de Torrente Arcano a las que lleva el inicio, en orden
const BIG = [
  ["Misiones", "https://www.torrentearcano.com/metalogros"],
  ["Guías Dofus", "https://www.torrentearcano.com/guias-dofus"],
  ["Checklists", "https://www.torrentearcano.com/checklists"],
];
const MID = [
  ["Clases y sets", "https://www.torrentearcano.com/clases-1"],
  ["Alineamiento", "https://www.torrentearcano.com/metalogro-alineamiento"],
  ["Team builder", "https://www.torrentearcano.com/team-builder"],
];
const SOON = ["Mazmorras", "Oficios", "Compañeros", "Mascotas"];

test("el inicio se monta en una shadow root con la portada, seis secciones y lo que viene", async ({ page }) => {
  const errors = await openInicio(page);
  expect(await inicio(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada del inicio en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".card, .hero, .chip").length)).toBe(0);
  await expect(inicio(page).getByRole("heading", { level: 1, name: "Guías de Dofus" })).toBeVisible();
  await expect(inicio(page).locator(".hero .ey")).toHaveText("Torrente Arcano");
  await expect(inicio(page).locator(".hero p")).toHaveText("Todo lo que necesitas para avanzar en el Mundo de los Doce.");
  await expect(big(page)).toHaveCount(3);
  await expect(mid(page)).toHaveCount(3);
  await expect(soon(page)).toHaveCount(4);
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("sin <div id=\"inicio-root\"> no pinta nada y avisa en la consola", async ({ page }) => {
  const errors = await loadInicio(page, PAGE.replace('<div id="inicio-root"></div>', ""));
  await expect.poll(() => errors.some(e => e.includes('falta <div id="inicio-root">'))).toBe(true);
  expect(await page.locator("#inicio-root").count()).toBe(0);
});

test("pegar el script dos veces no monta el inicio dos veces", async ({ page }) => {
  // Otra dirección del mismo archivo: el navegador lo ejecuta otra vez
  const twice = PAGE.replace("</main>", `<script type="module" src="${SCRIPT}?otra"></script></main>`);
  const errors = await openInicio(page, twice);
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes("embed/inicio.js")).length)).toBe(2);
  await expect(big(page)).toHaveCount(3);
  await expect(inicio(page).locator(".hero")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("cada carta lleva a su sección de Torrente Arcano, con su nombre y su lema", async ({ page }) => {
  await openInicio(page);
  for (const [list, expected] of [[big, BIG], [mid, MID]]) {
    for (const [i, [name, url]] of expected.entries()) {
      const card = list(page).nth(i);
      expect(await card.evaluate(el => el.tagName)).toBe("A");
      await expect(card).toHaveAttribute("href", url);
      await expect(card).toHaveAttribute("aria-label", name);
      await expect(card.locator(".name")).toHaveText(name);
      const lead = (await card.locator(".lead").textContent()).trim();
      expect(lead.length).toBeGreaterThan(10);
      await expect(card).toHaveAccessibleDescription(lead);
    }
  }
  await expect(inicio(page).getByRole("link", { name: "Misiones", exact: true })).toHaveAttribute("href", BIG[0][1]);
  // Ya no hay «Entrar»: la carta entera es el enlace
  await expect(inicio(page).locator(".go")).toHaveCount(0);
  await expect(inicio(page).getByRole("link")).toHaveCount(6);
});

test("lo de «En camino» no enlaza: en gris y sin foco", async ({ page }) => {
  await openInicio(page);
  await expect(inicio(page).locator(".soonT")).toHaveText("En camino");
  for (const [i, name] of SOON.entries()) {
    const chip = soon(page).nth(i);
    await expect(chip).toHaveText(name);
    expect(await chip.evaluate(el => el.tagName)).toBe("DIV");
    expect(await chip.evaluate(el => !!el.closest("a") || !!el.querySelector("a"))).toBe(false);
    expect(await style(chip.locator(".bg"), "filter")).toMatch(/grayscale\(1\)/);
  }
});

test("todas las imágenes salen de GitHub Pages y cargan, ninguna de DofusDB ni de Ankama", async ({ page }) => {
  const errors = await openInicio(page);
  const imgs = await inicio(page).locator("img").evaluateAll(list => list.map(i => ({ src: i.src, alt: i.alt })));
  // La portada, las 6 cartas con su fondo, PNJ e iconos y lo que viene
  expect(imgs.length).toBeGreaterThan(30);
  for (const { src, alt } of imgs) {
    expect(src.startsWith(`${SITE}img/`)).toBe(true);
    expect(src).not.toMatch(/dofusdb|ankama/i);
    expect(alt).toBe("");
  }
  await expect.poll(() => inicio(page).locator("img").evaluateAll(list => list.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src))).toEqual([]);
  expect(errors).toEqual([]);
});

/** Mueve el ratón a una fracción (fx, fy) de la carta. */
async function pointAt(page, card, fx, fy) {
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 4 });
}

test("las cartas se inclinan hacia el ratón y el brillo lo sigue; con movimiento reducido, no", async ({ page }) => {
  await openInicio(page);
  for (const card of [big(page).nth(1), mid(page).nth(0)]) {
    await card.scrollIntoViewIfNeeded();
    await pointAt(page, card, .9, .2);
    await expect.poll(() => style(card, "transform")).toMatch(/^matrix3d/);
    expect(await card.evaluate(el => el.style.getPropertyValue("--fx"))).toMatch(/%$/);
    await page.mouse.move(2, 2);
    await expect.poll(() => card.evaluate(el => el.style.transform)).toBe("");
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const card = big(page).nth(0);
  await pointAt(page, card, .9, .2);
  await pointAt(page, card, .1, .8);
  expect(await style(card, "transform")).toBe("none");
});

test("el CSS de la página no entra en el inicio ni el del inicio sale a la página", async ({ page }) => {
  await openInicio(page);
  const first = big(page).nth(0);
  expect(await style(first.locator(".lead"), "fontFamily")).toMatch(/Barlow/);
  expect(await style(first.locator(".name"), "fontFamily")).toMatch(/Barlow Condensed/);
  expect(await style(first.locator(".lead"), "textTransform")).toBe("none");
  expect(await style(first, "boxSizing")).toBe("border-box");
  // `a { color: orange }` de la página: el nombre va en el color de su sección
  expect(await style(first.locator(".name"), "color")).toBe("rgb(227, 197, 101)");
  expect(await style(first, "textDecorationLine")).toBe("none");
  // `h1 { color: lime }` tampoco llega a la portada
  expect(await style(inicio(page).locator("h1"), "color")).toBe("rgb(242, 245, 238)");
  // `img { max-width: 50%; border }`: el PNJ no se encoge ni lleva su borde
  expect(await style(first.locator(".npc"), "borderTopWidth")).toBe("0px");
  expect(await style(first.locator(".npc"), "maxWidth")).not.toBe("50%");
  // Y la página sigue como estaba
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  expect(await style(page.locator("#below p"), "fontFamily")).toBe("serif");
  expect(await style(page.locator("#below p"), "color")).toBe("rgb(204, 0, 0)");
});

test("en escritorio va de borde a borde, con su alto natural, y la página sigue debajo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openInicio(page);
  const box = await inicio(page).boundingBox();
  expect(Math.abs(box.x)).toBeLessThan(1);
  expect(Math.abs(box.width - 1440)).toBeLessThan(1);
  // No se ajusta a la ventana: mide lo que mide su contenido y el texto de Torrente va justo después
  expect(box.height).toBeGreaterThan(900);
  // (tras el margen de 40px que la página pone a sus párrafos)
  const below = await page.locator("#below p").boundingBox();
  expect(Math.abs(below.y - 40 - (box.y + box.height))).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Las tres grandes en una fila, y las tres medianas en otra debajo
  const bigs = await big(page).evaluateAll(list => list.map(c => c.getBoundingClientRect().toJSON()));
  const mids = await mid(page).evaluateAll(list => list.map(c => c.getBoundingClientRect().toJSON()));
  for (const b of [...bigs, ...mids]) expect(b.width).toBeGreaterThan(250);
  for (const row of [bigs, mids]) for (const b of row) expect(Math.abs(b.y - row[0].y)).toBeLessThan(1);
  expect(mids[0].y).toBeGreaterThan(bigs[0].bottom);
  // Las grandes, 4/5; las medianas, 16/8
  expect(Math.abs(bigs[0].width / bigs[0].height - 4 / 5)).toBeLessThan(.02);
  expect(Math.abs(mids[0].width / mids[0].height - 2)).toBeLessThan(.03);
});

test("en móvil (≤600px de ancho) todo va en una columna y lo que viene, de dos en dos", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openInicio(page);
  const host = await inicio(page).boundingBox();
  expect(Math.abs(host.width - 390)).toBeLessThan(1);
  const cards = await inicio(page).locator(".card").evaluateAll(list => list.map(c => c.getBoundingClientRect().toJSON()));
  expect(cards).toHaveLength(6);
  for (const [i, b] of cards.entries()) {
    expect(Math.abs(b.x - cards[0].x)).toBeLessThan(1);
    expect(b.x).toBeGreaterThanOrEqual(host.x);
    expect(b.right).toBeLessThanOrEqual(host.x + host.width);
    expect(b.width).toBeGreaterThan(300);
    if (i) expect(b.y).toBeGreaterThan(cards[i - 1].bottom - 1);
  }
  // Las grandes, apaisadas (5/4)
  expect(Math.abs(cards[0].width / cards[0].height - 5 / 4)).toBeLessThan(.02);
  const chips = await soon(page).evaluateAll(list => list.map(c => c.getBoundingClientRect().toJSON()));
  expect(Math.abs(chips[1].y - chips[0].y)).toBeLessThan(1);
  expect(chips[1].x).toBeGreaterThan(chips[0].right - 1);
  expect(chips[2].y).toBeGreaterThan(chips[0].bottom - 1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // El texto cabe en su carta
  for (const [i, b] of cards.entries()) {
    const lead = await inicio(page).locator(".card").nth(i).locator(".lead").boundingBox();
    expect(lead.y + lead.height).toBeLessThanOrEqual(b.y + b.height);
  }
});
