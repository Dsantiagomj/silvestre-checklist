import { test, expect } from "@playwright/test";

// Prueba de humo del Rush de todos los Dofus: lo que cambia de un checklist a otro (200 pasos,
// sus textos, el hero dorado, los 26 Dofus del camino, el Vulbis del paso 200, las paradas de
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

// Lo que cuenta cada categoría de la pestaña «Objetos» (resources.json)
const ITEM_COUNTS = { todo: 504, recursos: 415, consumibles: 56, equipables: 20, almas: 7, criaturas: 5, cosmeticos: 1 };

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
  // Con el 199 hecho el hero espera el Vulbis, el huevo de la marca
  await openTodos(page, { "todos:done": upTo(199) });
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
    await expect(page.locator(".hero-sub")).toHaveText("Del Dofawa al Vulbis: 26 Dofus en 200 pasos por todo el Mundo de los Doce.");
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
  });

  test("la franja lleva los 26 Dofus del camino, del Dofawa del 5 al Vulbis del 200, con el Ocre en el 127", async ({ page }) => {
    await openTodos(page);
    const strip = page.locator("#winRoad");
    await expect(strip.locator(".road-title")).toHaveText("Dofus del camino");
    await expect(strip.locator(".road-count")).toHaveText("0/26");
    await expect(strip.locator(".road-dofus")).toHaveCount(26);
    await expect(strip.locator('.road-dofus[data-step="127"]')).toHaveAttribute("title", "Dofus Ocre · paso 127");
    await expect(strip.locator('.road-dofus[data-step="127"] img')).toHaveAttribute("src", /items\/23012\.png$/);
    await expect(strip.locator(".road-dofus").first()).toHaveAttribute("title", "Dofawa · paso 5");
    await expect(strip.locator(".road-dofus").last()).toHaveAttribute("title", "Dofus vulbis · paso 200");
  });

  // El huevo del hero es el siguiente Dofus del camino, apagado; al conseguirlo se enciende con
  // la transformación y luego deja paso al siguiente. El anillo sigue siendo toda la guía
  const heroEggs = page => page.locator(".hero-egg .egg-body > img").evaluateAll(
    imgs => imgs.map(i => `${i.className}:${new URL(i.src).pathname.replace(/^\/img\//, "")}`));

  test("el hero espera el siguiente Dofus del camino: el Dofawa al empezar, el Púrpura tras el 40", async ({ page }) => {
    await openTodos(page);
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-egg", "5");
    expect(await heroEggs(page)).toEqual(["egg-off:items/23009.png"]);
    await page.reload();
    await page.evaluate(() => localStorage.setItem("todos:done", JSON.stringify(Object.fromEntries(Array.from({ length: 40 }, (_, i) => [i + 1, true])))));
    await page.reload();
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-egg", "44");
    expect(await heroEggs(page)).toEqual(["egg-off:items/23001.png"]);
    // El anillo, toda la guía: 40 de 200 pasos, no el tramo hasta el Púrpura
    const p = await page.locator(".hero-egg").evaluate(el => el.style.getPropertyValue("--p"));
    expect(p).toBe(await page.locator("#heroPct").evaluate(el => String(parseFloat(el.textContent))));
  });

  test("conseguir el Dofawa lo enciende con la transformación y luego el hero espera el plateado", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(4) });
    await page.click('.diary-row[data-n="5"] .row-check');
    const hero = page.locator(".hero-egg");
    await expect(hero).toHaveClass(/morphing/);
    // Mientras dura: el Dofawa apagado tiembla y sale encendido del destello
    expect(await heroEggs(page)).toEqual(["egg-from is-off:items/23009.png", "egg-on:items/23009.png"]);
    await expect(hero.locator(".egg-flash")).toHaveCount(1);
    // Luego, el siguiente: el plateado del 10, apagado
    await expect(hero).not.toHaveClass(/morphing/, { timeout: 8000 });
    await expect(hero).toHaveAttribute("data-egg", "10");
    expect(await heroEggs(page)).toEqual(["egg-off:items/23025.png"]);
  });

  test("con movimiento reducido salta al siguiente sin transformación", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openTodos(page, { "todos:done": upTo(4) });
    await page.click('.diary-row[data-n="5"] .row-check');
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-egg", "10");
    await expect(page.locator(".hero-egg")).not.toHaveClass(/morphing/);
  });

  test("el 190 da dos Dofus: el hero espera los dos juntos", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(189) });
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-egg", "190");
    await expect(page.locator(".hero-egg .egg-body")).toHaveClass(/\bis-pair\b/);
    expect(await heroEggs(page)).toEqual(["egg-off:items/23005.png", "egg-off:items/23027.png"]);
  });

  test("marcar el paso 200 da el Dofus Vulbis: en el hero, al final del mapa y en la franja", async ({ page }) => {
    await openTodos(page, { "todos:done": upTo(199) });
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "off");
    await page.click('.diary-row[data-n="200"] .row-check');
    await expect(page.locator(".hero-egg")).toHaveAttribute("data-stage", "silvestre");
    await expect(page.locator(".hero-egg")).toHaveClass(/morphing/);
    await expect(page.locator('#winRoad .road-dofus[data-step="200"]')).toHaveClass(/obtained/);
    await expect(page.locator("#winRoad .road-count")).toHaveText("26/26");
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
});

// Los objetos del rush (.build/quest_items.py): los pasos que repiten uno del Silvestre llevan
// su lista (la de Torre), los demás lo que piden sus misiones en DofusDB
test.describe("objetos", () => {
  /** Las casillas del paso n en el diario: id del objeto -> cantidad. */
  async function needsOf(page, n) {
    await openStep(page, n);
    const slots = page.locator("#journal .journal-needs .slot");
    return Object.fromEntries(await slots.evaluateAll(els => els.map(e => [e.dataset.id, e.querySelector(".q").textContent.replace(/\D/g, "")])));
  }

  // Las categorías del Silvestre, almas y criaturas incluidas, sin objetos de misión; las
  // jalabolas, que no son almas, van con los consumibles (quest_items.rush_categories)
  test("la pestaña «Objetos» lleva las categorías del Silvestre, sin objetos de misión", async ({ page }) => {
    const errors = await openTodos(page);
    // Las «Cadenas rotas» de alineamiento (9318), objeto de misión que traía el Silvestre, ya no
    // van en el 11; las otras, un recurso (14278), siguen en el 47 para «La desglaciación»
    expect(await needsOf(page, 11)).not.toHaveProperty("9318");
    expect(await needsOf(page, 47)).toHaveProperty("14278", "2");
    await page.click("#tabItems");
    await expect(page.locator("#items")).toBeVisible();
    expect(await page.locator(".needs-cat").evaluateAll(bs => bs.map(b => b.dataset.cat)))
      .toEqual(["todo", "recursos", "consumibles", "equipables", "almas", "criaturas", "cosmeticos"]);
    for (const [cat, n] of Object.entries(ITEM_COUNTS)) {
      await expect(page.locator(`.needs-cat[data-cat="${cat}"] .n`)).toHaveText(String(n));
    }
    expect(errors).toEqual([]);
  });

  test("el 13 repite el 5 del Silvestre y lleva sus objetos: la lana de jalató y la llave del laboratorio", async ({ page }) => {
    await openTodos(page);
    expect(await needsOf(page, 13)).toEqual({ 384: "5", 12073: "1" });
  });

  test("el 10 sale de sus misiones en DofusDB: «Eterno descanso» entrega tres de cada y el vermicida se fabrica", async ({ page }) => {
    await openTodos(page);
    expect(await needsOf(page, 10)).toEqual({
      306: "1", 309: "1", 2659: "1", 374: "1", 19656: "1",
      519: "3", 421: "3", 428: "3", 395: "3", 311: "3",
    });
    const vermicida = page.locator('#journal .journal-needs .slot[data-id="306"] .slot-tip');
    await expect(vermicida).toContainText("Quien siembra vientos recoge Artempestad");
    await expect(vermicida).toContainText("Para fabricar con alquimista nivel 1");
  });

  test("lo que una misión pide antes de la parada va en su paso, una sola vez: la ganzúa en el 140, no en el 148", async ({ page }) => {
    await openTodos(page);
    // «Un frío que pela» se lista en el 140 (hasta Smigol, que el propio 140 pasa) y otra vez
    // en el 148, la misión 97 de Bonta, que va desde la 90
    const p140 = await needsOf(page, 140);
    expect(p140[15533]).toBe("1");
    expect(Object.keys(p140)).toHaveLength(13);
    const p148 = await needsOf(page, 148);
    expect(p148[15533]).toBeUndefined();
    expect(p148[18836]).toBe("1");
    expect(Object.keys(p148)).toHaveLength(10);
  });

  test("los totales suman los pasos: la ortiga, 50 de los prerrequisitos, 8 del 3, 5 del 4 y 3 del 10", async ({ page }) => {
    await openTodos(page);
    await page.click("#tabItems");
    await page.click('.needs-sort [data-sort="qty"]');
    await expect(page.locator('#items .slot[data-id="421"] .q')).toHaveText(/66/);
    await expect(page.locator('#items .slot[data-id="9935"] .q')).toHaveText(/\b6\b/);
    await expect(page.locator("#items .slot").first()).toHaveAttribute("data-id", "14635");
  });

  test("los prerrequisitos piden los objetos del Silvestre y explican la orden de Bonta del 126", async ({ page }) => {
    await openTodos(page);
    await page.click("#tabPrereqs");
    await expect(page.locator('#prereqs .slot[data-id="421"]')).toHaveCount(1);
    const note = page.locator("#prereqs .pr-order");
    await expect(note.locator("b")).toHaveText("La guía sigue la orden Espíritu de la salvación");
    await expect(note.locator(".step-ref")).toHaveText(["126", "128"]);
  });
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

// Los cuatro checklists comparten origen y clave (lib/shared.js): lo terminado en el Silvestre,
// el Hielos o el Nebuloso sale hecho en el rush, y el rush publica lo suyo para los tres
test("lo terminado en los otros tres checklists sale hecho aquí, y el rush publica lo suyo", async ({ page }) => {
  const others = {
    silvestre: { name: "Dofus Silvestre", quests: ["657"], owned: [] },
    hielos: { name: "Dofus de los Hielos", quests: ["577"], owned: [] },
    nebuloso: { name: "Dofus Nebuloso", quests: ["1608"], owned: [] },
  };
  const errors = await openTodos(page, { "dofus-checklists:shared": others });
  // Cada uno de esos pasos lleva solo esa misión («Barnabé en el espacio», «Pesca en aguas
  // congeladas», «El desaparecido de Sufokia»): se marcan solos. El 1 no tiene nada de eso
  for (const n of [12, 50, 90]) await expect(row(page, n)).toHaveClass(/\bdone\b/);
  await expect(row(page, 1)).not.toHaveClass(/\bdone\b/);
  // El rush publica su entrada al lado, sin tocar las de los demás
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("dofus-checklists:shared")).todos?.name))
    .toBe("Rush de todos los Dofus");
  const shared = await page.evaluate(() => JSON.parse(localStorage.getItem("dofus-checklists:shared")));
  for (const [id, e] of Object.entries(others)) expect(shared[id]).toEqual(e);
  expect(errors).toEqual([]);
});

// El PDF deja dos «xxx» en el 199: el Parangón de potencia se dropea en el 111 y, si no
// salió ahí, en la ronda de sueños del 160
test("el paso 199 dice dónde se dropea el Parangón de potencia: el 111 o, si no, el 160", async ({ page }) => {
  await openTodos(page);
  await openStep(page, 199);
  await expect(page.locator("#journal")).toContainText(
    "parangón de potencia del inciso 111 para poder continuar, en caso tal de que en el inciso 160 no se haya dropeado aún");
});

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
    await expect(strip.locator(".road-count")).toHaveText("19/26");
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
    await expect(strip.locator(".road-count")).toHaveText("21/26");
    await expect(page.locator("#toastTxt")).toHaveText(`¡${NAMES} obtenidos!`);
    await expect.poll(() => page.evaluate(() => window.__won.slice().sort()))
      .toEqual(["Dofus de los hielos · paso 190", "Dofus plateado centelleante · paso 190"]);
  });
});

// Con 26 Dofus la franja no cabe en una fila junto al progreso: va en la suya, debajo, con
// el número del paso bajo cada huevo (is-long). El Silvestre, con 12, sigue en una fila
for (const width of [1440, 1024]) {
  test(`a ${width}px los 26 Dofus van en su propia fila, bajo el progreso, con su paso debajo`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await openTodos(page, { "todos:done": upTo(40) });
    const strip = page.locator("#winRoad");
    await expect(strip).toHaveClass(/\bis-long\b/);
    const eggs = strip.locator(".road-dofus");
    await expect(eggs).toHaveCount(26);
    expect(await eggs.locator("small").allTextContents()).toEqual(
      ["5", "10", "16", "22", "28", "37", "38", "44", "75", "86", "91", "100", "116", "127", "168", "169", "178", "181",
        "189", "190", "190", "193", "194", "196", "199", "200"]);
    const box = sel => strip.locator(sel).first().boundingBox();
    const [list, prog, next, head, s] = await Promise.all(
      [".road-list", ".win-progress", ".diary-next", ".road-head", ":scope"].map(box));
    // Debajo de la cabecera, el progreso y «Siguiente», sin pisarlos, y dentro de la franja
    for (const above of [prog, next, head]) expect(list.y).toBeGreaterThanOrEqual(above.y + above.height);
    expect(list.x).toBeGreaterThanOrEqual(s.x);
    expect(list.x + list.width).toBeLessThanOrEqual(s.x + s.width + 0.5);
    // Una sola fila de 26, cada huevo entero en su sitio
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
