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

test("el anillo marca el progreso y el Dofus sigue apagado hasta el final", async ({ page }) => {
  await openApp(page, SEED);
  const pct = parseFloat(await page.locator("#heroPct").innerText());
  expect(pct).toBeGreaterThan(0);
  const p = await page.locator(".hero-egg").evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue("--p")));
  expect(p).toBeCloseTo(pct, 1);
  await expect(page.locator(".hero-egg")).not.toHaveClass(/obtained/);
  await expect(page.locator(".egg-pct small")).toContainText("Obtención");
  // El huevo no se va encendiendo: el Silvestre, apagado
  await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "off");
  await expect(page.locator(".egg-body .egg-on")).toHaveCount(0);
  await expect(page.locator(".egg-body .egg-off")).toHaveAttribute("src", /items\/23036\.png$/);
});

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));

test("con el paso 99 hecho, en el anillo está la Piñata de pino", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(99) });
  await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "pinata");
  await expect(page.locator(".egg-body .egg-on")).toHaveAttribute("src", /items\/23035\.png$/);
  await expect(page.locator(".egg-body .egg-off")).toHaveCount(0);
});

test("al marcar el 99 se sube al hero y el Silvestre apagado se convierte en la Piñata de pino", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(98) });
  const egg = page.locator(".hero-egg");
  await expect(egg).toHaveAttribute("data-stage", "off");
  await page.locator('.diary-row[data-n="99"] .row-check').click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(80);
  await expect(egg).toHaveClass(/morphing/);
  // Lo que se transforma es el Silvestre apagado
  await expect(page.locator(".egg-body .egg-from")).toHaveAttribute("src", /items\/23036\.png$/);
  await expect(page.locator(".egg-body .egg-from")).toHaveClass(/is-off/);
  await expect(egg).not.toHaveClass(/morphing/, { timeout: 6_000 });
  await expect(egg).toHaveAttribute("data-stage", "pinata");
  await expect(page.locator(".egg-body .egg-on")).toHaveAttribute("src", /items\/23035\.png$/);
  await expect(page.locator(".egg-body .egg-from")).toHaveCount(0);
});

test("al marcar el 100 se sube al hero y la Piñata de pino se convierte en el Dofus Silvestre", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(99) });
  const egg = page.locator(".hero-egg");
  await page.locator('.diary-row[data-n="100"] .row-check').click();
  // Sube hasta el hero y se ve la transformación
  await expect.poll(() => page.evaluate(() => scrollY)).toBeLessThan(80);
  await expect(egg).toHaveClass(/morphing/);
  await expect(page.locator(".egg-body .egg-from")).toHaveAttribute("src", /items\/23035\.png$/);
  // Al terminar, el Silvestre encendido
  await expect(egg).not.toHaveClass(/morphing/, { timeout: 6_000 });
  await expect(egg).toHaveAttribute("data-stage", "silvestre");
  await expect(page.locator(".egg-body .egg-on")).toHaveAttribute("src", /items\/23036\.png$/);
  await expect(page.locator(".egg-body .egg-from")).toHaveCount(0);
  // Al recargar ya está encendido, sin repetir la animación
  await page.reload();
  await expect(egg).toHaveAttribute("data-stage", "silvestre");
  await expect(egg).not.toHaveClass(/morphing/);
});

test("con movimiento reducido el Dofus cambia sin animación", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, { "silvestre:done": upTo(99) });
  await page.locator('.diary-row[data-n="100"] .row-check').click();
  await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
  await expect(page.locator(".hero-egg")).not.toHaveClass(/morphing/);
});

test("al completar los 100 pasos se obtiene el Dofus", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  await expect(page.locator("#heroPct")).toHaveText("100%");
  await expect(page.locator(".hero-egg")).toHaveClass(/obtained/);
  await expect(page.locator(".egg-pct small")).toContainText("¡Obtenido!");
  // Sin siguiente paso ni nada que reunir: el hero se queda con el título y el huevo.
  // Los Dofus del camino viven en la ventana de los pasos, todos conseguidos
  await expect(page.locator("#heroNext")).toHaveCount(0);
  await expect(page.locator(".hero-reqs")).toHaveCount(0);
  await expect(page.locator(".hero .road-dofus")).toHaveCount(0);
  await expect(page.locator("#winRoad .road-dofus.obtained")).toHaveCount(12);
  await expect(page.locator("#winRoad .road-count")).toHaveText("12/12");
  await expect(page.locator("#diaryNext")).toBeDisabled();
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
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needs")).toBeInViewport();
});

test("la tarjeta de siguiente paso lleva a su detalle", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator("#heroNext")).toContainText("Paso 4");
  await expect(page.locator("#heroNext img")).toHaveCount(0); // el paso 4 no tiene arte: usa su número
  await page.click("#heroNextGo");
  await expect(page.locator('.diary-row[data-n="4"]')).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
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
  await expect(page.locator("#tabItems")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#needs")).toBeInViewport();
});

test("con el Dofus obtenido, prerrequisitos y objetos cuentan como completos", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  // Sin haber marcado nada a mano: terminar la guía implica tenerlo todo
  await page.click("#needsShowSummary");
  await page.click("#needsShowLists");
  await expect(page.locator("#prereqsCount")).toHaveText("21/21");
  await expect(page.locator(".pr-card:not(.done)")).toHaveCount(0);
  await page.click("#tabItems");
  await expect(page.locator("#items .slot:not(.owned)")).toHaveCount(0);
  // El diálogo de reinicio cuenta lo mismo que se ve en la página
  await page.click("#resetBtn");
  await expect(page.locator("#rdNPre")).toHaveText("21");
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
