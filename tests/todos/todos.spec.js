import { test, expect } from "@playwright/test";

// Prueba de humo del Rush de todos los Dofus: lo que cambia de un checklist a otro (200 pasos,
// sus textos, el hero dorado, los 25 Dofus del camino, el Vulbis del paso 200, las paradas de
// los sueños que cierra ese paso, la paleta «Oro», las imágenes de la raíz). La app es la misma
// que la del Silvestre: el resto lo prueba tests/e2e

const STEPS = 200;
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const doneOf = ns => Object.fromEntries(ns.map(n => [n, true]));
const upTo = n => doneOf(range(1, n));
const TALL = { width: 1440, height: 1000 };
const LOW = { width: 1280, height: 720 };
const MOBILE = { width: 390, height: 844 };

/** Abre la app con un progreso opcional, en el diario, y recoge los errores de la página. */
async function openTodos(page, seed = {}, { view = "diary" } = {}) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(([s, v]) => {
    if (localStorage.getItem("todos:stepsView") == null) localStorage.setItem("todos:stepsView", v);
    for (const [k, val] of Object.entries(s)) {
      if (localStorage.getItem(k) == null) localStorage.setItem(k, typeof val === "string" ? val : JSON.stringify(val));
    }
  }, [seed, view]);
  await page.goto("");
  await expect(page.locator(view === "map" ? ".map-node" : ".diary-row")).toHaveCount(STEPS);
  return errors;
}

const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);

async function openStep(page, n) {
  await row(page, n).locator(".row-num").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
}

/** Que la imagen se haya cargado de verdad (no un 404 con su hueco). */
const loaded = loc => loc.evaluate(img => img.complete && img.naturalWidth > 0);

test("los 200 pasos cargan sin errores, en el diario y en el mapa, con sus textos", async ({ page }) => {
  const errors = await openTodos(page);
  await expect(page).toHaveTitle("Rush de todos los Dofus · Checklist");
  await expect(page.locator("#diaryTitle")).toHaveText("Los 200 pasos");
  await expect(page.locator("footer")).toContainText("Guía original de los 200 pasos por Sandglass");
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(STEPS);
  await expect(page.locator(".map-end-name")).toHaveText("Rush de todos los Dofus");
  await expect(page.locator(".map-end img")).toHaveAttribute("src", /\/img\/items\/23004\.png$/);
  expect(errors).toEqual([]);
});

test("el sitio vive en todos/ y sus imágenes y favicons salen de la raíz y de su build", async ({ page, request }) => {
  await openTodos(page);
  // El huevo de la marca, el Vulbis, de public/img/ en la raíz: no hay otra copia en todos/
  const egg = page.locator(".hero-egg .egg-off, #winProgress img").first();
  await expect(egg).toHaveAttribute("src", "http://127.0.0.1:4327/img/items/23004.png");
  expect(await loaded(egg)).toBe(true);
  expect((await request.get("/todos/img/items/23004.png")).status()).toBe(404);
  // Sus favicons, el huevo del Vulbis, junto a su JS
  for (const rel of ["icon", "apple-touch-icon"]) {
    const href = await page.locator(`link[rel="${rel}"]`).first().getAttribute("href");
    expect(href).toMatch(/^\/todos\/assets\//);
    expect((await request.get(href)).ok()).toBe(true);
  }
});

test("lleva encima la cabecera del sitio, con el rush como página actual", async ({ page }) => {
  await openTodos(page);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  expect(await shell.evaluate(el => el.nextElementSibling?.id)).toBe("root");
  expect(await shell.getByRole("link", { name: "Dofus Tools" }).getAttribute("href")).toBe("/");
  const nav = shell.getByRole("navigation").getByRole("link");
  await expect(nav).toHaveCount(6);
  await expect(nav.nth(3)).toHaveAccessibleName("Todos los Dofus");
  await expect(nav.nth(3)).toHaveAttribute("aria-current", "page");
  expect(await nav.nth(3).getAttribute("href")).toBe("/todos/");
  for (const i of [0, 1, 2, 4, 5]) await expect(nav.nth(i)).not.toHaveAttribute("aria-current");
  // Detrás de la cabecera, las misiones de mundo: la ruta va por todo el Mundo de los Doce
  await expect(shell.locator("img.dt-art")).toHaveAttribute("src", /\/img\/zones\/misiones-de-mundo\.jpg$/);
});

test.describe("pantalla alta", () => {
  test.use({ viewport: TALL });

  test("el hero lleva el huevo del Vulbis y sus motas doradas", async ({ page }) => {
    const errors = await openTodos(page);
    const hero = page.locator(".hero");
    await expect(hero).toBeVisible();
    await expect(hero).toHaveClass(/\bfx-nebula\b/);
    const egg = hero.locator(".egg-off");
    await expect(egg).toHaveAttribute("src", /\/img\/items\/23004\.png$/);
    expect(await loaded(egg)).toBe(true);
    expect(errors).toEqual([]);
  });

  test("con la guía terminada, el hero dice la frase del hub", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(STEPS) });
    await expect(page.locator(".hero-title")).toHaveText("Rush de todos los Dofus");
    await expect(page.locator(".hero-title .hl")).toHaveText("todos los Dofus");
    await expect(page.locator(".hero-sub")).toHaveText("Del Dofawa al Vulbis: 25 Dofus en 200 pasos por todo el Mundo de los Doce.");
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
  });

  test("la franja lleva los 25 Dofus del camino, del Dofawa del 5 al Vulbis del 200", async ({ page }) => {
    await openTodos(page);
    const strip = page.locator("#winRoad");
    await expect(strip.locator(".road-title")).toHaveText("Dofus del camino");
    await expect(strip.locator(".road-count")).toHaveText("0/25");
    await expect(strip.locator(".road-dofus")).toHaveCount(25);
    await expect(strip.locator(".road-dofus").first()).toHaveAttribute("title", "Dofawa · paso 5");
    await expect(strip.locator(".road-dofus").last()).toHaveAttribute("title", "Dofus vulbis · paso 200");
  });

  test("marcar el paso 200 da el Dofus Vulbis: en el hero, al final del mapa y en la franja", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(199) });
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "off");
    await page.click('.diary-row[data-n="200"] .row-check');
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
    await expect(page.locator(".hero-egg")).toHaveClass(/morphing/);
    await expect(page.locator('#winRoad .road-dofus[data-step="200"]')).toHaveClass(/obtained/);
    await expect(page.locator("#winRoad .road-count")).toHaveText("25/25");
    await expect(page.locator("#toastTxt")).toHaveText("¡Dofus vulbis obtenido!");
    await page.click("#stepsViewMap");
    await expect(page.locator(".map-end")).toHaveClass(/\bdone\b/);
  });

  test("la Piñata de pino del 194 se anuncia en femenino", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(193) });
    await page.click('.diary-row[data-n="194"] .row-check');
    await expect(page.locator("#toastTxt")).toHaveText("¡Piñata de pino obtenida!");
  });
});

test("el paso 200 cierra las paradas de los sueños de 158, 159 y 160", async ({ page }) => {
  const rest = range(1, 199).filter(n => ![158, 159, 160].includes(n));
  await openTodos(page, { "todos:done": doneOf(rest) });
  for (const n of [158, 159, 160]) await expect(row(page, n).locator(".row-closed")).toHaveText("se cierra en el 200");
  await expect(row(page, 200).locator(".row-closes")).toHaveText("cierra el 158, 159, 160");
  await openStep(page, 200);
  await expect(page.locator("#toggleBtn")).toHaveText("✓ Completar paso 200", { timeout: 15_000 });
  await page.click("#toggleBtn");
  for (const n of [158, 159, 160, 200]) await expect(row(page, n)).toHaveClass(/done/);
});

test("guarda con su prefijo todos:, sin tocar los de los otros checklists", async ({ page }) => {
  await openTodos(page);
  await page.click('.diary-row[data-n="1"] .row-check');
  await expect(row(page, 1)).toHaveClass(/done/);
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("todos:done")))).toEqual({ 1: true });
  for (const key of ["silvestre:done", "hielos:done", "nebuloso:done"]) {
    expect(await page.evaluate(k => localStorage.getItem(k), key)).toBeNull();
  }
});

test.describe("pantalla baja", () => {
  test.use({ viewport: LOW });

  test("la nota de las pausas cuenta el ejemplo del Silvestre con sus pasos de aquí: el 69 y el 70, el 71 los cierra", async ({ page }) => {
    await openTodos(page);
    await page.click("#moreBtn");
    await page.click("#notaOpen");
    const nota = page.locator("#notaDialog");
    await expect(nota).toBeVisible();
    await expect(nota.locator(".nota-step")).toHaveText(["69", "70", "71"]);
    await expect(nota.locator("figcaption")).toHaveText(
      "Los pasos 69 y 70 se detienen ante Kodámade. En el 71 se pasa la mazmorra y se terminan los tres.");
  });
});

test.describe("móvil", () => {
  test.use({ viewport: MOBILE, isMobile: true, hasTouch: true });

  test("el paso se abre en la hoja, sin errores", async ({ page }) => {
    const errors = await openTodos(page);
    await expect(page.locator(".hero")).toHaveCount(0);
    await row(page, 190).locator(".row-num").click();
    await expect(page.locator("#sheet")).toHaveClass(/open/);
    await expect(page.locator("#sheetContent .journal-num")).toHaveText("190");
    expect(errors).toEqual([]);
  });
});

test("una parada que el texto no sitúa sale en su misión: el 18 para en «Arma letal», como el 7 del Silvestre", async ({ page }) => {
  await page.route("https://www.torrentearcano.com/**", r => r.fulfill({ contentType: "text/html", body: "<title>guía</title>" }));
  await openTodos(page, { "todos:done": upTo(17) });
  await openStep(page, 18);
  const quest = page.locator("#journal .q-item").filter({ has: page.locator(".q-name").getByText("Arma letal", { exact: true }) });
  await expect(quest).toBeVisible({ timeout: 15_000 });
  await expect(quest.locator(".obj-stop")).toBeVisible();
});

test("el Dofus Ocre: el aviso de los prerrequisitos lleva al paso 127", async ({ page }) => {
  await openTodos(page);
  await page.click("#tabPrereqs");
  const note = page.locator("#prereqs .pr-ocre");
  await expect(note.locator("b")).toHaveText("Ten el Dofus Ocre antes del paso 127");
  await expect(note.locator(".step-ref")).toHaveText("paso 127");
  await expect(page.locator("#prereqs .pr-order")).toHaveCount(0);
});

// La paleta «Oro» (palette en su config.js, lib/palette.js): el acento dorado en los botones,
// con texto oscuro encima, en los dos temas
for (const [theme, accent] of [["dark", "rgb(245, 228, 177)"], ["light", "rgb(240, 219, 156)"]]) {
  test(`el acento del rush es dorado en el tema ${theme === "dark" ? "oscuro" : "claro"}`, async ({ page }) => {
    await page.setViewportSize(TALL);
    await openTodos(page, { "dofus-tools:theme": theme });
    for (const sel of ["#diaryNext", "#heroNextGo", "#overlayBtn"]) {
      expect(await page.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor)).toBe(accent);
    }
    expect(await page.locator("#diaryNext").evaluate(el => getComputedStyle(el).color)).toBe("rgb(48, 41, 18)");
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent-rgb").trim()))
      .toBe("245,228,177");
  });
}

// En claro, la tinta dorada y el texto apagado se leen sobre los fondos del tema: 4,5:1 o más
// (WCAG AA) sobre el fondo, los paneles y los huecos
test("en el tema claro, la tinta dorada y el texto apagado pasan el contraste AA", async ({ page }) => {
  await page.setViewportSize(TALL);
  await openTodos(page, { "dofus-tools:theme": "light" });
  const ratios = await page.evaluate(() => {
    const css = getComputedStyle(document.documentElement);
    const v = name => css.getPropertyValue(name).trim();
    const lum = hex => {
      const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
    const out = {};
    for (const fg of ["--gold-ink", "--accent-ink", "--txt-mute"]) {
      for (const bg of ["--bg", "--panel", "--inset"]) out[`${fg} sobre ${bg}`] = ratio(v(fg), v(bg));
    }
    return out;
  });
  for (const [pair, r] of Object.entries(ratios)) expect(r, pair).toBeGreaterThanOrEqual(4.5);
});

// El paso 190 da dos Dofus («El silencio es áureo»: el de los hielos y el plateado
// centelleante). La app los lleva los dos en cada sitio donde va el Dofus de un paso
test.describe("dos Dofus en un paso", () => {
  test.use({ viewport: TALL });
  const PAIR = ["items/23005.png", "items/23027.png"];
  const NAMES = "Dofus de los hielos y Dofus plateado centelleante";
  const srcs = loc => loc.evaluateAll(imgs => imgs.map(i => new URL(i.src).pathname.replace(/^\/img\//, "")));

  test("el diario, el detalle y su estandarte llevan los dos huevos del paso 190", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(189) });
    expect(await srcs(row(page, 190).locator(".row-art img"))).toEqual(PAIR);
    await openStep(page, 190);
    const show = page.locator("#journal .journal-banner .journal-show");
    await expect(show).toHaveAttribute("data-kind", "egg");
    expect(await srcs(show.locator("img"))).toEqual(PAIR);
    await expect(show.locator(".journal-show-name")).toHaveText(NAMES);
    for (const img of await show.locator("img").all()) expect(await loaded(img)).toBe(true);
    // Uno solo, como siempre: el Vulbis del 200
    await openStep(page, 200);
    expect(await srcs(page.locator("#journal .journal-banner .journal-show img"))).toEqual(["items/23004.png"]);
  });

  test("en pantalla baja, el distintivo del detalle del 190 lleva los dos huevos", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await openTodos(page, { "todos:done": upTo(189) });
    await openStep(page, 190);
    const badge = page.locator("#journal .journal-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toHaveClass(/\bis-pair\b/);
    expect(await srcs(badge.locator("img"))).toEqual(PAIR);
    const b = await badge.boundingBox();
    expect(Math.round(b.width)).toBe(48);
    // Los dos se ven: no quedan uno encima del otro
    const [i1, i2] = await Promise.all((await badge.locator("img").all()).map(i => i.boundingBox()));
    expect(Math.abs(i1.x - i2.x)).toBeGreaterThan(4);
    await openStep(page, 200);
    await expect(badge).not.toHaveClass(/\bis-pair\b/);
    await expect(badge.locator("img")).toHaveCount(1);
  });

  test("en el mapa, el sello y la ficha del 190 llevan los dos", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(189) }, { view: "map" });
    const node = page.locator('.map-node[data-n="190"]');
    await expect(node).toHaveClass(/\bdofus\b/);
    expect(await srcs(node.locator(".node-egg"))).toEqual(PAIR);
    await node.click();
    await expect(page.locator(".map-card .map-card-reward .egg")).toHaveText(
      ["Se gana Dofus de los hielos", "Se gana Dofus plateado centelleante"]);
  });

  test("marcar el 190 enciende y celebra los dos, y el aviso los nombra", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(189) });
    const strip = page.locator("#winRoad");
    await expect(strip.locator(".road-count")).toHaveText("18/25");
    // Quién se lleva la celebración («won»): se apunta al ponerla, que dura menos de un segundo
    await page.evaluate(() => {
      window.__won = [];
      new MutationObserver(ms => ms.forEach(m => {
        if (m.target.classList.contains("won") && !window.__won.includes(m.target.title)) window.__won.push(m.target.title);
      })).observe(document.getElementById("winRoad"), { subtree: true, attributes: true, attributeFilter: ["class"] });
    });
    await page.click('.diary-row[data-n="190"] .row-check');
    const eggs = strip.locator('.road-dofus[data-step="190"]');
    await expect(eggs).toHaveCount(2);
    for (const egg of await eggs.all()) await expect(egg).toHaveClass(/obtained/);
    await expect(strip.locator(".road-count")).toHaveText("20/25");
    await expect(page.locator("#toastTxt")).toHaveText(`¡${NAMES} obtenidos!`);
    await expect.poll(() => page.evaluate(() => window.__won.slice().sort()))
      .toEqual(["Dofus de los hielos · paso 190", "Dofus plateado centelleante · paso 190"]);
  });
});

// Con 25 Dofus la franja no cabe en una fila junto al progreso: va en la suya, debajo, con
// el número del paso bajo cada huevo (is-long). El Silvestre, con 12, sigue en una fila
for (const width of [1440, 1024]) {
  test(`a ${width}px los 25 Dofus van en su propia fila, bajo el progreso, con su paso debajo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openTodos(page, { "todos:done": upTo(40) });
    const strip = page.locator("#winRoad");
    await expect(strip).toHaveClass(/\bis-long\b/);
    const eggs = strip.locator(".road-dofus");
    await expect(eggs).toHaveCount(25);
    expect(await eggs.locator("small").allTextContents()).toEqual(
      ["5", "10", "16", "22", "28", "37", "38", "44", "75", "86", "91", "100", "116", "168", "169", "178", "181",
        "189", "190", "190", "193", "194", "196", "199", "200"]);
    const box = sel => strip.locator(sel).first().boundingBox();
    const [list, prog, next, head, s] = await Promise.all(
      [".road-list", ".win-progress", ".diary-next", ".road-head", ":scope"].map(box));
    // Debajo de la cabecera, el progreso y «Siguiente», sin pisarlos, y dentro de la franja
    for (const above of [prog, next, head]) expect(list.y).toBeGreaterThanOrEqual(above.y + above.height);
    expect(list.x).toBeGreaterThanOrEqual(s.x);
    expect(list.x + list.width).toBeLessThanOrEqual(s.x + s.width + 0.5);
    // Una sola fila de 25, cada huevo entero en su sitio
    const boxes = await eggs.evaluateAll(l => l.map(e => e.getBoundingClientRect().toJSON()));
    for (const b of boxes) expect(Math.abs(b.y - boxes[0].y)).toBeLessThan(1);
    for (let i = 1; i < boxes.length; i++) expect(boxes[i].x).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5);
    // El progreso, a la derecha y no más ancho de 460px
    expect(prog.width).toBeLessThanOrEqual(460);
    expect(Math.abs(prog.x + prog.width - next.x)).toBeLessThan(40);
    // El número, en tinta dorada si se tiene; apagado si no
    const color = i => eggs.nth(i).locator("small").evaluate(el => getComputedStyle(el).color);
    expect(await color(0)).not.toBe(await color(24));
  });
}

// Nada se sale de lado: ni la cabecera, ni la barra de la ventana, ni la franja de los Dofus
for (const viewport of [TALL, { width: 1024, height: 900 }, MOBILE]) {
  test(`a ${viewport.width}px nada se sale de lado`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const errors = await openTodos(page, { "todos:done": upTo(40) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    for (const el of await page.locator("header.dt-shell a, #winBar button:visible, #winRoad .road-dofus:visible").all()) {
      const b = await el.boundingBox();
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(viewport.width);
    }
    expect(errors).toEqual([]);
  });
}
