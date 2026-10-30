import { test, expect } from "@playwright/test";

// La home de «Dofus Tools» (src/site/): la cabecera del sitio y una carta por herramienta.
// Se construye con SITE=1 y se sirve como en GitHub Pages (playwright.site.config.js)
const TOOLS = [
  { id: "silvestre", name: "Dofus Silvestre", path: "silvestre/" },
  { id: "hielos", name: "Dofus de los Hielos", path: "hielos/" },
  { id: "cosecha", name: "La eterna cosecha", path: "cosecha/" },
  { id: "global", name: "Guía global", path: "global/" },
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
  // Va arriba del todo, una franja de 84px, y no se pega al hacer scroll
  const box = await shell.boundingBox();
  expect(box.y).toBe(0);
  expect(Math.round(box.height)).toBe(84);
  expect(await shell.evaluate(el => getComputedStyle(el).position)).not.toMatch(/sticky|fixed/);
  // Detrás, la zona de la página (en la home, el Krosmoz), oscurecida hacia los dos lados
  const art = shell.locator("img.dt-art");
  await expect(art).toHaveAttribute("src", /\/img\/zones\/krosmoz\.jpg$/);
  await expect(art).toHaveAttribute("alt", "");
  expect(await shell.evaluate(el => getComputedStyle(el, "::before").backgroundImage)).toMatch(/^linear-gradient\(90deg/);
  // La regla dorada de abajo, fundida en los dos extremos
  expect(await shell.evaluate(el => getComputedStyle(el, "::after").backgroundImage)).toMatch(/rgba\(0, 0, 0, 0\).*rgba\(216, 178, 90, 0\.75\).*rgba\(0, 0, 0, 0\)/);

  // La marca, con su línea dorada encima; el nombre accesible es solo la marca
  const brand = shell.getByRole("link", { name: "Dofus Tools", exact: true });
  await expect(brand.locator(".dt-ey")).toHaveText("Checklists y herramientas");
  expect(await brand.locator(".dt-ey").evaluate(el => getComputedStyle(el).color)).toBe("rgb(216, 178, 90)");
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
    // La cabecera: una fila de 84px en ancho; en estrecho, la marca y el interruptor arriba y
    // el menú debajo, a todo el ancho. Sus enlaces y el interruptor caben
    const shell = page.locator("header.dt-shell");
    const h = (await shell.boundingBox()).height;
    if (width > 600) expect(Math.round(h)).toBe(84);
    else expect(h).toBeLessThanOrEqual(120);
    for (const link of [...await shell.getByRole("link").all(), shell.getByRole("switch")]) {
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

test("en estrecho el menú va en su propia fila, de lado a lado, con solo el final de cada nombre", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const shell = page.locator("header.dt-shell");
  const brand = await shell.getByRole("link", { name: "Dofus Tools", exact: true }).boundingBox();
  const sw = await shell.getByRole("switch").boundingBox();
  const links = shell.getByRole("navigation").getByRole("link");
  expect(await links.evaluateAll(l => l.map(a => a.innerText.trim()))).toEqual(["SILVESTRE", "HIELOS", "COSECHA", "GLOBAL"]);
  const boxes = await links.evaluateAll(l => l.map(a => a.getBoundingClientRect().toJSON()));
  // La marca y el interruptor en la primera fila; el menú debajo
  expect(Math.abs(sw.y + sw.height / 2 - (brand.y + brand.height / 2))).toBeLessThan(12);
  for (const b of boxes) expect(b.y).toBeGreaterThanOrEqual(brand.y + brand.height);
  // Repartido: el primero al borde izquierdo de la marca y el último al derecho del interruptor
  expect(Math.abs(boxes[0].x - brand.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(boxes.at(-1).right - (sw.x + sw.width))).toBeLessThanOrEqual(1);
});

test("la cabecera se queda oscura en el tema claro", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dofus-tools:theme", "light"));
  await page.goto("./");
  const shell = page.locator("header.dt-shell");
  expect(await shell.evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(11, 12, 10)");
  expect(await shell.getByRole("link", { name: "Dofus Tools", exact: true }).locator(".dt-lbl").evaluate(el => getComputedStyle(el).color)).toBe("rgb(242, 245, 238)");
});

test("la home en el tema claro: pergamino, las cartas con su arte y la cabecera con el interruptor", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("dofus-tools:theme", "light"));
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(244, 236, 220)");
  expect(await page.locator(".hero h1").evaluate(el => getComputedStyle(el).color)).toBe("rgb(42, 33, 20)");
  const sw = page.locator(".dt-shell").getByRole("switch");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(sw).toHaveAccessibleName("Modo claro · Dofus Marfil");
  // Las cartas no cambian: su nombre sigue sobre oscuro
  expect(await page.locator(".home a.card .name").first().evaluate(el => getComputedStyle(el).color)).toBe("rgb(183, 220, 105)");
});

test("sin tema del sitio se trae el del Hielos si el del Silvestre no está, una sola vez", async ({ page }) => {
  await page.addInitScript(() => { if (!sessionStorage.getItem("seeded")) { sessionStorage.setItem("seeded", "1"); localStorage.setItem("hielos:theme", "light"); } });
  await page.goto("./");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("light");
  // Elegido aquí, manda aunque el del Hielos diga otra cosa
  await page.locator(".dt-shell").getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark", { timeout: 3_000 });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("hielos:theme"))).toBe("light");
});
