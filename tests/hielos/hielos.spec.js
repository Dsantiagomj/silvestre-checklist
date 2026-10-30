import { test, expect } from "@playwright/test";

// Prueba de humo del checklist del Dofus de los Hielos: lo que cambia de un Dofus a otro
// (datos, textos, el hero, la franja de un solo Dofus, la nota, las imágenes de la raíz).
// La app es la misma que la del Silvestre: el resto lo prueba tests/e2e

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const TALL = { width: 1440, height: 1000 };
const LOW = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

/** Abre la app con un progreso opcional, en el diario, y recoge los errores de la página. */
async function openHielos(page, seed = {}, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(([s, v]) => {
    if (localStorage.getItem("hielos:stepsView") == null) localStorage.setItem("hielos:stepsView", v);
    for (const [k, val] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof val === "string" ? val : JSON.stringify(val));
    }
  }, [seed, view]);
  await page.goto("");
  await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(70);
  return errors;
}

/** Las guías de Torrente Arcano, sin salir a la red. */
const stubGuides = context => context.route("https://www.torrentearcano.com/**",
  r => r.fulfill({ contentType: "text/html", body: "<title>guía</title>" }));

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });

/** Que la imagen se haya cargado de verdad (no un 404 con su hueco). */
const loaded = loc => loc.evaluate(img => img.complete && img.naturalWidth > 0);

test("los 70 pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openHielos(page);
  await expect(page).toHaveTitle("Dofus de los Hielos · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los 70 pasos");
  await expect(page.locator("footer")).toContainText("Guía original de los 70 pasos por Torrente Arcano");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(70);
  await expect(page.locator(".map-end-name")).toHaveText("Dofus de los Hielos");
  // Nada del Silvestre en la página, salvo su enlace en el menú de la cabecera del sitio
  const appText = () => page.evaluate(() => [...document.body.children].filter(el => !el.matches(".dt-shell")).map(el => el.textContent).join(" "));
  await expect.poll(appText).not.toMatch(/Silvestre|Sandglass|100 pasos/);
  expect(errors).toEqual([]);
});

test("el sitio vive en hielos/ y sus imágenes y favicons salen de la raíz y de su build", async ({ page, request }) => {
  await openHielos(page);
  // El huevo de la marca, de public/img/ en la raíz: no hay otra copia en hielos/
  const egg = page.locator("#winProgress img, .hero-egg .egg-off").first();
  await expect(egg).toHaveAttribute("src", "http://127.0.0.1:4321/img/items/23005.png");
  expect(await loaded(egg)).toBe(true);
  expect((await request.get("/hielos/img/items/23005.png")).status()).toBe(404);
  // Sus favicons, el huevo de los Hielos, junto a su JS
  for (const rel of ["icon", "apple-touch-icon"]) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
    expect(href).toMatch(/^\/hielos\/assets\//);
    expect((await request.get(href)).ok()).toBe(true);
  }
});

test("lleva encima la cabecera del sitio, con el Hielos como página actual", async ({ page }) => {
  await openHielos(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  expect(await shell.evaluate(el => el.nextElementSibling?.id)).toBe("root");
  // Los enlaces salen de la raíz del sitio, no de hielos/
  expect(await shell.getByRole("link", { name: "Dofus Tools" }).getAttribute("href")).toBe("/");
  const nav = shell.getByRole("navigation").getByRole("link");
  await expect(nav).toHaveCount(4);
  await expect(nav.nth(1)).toHaveAccessibleName("Dofus de los Hielos");
  await expect(nav.nth(1)).toHaveAttribute("aria-current", "page");
  expect(await nav.nth(1).getAttribute("href")).toBe("/hielos/");
  for (const i of [0, 2, 3]) await expect(nav.nth(i)).not.toHaveAttribute("aria-current");
});

test.describe("pantalla alta", () => {
  test.use({ viewport: TALL });

  test("el hero lleva el huevo de los Hielos y nieve", async ({ page }) => {
    const errors = await openHielos(page);
    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveClass(/\bfx-snow\b/);
    const egg = hero.locator(".egg-off");
    await expect(egg).toHaveAttribute("src", /\/img\/items\/23005\.png$/);
    expect(await loaded(egg)).toBe(true);
    await expect(page.locator("#heroNext .hero-step-title")).toHaveText("Un alma helada");
    expect(errors).toEqual([]);
  });

  test("con la guía terminada, el hero dice la frase del hub", async ({ page }) => {
    await openHielos(page, { "hielos:done": upTo(70) });
    await expect(page.locator(".hero-title")).toHaveText("Checklist del Dofus de los Hielos");
    await expect(page.locator(".hero-sub")).toHaveText(
      "Descubre los misterios de la isla de Frigost en 70 pasos y enfréntate al temible Conde Kontatrás.");
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
  });

  test("la primera fila de la barra es el Dofus de los Hielos, no un camino vacío", async ({ page }) => {
    await openHielos(page);
    const strip = page.locator("#winRoad");
    await expect(strip).toHaveClass(/\bis-solo\b/);
    await expect(strip.locator(".road-title")).toHaveText("El Dofus de la guía");
    await expect(strip.locator(".road-name")).toHaveText("Dofus de los Hielos");
    await expect(strip.locator(".road-count")).toHaveText("Paso 69");
    await expect(strip).not.toContainText("0/0");
    await expect(strip).not.toContainText("Dofus del camino");
    const eggs = strip.locator(".road-dofus");
    await expect(eggs).toHaveCount(1);
    await expect(eggs).toHaveAttribute("data-step", "69");
    await expect(eggs.locator("img")).toHaveAttribute("src", /\/img\/items\/23005\.png$/);
    // Con el progreso y «Siguiente» en la misma fila
    await expect(strip.locator("#winPct")).toHaveText("0%");
    await expect(strip.locator("#diaryNext")).toContainText("Siguiente: 1");
    // Pulsar el huevo abre el paso que lo da
    await eggs.click();
    await expect(page.locator("#journal .journal-num")).toHaveText("69");
  });

  test("marcar el paso 69 enciende el Dofus de los Hielos y lo avisa", async ({ page }) => {
    await openHielos(page, { "hielos:done": upTo(68) });
    const egg = page.locator('#winRoad .road-dofus[data-step="69"]');
    await expect(egg).not.toHaveClass(/obtained/);
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "off");
    await page.click('.diary-row[data-n="69"] .row-check');
    await expect(egg).toHaveClass(/obtained/);
    await expect(page.locator("#winRoad .road-count")).toHaveText("¡Obtenido!");
    await expect(page.locator("#toastTxt")).toHaveText("¡Dofus de los Hielos obtenido!");
    // El huevo del hero se enciende (y se transforma: de apagado a encendido)
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
    await expect(page.locator(".hero-egg")).toHaveClass(/morphing/);
    // Y el del final del camino, en el mapa, aunque falte el 70
    await page.click("#stepsViewMap");
    await expect(page.locator(".map-end")).toHaveClass(/\bdone\b/);
  });
});

test.describe("pantalla baja", () => {
  test.use({ viewport: LOW });

  test("sin hero, una fila y sin botón de Dofus del camino: el anillo lleva el huevo", async ({ page }) => {
    const errors = await openHielos(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    await expect(page.locator("#winRoad")).toHaveCount(0);
    await expect(page.locator("#roadBtn")).toHaveCount(0);
    await expect(page.locator("#winBar")).not.toContainText("0/0");
    await expect(page.locator("#winProgress .win-ring img")).toHaveAttribute("src", /\/img\/items\/23005\.png$/);
    await expect(page.locator("#winDone")).toHaveText("0");
    await expect(page.locator("#diaryNext")).toBeVisible();
    expect(errors).toEqual([]);
  });

  test("en el sitio el tema es el de la cabecera: el menú «⋯» ya no lleva interruptor", async ({ page }) => {
    // Los iconos de Frigost siguen en el interruptor del embebido (tests/embed/hielos.spec.js)
    await openHielos(page);
    await page.click("#moreBtn");
    await expect(page.locator("#moreMenu")).toBeVisible();
    await expect(page.locator("#themeBtn")).toHaveCount(0);
    const btn = page.locator(".dt-shell").getByRole("switch");
    // Detrás de la cabecera, Frigost
    await expect(page.locator(".dt-shell img.dt-art")).toHaveAttribute("src", /\/img\/zones\/isla-de-frigost\.jpg$/);
    await expect(btn).toHaveAccessibleName("Modo oscuro · Dofus Ébano");
    await btn.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
    await expect(btn).toHaveAccessibleName("Modo claro · Dofus Marfil");
    expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("light");
  });

  test("el tema que se eligió en el Hielos antes de la cabecera se trae al tema del sitio", async ({ page }) => {
    await openHielos(page, { "hielos:theme": "light" });
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("light");
    await expect(page.locator(".dt-shell").getByRole("switch")).toHaveAttribute("aria-checked", "false");
  });

  test("la nota de las pausas cuenta el ejemplo del Hielos: 8 y 12 ante el Morsagüino Real, el 13 los cierra", async ({ page }) => {
    await openHielos(page);
    await page.click("#moreBtn");
    await page.click("#notaOpen");
    const nota = page.locator("#notaDialog");
    await expect(nota).toBeVisible();
    await expect(nota.locator(".nota-step")).toHaveText(["8", "12", "13"]);
    await expect(nota.locator(".nota-boss img")).toHaveAttribute("src", /\/img\/monsters\/769\.png$/);
    await expect(nota.locator("figcaption")).toHaveText(
      "Los pasos 8 y 12 se detienen ante el Morsagüino Real. En el 13 se pasa la mazmorra y se terminan los tres.");
    await expect(nota).not.toContainText(/43|44|45|Kodámade/);
  });
});

test.describe("móvil", () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test("la ventana de los pasos sin hero ni Dofus del camino; el paso se abre en la hoja", async ({ page }) => {
    const errors = await openHielos(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    await expect(page.locator("#roadBtn")).toHaveCount(0);
    await expect(page.locator("#winProgress")).toBeVisible();
    await page.locator('.diary-row[data-n="12"] .row-num').click();
    await expect(page.locator("#sheet")).toHaveClass(/open/);
    await expect(page.locator("#sheetContent .journal-num")).toHaveText("12");
    expect(errors).toEqual([]);
  });
});

test("el paso 12 lleva abierta su misión con parada, con su guía", async ({ page, context }) => {
  await stubGuides(context);
  await openHielos(page, { "hielos:done": upTo(11) });
  await openStep(page, 12);
  const pesca = quest(page, "Pesca en aguas congeladas");
  // Sin hacer, abierta: sus objetivos y la parada roja a la vista
  await expect(pesca).toHaveClass(/is-expandable/);
  await expect(pesca.locator(".obj-stop")).toBeVisible();
  await expect(pesca.locator(".obj-list.route > .obj-row").first()).toBeVisible();
  await expect(pesca.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/pesca-en-aguas-congeladas");
});

test("el paso 69 enlaza «El dofus de los hielos» y el 67 deja «Los caminantes blancos» como solo tomarla", async ({ page, context }) => {
  await stubGuides(context);
  await openHielos(page, { "hielos:done": upTo(66) });
  await openStep(page, 67);
  const caminantes = quest(page, "Los caminantes blancos");
  await expect(caminantes).toContainText("Solo tomarla");
  // Sin guía en Torrente Arcano: su nombre no es un enlace
  await expect(caminantes.locator("a.q-name")).toHaveCount(0);
  // «Se busca» no lleva dentro a la de solo tomarla
  await expect(quest(page, "Se busca: conde Kontatrás").locator(".obj-kids")).toHaveCount(0);
  await openStep(page, 69);
  await expect(page.locator("#journal a", { hasText: /^El dofus de los hielos$/ }).first())
    .toHaveAttribute("href", "https://www.torrentearcano.com/el-dofus-de-los-hielos");
});

// La paleta del Hielos (palette en su config.js, lib/palette.js): el acento es azul hielo en
// los botones, con texto oscuro encima, en los dos temas
for (const [theme, accent] of [["dark", "rgb(159, 216, 240)"], ["light", "rgb(126, 198, 230)"]]) {
  test(`el acento del Hielos es azul hielo en el tema ${theme === "dark" ? "oscuro" : "claro"}`, async ({ page }) => {
    await page.setViewportSize(TALL);
    await openHielos(page, { "hielos:theme": theme });
    for (const sel of ["#diaryNext", "#heroNextGo", "#overlayBtn"]) {
      expect(await page.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor)).toBe(accent);
    }
    expect(await page.locator("#diaryNext").evaluate(el => getComputedStyle(el).color)).toBe("rgb(10, 30, 42)");
    // El acento con alfa (fondos, halos) también es el del Hielos
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim()))
      .toBe("159,216,240");
  });
}

test("una misión terminada en el Silvestre sale hecha aquí, y el paso con todo hecho se marca solo", async ({ page }) => {
  // Mismo origen: el Silvestre publica sus misiones terminadas en la clave compartida
  const errors = await openHielos(page, {
    "dofus-checklists:shared": { silvestre: { name: "Dofus Silvestre", quests: ["581", "615"], owned: [] } },
  });
  // El 4 solo lleva «Los monólogos de la vacuna»
  await expect(page.locator('.diary-row[data-n="4"]')).toHaveClass(/\bdone\b/);
  await openStep(page, 9);
  const check = quest(page, "Hotel de hielo").locator(".q-check");
  await expect(check).toHaveAttribute("aria-pressed", "true");
  await expect(check).toBeDisabled();
  await expect(quest(page, "Hotel de hielo").locator(".q-shared")).toHaveText("Hecha en el Dofus Silvestre");
  await expect(quest(page, "La desglaciación").locator(".q-check")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.diary-row[data-n="9"]')).not.toHaveClass(/\bdone\b/);
  // Y el Hielos publica lo suyo al lado, sin tocar lo del Silvestre
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("dofus-checklists:shared")).hielos?.quests || []))
    .toContain("615");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("dofus-checklists:shared")).silvestre.quests)).toEqual(["581", "615"]);
  expect(errors).toEqual([]);
});
