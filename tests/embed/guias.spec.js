import { test, expect } from "@playwright/test";
import { SITE } from "./harness.js";
import { PAGE, SCRIPT, guias, loadGuias, openGuias, openGuiasPreview } from "./guias-harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const cards = page => guias(page).locator(".card");
const visible = page => guias(page).locator(".card:not([hidden])");
const root = page => guias(page).locator(".guias");
const search = page => guias(page).getByRole("textbox", { name: "Buscar Dofus" });
const filter = (page, name) => guias(page).getByRole("group", { name: "Tipo de Dofus" }).getByRole("button", { name });
const themeSwitch = page => guias(page).getByRole("switch");
const noScroll = page => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);
const THEME = "guias:theme";
const T = "https://www.torrentearcano.com/";
// Lo único que pega Torre en el bloque de código de la página: ni variables, ni título, ni más bloques
const SNIPPET = `<div id="guias-root"></div>\n<script type="module" src="${SCRIPT}"></script>`;

// Las 30 guías de la página de Torre (torrentearcano.com/guias-dofus), en su orden: nombre,
// dirección (null: sin guía todavía), etiqueta y nivel del Dofus en DofusDB
const GUIDES = [
  ["Dofawa", "dofawa", null, 6], ["Dofus Plateado", "dofus-plateado", null, 20], ["Jyfus", "jyfus", "Evento", 20],
  ["Dofus Cacao", "dofus-cacao", "Evento", 50], ["Dofus Zanahowia", "dofus-zanahowia", null, 60], ["Dosaurio", "dosaurio", "Evento", 80],
  ["Dokoko", "dokoko", null, 80], ["Dofus Kalipto", null, null, 100], ["Dofus Vigilante", "dofus-vigilante", null, 100],
  ["Dolmanax", "dolmanax", null, 100], ["Dofus Esmeralda", "dofus-esmeralda", "Primordial", 100], ["Dofus Púrpura", "dofus-purpura", "Primordial", 110],
  ["Dotruz", "dotruz", null, 110], ["Domakuro", "domakuro", null, 120], ["Dorigami", "dorigami", null, 150],
  ["Dofus Ocre", "dofus-ocre", "Primordial", 160], ["Dofus Turquesa", "dofus-turquesa", "Primordial", 160], ["Dofzzbz", "dofzzbz", null, 170],
  ["Dofus Vulbis", "dofus-vulbis", null, 180], ["Dofus de los Hielos", "dofus-de-los-hielos", null, 180], ["Dofus Nebuloso", "misiones-nebuloso", null, 180],
  ["Dofus Abisal", "dofus-abisal", null, 180], ["Dofus Marfil", "dofus-marfil", "Primordial", 180], ["Dofus Forjalava", "dofus-forjalava", null, 180],
  ["Dofus Ébano", "dofus-ebano", "Primordial", 180], ["Dofus Centelleante", "dofus-centelleante", null, 180], ["Dofus Moteado", "dofus-moteado", null, 180],
  ["Piñata de Pino", "piata-de-pino", null, 180], ["Dofus Pesadilla", "dofus-pesadilla", null, 180], ["Dofus Silvestre", "dofus-silvestre", null, 180],
];
const names = list => list.map(([n]) => n);
const shown = page => visible(page).locator(".name").allTextContents();

test("se monta en una shadow root con el h1 de la página, la entradilla de Torre y las 30 guías", async ({ page }) => {
  // La página de prueba lleva solo el snippet en su bloque de código, nada más de Torre
  expect(PAGE).toContain(`<div class="sqs-block-content">\n${SNIPPET}\n      </div>`);
  expect(PAGE).not.toMatch(/--guias|data-theme|guias:theme/);
  const errors = await openGuias(page);
  expect(await guias(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada del widget en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".card, .grid, .bar").length)).toBe(0);
  // La página de Torre no tiene título propio: el del widget es su único h1
  await expect(guias(page).getByRole("heading", { level: 1, name: "Guías de Dofus" })).toBeVisible();
  expect(await page.evaluate(() => document.querySelectorAll("h1").length)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(guias(page).getByRole("region", { name: "Guías de Dofus" })).toHaveCount(1);
  await expect(guias(page).locator(".lead")).toHaveText(
    "Descubre aquí todas las diferentes guías de los Dofus: primordiales, de evento y muchos más. " +
    "Podrás conocer qué misiones y logros son necesarios para obtener el Dofus que quieras, y la manera más eficiente para no repetir contenido.");
  await expect(cards(page)).toHaveCount(30);
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][data-guias-fonts]')).toHaveCount(1);
  // Lo demás lo pone el embebido solo: la altura de la cabecera de Torre en --guias-top y el tema oscuro
  expect(await guias(page).evaluate(el => el.style.getPropertyValue("--guias-top"))).toBe("102px");
  await expect(root(page)).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("las cartas siguen el orden de Torre: su nombre, su nivel, su etiqueta y su guía", async ({ page }) => {
  await openGuias(page);
  for (const [i, [name, slug, tag, level]] of GUIDES.entries()) {
    const card = cards(page).nth(i);
    await expect(card.locator(".name")).toHaveText(name);
    await expect(card.locator(".lv")).toHaveText(`Nivel ${level}`);
    await expect(card).toHaveAccessibleDescription(`Nivel ${level}`);
    if (slug) {
      expect(await card.evaluate(el => el.tagName), name).toBe("A");
      await expect(card).toHaveAttribute("href", T + slug);
      await expect(card).toHaveAccessibleName(`${name} · Ver guía`);
      if (tag) await expect(card.locator(".kick")).toHaveText(tag);
      else await expect(card.locator(".kick")).toHaveCount(0);
    }
  }
  // 29 enlaces; la que no tiene guía es role=link desactivado, como la bloqueada del hub
  await expect(guias(page).locator("a[href]")).toHaveCount(29);
  await expect(guias(page).getByRole("link", { disabled: true })).toHaveCount(1);
  // Ningún «Ver guía» dentro de la carta: la carta entera es el enlace
  expect(await cards(page).evaluateAll(list => list.filter(c => c.querySelector("a, button")).length)).toBe(0);
});

test("Kalipto no tiene guía todavía: «Próximamente», sin enlace ni foco", async ({ page }) => {
  await openGuias(page);
  for (const name of ["Dofus Kalipto"]) {
    const card = cards(page).filter({ hasText: name });
    expect(await card.evaluate(el => el.tagName)).toBe("DIV");
    await expect(card).toHaveAttribute("aria-disabled", "true");
    await expect(card).not.toHaveAttribute("href");
    await expect(card).not.toHaveAttribute("tabindex");
    await expect(card.locator(".kick")).toHaveText("Próximamente");
    await expect(card).toHaveClass(/\bwip\b/);
    expect(await card.evaluate(el => !!el.closest("a") || !!el.querySelector("a"))).toBe(false);
    expect(await style(card, "filter")).toMatch(/grayscale\(1\)/);
  }
});

test("los filtros llevan su cuenta y dejan solo los primordiales o los de evento", async ({ page }) => {
  const errors = await openGuias(page);
  await expect(filter(page, /^Todos/)).toHaveAttribute("aria-pressed", "true");
  await expect(filter(page, /^Todos/)).toHaveText("Todos30");
  await expect(filter(page, /^Primordiales/)).toHaveText("Primordiales6");
  await expect(filter(page, /^Eventos/)).toHaveText("Eventos3");

  await filter(page, /^Primordiales/).click();
  await expect(filter(page, /^Primordiales/)).toHaveAttribute("aria-pressed", "true");
  await expect(filter(page, /^Todos/)).toHaveAttribute("aria-pressed", "false");
  expect(await shown(page)).toEqual(names(GUIDES.filter(g => g[2] === "Primordial")));
  await expect(guias(page).getByRole("status")).toHaveText("6 guías");

  await filter(page, /^Eventos/).click();
  expect(await shown(page)).toEqual(["Jyfus", "Dofus Cacao", "Dosaurio"]);
  await filter(page, /^Todos/).click();
  await expect(visible(page)).toHaveCount(30);
  expect(errors).toEqual([]);
});

test("el buscador no distingue tildes ni mayúsculas y conoce los otros nombres de Torre", async ({ page }) => {
  await openGuias(page);
  await search(page).fill("EBANO");
  expect(await shown(page)).toEqual(["Dofus Ébano"]);
  await search(page).fill("púrpura");
  expect(await shown(page)).toEqual(["Dofus Púrpura"]);
  await search(page).fill("pinata");
  expect(await shown(page)).toEqual(["Piñata de Pino"]);
  // Los otros nombres que Torre puso en su buscador
  await search(page).fill("zanahoria");
  expect(await shown(page)).toEqual(["Dofus Zanahowia"]);
  await search(page).fill("kaliptus");
  expect(await shown(page)).toEqual(["Dofus Kalipto"]);
  // Con un filtro, busca dentro de él
  await search(page).fill("dofus");
  await filter(page, /^Eventos/).click();
  expect(await shown(page)).toEqual(["Dofus Cacao"]);
  // La cruz lo vacía y vuelve el filtro solo
  await guias(page).getByRole("button", { name: "Borrar la búsqueda" }).click();
  await expect(search(page)).toHaveValue("");
  await expect(search(page)).toBeFocused();
  expect(await shown(page)).toEqual(["Jyfus", "Dofus Cacao", "Dosaurio"]);
});

test("sin resultados, el vacío con el texto de Torre", async ({ page }) => {
  await openGuias(page);
  const empty = guias(page).locator(".empty");
  await expect(empty).toBeHidden();
  await search(page).fill("zzz");
  await expect(visible(page)).toHaveCount(0);
  await expect(empty).toBeVisible();
  await expect(empty).toContainText("Ningún Dofus");
  await expect(empty).toContainText("No se ha encontrado ningún Dofus.");
  await expect(guias(page).getByRole("status")).toHaveText("No se ha encontrado ningún Dofus.");
  await search(page).fill("");
  await expect(empty).toBeHidden();
  await expect(visible(page)).toHaveCount(30);
});

test("todas las imágenes salen de GitHub Pages y cargan; cada guía con el huevo de su Dofus", async ({ page }) => {
  const errors = await openGuias(page);
  const imgs = await guias(page).locator("img").evaluateAll(list => list.map(i => ({ src: i.src, alt: i.alt })));
  // La zona de la cabecera, los 30 huevos, el vacío y los dos del interruptor
  expect(imgs.length).toBe(34);
  for (const { src, alt } of imgs) {
    expect(src.startsWith(`${SITE}img/`), src).toBe(true);
    expect(src).not.toMatch(/dofusdb|ankama|squarespace/i);
    expect(alt).toBe("");
  }
  const eggs = await cards(page).locator(".egg").evaluateAll(list => list.map(i => i.src.split("/img/")[1]));
  expect(new Set(eggs).size).toBe(30);
  for (const e of eggs) expect(e).toMatch(/^items\/230\d\d\.png$/);
  // El Dofus Ocre, el de los Hielos y el Silvestre: los mismos huevos que el resto del sitio
  expect(eggs[15]).toBe("items/23012.png");
  expect(eggs[19]).toBe("items/23005.png");
  expect(eggs[29]).toBe("items/23036.png");
  await expect.poll(() => guias(page).locator("img").evaluateAll(list => list.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src))).toEqual([]);
  expect(errors).toEqual([]);
});

test("sin <div id=\"guias-root\"> no pinta nada y avisa en la consola", async ({ page }) => {
  const errors = await loadGuias(page, { html: PAGE.replace('<div id="guias-root"></div>', "") });
  await expect.poll(() => errors.some(e => e.includes('falta <div id="guias-root">'))).toBe(true);
  expect(await page.locator("#guias-root").count()).toBe(0);
});

test("pegar el script dos veces no monta el widget dos veces", async ({ page }) => {
  const twice = PAGE.replace("</main>", `<script type="module" src="${SCRIPT}?otra"></script></main>`);
  const errors = await openGuias(page, { html: twice });
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes("embed/guias.js")).length)).toBe(2);
  await expect(cards(page)).toHaveCount(30);
  await expect(guias(page).locator("h1")).toHaveCount(1);
  expect(errors).toEqual([]);
});

/** Mueve el ratón a una fracción (fx, fy) de la carta. */
async function pointAt(page, card, fx, fy) {
  const b = await card.boundingBox();
  await page.mouse.move(b.x + b.width * fx, b.y + b.height * fy, { steps: 4 });
}

test("con el ratón la carta se inclina y el brillo la sigue; las de «Próximamente», quietas", async ({ page }) => {
  await openGuias(page);
  const card = cards(page).nth(15);
  await card.scrollIntoViewIfNeeded();
  await pointAt(page, card, .9, .2);
  await expect.poll(() => style(card, "transform")).toMatch(/^matrix3d/);
  expect(await card.evaluate(el => el.style.getPropertyValue("--fx"))).toMatch(/%$/);
  // Hasta 9 grados por lado, como el hub
  await pointAt(page, card, .97, .5);
  expect(parseFloat(await card.evaluate(el => el.style.transform.match(/rotateY\(([-\d.]+)deg\)/)[1]))).toBeLessThanOrEqual(9);
  // El halo del color del Dofus al pasar por encima
  await expect.poll(() => style(card, "boxShadow")).toContain("rgb(209, 139, 35) 0px 0px 32px -6px");
  await page.mouse.move(2, 2);
  await expect.poll(() => card.evaluate(el => el.style.transform)).toBe("");
  // La de Kalipto no se mueve ni brilla
  const wip = cards(page).nth(7);
  await wip.scrollIntoViewIfNeeded();
  await pointAt(page, wip, .9, .2);
  expect(await style(wip, "transform")).toBe("none");
  expect(await style(wip, "boxShadow")).not.toContain("32px -6px");
});

test("al tocar (sin ratón) la carta no se inclina", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await openGuias(page);
  const card = cards(page).nth(0);
  // Un puntero táctil por encima de la carta
  await card.evaluate(el => {
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent("pointermove", { pointerType: "touch", clientX: r.right - 5, clientY: r.top + 5, bubbles: true }));
  });
  expect(await card.evaluate(el => el.style.transform)).toBe("");
  await context.close();
});

test("con movimiento reducido nada se inclina ni se anima", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openGuias(page);
  const card = cards(page).nth(0);
  await pointAt(page, card, .9, .2);
  await pointAt(page, card, .1, .8);
  expect(await style(card, "transform")).toBe("none");
  expect(await style(card, "transitionDuration")).toMatch(/^0s/);
  expect(await style(card.locator(".foil"), "transitionDuration")).toMatch(/^0s/);
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  await expect(themeSwitch(page)).not.toHaveClass(/\bpop\b/);
});

test("el CSS de la página no entra en el widget ni el del widget sale a la página", async ({ page }) => {
  await openGuias(page);
  const first = cards(page).nth(0);
  expect(await style(root(page), "fontFamily")).toMatch(/Barlow/);
  expect(await style(first.locator(".name"), "fontFamily")).toMatch(/Barlow Condensed/);
  expect(await style(guias(page).locator(".lead"), "textTransform")).toBe("none");
  expect(await style(guias(page).locator(".lead"), "letterSpacing")).toBe("normal");
  expect(await style(first, "boxSizing")).toBe("border-box");
  expect(await style(first, "textDecorationLine")).toBe("none");
  // `h1 { color: lime }` no llega al título
  expect(await style(guias(page).locator("h1"), "color")).toBe("rgb(242, 245, 238)");
  // `img { max-width: 50%; border }`: el huevo no se encoge ni lleva borde
  expect(await style(first.locator(".egg"), "borderTopWidth")).toBe("0px");
  expect(await style(first.locator(".egg"), "maxWidth")).not.toBe("50%");
  // `button { background: magenta }` tampoco llega a los filtros
  expect(await style(filter(page, /^Eventos/), "backgroundColor")).not.toBe("rgb(255, 0, 255)");
  expect(await style(search(page), "borderTopWidth")).toBe("0px");
  // Y la página sigue como estaba
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
  expect(await style(page.locator("#below p"), "fontFamily")).toBe("serif");
});

test("aunque la página corte las palabras, ningún nombre de carta se parte", async ({ page }) => {
  const html = PAGE.replace("</head>", "<style>body { overflow-wrap: anywhere; word-break: break-all; hyphens: auto; }</style></head>");
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await loadGuias(page, { html });
    await expect(cards(page)).toHaveCount(30);
    const broken = await cards(page).locator(".name").evaluateAll(list => list.filter(el => {
      const node = el.firstChild;
      const range = document.createRange();
      let at = 0;
      return node.textContent.split(" ").some(w => {
        range.setStart(node, at);
        range.setEnd(node, at + w.length);
        at += w.length + 1;
        return range.getClientRects().length > 1;
      });
    }).map(el => el.textContent));
    expect(broken, `${width}px`).toEqual([]);
  }
});

// Cuántas cartas por fila a cada ancho: seis en escritorio, cuatro en tableta, dos en móvil
for (const [width, perRow, header] of [[1440, 6, 102], [1024, 4, 92], [390, 2, 84]]) {
  test(`a ${width}px: de borde a borde, ${perRow} cartas por fila y la barra pegada bajo la cabecera de Torre (${header}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = await openGuias(page);
    const host = await guias(page).boundingBox();
    expect(Math.abs(host.x)).toBeLessThan(1);
    expect(Math.abs(host.width - width)).toBeLessThan(1);
    await expect.poll(() => noScroll(page)).toBe(true);
    const tops = await cards(page).evaluateAll((l, n) => l.slice(0, n + 1).map(c => Math.round(c.getBoundingClientRect().top)), perRow);
    expect(new Set(tops.slice(0, perRow)).size).toBe(1);
    expect(tops[perRow]).toBeGreaterThan(tops[0]);
    const boxes = await cards(page).evaluateAll(l => l.map(c => c.getBoundingClientRect().toJSON()));
    for (const b of boxes) {
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.right).toBeLessThanOrEqual(width);
    }
    // Ningún nombre se sale de su carta, ya con sus fuentes (sin ellas, la de reserva es más ancha)
    await page.evaluate(() => document.fonts.ready);
    const over = await cards(page).locator(".meta").evaluateAll(l => l.filter(m => m.scrollWidth > m.clientWidth + 1).map(m => m.textContent));
    expect(over).toEqual([]);
    // Al bajar, los filtros y el buscador se quedan justo debajo de la cabecera fija
    const bar = guias(page).locator(".bar");
    await page.evaluate(() => window.scrollBy(0, 1400));
    await expect.poll(async () => Math.round((await bar.boundingBox()).y)).toBe(header);
    await expect(bar).toHaveClass(/\bstuck\b/);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(bar).not.toHaveClass(/\bstuck\b/);
    expect(errors).toEqual([]);
  });
}

test("con su alto natural: el texto de Torre va justo después del widget", async ({ page }) => {
  await openGuias(page);
  // Las dos cajas a la vez y hasta que el alto se asienta (las fuentes aún pueden estar llegando)
  await expect.poll(() => page.evaluate(() => {
    const host = document.getElementById("guias-root").getBoundingClientRect();
    const below = document.querySelector("#below p").getBoundingClientRect();
    return Math.abs(below.top - 40 - host.bottom) < 2;
  })).toBe(true);
});

// El modo claro: pergamino como la cosecha; las cartas siguen oscuras, como en la home.
// Lo elige el interruptor de huevos al final de la barra y se guarda en guias:theme
test("el interruptor de huevos cambia a claro y se recuerda tras recargar; por defecto, oscuro", async ({ page }) => {
  const errors = await openGuias(page);
  const sw = themeSwitch(page);
  await expect(sw).toHaveCount(1);
  await expect(root(page)).toHaveAttribute("data-theme", "dark");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(sw).toHaveAccessibleName("Modo oscuro · Dofus Ébano");
  await expect(sw.locator("img.ts-light")).toHaveAttribute("src", `${SITE}img/items/23011.png`);
  await expect(sw.locator("img.ts-dark")).toHaveAttribute("src", `${SITE}img/items/23007.png`);
  expect(await style(root(page), "backgroundColor")).toBe("rgb(11, 12, 10)");
  // Montar no guarda nada: la clave aparece al elegir
  expect(await page.evaluate(k => localStorage.getItem(k), THEME)).toBeNull();

  await sw.click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  await expect(sw).toHaveAccessibleName("Modo claro · Dofus Marfil");
  expect(await page.evaluate(k => localStorage.getItem(k), THEME)).toBe("light");
  await expect.poll(() => style(root(page), "backgroundColor")).toBe("rgb(244, 236, 220)");
  expect(await style(guias(page).locator("h1"), "color")).toBe("rgb(42, 33, 20)");
  expect(await style(guias(page).locator(".lead"), "color")).toBe("rgb(77, 64, 48)");
  expect(await style(search(page), "backgroundColor")).toBe("rgb(255, 250, 240)");
  // Las cartas no cambian: su texto va sobre oscuro
  expect(await style(cards(page).nth(0).locator(".shade"), "backgroundImage")).toContain("rgba(5, 6, 5");

  await page.reload();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(k => localStorage.getItem(k), THEME)).toBe("dark");
  expect(errors).toEqual([]);
});

test("sin localStorage (modo privado estricto) el widget funciona y el tema cambia igual", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError"); } });
  });
  await openGuias(page);
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
});

test("la vista previa en GitHub Pages (/guias-dofus/) monta el widget con el mismo snippet", async ({ page }) => {
  const errors = await openGuiasPreview(page);
  await expect(page).toHaveTitle(/Guías de Dofus/);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.+/);
  await expect(page.locator("#header")).toBeVisible();
  // El único h1 es el del widget, como en la página de Torre
  expect(await page.evaluate(() => document.querySelectorAll("h1").length)).toBe(0);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(cards(page).nth(0)).toHaveAttribute("href", `${T}dofawa`);
  expect(await page.locator('script[type="module"]').getAttribute("src")).toMatch(/embed\/guias\.js$/);
  expect(errors).toEqual([]);
});
