import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const EMOJI = /\p{Extended_Pictographic}/u;

/** Playwright no tiene Picture-in-Picture: el overlay se abre como popup. */
async function openOverlay(page, context) {
  const [ov] = await Promise.all([context.waitForEvent("page"), page.click("#overlayBtn")]);
  await expect(ov.locator(".ov")).toBeVisible({ timeout: 10_000 });
  return ov;
}

async function openStep(page, n) {
  await page.click(`.diary-row[data-n="${n}"] .row-main`);
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

const noEmoji = ov => ov.evaluate(re => !new RegExp(re, "u").test(document.body.textContent), EMOJI.source);

/** El nombre de la misión en curso, en «Ahora» (en su desplegable). */
const qname = ov => ov.locator(".ov-tab-body .ov-qsel-name");
/** «Objetivo 3 de 12», entre las flechas de objetivo. */
const objCount = ov => ov.locator(".ov-tab-body .ov-stepper-count");

test("el overlay tiene un solo modo: abre en «Ahora» con el paso entero, sin «Ver más» ni «Reducir»", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  // Un modo guardado de antes no cuenta, y se borra al abrir
  await openApp(page, { "silvestre:done": upTo(10), "silvestre:overlayMode": "mini" });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov")).not.toHaveAttribute("data-mode");
  await expect(ov.locator(".ov-mini-body")).toHaveCount(0);
  await expect(ov.locator(".ov-bar")).toHaveCount(0);
  await expect(ov.getByRole("button", { name: "Ver más" })).toHaveCount(0);
  await expect(ov.getByRole("button", { name: "Reducir" })).toHaveCount(0);
  await expect(ov.getByRole("tab")).toHaveText([/^Ahora/, /^Misiones/, /^Objetos/, /^Guía/]);
  await expect(ov.getByRole("tab", { name: /^Ahora/ })).toHaveAttribute("aria-selected", "true");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:overlayMode"))).toBeNull();
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-head")).toContainText("La viajera imprudente");
  await expect(ov.locator(".ov-pct")).toHaveText(/^\d+(\.\d)?%$/);
  await expect(ov.locator(".journal-cta .gbtn.go")).toBeVisible();
  // El objetivo con el medallón del juego (no un emoji) y su /travel
  await expect(ov.locator(".ov-now .obj-row .obj-med img")).toHaveCount(1, { timeout: 15_000 });
  const chip = ov.locator(".ov-now .coord-chip").first();
  if (await chip.count()) {
    await chip.click();
    expect(await ov.evaluate(() => navigator.clipboard.readText())).toMatch(/^\/travel -?\d+,-?\d+$/);
  }
  expect(await noEmoji(ov)).toBe(true);
});

test("el overlay sigue el paso de la página y cambia de misión con su desplegable", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await expect(qname(ov)).toHaveText("El dragón blanco", { timeout: 10_000 });
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 16");
  // «Misión» encima; el desplegable dice «1 de 10» y el nombre de la misión
  await expect(ov.locator(".ov-tab-body .ov-qhead .ov-label")).toHaveText("Misión");
  const sel = ov.locator(".ov-tab-body .ov-qsel");
  await expect(sel).toContainText("1 de 10");
  await expect(sel).toHaveAttribute("aria-haspopup", "listbox");
  await expect(sel).toHaveAttribute("aria-expanded", "false");
  // Las flechas pequeñas de misión ya no están
  await expect(ov.locator('[data-q]')).toHaveCount(0);
  const list = ov.getByRole("listbox", { name: "Misiones del paso" });
  await expect(list).toHaveCount(0);
  await sel.click();
  await expect(sel).toHaveAttribute("aria-expanded", "true");
  const opts = list.getByRole("option");
  await expect(opts).toHaveCount(10);
  await expect(opts.first()).toHaveText(/1 · El dragón blanco/);
  await expect(opts.nth(1)).toHaveText(/2 · Examen de paso/);
  await expect(opts.first()).toHaveAttribute("aria-selected", "true");
  await expect(opts.nth(1)).toHaveAttribute("aria-selected", "false");
  // Con la lista abierta, las flechas del teclado no cambian el objetivo; Escape la cierra
  await ov.keyboard.press("ArrowDown");
  await ov.keyboard.press("Escape");
  await expect(list).toHaveCount(0);
  await expect(sel).toHaveAttribute("aria-expanded", "false");
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 16");
  // Un clic fuera también la cierra
  await sel.click();
  await expect(list).toBeVisible();
  await ov.locator(".ov-head .ov-title").click();
  await expect(list).toHaveCount(0);
  // Elegir una lleva a esa misión y cierra la lista
  await sel.click();
  await list.getByRole("option", { name: /Examen de paso/ }).click();
  await expect(list).toHaveCount(0);
  await expect(qname(ov)).toHaveText("Examen de paso");
  await expect(sel).toContainText("2 de 10");
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 23");
  // Con el teclado: flechas entre las opciones e Intro elige
  await sel.click();
  await expect(list.getByRole("option", { name: /Examen de paso/ })).toBeFocused();
  await ov.keyboard.press("ArrowDown");
  await expect(list.getByRole("option", { name: /El Reino Gris/ })).toBeFocused();
  await ov.keyboard.press("Enter");
  await expect(list).toHaveCount(0);
  await expect(qname(ov)).toHaveText("El Reino Gris");
  await expect(ov.locator(".ov-num")).toHaveText("93");
});

test("en el desplegable, la misión completada sale tachada con su ✓", async ({ page, context }) => {
  await openApp(page, { "silvestre:questObjective": { 1905: 16 }, "silvestre:questPos": { 93: 1 } });
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await expect(qname(ov)).toHaveText("Examen de paso", { timeout: 10_000 });
  await ov.locator(".ov-tab-body .ov-qsel").click();
  const opts = ov.getByRole("listbox", { name: "Misiones del paso" }).getByRole("option");
  await expect(opts.first()).toHaveClass(/is-done/);
  await expect(opts.first().locator(".ov-qopt-ok")).toHaveText("✓");
  expect(await opts.first().locator(".ov-qopt-name").evaluate(el => getComputedStyle(el).textDecorationLine)).toBe("line-through");
  await expect(opts.nth(1)).not.toHaveClass(/is-done/);
  await expect(opts.nth(1).locator(".ov-qopt-ok")).toHaveText("");
});

test("«Ahora» con dónde parar, el objetivo y los dos siguientes", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(ov.getByRole("tab", { name: /^Ahora/ })).toHaveAttribute("aria-selected", "true");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-head")).toContainText("La viajera imprudente");
  await expect(ov.locator(".ov-tab-body .call.stop")).toContainText("Hasta tener que pasar Kanigrula");
  await expect(ov.locator(".ov-now .obj-row")).toHaveCount(1, { timeout: 15_000 });
  await expect(ov.locator(".ov-after .obj-row")).toHaveCount(2);
  expect(await noEmoji(ov)).toBe(true);
  // La zona es texto en su color, sin píldora ni punto; sin miniatura del mapa
  const zone = ov.locator(".ov-head .ov-zone");
  await expect(zone.locator("i")).toHaveCount(0);
  const look = await zone.evaluate(el => {
    const cs = getComputedStyle(el);
    const probe = el.ownerDocument.createElement("span");
    probe.style.color = cs.getPropertyValue("--zone-color");
    el.ownerDocument.body.append(probe);
    const want = getComputedStyle(probe).color;
    probe.remove();
    return { border: cs.borderTopWidth, color: cs.color, want };
  });
  expect(look.border).toBe("0px");
  expect(look.color).toBe(look.want);
  await expect(ov.locator(".ov-map")).toHaveCount(0);
  // Una barra bajo el objetivo: [◀ | Objetivo 1 de 15 | ▶] y «✓ Completar objetivo», todo a 40 px
  const body = ov.locator(".ov-tab-body");
  const bar = body.locator(".ov-objbar");
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 15");
  await expect(bar.locator(".ov-stepper")).toBeVisible();
  for (const el of [bar.locator(".ov-stepper"), bar.getByRole("button", { name: "✓ Completar objetivo" }), body.locator(".ov-qsel")]) {
    expect(Math.round((await el.boundingBox()).height)).toBe(40);
  }
  // El botón ocupa el resto de la fila, en la misma línea que las flechas
  const [stepBox, goBox] = [await bar.locator(".ov-stepper").boundingBox(), await bar.getByRole("button", { name: "✓ Completar objetivo" }).boundingBox()];
  expect(Math.round(goBox.y)).toBe(Math.round(stepBox.y));
  expect(goBox.width).toBeGreaterThan(stepBox.width);
  await expect(body.getByRole("button", { name: "Objetivo anterior" })).toBeDisabled();
  await body.getByRole("button", { name: "✓ Completar objetivo" }).click();
  await expect(objCount(ov)).toHaveText("Objetivo 2 de 15");
  await body.getByRole("button", { name: "Objetivo anterior" }).click();
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 15");
  await body.getByRole("button", { name: "Objetivo siguiente" }).click();
  await expect(objCount(ov)).toHaveText("Objetivo 2 de 15");
});

test("en el último objetivo, ▶ queda desactivado y no termina la misión", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10), "silvestre:questObjective": { 1473: 14 } });
  const ov = await openOverlay(page, context);
  await expect(objCount(ov)).toHaveText("Objetivo 15 de 15", { timeout: 15_000 });
  const body = ov.locator(".ov-tab-body");
  await expect(body.getByRole("button", { name: "Objetivo siguiente" })).toBeDisabled();
  await expect(body.getByRole("button", { name: "Objetivo anterior" })).toBeEnabled();
  await expect(qname(ov)).toHaveText("El acusado de la recepción");
});

test("«Misiones» es la lista del diario y «Completar» comparte el estado", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await ov.getByRole("tab", { name: /^Misiones/ }).click();
  expect(await page.evaluate(() => localStorage.getItem("silvestre:overlayTab"))).toBe("quests");
  const items = ov.locator(".ov-tab-body .q-item");
  await expect(items).toHaveCount(10, { timeout: 15_000 });
  const first = items.first();
  await first.locator(".q-done-btn").click();
  await expect(first.locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#journal .q-item").first().locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
  // Abrir una misión enseña su ruta de medallones
  await items.nth(1).locator("summary .q-name").click();
  await expect(items.nth(1).locator(".obj-list.route .obj-med").first()).toBeVisible();
  expect(await noEmoji(ov)).toBe(true);
});

test("«Objetos» marca lo conseguido en la página y copia el nombre", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  const tab = ov.getByRole("tab", { name: /^Objetos/ });
  await expect(tab.locator(".win-badge")).toHaveText("12");
  await tab.click();
  const slots = ov.locator(".ov-tab-body .slot");
  await expect(slots).toHaveCount(12);
  const id = await slots.first().getAttribute("data-id");
  await slots.first().locator(".slot-main").click();
  await expect(slots.first().locator(".slot-main")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(`#journal .journal-needs .slot[data-id="${id}"] .slot-main`)).toHaveAttribute("aria-pressed", "true");
  await expect(tab.locator(".win-badge")).toHaveText("11");
  // El nombre se copia desde la ventana del overlay, que es la que tiene el foco
  await slots.nth(1).locator(".slot-copy").click();
  const name = await slots.nth(1).locator(".slot-tip b").textContent();
  expect(name.startsWith(await ov.evaluate(() => navigator.clipboard.readText()))).toBe(true);
  expect(await noEmoji(ov)).toBe(true);
});

test("«Guía» con el texto y sus avisos; un paso citado cambia el overlay, no la página", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 58);
  const ov = await openOverlay(page, context);
  await ov.getByRole("tab", { name: /^Guía/ }).click();
  await expect(ov.locator(".ov-tab-body .journal-base")).not.toBeEmpty();
  // «Se retoma más adelante», con los pasos donde se retoman
  const resumed = ov.locator(".ov-tab-body .goal-calls .call.resumedin");
  await expect(resumed).toContainText("Se retoma más adelante");
  await expect(resumed.locator("i img")).toHaveCount(1);
  expect(await noEmoji(ov)).toBe(true);
  await resumed.locator('.step-ref[data-n="59"]').click();
  await expect(ov.locator(".ov-num")).toHaveText("59");
  await expect(page.locator("#journal .journal-num")).toHaveText("58");
  expect(await readLS(page, "silvestre:selectedStep")).toBe(58);
  // Si la página elige otro paso, el overlay vuelve a seguirla
  await page.bringToFront();
  await openStep(page, 60);
  await expect(ov.locator(".ov-num")).toHaveText("60");
});

test("el botón del pie marca el paso como el diario, con la línea «Además»", async ({ page, context }) => {
  const done = { ...upTo(16) };
  delete done[10];
  await openApp(page, { "silvestre:done": done });
  await openStep(page, 17);
  const ov = await openOverlay(page, context);
  const go = ov.locator(".journal-cta .gbtn.go");
  await expect(go).toHaveText("✓ Completar paso 17");
  await expect(ov.locator(".journal-cta .cta-also")).toHaveText(/^Además: en el 10 completa /);
  await go.click();
  await expect(page.locator('.diary-row[data-n="17"]')).toHaveClass(/done/);
  // Como en el diario: al 10 le faltan misiones, sigue pendiente y el aviso lo dice
  await expect(page.locator("#toast")).toContainText("El 10 sigue pendiente");
  // El overlay pasa al siguiente pendiente; la página sigue en el suyo
  await expect(ov.locator(".ov-num")).toHaveText("18");
  await expect(page.locator("#journal .journal-num")).toHaveText("17");
  await ov.locator(".journal-cta .gbtn").first().click();
  await expect(ov.locator(".ov-num")).toHaveText("17");
  await expect(go).toHaveText("Paso completado · deshacer");
});

test("el teclado del overlay: flechas para paso y objetivo, espacio marca el paso", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 15", { timeout: 15_000 });
  await ov.keyboard.press("ArrowDown");
  await expect(objCount(ov)).toHaveText("Objetivo 2 de 15");
  await ov.keyboard.press("ArrowUp");
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 15");
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("12");
  await ov.keyboard.press("ArrowLeft");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await ov.keyboard.press(" ");
  await expect(page.locator('.diary-row[data-n="11"]')).toHaveClass(/done/);
});

test("sin las misiones cargadas, «Ahora» enseña dónde parar y el pie completa el paso", async ({ page, context }) => {
  // El chunk de las misiones no llega: el overlay no tiene objetivo que enseñar
  await page.route(/quests[^/]*\.js$/, route => route.abort());
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-title")).toHaveText("La viajera imprudente");
  await expect(ov.locator(".ov-tab-body .call.stop")).toContainText("Hasta tener que pasar Kanigrula");
  await expect(ov.locator(".ov-now")).toHaveCount(0);
  // Sin objetivo que completar, el botón del pie completa el paso
  await expect(ov.getByRole("button", { name: "✓ Completar objetivo" })).toHaveCount(0);
  await ov.locator(".journal-cta").getByRole("button", { name: "✓ Completar paso 11" }).click();
  await expect(page.locator('.diary-row[data-n="11"]')).toHaveClass(/done/);
});

test("«Ahora» completa la misión en curso como el diario, y la cabecera enlaza la guía del paso", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await expect(qname(ov)).toHaveText("El dragón blanco", { timeout: 10_000 });
  // La guía del logro del paso en Torrente Arcano, en otra pestaña
  const guide = ov.locator(".ov-head .ov-guide-link");
  await expect(guide).toHaveText("Guía");
  await expect(guide).toHaveAttribute("href", "https://www.torrentearcano.com/blanco-marfil");
  await expect(guide).toHaveAttribute("target", "_blank");
  await expect(guide).toHaveAttribute("rel", /noopener/);
  // «Completar», junto al rótulo «Misión», la termina en el mismo estado que la página y pasa a la siguiente
  const done = ov.locator(".ov-tab-body .ov-qhead .q-done-btn");
  await expect(done).toHaveText("Completar");
  await done.click();
  await expect(page.locator("#journal .q-item").first().locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(qname(ov)).toHaveText("Examen de paso");
  await done.click();
  await expect(page.locator("#journal .q-item").nth(1).locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
});

test("en un paso de una sola misión obligatoria, el overlay también lleva «Completar» misión", async ({ page, context }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(1, { timeout: 15_000 });
  const ov = await openOverlay(page, context);
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 9", { timeout: 15_000 });
  await expect(ov.locator(".ov-tab-body .ov-qhead .q-done-btn")).toHaveText("Completar");
  // Una sola misión que recorrer: el desplegable dice «1 de 1» y no se abre
  await expect(ov.locator(".ov-tab-body .ov-qsel")).toContainText("1 de 1");
  await expect(ov.locator(".ov-tab-body .ov-qsel")).toBeDisabled();
  await expect(ov.locator(".ov-guide-link")).toHaveAttribute("href", "https://www.torrentearcano.com/barnabe-en-el-espacio");
});

test("pulsar el número del paso abre la lista de los 100 pasos para elegir otro", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await ov.locator(".ov-num").click();
  const picker = ov.locator(".ov-picker");
  await expect(picker).toBeVisible();
  await expect(picker.locator(".ov-pick")).toHaveCount(100);
  // Número y título; los hechos, marcados; el actual, señalado y a la vista
  await expect(picker.locator('.ov-pick[data-n="11"]')).toContainText("11");
  await expect(picker.locator('.ov-pick[data-n="11"]')).toContainText("La viajera imprudente");
  await expect(picker.locator('.ov-pick[data-n="11"]')).toHaveAttribute("aria-current", "step");
  await expect(picker.locator('.ov-pick[data-n="11"]')).toBeInViewport();
  await expect(picker.locator(".ov-pick.is-done")).toHaveCount(10);
  // Tapa también la cabecera del overlay
  expect(await ov.evaluate(() => !!document.elementFromPoint(40, 12)?.closest(".ov-picker"))).toBe(true);
  // Con la lista abierta, las flechas no cambian de paso; Escape la cierra
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await ov.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("12");
  // Elegir uno lleva el overlay a ese paso y cierra la lista
  await ov.locator(".ov-num").click();
  await picker.locator('.ov-pick[data-n="50"]').click();
  await expect(picker).toHaveCount(0);
  await expect(ov.locator(".ov-num")).toHaveText("50");
  await expect(page.locator("#journal .journal-num")).not.toHaveText("50");
});

test("la ventana se abre una vez a 400×680 y no cambia de tamaño; en una ventana baja se desplaza el cuerpo", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10) });
  // Se mira con qué tamaño pide la ventana la página, sea Picture-in-Picture o popup
  await page.evaluate(() => {
    window.__sizes = [];
    const pip = window.documentPictureInPicture;
    if (pip) {
      const request = pip.requestWindow.bind(pip);
      pip.requestWindow = opts => { window.__sizes.push(`${opts.width}x${opts.height}`); return request(opts); };
    }
    const open = window.open;
    window.open = (url, name, features) => {
      const m = /width=(\d+),height=(\d+)/.exec(features || "");
      if (m) window.__sizes.push(`${m[1]}x${m[2]}`);
      return open.call(window, url, name, features);
    };
  });
  const ov = await openOverlay(page, context);
  expect(new Set(await page.evaluate(() => window.__sizes))).toEqual(new Set(["400x680"]));
  await ov.evaluate(() => {
    window.__resized = 0;
    window.resizeTo = () => { window.__resized++; };
    window.resizeBy = () => { window.__resized++; };
  });
  await ov.setViewportSize({ width: 340, height: 230 });
  await expect(ov.locator(".ov-now .obj-row")).toHaveCount(1, { timeout: 15_000 });
  // Cabecera, pestañas y pie a la vista; lo de en medio se desplaza
  await expect(ov.locator(".ov-head")).toBeInViewport();
  await expect(ov.locator(".journal-cta .gbtn.go")).toBeInViewport();
  const body = await ov.locator(".ov-tab-body").evaluate(el => ({ sh: el.scrollHeight, ch: el.clientHeight, ov: getComputedStyle(el).overflowY }));
  expect(body.ov).toBe("auto");
  expect(body.sh).toBeGreaterThan(body.ch);
  // Cambiar de pestaña o de paso tampoco la redimensiona
  await ov.getByRole("tab", { name: /^Misiones/ }).click();
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("12");
  expect(await ov.evaluate(() => window.__resized)).toBe(0);
});

test("a 400 px el título largo del paso cabe en dos líneas, sin cortarse", async ({ page, context }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-main');
  const ov = await openOverlay(page, context);
  await ov.setViewportSize({ width: 400, height: 680 });
  const title = ov.locator(".ov-head .ov-title");
  await expect(title).toHaveText("Krosmoz: Misión: Barnabé en el espacio");
  const box = await title.evaluate(el => ({
    sw: el.scrollWidth, cw: el.clientWidth, sh: el.scrollHeight, ch: el.clientHeight,
    lines: Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)),
  }));
  expect(box.sw).toBeLessThanOrEqual(box.cw);
  expect(box.sh).toBeLessThanOrEqual(box.ch);
  expect(box.lines).toBeLessThanOrEqual(2);
});

test("tras el último objetivo, la misión queda «Misión completada» y «Siguiente misión» lleva a la otra", async ({ page, context }) => {
  // Paso 80: «La última piedra» (33 objetivos) y «Alma máster»; en el último objetivo de la primera
  await openApp(page, { "silvestre:done": upTo(79), "silvestre:questObjective": { 1782: 32 } });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-num")).toHaveText("80");
  await expect(objCount(ov)).toHaveText("Objetivo 33 de 33", { timeout: 15_000 });
  const body = ov.locator(".ov-tab-body");
  const go = body.getByRole("button", { name: "✓ Completar objetivo" });
  await go.click();
  // La misión no se va: el botón queda apagado, sin verde, y el objetivo atenuado
  const doneBtn = body.getByRole("button", { name: "✓ Misión completada" });
  await expect(doneBtn).toBeDisabled();
  await expect(doneBtn).not.toHaveClass(/\bgo\b/);
  await expect(go).toHaveCount(0);
  await expect(body.locator(".ov-stepper")).toHaveCount(0);
  await expect(body.locator(".ov-now")).toHaveClass(/is-done/);
  await expect(qname(ov)).toHaveText("La última piedra");
  await expect(body.locator(".ov-qhead .q-done-btn")).toHaveAttribute("aria-pressed", "true");
  expect(Math.round((await doneBtn.boundingBox()).height)).toBe(40);
  // «Siguiente misión ▶» pasa a la siguiente, que sigue por su primer objetivo
  const next = body.getByRole("button", { name: /Siguiente misión/ });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(qname(ov)).toHaveText("Alma máster");
  await expect(body.locator(".ov-qsel")).toContainText("2 de 2");
  await expect(objCount(ov)).toHaveText("Objetivo 1 de 30");
  await expect(body.getByRole("button", { name: "✓ Completar objetivo" })).toBeEnabled();
  // En el desplegable, la primera sale tachada con su ✓
  await body.locator(".ov-qsel").click();
  const first = ov.getByRole("listbox", { name: "Misiones del paso" }).getByRole("option").first();
  await expect(first).toHaveClass(/is-done/);
  await expect(first.locator(".ov-qopt-ok")).toHaveText("✓");
  // Volver a la terminada enseña otra vez «Misión completada»
  await first.click();
  await expect(body.getByRole("button", { name: "✓ Misión completada" })).toBeDisabled();
});

test("en la última misión del paso, terminada, solo queda «Misión completada»", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(79), "silvestre:questPos": { 80: 1 }, "silvestre:questObjective": { 1782: 33, 1784: 29 } });
  await openStep(page, 80);
  const ov = await openOverlay(page, context);
  await expect(qname(ov)).toHaveText("Alma máster", { timeout: 15_000 });
  await expect(objCount(ov)).toHaveText("Objetivo 30 de 30");
  const body = ov.locator(".ov-tab-body");
  await body.getByRole("button", { name: "✓ Completar objetivo" }).click();
  // Con todas sus misiones hechas el paso queda hecho solo y el overlay sigue en él
  await expect(page.locator('.diary-row[data-n="80"]')).toHaveClass(/done/);
  await expect(ov.locator(".ov-num")).toHaveText("80");
  await expect(body.getByRole("button", { name: "✓ Misión completada" })).toBeDisabled();
  await expect(body.getByRole("button", { name: /Siguiente misión/ })).toHaveCount(0);
  await expect(body.getByRole("button", { name: "✓ Completar objetivo" })).toHaveCount(0);
});
