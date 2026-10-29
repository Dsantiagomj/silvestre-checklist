import { test, expect } from "@playwright/test";

// La home de «Dofus Tools» (src/site/): la cabecera del sitio y una carta por herramienta.
// Se construye con SITE=1 y se sirve como en GitHub Pages (playwright.site.config.js)
const TOOLS = [
  { id: "silvestre", name: "Dofus Silvestre", path: "silvestre/" },
  { id: "hielos", name: "Dofus de los Hielos", path: "hielos/" },
  { id: "cosecha", name: "La eterna cosecha", path: "cosecha/" },
];

/** Los fallos de la página: errores de JS, de consola y respuestas de 400 o más del sitio. */
function watchErrors(page, baseURL) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("response", r => { if (r.url().startsWith(baseURL) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

test("la home: el título, una línea y una carta por herramienta, cada una con su enlace", async ({ page, baseURL }) => {
  await page.goto("./");
  await expect(page).toHaveTitle(/Dofus Tools/);
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toBeTruthy();
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /favicon/);
  expect(await page.locator("html").getAttribute("lang")).toBe("es");

  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText("Dofus Tools");
  await expect(page.locator(".home .lead").first()).not.toBeEmpty();

  const cards = page.locator(".home a.card");
  await expect(cards).toHaveCount(TOOLS.length);
  for (const [i, t] of TOOLS.entries()) {
    const card = cards.nth(i);
    await expect(card).toHaveAttribute("data-id", t.id);
    await expect(card).toHaveAccessibleName(t.name);
    expect(await card.evaluate(a => a.href)).toBe(new URL(t.path, baseURL).href);
    // La carta entera es el enlace: dentro no hay nada más que se pueda pulsar
    await expect(card.locator("a, button, input")).toHaveCount(0);
  }
});

test("la cabecera del sitio: la marca lleva a la home y el menú a cada herramienta", async ({ page, baseURL }) => {
  await page.goto("./");
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  // Va arriba del todo, delgada y sin pegarse al hacer scroll
  const box = await shell.boundingBox();
  expect(box.y).toBe(0);
  expect(box.height).toBeGreaterThanOrEqual(48);
  expect(box.height).toBeLessThanOrEqual(60);
  expect(await shell.evaluate(el => getComputedStyle(el).position)).not.toMatch(/sticky|fixed/);

  const brand = shell.getByRole("link", { name: "Dofus Tools" });
  expect(await brand.evaluate(a => a.href)).toBe(new URL("./", baseURL).href);
  // En la home, la marca es la página actual y ninguna herramienta lo es
  await expect(brand).toHaveAttribute("aria-current", "page");

  const nav = shell.getByRole("navigation");
  const links = nav.getByRole("link");
  await expect(links).toHaveCount(TOOLS.length);
  for (const [i, t] of TOOLS.entries()) {
    await expect(links.nth(i)).toHaveAccessibleName(t.name);
    expect(await links.nth(i).evaluate(a => a.href)).toBe(new URL(t.path, baseURL).href);
    await expect(links.nth(i)).not.toHaveAttribute("aria-current");
  }
});

test("los enlaces viejos al Silvestre (con ?… o #…) van a silvestre/ con lo mismo", async ({ page, baseURL }) => {
  await page.goto("./?x=1#y");
  await page.waitForURL(new URL("silvestre/?x=1#y", baseURL).href);
  await page.goto("./#paso-12");
  await page.waitForURL(new URL("silvestre/#paso-12", baseURL).href);
  // Sin nada detrás, la home se queda
  await page.goto("./");
  await expect(page.locator("h1")).toHaveText("Dofus Tools");
  expect(page.url()).toBe(new URL("./", baseURL).href);
});

for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
  test(`a ${width}px nada se sale de lado, todo carga y no hay errores`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height });
    const errors = watchErrors(page, baseURL);
    await page.goto("./", { waitUntil: "load" });
    await expect(page.locator(".home a.card")).toHaveCount(TOOLS.length);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    // La cabecera cabe en una fila y sus enlaces caben en ella
    const shell = page.locator("header.dt-shell");
    expect((await shell.boundingBox()).height).toBeLessThanOrEqual(60);
    for (const link of await shell.getByRole("link").all()) {
      const b = await link.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
    // Las tres cartas, enteras dentro de la pantalla a lo ancho
    for (const card of await page.locator(".home a.card").all()) {
      const b = await card.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
    const imgs = page.locator("img");
    expect(await imgs.count()).toBeGreaterThan(0);
    for (const img of await imgs.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate(i => i.complete && i.naturalWidth), { message: await img.getAttribute("src") }).toBeGreaterThan(0);
    }
    expect(errors).toEqual([]);
  });
}
