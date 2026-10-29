import { test, expect } from "@playwright/test";
import { SITE } from "./harness.js";
import { PAGE, SCRIPT, SOULS, cosecha, loadCosecha, openCosecha, readLS } from "./cosecha-harness.js";

const style = (loc, prop) => loc.evaluate((el, p) => getComputedStyle(el)[p], prop);
const stops = page => cosecha(page).locator(".rail .stop");
const cromos = page => cosecha(page).locator(".cromo");
const cromo = (page, name) => cosecha(page).locator(".cromo", { has: page.locator("b", { hasText: new RegExp(`^${name}$`) }) });
const names = loc => loc.locator("b").allTextContents();
const of = e => SOULS.filter(s => s.e === e);
const KEY = "cosecha:done";

test("se monta en una shadow root con su cabecera y las 337 almas a cero", async ({ page }) => {
  const errors = await openCosecha(page);
  expect(await cosecha(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  // Nada del checklist en el documento de la página
  expect(await page.evaluate(() => document.querySelectorAll(".cromo, .rail, .stop").length)).toBe(0);
  // La página tiene su propio h1: el título del checklist es un h2
  await expect(cosecha(page).getByRole("heading", { level: 2, name: "La eterna cosecha" })).toBeVisible();
  await expect(cosecha(page).locator("h1")).toHaveCount(0);
  await expect(cosecha(page).locator(".hd .ey")).toHaveText("Dofus Ocre");
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("0/337");
  await expect(cosecha(page).locator(".bar.j em")).toHaveText("0/51");
  await expect(cosecha(page).locator(".bar.a em")).toHaveText("0/286");
  // Las fuentes van en la página: @font-face no funciona dentro de una shadow root
  await expect(page.locator('head link[rel="stylesheet"][href*="fonts.googleapis.com"]')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("sin <div id=\"cosecha-root\"> no pinta nada y avisa en la consola", async ({ page }) => {
  const errors = await loadCosecha(page, { html: PAGE.replace('<div id="cosecha-root"></div>', "") });
  await expect.poll(() => errors.some(e => e.includes('falta <div id="cosecha-root">'))).toBe(true);
  expect(await page.locator("#cosecha-root").count()).toBe(0);
});

test("pegar el script dos veces no monta el checklist dos veces", async ({ page }) => {
  // Otra dirección del mismo archivo: el navegador lo ejecuta otra vez
  const html = PAGE.replace("</main>", `<script type="module" src="${SCRIPT}?otra"></script></main>`);
  const errors = await openCosecha(page, { html });
  await expect.poll(() => page.evaluate(() => performance.getEntriesByType("resource").filter(r => r.name.includes("embed/cosecha.js")).length)).toBe(2);
  await expect(cosecha(page).locator(".hd")).toHaveCount(1);
  await expect(stops(page)).toHaveCount(18);
  await expect(cromos(page)).toHaveCount(20);
  expect(errors).toEqual([]);
});

test("el carril lleva las 18 etapas en el orden de la misión y la 1 muestra sus 20 jefes", async ({ page }) => {
  await openCosecha(page);
  await expect(stops(page)).toHaveCount(18);
  expect(await stops(page).locator(".num").allTextContents()).toEqual(Array.from({ length: 18 }, (_, i) => `${i + 1}`));
  expect(await stops(page).locator(".lab span").allTextContents()).toEqual([...Array(3).fill("Jefes"), ...Array(15).fill("Archis")]);
  expect(await stops(page).locator(".lab small").allTextContents()).toEqual(Array.from({ length: 18 }, (_, i) => `0/${of(i + 1).length}`));
  await expect(stops(page).nth(0)).toHaveAttribute("aria-current", "true");
  await expect(cosecha(page).locator(".rail [aria-current]")).toHaveCount(1);
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Etapa 1 · Jefes");
  await expect(cosecha(page).locator(".stH small")).toHaveText("0 de 20 almas");
  // En el orden de la misión, cada uno con su mazmorra y su nivel
  expect(await names(cromos(page))).toEqual(of(1).map(s => s.n));
  await expect(cromos(page).nth(0).locator("small")).toHaveText("Castillo de Arena · nv. 20");
  // Otra etapa desde el carril y con los botones de abajo
  await stops(page).nth(4).click();
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Etapa 5 · Archis");
  expect(await names(cromos(page))).toEqual(of(5).map(s => s.n));
  await cosecha(page).locator(".nav2 button").last().click();
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Etapa 6 · Archis");
  await expect(stops(page).nth(5)).toHaveAttribute("aria-current", "true");
  expect((await readLS(page, "cosecha:ui")).sel.etapa).toBe(6);
});

test("pulsar un alma la marca, se guarda en cosecha:done, sigue tras recargar y suma en la cabecera y el carril", async ({ page }) => {
  await openCosecha(page);
  const jalato = cromo(page, "Jalató Real");
  await expect(jalato).toHaveAttribute("aria-pressed", "false");
  await jalato.click();
  await expect(jalato).toHaveAttribute("aria-pressed", "true");
  await expect(jalato).toHaveClass(/\bdone\b/);
  // Sigue con el foco: se puede seguir con el teclado
  expect(await cosecha(page).evaluate(h => h.shadowRoot.activeElement?.textContent)).toContain("Jalató Real");
  expect(await readLS(page, KEY)).toEqual([147]);
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("1/337");
  await expect(cosecha(page).locator(".bar.j em")).toHaveText("1/51");
  await expect(stops(page).nth(0).locator(".lab small")).toHaveText("1/20");
  await expect(cosecha(page).locator(".stH small")).toHaveText("1 de 20 almas");
  await expect(cosecha(page).locator(".ring em")).toHaveText("5%");
  await page.reload();
  await expect(cromo(page, "Jalató Real")).toHaveAttribute("aria-pressed", "true");
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("1/337");
  // Pulsarla otra vez la desmarca
  await cromo(page, "Jalató Real").click();
  await expect(cromo(page, "Jalató Real")).toHaveAttribute("aria-pressed", "false");
  expect(await readLS(page, KEY)).toEqual([]);
});

test("respeta lo marcado en la página anterior (la misma clave cosecha:done)", async ({ page }) => {
  const archis = of(4).slice(0, 3).map(s => s.id);
  await openCosecha(page, { seed: { [KEY]: [928, 147, ...archis] } });
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("5/337");
  await expect(cosecha(page).locator(".bar.j em")).toHaveText("2/51");
  await expect(cosecha(page).locator(".bar.a em")).toHaveText("3/286");
  await expect(cromo(page, "Mob Lasponja")).toHaveAttribute("aria-pressed", "true");
  await expect(stops(page).nth(3).locator(".lab small")).toHaveText("3/20");
});

test("otra pestaña que marca almas se refleja aquí sin recargar", async ({ page }) => {
  await openCosecha(page);
  const other = await page.context().newPage();
  await openCosecha(other);
  await cromo(other, "Shin Larva").click();
  await expect(cromo(page, "Shin Larva")).toHaveAttribute("aria-pressed", "true");
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("1/337");
});

test("por región: 19 regiones de la que más almas tiene a la que menos, con sus subzonas", async ({ page }) => {
  await openCosecha(page);
  await cosecha(page).getByRole("button", { name: "Por región" }).click();
  await expect(cosecha(page).getByRole("button", { name: "Por región" })).toHaveAttribute("aria-pressed", "true");
  await expect(stops(page)).toHaveCount(19);
  const labels = await stops(page).locator(".lab span").allTextContents();
  expect(labels.slice(0, 3)).toEqual(["Amakna", "Llanuras de Cania", "Isla de Otomai"]);
  await expect(stops(page).nth(0).locator(".lab small")).toHaveText("0/85");
  // Las regiones no tienen orden ni número: sin medallón, y el nombre entero en su sitio
  await expect(stops(page).locator(".num")).toHaveCount(0);
  const cut = await stops(page).locator(".lab span").evaluateAll(els => els.filter(e => e.scrollWidth > e.clientWidth).map(e => e.textContent));
  expect(cut).toEqual([]);
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Amakna");
  await expect(cromos(page)).toHaveCount(85);
  // Dentro de la región, una cabecera por subzona
  const zones = new Set(SOULS.filter(s => s.r === "Amakna").map(s => s.z));
  await expect(cosecha(page).locator(".zone")).toHaveCount(zones.size);
  await expect(cosecha(page).locator(".zone", { hasText: "Guarida de Sfinter Cell" }).locator("small")).toHaveText("0/3");
  // Se recuerda al recargar
  await stops(page).nth(2).click();
  await page.reload();
  await expect(stops(page)).toHaveCount(19);
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Isla de Otomai");
  expect(await readLS(page, "cosecha:ui")).toMatchObject({ by: "region", sel: { region: "Isla de Otomai" } });
});

test("«Jefes» deja solo las etapas 1 a 3 y «Archis», de la 4 a la 18", async ({ page }) => {
  await openCosecha(page);
  await cosecha(page).getByRole("button", { name: "Jefes", exact: true }).click();
  await expect(stops(page)).toHaveCount(3);
  expect(await stops(page).locator(".num").allTextContents()).toEqual(["1", "2", "3"]);
  await expect(cromos(page)).toHaveCount(20);
  await cosecha(page).getByRole("button", { name: "Archis", exact: true }).click();
  await expect(stops(page)).toHaveCount(15);
  await expect(stops(page).nth(0).locator(".num")).toHaveText("4");
  // La etapa elegida ya no está: pasa a la primera que queda
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Etapa 4 · Archis");
  // Por región, solo sus archis: Amakna con los suyos
  await cosecha(page).getByRole("button", { name: "Por región" }).click();
  const archis = SOULS.filter(s => s.r === "Amakna" && s.t === "archi").length;
  await expect(stops(page).nth(0).locator(".lab small")).toHaveText(`0/${archis}`);
  await expect(cromos(page)).toHaveCount(archis);
});

test("«Ocultar hechos» esconde las marcadas sin cambiar las cuentas, y una etapa hecha dice «Etapa completa»", async ({ page }) => {
  const third = of(3).map(s => s.id);
  await openCosecha(page, { seed: { [KEY]: [928, 147, ...third] } });
  await cosecha(page).getByLabel("Ocultar hechos").check();
  await expect(cromos(page)).toHaveCount(18);
  await expect(cromo(page, "Mob Lasponja")).toHaveCount(0);
  await expect(cosecha(page).locator(".stH small")).toHaveText("2 de 20 almas");
  await expect(stops(page).nth(0).locator(".lab small")).toHaveText("2/20");
  // Marcar una con «Ocultar hechos» la quita de la vista
  await cromo(page, "Girasol Hambriento").click();
  await expect(cromos(page)).toHaveCount(17);
  await stops(page).nth(2).click();
  await expect(cromos(page)).toHaveCount(0);
  await expect(cosecha(page).locator(".empty b")).toHaveText("Etapa completa");
  await expect(stops(page).nth(2).locator(".lab small")).toHaveText("11/11");
  await expect(stops(page).nth(2)).toHaveClass(/\bfull\b/);
  expect((await readLS(page, "cosecha:ui")).hide).toBe(true);
  await page.reload();
  await expect(cosecha(page).getByLabel("Ocultar hechos")).toBeChecked();
});

test("el anillo dorado del botón pulsado sigue las esquinas redondeadas de su botonera, también en estrecho", async ({ page }) => {
  const radii = loc => loc.evaluate(el => {
    const s = getComputedStyle(el);
    return [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius];
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openCosecha(page);
    for (const group of ["Agrupar", "Tipo"]) {
      const seg = cosecha(page).getByRole("group", { name: group });
      const [r] = await radii(seg);
      expect(r, `${group} a ${width}px`).toBe("10px");
      const buttons = seg.getByRole("button");
      // Pulsados, el primero y el último: su anillo va en su caja, que redondea las esquinas de fuera como la botonera
      await buttons.first().click();
      await expect(buttons.first()).toHaveAttribute("aria-pressed", "true");
      expect(await radii(buttons.first()), `${group} a ${width}px`).toEqual([r, "0px", "0px", r]);
      await buttons.last().click();
      await expect(buttons.last()).toHaveAttribute("aria-pressed", "true");
      expect(await radii(buttons.last()), `${group} a ${width}px`).toEqual(["0px", r, r, "0px"]);
      // Uno de en medio no redondea ninguna
      if (await buttons.count() > 2) expect(await radii(buttons.nth(1))).toEqual(["0px", "0px", "0px", "0px"]);
    }
  }
});

test("buscar «rata» enseña lo de todas las etapas y apaga en el carril las que no tienen", async ({ page }) => {
  await openCosecha(page);
  await stops(page).nth(7).click();
  const search = cosecha(page).getByRole("textbox", { name: "Buscar" });
  await expect(search).toHaveAttribute("type", "text");
  await search.fill("rata");
  // Rata Negra y Rata Blanca en la 1, Milirratatúi en la 6
  await expect(cosecha(page).locator(".res b")).toHaveText(["Etapa 1 · Jefes", "Etapa 6 · Archis"]);
  expect(await names(cromos(page))).toEqual(["Rata Negra", "Rata Blanca", "Milirratatúi el Gastrónomo"]);
  await expect(stops(page).nth(0).locator(".hit")).toHaveText("2");
  await expect(stops(page).nth(5).locator(".hit")).toHaveText("1");
  await expect(cosecha(page).locator(".rail .stop.none")).toHaveCount(16);
  await expect(cosecha(page).locator(".rail [aria-current]")).toHaveCount(0);
  // Pulsar una etapa en el carril lleva a sus resultados, sin salir de la búsqueda
  await stops(page).nth(5).click();
  await expect(search).toHaveValue("rata");
  await expect.poll(async () => (await cosecha(page).locator(".res").nth(1).boundingBox()).y).toBeLessThan(400);
  // La búsqueda no se guarda; al borrarla vuelve a la etapa elegida
  expect((await readLS(page, "cosecha:ui")).q).toBeUndefined();
  await cosecha(page).getByRole("button", { name: "Borrar búsqueda" }).click();
  await expect(search).toHaveValue("");
  await expect(cosecha(page).locator(".stH h3")).toHaveText("Etapa 8 · Archis");
  // Sin nada que coincida
  await search.fill("zzzz");
  await expect(cosecha(page).locator(".empty b")).toHaveText("Sin resultados");
});

test("«/» lleva a la búsqueda, salvo si se escribe en otro campo de la página", async ({ page }) => {
  await openCosecha(page);
  await page.locator("#page-search").focus();
  await page.keyboard.type("a/b");
  await expect(page.locator("#page-search")).toHaveValue("a/b");
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("/");
  expect(await cosecha(page).evaluate(h => h.shadowRoot.activeElement?.getAttribute("aria-label"))).toBe("Buscar");
  await page.keyboard.type("larva");
  await expect(cosecha(page).getByRole("textbox", { name: "Buscar" })).toHaveValue("larva");
});

test("el botón de copiar copia el nombre sin marcar el alma, y no va dentro del de marcar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "https://www.torrentearcano.com" });
  await openCosecha(page);
  // Ningún botón dentro de otro
  expect(await cosecha(page).evaluate(h => h.shadowRoot.querySelectorAll("button button").length)).toBe(0);
  const copy = cosecha(page).getByRole("button", { name: "Copiar Jalató Real" });
  await copy.click();
  await expect(cosecha(page).locator(".toast")).toHaveText("Copiado: Jalató Real");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("Jalató Real");
  await expect(cromo(page, "Jalató Real")).toHaveAttribute("aria-pressed", "false");
  expect(await readLS(page, KEY)).toBeNull();
});

// «Reiniciar» abre un diálogo propio (<dialog> con showModal, como el del checklist), nunca el
// confirm() del navegador: el anillo con lo marcado, qué se borra, Cancelar y Desmarcar
// todas; después, un aviso con «Deshacer» que devuelve lo que había
const noNativeDialogs = page => {
  const native = [];
  page.on("dialog", d => { native.push(d.type()); d.dismiss(); });
  return native;
};
const resetDialog = page => cosecha(page).getByRole("dialog", { name: "¿Desmarcar todas las almas?" });

test("«Reiniciar» abre su diálogo: Esc y Cancelar no tocan nada", async ({ page }) => {
  const native = noNativeDialogs(page);
  await openCosecha(page, { seed: { [KEY]: [928, 147] } });
  const reset = cosecha(page).getByRole("button", { name: "Reiniciar" });
  await expect(resetDialog(page)).toBeHidden();
  await reset.click();
  const dlg = resetDialog(page);
  await expect(dlg).toBeVisible();
  // Lo que se va a borrar, contado
  await expect(dlg).toContainText("2 de las 337 almas");
  await expect(dlg).toContainText("2 jefes y 0 archis");
  // El anillo se llena con lo marcado al abrir (1 %), con el Dofus Ocre en medio
  await expect(dlg.locator(".rd-ring img")).toHaveAttribute("src", `${SITE}img/inicio/dofus-ocre.png`);
  await expect.poll(() => dlg.locator(".rd-ring").evaluate(el => el.style.getPropertyValue("--rd-v"))).toBe("1");
  // El foco va dentro y Esc lo cierra sin borrar
  await expect(dlg.getByRole("button", { name: "Cancelar" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("2/337");
  // Cancelar, igual
  await reset.click();
  await resetDialog(page).getByRole("button", { name: "Cancelar" }).click();
  await expect(resetDialog(page)).toBeHidden();
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("2/337");
  expect(await readLS(page, KEY)).toEqual([928, 147]);
  expect(native).toEqual([]);
});

test("«Desmarcar todas» lo borra y lo guarda, y «Deshacer» lo devuelve", async ({ page }) => {
  const native = noNativeDialogs(page);
  const errors = await openCosecha(page, { seed: { [KEY]: [928, 147] } });
  await cosecha(page).getByRole("button", { name: "Reiniciar" }).click();
  await resetDialog(page).getByRole("button", { name: "Desmarcar todas" }).click();
  // El anillo se vacía y el diálogo se cierra
  await expect(resetDialog(page)).toBeHidden({ timeout: 3_000 });
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("0/337");
  expect(await readLS(page, KEY)).toEqual([]);
  const toast = cosecha(page).locator(".toast");
  await expect(toast).toHaveClass(/\bon\b/);
  await expect(toast).toContainText("Almas desmarcadas");
  await toast.getByRole("button", { name: "Deshacer" }).click();
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("2/337");
  await expect(cromo(page, "Mob Lasponja")).toHaveAttribute("aria-pressed", "true");
  expect(await readLS(page, KEY)).toEqual([928, 147]);
  await expect(toast).not.toHaveClass(/\bon\b/);
  // Y otra vez, sin deshacer: se queda borrado tras recargar
  await cosecha(page).getByRole("button", { name: "Reiniciar" }).click();
  await resetDialog(page).getByRole("button", { name: "Desmarcar todas" }).click();
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("0/337");
  await page.reload();
  await expect(cosecha(page).locator(".bar.t em")).toHaveText("0/337");
  expect(native).toEqual([]);
  expect(errors).toEqual([]);
});

test("sin almas marcadas el diálogo lo dice y no deja confirmar", async ({ page }) => {
  await openCosecha(page);
  await cosecha(page).getByRole("button", { name: "Reiniciar" }).click();
  await expect(resetDialog(page)).toContainText("Todavía no has marcado ninguna alma");
  await expect(resetDialog(page).getByRole("button", { name: "Desmarcar todas" })).toBeDisabled();
});

test("el diálogo de reiniciar va con el tema: pergamino en claro, oscuro en oscuro", async ({ page }) => {
  const lum = c => {
    const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  for (const theme of ["dark", "light"]) {
    await openCosecha(page, { seed: { [KEY]: [928], [THEME]: theme } });
    await page.evaluate(([k, t]) => localStorage.setItem(k, t), [THEME, theme]);
    await page.reload();
    await cosecha(page).getByRole("button", { name: "Reiniciar" }).click();
    const dlg = resetDialog(page);
    await expect(dlg).toBeVisible();
    const bg = lum(await dlg.evaluate(el => getComputedStyle(el).backgroundColor));
    const fg = lum(await dlg.locator(".rd-title").evaluate(el => getComputedStyle(el).color));
    if (theme === "light") expect(bg).toBeGreaterThan(.8);
    else expect(bg).toBeLessThan(.05);
    const [a, b] = [bg, fg].sort((x, y) => y - x);
    expect((a + .05) / (b + .05), theme).toBeGreaterThanOrEqual(7);
    await page.keyboard.press("Escape");
  }
});

test("con movimiento reducido el diálogo se cierra sin esperar al anillo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCosecha(page, { seed: { [KEY]: [928] } });
  await cosecha(page).getByRole("button", { name: "Reiniciar" }).click();
  expect(await style(resetDialog(page).locator(".rd-ring .rd-fill"), "transitionDuration")).toMatch(/^0s/);
  await resetDialog(page).getByRole("button", { name: "Desmarcar todas" }).click();
  await expect(resetDialog(page)).toBeHidden({ timeout: 300 });
});

test("todas las imágenes salen de GitHub Pages y cargan, ninguna de DofusDB ni de Ankama", async ({ page }) => {
  const outside = [];
  page.on("request", r => { if (/dofusdb|ankama/i.test(r.url())) outside.push(r.url()); });
  const errors = await openCosecha(page);
  // Todas las de la región más grande, sin esperar al scroll
  await cosecha(page).getByRole("button", { name: "Por región" }).click();
  await expect(cromos(page)).toHaveCount(85);
  await cosecha(page).locator("img").evaluateAll(list => list.forEach(i => { i.loading = "eager"; }));
  const imgs = await cosecha(page).locator("img").evaluateAll(list => list.map(i => ({ src: i.src, alt: i.alt })));
  expect(imgs.length).toBeGreaterThan(85);
  for (const { src, alt } of imgs) {
    expect(src.startsWith(`${SITE}img/`)).toBe(true);
    expect(alt).toBe("");
  }
  await expect.poll(() => cosecha(page).locator("img").evaluateAll(list => list.filter(i => !(i.complete && i.naturalWidth > 0)).map(i => i.src))).toEqual([]);
  expect(outside).toEqual([]);
  expect(errors).toEqual([]);
});

test("el CSS de la página no entra en el checklist ni el del checklist sale a la página", async ({ page }) => {
  await openCosecha(page);
  const first = cromos(page).nth(0);
  expect(await style(first.locator("b"), "fontFamily")).toMatch(/Barlow Condensed/);
  expect(await style(first.locator("small"), "textTransform")).toBe("none");
  expect(await style(first, "boxSizing")).toBe("border-box");
  expect(await style(first.locator("img"), "borderTopWidth")).toBe("0px");
  // `h2 { color: lime }` no llega al título
  expect(await style(cosecha(page).locator("h2"), "color")).toBe("rgb(242, 245, 238)");
  expect(await style(page.locator("#below p"), "color")).toBe("rgb(204, 0, 0)");
  expect(await style(page.locator("body"), "backgroundColor")).toBe("rgb(250, 250, 250)");
});

test("aunque la página corte las palabras, ningún nombre se parte", async ({ page }) => {
  // Squarespace pone reglas de corte en el body y se heredan hasta la shadow root
  const html = PAGE.replace("</head>", "<style>body { overflow-wrap: anywhere; word-break: break-all; hyphens: auto; }</style></head>");
  await openCosecha(page, { html });
  for (const view of ["Por etapa", "Por región"]) {
    await cosecha(page).getByRole("button", { name: view }).click();
    const texts = cosecha(page).locator(".cromo b, .stH h3, h2");
    const broken = await texts.evaluateAll(list => list.filter(el => {
      const node = el.firstChild;
      const range = document.createRange();
      let at = 0;
      // Cada palabra en una sola línea: ninguna línea empieza a mitad de palabra
      return node.textContent.split(" ").some(w => {
        range.setStart(node, at);
        range.setEnd(node, at + w.length);
        at += w.length + 1;
        return range.getClientRects().length > 1;
      });
    }).map(el => el.textContent));
    expect(broken).toEqual([]);
  }
});

test("en escritorio va de borde a borde, el carril a la izquierda se pega bajo la cabecera de la página", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openCosecha(page);
  const box = await cosecha(page).boundingBox();
  expect(Math.abs(box.x)).toBeLessThan(1);
  expect(Math.abs(box.width - 1440)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Con su alto natural: el texto de Torrente va justo después (tras el margen de 40px de sus párrafos)
  const below = await page.locator("#below p").boundingBox();
  expect(Math.abs(below.y - 40 - (box.y + box.height))).toBeLessThan(2);
  const rail = cosecha(page).locator(".rail");
  const main = cosecha(page).locator(".main");
  const r = await rail.boundingBox();
  expect(r.x + r.width).toBeLessThan((await main.boundingBox()).x);
  // Cinco almas por fila
  const tops = await cosecha(page).locator(".slot").evaluateAll(l => l.slice(0, 6).map(c => Math.round(c.getBoundingClientRect().top)));
  expect(new Set(tops.slice(0, 5)).size).toBe(1);
  expect(tops[5]).toBeGreaterThan(tops[0]);
  // Al bajar por una región larga, el carril se queda debajo de la cabecera fija de Squarespace (90px)
  await cosecha(page).getByRole("button", { name: "Por región" }).click();
  await page.evaluate(() => window.scrollBy(0, 1500));
  await expect.poll(async () => Math.round((await rail.boundingBox()).y)).toBe(102);
});

test("en móvil (≤700px) el carril es una fila de etapas pegada arriba y las almas van de tres en tres", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCosecha(page);
  const host = await cosecha(page).boundingBox();
  expect(Math.abs(host.width - 390)).toBeLessThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  // Las etapas en una fila que se desplaza de lado
  const chips = await stops(page).evaluateAll(l => l.map(c => c.getBoundingClientRect().toJSON()));
  for (const c of chips) expect(Math.abs(c.y - chips[0].y)).toBeLessThan(1);
  expect(await cosecha(page).locator(".stops").evaluate(el => el.scrollWidth > el.clientWidth)).toBe(true);
  // Tres por fila, dentro del ancho
  const slots = await cosecha(page).locator(".slot").evaluateAll(l => l.slice(0, 4).map(c => c.getBoundingClientRect().toJSON()));
  expect(Math.abs(slots[1].y - slots[0].y)).toBeLessThan(1);
  expect(Math.abs(slots[2].y - slots[0].y)).toBeLessThan(1);
  expect(slots[3].y).toBeGreaterThan(slots[0].bottom - 1);
  expect(slots[2].right).toBeLessThanOrEqual(390);
  // Ningún nombre se sale de su cromo
  const over = await cromos(page).evaluateAll(l => l.filter(c => c.scrollWidth > c.clientWidth + 1).map(c => c.textContent));
  expect(over).toEqual([]);
  // Al bajar por una región larga, la fila se queda bajo la cabecera fija de la página (84px en móvil)
  await cosecha(page).getByRole("button", { name: "Por región" }).click();
  await page.evaluate(() => window.scrollBy(0, 2500));
  await expect.poll(async () => Math.round((await cosecha(page).locator(".rail").boundingBox()).y)).toBe(84);
});

test("con movimiento reducido las almas no se mueven al pasar el ratón", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCosecha(page);
  const first = cosecha(page).locator(".slot").nth(0);
  await first.hover();
  expect(await style(first, "transform")).toBe("none");
  expect(await style(cromos(page).nth(0), "transitionDuration")).toMatch(/^0s/);
});

// El modo claro (cosecha.css, [data-theme=light] en .cosecha): pergamino con el ocre como
// tinta. En el embebido lo elige su propio interruptor de huevos, al final de las
// herramientas, y se guarda en cosecha:theme. Por defecto, oscuro
const THEME = "cosecha:theme";
const themeSwitch = page => cosecha(page).getByRole("switch");
const root = page => cosecha(page).locator(".cosecha");

test("el interruptor de huevos cambia a claro, pinta de pergamino y se recuerda tras recargar", async ({ page }) => {
  const errors = await openCosecha(page);
  const sw = themeSwitch(page);
  await expect(sw).toHaveCount(1);
  await expect(root(page)).toHaveAttribute("data-theme", "dark");
  await expect(sw).toHaveAttribute("aria-checked", "true");
  await expect(sw).toHaveAccessibleName("Modo oscuro · Dofus Ébano");
  // Los huevos del checklist: el Dofus Marfil para el claro y el Ébano para el oscuro, de GitHub Pages
  await expect(sw.locator("img.ts-light")).toHaveAttribute("src", `${SITE}img/items/23011.png`);
  await expect(sw.locator("img.ts-dark")).toHaveAttribute("src", `${SITE}img/items/23007.png`);
  // Al final de la fila de herramientas
  expect(await sw.evaluate(el => el.parentElement.classList.contains("tools") && !el.nextElementSibling)).toBe(true);
  expect(await style(root(page), "backgroundColor")).toBe("rgb(11, 12, 10)");
  // Montar no guarda nada: la clave aparece al elegir
  expect(await readLS(page, THEME)).toBeNull();

  await sw.click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect(sw).toHaveAccessibleName("Modo claro · Dofus Marfil");
  expect(await page.evaluate(k => localStorage.getItem(k), THEME)).toBe("light");
  // La paleta del modo claro
  await expect.poll(() => style(root(page), "backgroundColor")).toBe("rgb(244, 236, 220)");
  expect(await style(cosecha(page).locator("h2"), "color")).toBe("rgb(42, 33, 20)");
  expect(await style(cosecha(page).locator(".sub"), "color")).toBe("rgb(77, 64, 48)");
  expect(await style(cosecha(page).locator(".hd .ey"), "color")).toBe("rgb(138, 75, 5)");
  expect(await style(cosecha(page).locator(".bigN"), "color")).toBe("rgb(184, 101, 10)");
  expect(await style(cosecha(page).locator(".stH small"), "color")).toBe("rgb(107, 93, 72)");
  expect(await style(cromos(page).nth(0), "backgroundImage")).toContain("rgb(255, 250, 240)");
  // El pulsado: tinta ocre oscura y anillo dorado
  const pressed = cosecha(page).getByRole("button", { name: "Por etapa" });
  expect(await style(pressed, "color")).toBe("rgb(106, 58, 4)");
  expect(await style(pressed, "boxShadow")).toContain("rgba(184, 138, 46");
  // El huevo de la cabecera sigue oscuro, con su anillo dorado
  expect(await style(cosecha(page).locator(".hd .egg"), "backgroundImage")).toContain("rgb(74, 51, 21)");
  // Marcada, el nombre en la tinta ocre de lo marcado
  await cromo(page, "Jalató Real").click();
  expect(await style(cromo(page, "Jalató Real").locator("b"), "color")).toBe("rgb(106, 58, 4)");

  await page.reload();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  await expect(themeSwitch(page)).toHaveAttribute("aria-checked", "false");
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(k => localStorage.getItem(k), THEME)).toBe("dark");
  await expect.poll(() => style(root(page), "backgroundColor")).toBe("rgb(11, 12, 10)");
  expect(errors).toEqual([]);
});

test("en el modo claro ningún color oscuro se queda atrás, tampoco en estrecho con el carril pegado", async ({ page }) => {
  const lum = c => {
    const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => {
      v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
    });
    return .2126 * r + .7152 * g + .0722 * b;
  };
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await openCosecha(page, { seed: { [THEME]: "light" } });
    await expect(root(page)).toHaveAttribute("data-theme", "light");
    // Los fondos de lo que se toca, claros
    for (const sel of [".seg", ".srch input", ".rail", ".stop:not([aria-current]) .num"]) {
      const bg = await style(cosecha(page).locator(sel).first(), "backgroundColor");
      expect(lum(bg), `${sel} a ${width}px: ${bg}`).toBeGreaterThan(.6);
    }
    // Y el texto, oscuro y legible sobre el pergamino de la página
    const page_ = lum(await style(root(page), "backgroundColor"));
    for (const sel of ["h2", ".sub", ".seg button", ".stop .lab", ".stH h3", ".stH small", ".cromo b", ".nav2 button"]) {
      const fg = lum(await style(cosecha(page).locator(sel).first(), "color"));
      const [a, b] = [fg, page_].sort((x, y) => y - x);
      expect((a + .05) / (b + .05), `${sel} a ${width}px`).toBeGreaterThanOrEqual(4.5);
    }
  }
  // En estrecho, el carril pegado es pergamino opaco
  expect(await style(cosecha(page).locator(".rail"), "backgroundColor")).toBe("rgb(251, 244, 230)");
});

test("en estrecho el interruptor va en la fila de Todo, Jefes y Archis, a la derecha", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCosecha(page);
  const type = await cosecha(page).getByRole("group", { name: "Tipo" }).boundingBox();
  const sw = await themeSwitch(page).boundingBox();
  const tools = await cosecha(page).locator(".tools").boundingBox();
  // En la misma fila
  expect(sw.y).toBeLessThan(type.y + type.height);
  expect(sw.y + sw.height).toBeGreaterThan(type.y);
  // Pegado al borde derecho de las herramientas
  expect(Math.abs(sw.x + sw.width - (tools.x + tools.width))).toBeLessThanOrEqual(1);
});

test("sin localStorage (modo privado estricto) el interruptor cambia el tema igual", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new Error("SecurityError"); } });
  });
  await openCosecha(page);
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
});

test("con movimiento reducido el interruptor cambia sin animar los huevos", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCosecha(page);
  await themeSwitch(page).click();
  await expect(root(page)).toHaveAttribute("data-theme", "light");
  expect(await style(themeSwitch(page).locator(".ts-egg").first(), "transitionDuration")).toMatch(/^0s/);
  await expect(themeSwitch(page)).not.toHaveClass(/\bpop\b/);
});
