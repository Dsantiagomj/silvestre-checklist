import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const heroBg = page => page.locator(".hero").evaluate(el => getComputedStyle(el).getPropertyValue("--hero-bg"));

test("el fondo del hero es un mapa distinto en cada tema", async ({ page }) => {
  await openApp(page);
  // Oscuro: Refugio Silvestre. Claro: Mazmorra de los Escarahojas, un bosque de día.
  await expect.poll(() => heroBg(page)).toContain("223350028");
  await page.click("#themeBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  await expect.poll(() => heroBg(page)).toContain("88080387");
  // Los dos mapas existen y cargan
  for (const id of ["223350028", "88080387"]) {
    const res = await page.request.get(`img/maps/1/${id}.jpg`);
    expect(res.ok()).toBe(true);
  }
});

const SEED = {
  "silvestre:done": { 1: true, 2: true, 3: true },
  "silvestre:prereqs": { l1: true },
  // Pepita y Reflejo onírico; el paso 1 además es el único que pide otros dos objetos
  "silvestre:owned": { 14635: true, 32079: true },
};

test("el hero ocupa todo el ancho y casi toda la pantalla", async ({ page }) => {
  await openApp(page);
  const box = await page.locator(".hero").boundingBox();
  expect(box.width).toBe(1440);
  expect(box.height).toBeGreaterThanOrEqual(900 * 0.72);
});

test("el Dofus se llena de color con el progreso", async ({ page }) => {
  await openApp(page, SEED);
  const pct = parseFloat(await page.locator("#heroPct").innerText());
  expect(pct).toBeGreaterThan(0);
  const p = await page.locator(".hero-egg").evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue("--p")));
  expect(p).toBeCloseTo(pct, 1);
  await expect(page.locator(".hero-egg")).not.toHaveClass(/obtained/);
  await expect(page.locator(".egg-pct small")).toContainText("Obtención");
});

test("al completar los 100 pasos se obtiene el Dofus", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  await expect(page.locator("#heroPct")).toHaveText("100%");
  await expect(page.locator(".hero-egg")).toHaveClass(/obtained/);
  await expect(page.locator(".egg-pct small")).toContainText("¡Obtenido!");
  // La tarjeta del siguiente paso se vuelve un trofeo con el propio Dofus
  const card = page.locator("#heroNext");
  await expect(card).toHaveClass(/\bdone\b/);
  await expect(card.locator(".hero-next-name")).toHaveText("¡El Dofus Silvestre es tuyo!");
  await expect(card).toContainText("100 pasos");
  await expect(card.locator(".hero-next-art img")).toHaveAttribute("src", /items\/23036\.png$/);
  await page.click("#heroNextGo");
  await expect(page.locator("#grid")).toBeInViewport();
});

test("los contadores muestran pasos, prerrequisitos y objetos", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator("#statDone")).toHaveText("3");
  await expect(page.locator("#statPre")).toHaveText("1");
  await expect(page.locator("#statOwned")).toHaveText("4");
  // Pendiente no es un error: la tarjeta queda neutra (sin rojo) y abre su sección
  await expect(page.locator("#heroWarn")).not.toHaveClass(/\b(warn|complete)\b/);
  expect(await page.locator("#heroWarn .hero-req-name").evaluate(el => getComputedStyle(el).color))
    .toBe(await page.locator("#heroItems .hero-req-name").evaluate(el => getComputedStyle(el).color));
  await page.click("#heroWarn");
  await expect(page.locator("#prereqs")).toHaveClass(/open/);
  await expect(page.locator("#prereqs")).toBeInViewport();
});

test("la tarjeta de siguiente paso lleva a su detalle", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator("#heroNext")).toContainText("Paso 4");
  await expect(page.locator("#heroNext img")).toHaveCount(0); // el paso 4 no tiene arte: usa su número
  await page.click("#heroNextGo");
  await expect(page.locator('.cell[data-n="4"]')).toHaveClass(/selected/);
  await expect(page.locator("#detailContent")).toContainText("Paso 4");
});

test("el parallax y el ambiente respetan el movimiento reducido", async ({ browser }) => {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    const ctx = await browser.newContext({ reducedMotion, viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await openApp(page);
    await expect.poll(() => page.locator(".hero-fx > *").count()).toBeGreaterThanOrEqual(8);
    await expect(page.locator(".hero-fx")).toHaveAttribute("aria-hidden", "true");
    await page.evaluate(() => window.scrollTo(0, 300));
    const bg = page.locator(".hero-bg");
    if (reducedMotion === "reduce") {
      await expect.poll(() => bg.evaluate(el => getComputedStyle(el).transform)).toBe("none");
      await expect(page.locator(".hero-fx")).toBeHidden();
    } else {
      // El mapa baja más despacio que la página: se traslada hacia abajo al hacer scroll
      await expect.poll(() => bg.evaluate(el => new DOMMatrix(getComputedStyle(el).transform).m42)).toBeGreaterThan(50);
    }
    await ctx.close();
  }
});

test("la descripción explica la página y el ponderado es una nota del porcentaje", async ({ page }) => {
  await openApp(page);
  const sub = page.locator(".hero-sub");
  await expect(sub).toHaveText("Los 100 pasos para obtener el Dofus Silvestre en el orden más eficiente, con las misiones, jefes de mazmorra y objetos que vas a necesitar.");
  // El eyebrow da crédito a Sandglass; los "100 pasos" ya los dicen título y descripción
  await expect(page.locator(".hero-eyebrow")).toHaveText("Guía de Sandglass");
  await expect(sub).not.toContainText("ponderado");
  // La nota se asocia al porcentaje y aparece al pasar el ratón o con el foco
  const info = page.locator("#pctInfo");
  await expect(info).toHaveAttribute("aria-describedby", "pctNote");
  await expect(page.locator("#pctNote")).toBeHidden();
  await info.hover();
  await expect(page.locator("#pctNote")).toBeVisible();
  await expect(page.locator("#pctNote")).toContainText("esfuerzo");
});

test("los pasos van con el progreso y los requisitos van aparte", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator(".hero-visual #statDone")).toHaveText("3");
  const reqs = page.locator(".hero-reqs");
  await expect(reqs).toContainText("Lo que necesitas");
  await expect(reqs.locator("#statPre")).toHaveText("1");
  await expect(reqs.locator("#statOwned")).toHaveText("4");
});

test("objetos necesarios lleva a su sección", async ({ page }) => {
  await openApp(page);
  await page.click("#heroItems");
  await expect(page.locator("#shop")).toBeInViewport();
});

test("con el Dofus obtenido, prerrequisitos y objetos cuentan como completos", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  // Sin haber marcado nada a mano: terminar la guía implica tenerlo todo
  const [pre, preTotal] = (await page.locator("#heroWarn .hero-req-count").textContent()).split("/");
  expect(pre).toBe(preTotal);
  const [own, ownTotal] = (await page.locator("#heroItems .hero-req-count").textContent()).split("/");
  expect(own).toBe(ownTotal);
  await expect(page.locator("#heroWarn")).toHaveClass(/\bcomplete\b/);
  await expect(page.locator("#heroItems")).toHaveClass(/\bcomplete\b/);
  await expect(page.locator(".prereq-item:not(.done)")).toHaveCount(0);
  await expect(page.locator(".shop-item:not(.owned)")).toHaveCount(0);
  // El diálogo de reinicio cuenta lo que hay guardado, no lo deducido
  await page.click("#resetBtn");
  await expect(page.locator("#rdNPre")).toHaveText("0");
});
