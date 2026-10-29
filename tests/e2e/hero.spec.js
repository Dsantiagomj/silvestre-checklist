import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, siteHeaderBottom } from "./helpers.js";

/**
 * En pantallas altas (900 px de alto o más, en escritorio) el hero vuelve encima de la
 * ventana de los pasos: el siguiente paso en grande sobre su mapa y el anillo de
 * obtención. La suite va a 1440×900; en pantallas bajas no hay hero (ver el final).
 */

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));

const FIGURES = JSON.parse(readFileSync(new URL("../../src/dofus/silvestre/figures.json", import.meta.url), "utf8"));
const heroBg = page => page.locator(".hero-bg-img").last().evaluate(el => el.style.backgroundImage);

test("el fondo del hero es el mapa del juego donde empieza el siguiente paso", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true, 3: true } });
  // El mapa grande (escala 1) de su primera misión; debajo, el paisaje de la zona
  await expect.poll(() => heroBg(page)).toContain(`maps/1/${FIGURES[4].m}.jpg`);
  // Al marcar el paso, el fondo pasa al mapa del siguiente
  await page.locator('.diary-row[data-n="4"] .row-check').click();
  await expect.poll(() => heroBg(page)).toContain(`maps/1/${FIGURES[5].m}.jpg`);
  await expect(page.locator(".hero-bg-img")).toHaveCount(1);
});

test("con la guía terminada el fondo es un mapa distinto en cada tema", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(100) });
  // Oscuro: Refugio Silvestre. Claro: Mazmorra de los Escarahojas, un bosque de día.
  await expect.poll(() => heroBg(page)).toContain("223350028");
  const dark = await heroBg(page);
  await page.locator(".dt-shell").getByRole("switch").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  await expect.poll(() => heroBg(page)).toContain("88080387");
  const light = await heroBg(page);
  // Los dos mapas existen y cargan, de la dirección que usa la app (las imágenes van en la
  // raíz del sitio, no debajo de la app)
  for (const [bg, id] of [[dark, "223350028"], [light, "88080387"]]) {
    const url = bg.match(new RegExp(`url\\("?([^")]*maps/1/${id}\\.jpg)"?\\)`))[1];
    const res = await page.request.get(url);
    expect(res.ok(), url).toBe(true);
  }
});

const SEED = {
  "silvestre:done": { 1: true, 2: true, 3: true },
  "silvestre:prereqs": { l1: true },
  // Pepita y Reflejo onírico; el paso 1 además es el único que pide otros dos objetos
  "silvestre:owned": { 14635: true, 32079: true },
};

test("el hero ocupa todo el ancho y deja asomar la ventana de los pasos", async ({ page }) => {
  await openApp(page);
  const box = await page.locator(".hero").boundingBox();
  expect(box.width).toBe(1440);
  // Como mucho el 70 % de la pantalla (y 620 px): sin bajar ya asoma la ventana
  expect(box.height).toBeLessThanOrEqual(Math.min(900 * 0.7, 620) + 1);
  expect(await page.locator(".steps-win").evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(900);
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
  await expect(page.locator(".hero .journal-banner")).toHaveCount(0);
  await expect(page.locator(".hero .road-dofus")).toHaveCount(0);
  // El título vuelve a ser el protagonista, grande, con la descripción de la página
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".hero h1.hero-title")).toHaveText("Checklist del Dofus Silvestre");
  expect(await page.locator(".hero h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(34);
  await expect(page.locator(".hero-sub")).toContainText("Los 100 pasos para obtener el Dofus Silvestre");
  await expect(page.locator("#winRoad .road-dofus.obtained")).toHaveCount(12);
  await expect(page.locator("#winRoad .road-count")).toHaveText("12/12");
  await expect(page.locator("#diaryNext")).toBeDisabled();
});

test("el hero no repite lo que hay que reunir: eso lo cuentan las pestañas de la ventana", async ({ page }) => {
  await openApp(page, SEED);
  await expect(page.locator(".hero-visual #statDone")).toHaveText("3");
  await expect(page.locator(".hero-reqs, #heroWarn, #heroItems, #statPre, #statOwned")).toHaveCount(0);
  await expect(page.locator("#prereqsCount")).toHaveText("19");
});

test("el hero es el siguiente paso: su estandarte, su título y lo que pide", async ({ page }) => {
  await openApp(page, SEED);
  const step = page.locator("#heroNext");
  // Una sola h1, pequeña: el título de la página es la antesala del paso
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator(".hero-eyebrow")).toContainText("Checklist del Dofus Silvestre");
  await expect(page.locator(".hero-eyebrow")).toContainText("siguiente paso");
  expect(await page.locator("h1").evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeLessThan(16);
  // El mismo estandarte que su detalle: número, zona y figura (el 4 lo empieza Maytesé Nyhil)
  await expect(step.locator(".journal-banner .journal-num")).toHaveText("4");
  await expect(step.locator(".journal-banner .banner-zone")).toHaveText("Krosmoz");
  await expect(step.locator(".journal-show img")).toHaveAttribute("src", /npcs\/npc-\d+\.png$/);
  await expect(step.locator(".journal-show-name")).toHaveText("Maytesé Nyhil");
  await expect(step.locator(".journal-show-label")).toHaveText("Inicia el paso");
  // Una línea con la zona y, cuando cargan, cuántas misiones tiene
  await expect(step.locator(".hero-step-meta")).toContainText("Krosmoz");
  await expect(step.locator(".hero-step-meta")).toContainText(/\d+ misi(ón|ones)/, { timeout: 15_000 });
  // Continuar lleva a su detalle, con el mismo título
  const title = await step.locator(".hero-step-title").innerText();
  await expect(page.locator("#heroNextGo")).toHaveText("Continuar con el paso 4 →");
  await page.click("#heroNextGo");
  await expect(page.locator('.diary-row[data-n="4"]')).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#journal .journal-num")).toHaveText("4");
  await expect(page.locator("#journal .journal-title")).toHaveText(title);
});

test("el hero dice los objetos que pide el paso y su aviso de la guía", async ({ page }) => {
  // El paso 1 pide objetos; ninguno marcado
  await openApp(page);
  const step = page.locator("#heroNext");
  await expect(step.locator(".journal-num")).toHaveText("1");
  await expect(step.locator(".hero-step-meta")).toContainText(/\d+ objetos? que reunir/);
  // El 22 tiene verde: lo que se resuelve, en una sola línea
  await openApp(page, { "silvestre:done": upTo(21) });
  const call = step.locator(".hero-call");
  await expect(call).toHaveCount(1);
  await expect(call).toHaveClass(/\b(stop|done)\b/);
  expect(await call.locator(".hero-call-text").evaluate(el => getComputedStyle(el).whiteSpace)).toBe("nowrap");
});

test("dónde parar va en un medallón con el jefe ante el que se para, sin caja ni tooltip", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(9) });
  const call = page.locator("#heroNext .hero-call.stop");
  await expect(call).toHaveCount(1);
  await expect(call.locator(".hero-call-med img")).toHaveAttribute("src", /monsters\/128\.png$/);
  await expect(call.locator(".hero-call-label")).toHaveText("Hasta dónde llegar");
  await expect(call.locator(".hero-call-text")).toHaveText("Hasta tener que pasar Maxilubo");
  await expect(call).not.toHaveAttribute("title");
  // Sin la caja de antes: ni fondo ni borde
  const box = await call.evaluate(el => {
    const cs = getComputedStyle(el);
    return { bg: cs.backgroundColor, border: cs.borderLeftWidth };
  });
  expect(box).toEqual({ bg: "rgba(0, 0, 0, 0)", border: "0px" });
});

test("si la parada no nombra un jefe, el medallón lleva el icono de la guía", async ({ page }) => {
  // El 5 para a la entrada de una mazmorra: no hay jefe que mostrar
  await openApp(page, { "silvestre:done": upTo(4) });
  const call = page.locator("#heroNext .hero-call.stop");
  await expect(call.locator(".hero-call-med img")).toHaveAttribute("src", /items\/84228\.png$/);
  await expect(call.locator(".hero-call-text")).toContainText("Laboratorio de Brumen Tinctorias");
});

test("al marcar un paso el hero pasa al siguiente con un fundido, pero no al cargar", async ({ page }) => {
  await openApp(page, SEED);
  const running = () => page.evaluate(() => [...document.querySelectorAll(".hero-step, .hero-bg-img")]
    .flatMap(el => el.getAnimations()).length);
  // Al cargar, el paso ya está en su sitio, sin fundido
  expect(await running()).toBe(0);
  // Marcar el 4: los dos pasos se cruzan un momento y queda el 5
  const during = await page.evaluate(() => new Promise(resolve => {
    document.querySelector('.diary-row[data-n="4"] .row-check').click();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(document.querySelectorAll(".hero-step").length)));
  }));
  expect(during).toBe(2);
  await expect(page.locator(".hero-step")).toHaveCount(1);
  await expect(page.locator("#heroNext .journal-num")).toHaveText("5");
  await expect(page.locator("#heroNextGo")).toHaveCount(1);
});

test("con movimiento reducido el hero cambia de paso sin fundido", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openApp(page, SEED);
  await page.locator('.diary-row[data-n="4"] .row-check').click();
  await expect(page.locator("#heroNext .journal-num")).toHaveText("5");
  await expect(page.locator(".hero-step")).toHaveCount(1);
  expect(await page.evaluate(() => [...document.querySelectorAll(".hero-step, .hero-bg-img")]
    .flatMap(el => el.getAnimations()).length)).toBe(0);
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

test("el ponderado es una nota del porcentaje", async ({ page }) => {
  await openApp(page);
  // La nota se asocia al porcentaje y aparece al pasar el ratón o con el foco
  // La del hero; la barra lleva la suya (#pctInfo)
  const info = page.locator("#heroPctInfo");
  await expect(info).toHaveAttribute("aria-describedby", "heroPctNote");
  await expect(page.locator("#heroPctNote")).toBeHidden();
  await info.hover();
  await expect(page.locator("#heroPctNote")).toBeVisible();
  await expect(page.locator("#heroPctNote")).toHaveText("No todos los pasos valen lo mismo: cuentan más los que tienen misiones de más nivel y más largas.");
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

for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  test(`a ${w}×${h} el hero va encima de la ventana y la barra lleva la franja de los Dofus y una fila de herramientas`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    const hero = await page.locator(".hero").boundingBox();
    const win = await page.locator(".steps-win").boundingBox();
    expect(hero.y).toBeLessThan(win.y);
    expect(hero.width).toBe(w);
    await expect(page.locator("#heroNextGo")).toBeVisible();
    // Sin cabecera de la app: el hero arranca arriba, justo bajo la del sitio
    await expect(page.locator("#root header, #root .title-bar")).toHaveCount(0);
    expect(hero.y).toBeLessThanOrEqual(await siteHeaderBottom(page) + 1);
    await expect(page.locator("#winBar > .win-strip .road-dofus")).toHaveCount(12);
    const tools = await page.locator("#winBar > .win-bar-in").boundingBox();
    expect(tools.height).toBeLessThanOrEqual(64);
    for (const sel of ['[role="tablist"]', "#searchInput", "#zoneBtn", "#overlayBtn", "#moreBtn"]) {
      const b = await page.locator(sel).first().boundingBox();
      expect(b.y + b.height, sel).toBeLessThanOrEqual(tools.y + tools.height + 0.5);
    }
  });
}

for (const [w, h] of [[1280, 720], [1279, 804]]) {
  test(`a ${w}×${h} no hay hero: ni se monta ni carga su mapa`, async ({ page }) => {
    const maps = [];
    page.on("request", r => { if (/\/maps\/1\//.test(r.url())) maps.push(r.url()); });
    await page.setViewportSize({ width: w, height: h });
    await openApp(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    await expect(page.locator("#heroNextGo, #heroPct")).toHaveCount(0);
    // El título de la página sigue, solo para lectores de pantalla
    await expect(page.locator("h1")).toHaveCount(1);
    await page.waitForLoadState("networkidle");
    expect(maps).toEqual([]);
  });
}

test("al cruzar los 900 px de alto el hero se quita y se vuelve a poner, con la barra pegada", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await expect(page.locator(".hero")).toHaveCount(1);
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.locator(".hero")).toHaveCount(0);
  // La ventana sigue entera y su barra arriba, a la vista
  await expect(page.locator("#winBar")).toBeInViewport();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".hero")).toHaveCount(1);
  await expect(page.locator("#heroNextGo")).toBeVisible();
  // Al bajar hasta la ventana, la barra se queda arriba
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  await expect.poll(() => page.locator("#winBar").evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThanOrEqual(10);
  await expect(page.locator("#winBar")).toBeInViewport();
});

test("«Continuar con el paso N» del hero lleva a la ventana con ese paso abierto", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true } });
  await page.click("#heroNextGo");
  await expect(page.locator("#journal .journal-num")).toHaveText("3");
  await expect(page.locator("#winBar")).toBeInViewport();
});
