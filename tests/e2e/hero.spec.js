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
  // Sin siguiente paso ni nada que reunir: el sitio lo ocupa la colección del camino
  await expect(page.locator("#heroNext")).toHaveCount(0);
  await expect(page.locator(".hero-reqs")).toHaveCount(0);
  const road = page.locator(".road.big");
  await expect(road.locator(".road-title")).toHaveText("Por el camino conseguiste");
  await expect(road.locator(".road-dofus.obtained")).toHaveCount(7);
  await page.click("#roadGo");
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
  await expect(page.locator("#prereqsCount")).toHaveText("18/18 completados");
  await expect(page.locator(".prereq-item:not(.done)")).toHaveCount(0);
  await expect(page.locator(".shop-item:not(.owned)")).toHaveCount(0);
  // El diálogo de reinicio cuenta lo mismo que se ve en la página
  await page.click("#resetBtn");
  await expect(page.locator("#rdNPre")).toHaveText("18");
});

test("el brillo del Dofus obtenido no deja un borde cuadrado en oscuro", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await page.emulateMedia({ reducedMotion: "reduce" }); // el huevo quieto, para medir
  await openApp(page, { "silvestre:done": all });
  await expect.poll(() => page.locator(".egg-on").evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  // Mayor salto de luminancia entre dos columnas vecinas al cruzar el borde izquierdo de
  // la imagen. Un brillo recortado deja un escalón de golpe; uno entero se apaga poco a poco.
  const edgeJump = async () => {
    const box = await page.locator(".egg-body").boundingBox();
    const png = await page.screenshot({ clip: { x: box.x - 6, y: box.y + box.height / 2 - 1, width: 12, height: 2 } });
    return page.evaluate(async b64 => {
      const img = new Image();
      img.src = "data:image/png;base64," + b64;
      await img.decode();
      const ctx = new OffscreenCanvas(img.width, img.height).getContext("2d");
      ctx.drawImage(img, 0, 0);
      const cols = [];
      for (let x = 0; x < img.width; x++) {
        const d = ctx.getImageData(x, 0, 1, img.height).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        cols.push(sum / (d.length / 4));
      }
      return Math.max(...cols.slice(1).map((v, i) => Math.abs(v - cols[i])));
    }, png.toString("base64"));
  };
  await page.waitForTimeout(400); // el brillo entra con una transición
  expect(await edgeJump()).toBeLessThan(8);
});

test("los Dofus del camino se van consiguiendo al completar su logro", async ({ page }) => {
  // Esmeralda (paso 18) y Púrpura (21); el 17 solo lleva "Verde esmeralda" hasta la misión 7
  await openApp(page, { "silvestre:done": { 17: true, 18: true, 21: true } });
  const road = page.locator(".road");
  await expect(road).not.toHaveClass(/\bbig\b/);
  await expect(road.locator(".road-count")).toHaveText("2/7");
  const dofus = road.locator(".road-dofus");
  await expect(dofus).toHaveCount(7);
  await expect(dofus.nth(0)).toHaveClass(/\bobtained\b/);
  await expect(dofus.nth(1)).toHaveClass(/\bobtained\b/);
  await expect(dofus.nth(2)).not.toHaveClass(/\bobtained\b/);
  // Uno pendiente dice en qué paso se consigue
  await expect(dofus.nth(2)).toHaveAttribute("title", "Dofus Turquesa · paso 62");
  await expect(dofus.nth(2).locator(".road-step")).toHaveText("62");
  // Mientras falta, siguen el siguiente paso y lo que necesitas
  await expect(page.locator("#heroNext")).toBeVisible();
  await expect(page.locator(".hero-reqs")).toBeVisible();
});
