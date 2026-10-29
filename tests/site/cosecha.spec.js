import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// «La eterna cosecha» como página del sitio (src/site/cosecha/): la cabecera del sitio y,
// debajo, el mismo checklist que el embebido, montado desde src/tools/cosecha/. Guarda en
// la misma clave que la vista previa que había antes en esta dirección (cosecha:done)
const KEY = "cosecha:done";
const SITE_OUT = path.resolve(import.meta.dirname, "../../.site-test");
const tool = page => page.locator("#cosecha");
const cromo = (page, name) => tool(page).locator(".cromo", { has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) });
const readLS = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k) || "null"), key);

/** Los fallos de la página: errores de JS, de consola y respuestas de 400 o más del sitio. */
function watchErrors(page, baseURL) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  page.on("response", r => { if (r.url().startsWith(baseURL) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
  return errors;
}

/** Abre la página con claves ya guardadas (solo las que falten: una recarga no las pisa). */
async function open(page, seed = {}) {
  await page.addInitScript(s => {
    for (const [k, v] of Object.entries(s)) if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v));
  }, seed);
  await page.goto("./cosecha/");
  await expect(tool(page).locator(".cromo")).not.toHaveCount(0, { timeout: 20_000 });
}

test("la página sale del build del sitio, con cosecha.json publicado al lado", () => {
  const html = fs.readFileSync(path.join(SITE_OUT, "cosecha/index.html"), "utf8");
  // Ya no es la vista previa que cargaba el embebido publicado
  expect(html).not.toContain("embed/cosecha.js");
  expect(html).not.toContain("noindex");
  expect(fs.existsSync(path.join(SITE_OUT, "cosecha/cosecha.json"))).toBe(true);
});

test("el checklist va bajo la cabecera del sitio, con «La eterna cosecha» como página actual", async ({ page, baseURL }) => {
  const errors = watchErrors(page, baseURL);
  await open(page);
  await expect(page).toHaveTitle(/La eterna cosecha/);
  expect(await page.locator('meta[name="description"]').getAttribute("content")).toMatch(/cosecha/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  expect(await page.locator("html").getAttribute("lang")).toBe("es");
  await expect(page.locator('link[rel="icon"]').first()).toHaveAttribute("href", /favicon/);

  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  const current = shell.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveAccessibleName("La eterna cosecha");
  expect(await current.evaluate(a => a.href)).toBe(new URL("cosecha/", baseURL).href);

  // El checklist en su shadow root, justo debajo de la cabecera y de borde a borde
  expect(await tool(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  const top = await shell.boundingBox();
  const box = await tool(page).boundingBox();
  expect(Math.round(box.y)).toBe(Math.round(top.y + top.height));
  expect(Math.abs(box.width - page.viewportSize().width)).toBeLessThan(1);
  // Un solo título en la página, el del checklist, y es el h1
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("La eterna cosecha");
  await expect(tool(page).locator(".bar.t em")).toHaveText("0/337");
  expect(errors).toEqual([]);
});

test("lo marcado se guarda en cosecha:done y sigue tras recargar", async ({ page }) => {
  await open(page);
  await cromo(page, "Jalató Real").click();
  await expect(cromo(page, "Jalató Real")).toHaveAttribute("aria-pressed", "true");
  expect(await readLS(page, KEY)).toEqual([147]);
  await page.reload();
  await expect(cromo(page, "Jalató Real")).toHaveAttribute("aria-pressed", "true");
  await expect(tool(page).locator(".bar.t em")).toHaveText("1/337");
});

test("lo marcado en la vista previa que había en esta dirección sigue marcado", async ({ page }) => {
  // Mismo dominio y misma clave que la página de antes
  await open(page, { [KEY]: [928, 147] });
  await expect(tool(page).locator(".bar.t em")).toHaveText("2/337");
  await expect(cromo(page, "Mob Lasponja")).toHaveAttribute("aria-pressed", "true");
  await expect(cromo(page, "Jalató Real")).toHaveClass(/\bdone\b/);
});

test("el carril se pega arriba al bajar: la cabecera del sitio no se pega y no lo tapa", async ({ page }) => {
  await open(page);
  // Por región, la primera tiene almas de sobra para bajar con el carril pegado
  await tool(page).getByRole("button", { name: "Por región" }).click();
  await page.evaluate(() => window.scrollBy(0, 2500));
  await expect.poll(async () => Math.round((await tool(page).locator(".rail").boundingBox()).y)).toBe(12);
});

for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
  test(`a ${width}px nada se sale de lado y no hay errores`, async ({ page, baseURL }) => {
    await page.setViewportSize({ width, height });
    const errors = watchErrors(page, baseURL);
    await open(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const link of await page.locator("header.dt-shell").getByRole("link").all()) {
      const b = await link.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(width);
    }
    expect(errors).toEqual([]);
  });
}

test("la cabecera del sitio va al ancho de la cosecha: la marca y el huevo empiezan en la misma línea", async ({ page }) => {
  for (const width of [1440, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page);
    const brand = await page.locator(".dt-shell .dt-in").boundingBox();
    const hd = await tool(page).locator(".hd").boundingBox();
    expect(Math.abs(brand.x - hd.x), `a ${width}px`).toBeLessThanOrEqual(1);
    expect(Math.abs(brand.width - hd.width), `a ${width}px`).toBeLessThanOrEqual(1);
  }
});

test("en su página el checklist no lleva interruptor de tema propio ni lee cosecha:theme", async ({ page }) => {
  await open(page, { "cosecha:theme": "light" });
  await expect(tool(page).getByRole("switch")).toHaveCount(0);
  await expect(tool(page).locator(".cosecha")).toHaveAttribute("data-theme", "dark");
});

test("el checklist sigue el tema del sitio, también al cambiarlo en la cabecera", async ({ page }) => {
  await page.addInitScript(() => { if (localStorage.getItem("dofus-tools:theme") == null) localStorage.setItem("dofus-tools:theme", "light"); });
  await open(page);
  const widget = tool(page).locator(".cosecha");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(widget).toHaveAttribute("data-theme", "light");
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(244, 236, 220)");
  await page.locator(".dt-shell").getByRole("switch").click();
  await expect(widget).toHaveAttribute("data-theme", "dark", { timeout: 3_000 });
  expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("dark");
  // Su clave del embebido no se toca
  expect(await page.evaluate(() => localStorage.getItem("cosecha:theme"))).toBeNull();
});
