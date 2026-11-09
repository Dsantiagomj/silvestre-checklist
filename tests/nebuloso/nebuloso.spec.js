import { test, expect } from "@playwright/test";

// Prueba de humo del checklist del Dofus Nebuloso: lo que cambia de un Dofus a otro (datos,
// textos, el hero, el Dofus de los Vigilantes del camino, los grupos nuevos de recursos, la
// nota, las imágenes de la raíz). La app es la misma que la del Silvestre: el resto lo prueba
// tests/e2e

const STEPS = 26;
const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const TALL = { width: 1440, height: 1000 };
const LOW = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

/** Abre la app con un progreso opcional, en el diario, y recoge los errores de la página. */
async function openNebuloso(page, seed = {}, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(([s, v]) => {
    if (localStorage.getItem("nebuloso:stepsView") == null) localStorage.setItem("nebuloso:stepsView", v);
    for (const [k, val] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof val === "string" ? val : JSON.stringify(val));
    }
  }, [seed, view]);
  await page.goto("");
  if (view === "items") await expect(page.locator("#items")).toBeVisible();
  else await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(STEPS);
  return errors;
}

/** Las guías de Torrente Arcano, sin salir a la red. */
const stubGuides = context => context.route("https://www.torrentearcano.com/**",
  r => r.fulfill({ contentType: "text/html", body: "<title>guía</title>" }));

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-num`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
}

const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });

/** Que la imagen se haya cargado de verdad (no un 404 con su hueco). */
const loaded = loc => loc.evaluate(img => img.complete && img.naturalWidth > 0);

test("los 26 pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openNebuloso(page);
  await expect(page).toHaveTitle("Dofus Nebuloso · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los 26 pasos");
  await expect(page.locator("footer")).toContainText("Guía original de los 26 pasos por Torrente Arcano");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(STEPS);
  await expect(page.locator(".map-end-name")).toHaveText("Dofus Nebuloso");
  // Nada del Silvestre en la página, salvo su enlace en el menú de la cabecera del sitio
  const appText = () => page.evaluate(() => [...document.body.children].filter(el => !el.matches(".dt-shell")).map(el => el.textContent).join(" "));
  await expect.poll(appText).not.toMatch(/Silvestre|Sandglass|100 pasos/);
  expect(errors).toEqual([]);
});

test("el sitio vive en nebuloso/ y sus imágenes y favicons salen de la raíz y de su build", async ({ page, request }) => {
  await openNebuloso(page);
  // El huevo de la marca, de public/img/ en la raíz: no hay otra copia en nebuloso/
  const egg = page.locator(".hero-egg .egg-off, #winProgress img").first();
  await expect(egg).toHaveAttribute("src", "http://127.0.0.1:4323/img/items/23016.png");
  expect(await loaded(egg)).toBe(true);
  expect((await request.get("/nebuloso/img/items/23016.png")).status()).toBe(404);
  // Sus favicons, el huevo del Nebuloso, junto a su JS
  for (const rel of ["icon", "apple-touch-icon"]) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
    expect(href).toMatch(/^\/nebuloso\/assets\//);
    expect((await request.get(href)).ok()).toBe(true);
  }
});

test("lleva encima la cabecera del sitio, con el Nebuloso como página actual", async ({ page }) => {
  await openNebuloso(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  expect(await shell.evaluate(el => el.nextElementSibling?.id)).toBe("root");
  expect(await shell.getByRole("link", { name: "Dofus Tools" }).getAttribute("href")).toBe("/");
  const nav = shell.getByRole("navigation").getByRole("link");
  await expect(nav).toHaveCount(5);
  await expect(nav.nth(2)).toHaveAccessibleName("Dofus Nebuloso");
  await expect(nav.nth(2)).toHaveAttribute("aria-current", "page");
  expect(await nav.nth(2).getAttribute("href")).toBe("/nebuloso/");
  for (const i of [0, 1, 3, 4]) await expect(nav.nth(i)).not.toHaveAttribute("aria-current");
  // Detrás de la cabecera, Xelorium, donde se lucha contra el pájaro del tiempo
  await expect(shell.locator("img.dt-art")).toHaveAttribute("src", /\/img\/zones\/xelorium\.jpg$/);
});

test.describe("pantalla alta", () => {
  test.use({ viewport: TALL });

  test("el hero lleva el huevo del Nebuloso y su polvo de nebulosa", async ({ page }) => {
    const errors = await openNebuloso(page);
    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveClass(/\bfx-nebula\b/);
    const egg = hero.locator(".egg-off");
    await expect(egg).toHaveAttribute("src", /\/img\/items\/23016\.png$/);
    expect(await loaded(egg)).toBe(true);
    await expect(page.locator("#heroNext .hero-step-title")).toHaveText("De un mundo al otro");
    expect(errors).toEqual([]);
  });

  test("con la guía terminada, el hero dice la frase del hub", async ({ page }) => {
    await openNebuloso(page, { "nebuloso:done": upTo(STEPS) });
    await expect(page.locator(".hero-title")).toHaveText("Checklist del Dofus Nebuloso");
    await expect(page.locator(".hero-sub")).toHaveText(
      "Recorre Anutropía, Sramvil y Xelorium en 26 pasos, con el Dofus de los Vigilantes por el camino.");
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
  });

  test("el Dofus de los Vigilantes va en el camino, en el paso 4, y marcarlo lo enciende", async ({ page }) => {
    await openNebuloso(page, { "nebuloso:done": upTo(3) });
    const strip = page.locator("#winRoad");
    await expect(strip.locator(".road-title")).toHaveText("Dofus del camino");
    await expect(strip.locator(".road-count")).toHaveText("0/1");
    const egg = strip.locator('.road-dofus[data-step="4"]');
    await expect(egg).toHaveCount(1);
    await expect(egg.locator("img")).toHaveAttribute("src", /\/img\/items\/23020\.png$/);
    await page.click('.diary-row[data-n="4"] .row-check');
    await expect(egg).toHaveClass(/obtained/);
    await expect(strip.locator(".road-count")).toHaveText("1/1");
    await expect(page.locator("#toastTxt")).toHaveText("¡Dofus de los vigilantes obtenido!");
  });

  test("marcar el paso 26 enciende el Dofus Nebuloso, en el hero y al final del mapa", async ({ page }) => {
    // Como en el Silvestre, el aviso es de los Dofus del camino: el del checklist lo dice el hero
    await openNebuloso(page, { "nebuloso:done": upTo(25) });
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "off");
    await page.click('.diary-row[data-n="26"] .row-check');
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
    await expect(page.locator(".hero-egg")).toHaveClass(/morphing/);
    await page.click("#stepsViewMap");
    await expect(page.locator(".map-end")).toHaveClass(/\bdone\b/);
  });
});

test.describe("pantalla baja", () => {
  test.use({ viewport: LOW });

  test("la nota de las pausas cuenta el ejemplo del Nebuloso: el 8 ante el Rey Nidas, el 9 lo cierra", async ({ page }) => {
    await openNebuloso(page);
    await page.click("#moreBtn");
    await page.click("#notaOpen");
    const nota = page.locator("#notaDialog");
    await expect(nota).toBeVisible();
    await expect(nota.locator(".nota-step")).toHaveText(["8", "9"]);
    await expect(nota.locator(".nota-boss img")).toHaveAttribute("src", /\/img\/monsters\/1106\.png$/);
    await expect(nota.locator("figcaption")).toHaveText(
      "El paso 8 se detiene ante el Rey Nidas. En el 9 se pasa su mazmorra y se terminan los dos.");
    await expect(nota.locator("#notaSteps")).toHaveText("Ver los 4 pasos");
  });
});

test.describe("móvil", () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test("el paso se abre en la hoja, sin errores", async ({ page }) => {
    const errors = await openNebuloso(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    await page.locator('.diary-row[data-n="12"] .row-num').click();
    await expect(page.locator("#sheet")).toHaveClass(/open/);
    await expect(page.locator("#sheetContent .journal-num")).toHaveText("12");
    expect(errors).toEqual([]);
  });
});

test("el paso 7 toma «Muestreo» y para antes de entregar las muestras, con su guía", async ({ page, context }) => {
  await stubGuides(context);
  await openNebuloso(page, { "nebuloso:done": upTo(6) });
  await openStep(page, 7);
  const muestreo = quest(page, "Muestreo");
  await expect(muestreo).toBeVisible({ timeout: 15_000 });
  await expect(muestreo.locator(".obj-stop")).toBeVisible();
  await expect(muestreo.locator("a.q-name")).toHaveAttribute("href", "https://www.torrentearcano.com/muestreo");
});

test("el paso 8 hace antes las misiones 1 a 3 de «El rey y yo», que su texto no nombra", async ({ page }) => {
  await openNebuloso(page, { "nebuloso:done": upTo(7) });
  await openStep(page, 8);
  await expect(page.locator("#journal .q-item .q-name")).toHaveText(
    ["Rick Hachón, corazón de anutrof", "Por unos kamas más", "No todo lo que brilla es oro", "Anutrof salve al rey"],
    { timeout: 15_000 });
  await expect(page.locator("#journal")).toContainText("Para llegar a la misión 4 hay que hacer antes las misiones 1 a 3");
});

test("los pasos que solo piden hablar con el dios llevan al dios", async ({ page }) => {
  const errors = await openNebuloso(page);
  await openStep(page, 18);
  await expect(page.locator("#journal .goal-by")).toHaveText("Se habla con: Dios Sram");
  await expect(page.locator("#journal .journal-banner img").first()).toHaveAttribute("src", /\/img\/npcs\/dios-sram\.png$/);
  expect(errors).toEqual([]);
});

test.describe("recursos", () => {
  test("el hechizo y el objeto de misión salen en su paso y no cuentan en el total", async ({ page }) => {
    await openNebuloso(page);
    await openStep(page, 5);
    const needs = page.locator("#journal .journal-needs");
    await expect(needs.locator('.slot[data-id="x:captura de almas"]')).toHaveCount(1);
    await expect(needs.locator('.slot[data-id="x:captura de almas"] .slot-tip')).toContainText("Hechizo: requisito, no consumible");
    await openStep(page, 26);
    await expect(page.locator('#journal .journal-needs .slot[data-id="16061"]')).toHaveCount(1);
    // En «Objetos» no están: el compilado de la página los deja fuera
    await page.click("#tabItems");
    await expect(page.locator("#items")).toBeVisible();
    await expect(page.locator('#items .slot[data-id="x:captura de almas"], #items .slot[data-id="16061"]')).toHaveCount(0);
    await expect(page.locator('#items .slot[data-id="15416"]')).toHaveCount(1);
  });

  test("una alternativa en kamas es la nota de su objeto", async ({ page }) => {
    await openNebuloso(page);
    await openStep(page, 4);
    const insignia = page.locator('#journal .journal-needs .slot[data-id="15416"]');
    await expect(insignia.locator(".slot-tip")).toContainText("Insignia de maligilante ×1");
    await expect(insignia.locator(".slot-tip")).toContainText("o 30 000 kamas");
  });
});

// La paleta del Nebuloso (palette en su config.js, lib/palette.js): el acento es lavanda en
// los botones, con texto oscuro encima, en los dos temas
for (const [theme, accent] of [["dark", "rgb(195, 177, 245)"], ["light", "rgb(177, 156, 240)"]]) {
  test(`el acento del Nebuloso es lavanda en el tema ${theme === "dark" ? "oscuro" : "claro"}`, async ({ page }) => {
    await page.setViewportSize(TALL);
    await openNebuloso(page, { "dofus-tools:theme": theme });
    for (const sel of ["#diaryNext", "#heroNextGo", "#overlayBtn"]) {
      expect(await page.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor)).toBe(accent);
    }
    expect(await page.locator("#diaryNext").evaluate(el => getComputedStyle(el).color)).toBe("rgb(26, 18, 48)");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim()))
      .toBe("195,177,245");
  });
}

test("sin misiones de alineamiento no hay selector de bando ni aviso de la orden de Bonta", async ({ page }) => {
  await openNebuloso(page);
  await expect(page.locator("#sideSwitch, .q-side")).toHaveCount(0);
  await page.click("#tabPrereqs");
  await expect(page.locator("#prereqs .pr-card").first()).toBeVisible();
  await expect(page.locator("#prereqs .pr-order")).toHaveCount(0);
  await expect(page.locator("#prereqs .pr-card")).toHaveCount(4);
});

test("los pasos 12, 18 y 25, «Habla con el Dios X», enlazan su guía en el texto y en el overlay", async ({ page, context }) => {
  await stubGuides(context);
  await openNebuloso(page);
  for (const [n, god] of [[12, "anutrof"], [18, "sram"], [25, "xelor"]]) {
    await openStep(page, n);
    const name = `Habla con el Dios ${god[0].toUpperCase()}${god.slice(1)}`;
    await expect(page.locator("#journal").getByRole("link", { name })).toHaveAttribute(
      "href", `https://www.torrentearcano.com/hablar-con-el-dios-${god}`);
  }
  // Sin texto fuera de la nota, la guía del paso sale de la nota
  await openStep(page, 12);
  const [ov] = await Promise.all([context.waitForEvent("page"), page.click("#overlayBtn")]);
  await expect(ov.locator(".ov")).toBeVisible({ timeout: 10_000 });
  await expect(ov.locator(".ov-head .ov-guide-link")).toHaveAttribute(
    "href", "https://www.torrentearcano.com/hablar-con-el-dios-anutrof");
});
