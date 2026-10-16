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

test("el overlay abre en mini con el objetivo actual, su /travel y dónde parar", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov")).toHaveAttribute("data-mode", "mini");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 1 /", { timeout: 15_000 });
  await expect(ov.locator(".ov-meta")).toContainText("misión 1 de");
  await expect(ov.locator(".ov-pct")).toHaveText(/^\d+(\.\d)?%$/);
  // El objetivo con el medallón del juego (no un emoji) y su /travel
  const now = ov.locator(".ov-now .obj-row");
  await expect(now.locator(".obj-med img")).toHaveCount(1);
  const first = await now.locator(".obj-t").textContent();
  await expect(ov.locator(".ov-stop")).toContainText("Hasta tener que pasar Kanigrula");

  // «Completar objetivo» avanza al objetivo siguiente, en el mismo estado que la página
  const qid = await ov.locator(".ov-now").getAttribute("data-qid");
  await ov.getByRole("button", { name: "✓ Completar objetivo" }).click();
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 2 /");
  await expect(now.locator(".obj-t")).not.toHaveText(first);
  expect((await readLS(page, "silvestre:questObjective"))[qid]).toBe(1);
  // Las flechas del objetivo van junto a «Objetivo 2 / N»; las del pie son de paso
  const meta = ov.locator(".ov-head .ov-meta");
  await expect(meta.getByRole("button", { name: "Objetivo anterior" })).toBeVisible();
  await meta.getByRole("button", { name: "Objetivo anterior" }).click();
  await expect(meta).toContainText("Objetivo 1 /");
  await expect(meta.getByRole("button", { name: "Objetivo anterior" })).toBeDisabled();
  await meta.getByRole("button", { name: "Objetivo siguiente" }).click();
  await expect(meta).toContainText("Objetivo 2 /");
  await expect(ov.locator(".ov-bar").getByRole("button", { name: "Paso 10" })).toBeVisible();
  await expect(ov.locator(".ov-bar").getByRole("button", { name: "Paso 12" })).toBeVisible();

  const chip = ov.locator(".ov-now .coord-chip").first();
  if (await chip.count()) {
    await chip.click();
    expect(await ov.evaluate(() => navigator.clipboard.readText())).toMatch(/^\/travel -?\d+,-?\d+$/);
  }
  expect(await noEmoji(ov)).toBe(true);
});

test("el overlay sigue el paso de la página y cambia de misión", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-qname")).toHaveText("El dragón blanco", { timeout: 10_000 });
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 1 / 16");
  await ov.click('[data-q="1"]');
  await expect(ov.locator(".ov-qname")).toHaveText("Examen de paso");
});

test("«Ver más» pasa a completo y se recuerda; «Reducir» vuelve a mini", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10) });
  let ov = await openOverlay(page, context);
  await expect(ov.getByRole("button", { name: "Ver todo" })).toHaveCount(0);
  await ov.getByRole("button", { name: "Ver más" }).click();
  await expect(ov.locator(".ov")).toHaveAttribute("data-mode", "full");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:overlayMode"))).toBe("full");
  await expect(ov.getByRole("tab")).toHaveText([/^Ahora/, /^Misiones/, /^Objetos/, /^Guía/]);

  // Cerrar y volver a abrir: sigue en completo
  await ov.close();
  ov = await openOverlay(page, context);
  await expect(ov.locator(".ov")).toHaveAttribute("data-mode", "full");
  await ov.getByRole("button", { name: "Reducir" }).click();
  await expect(ov.locator(".ov")).toHaveAttribute("data-mode", "mini");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:overlayMode"))).toBe("mini");
});

test("completo: «Ahora» con dónde parar, el objetivo y los dos siguientes", async ({ page, context }) => {
  await openApp(page, { "silvestre:done": upTo(10), "silvestre:overlayMode": "full" });
  const ov = await openOverlay(page, context);
  await expect(ov.getByRole("tab", { name: /^Ahora/ })).toHaveAttribute("aria-selected", "true");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-full-head")).toContainText("La viajera imprudente");
  await expect(ov.locator(".ov-tab-body .call.stop")).toContainText("Hasta tener que pasar Kanigrula");
  await expect(ov.locator(".ov-now .obj-row")).toHaveCount(1, { timeout: 15_000 });
  await expect(ov.locator(".ov-after .obj-row")).toHaveCount(2);
  expect(await noEmoji(ov)).toBe(true);
  // La zona es texto en su color, sin píldora ni punto; sin miniatura del mapa
  const zone = ov.locator(".ov-full-head .ov-zone");
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
  // El objetivo se completa también en completo, con sus flechas al lado
  const body = ov.locator(".ov-tab-body");
  await expect(body.getByRole("button", { name: "Objetivo anterior" })).toBeDisabled();
  await body.getByRole("button", { name: "✓ Completar objetivo" }).click();
  await expect(body.locator(".ov-meta")).toContainText("Objetivo 2 /");
  await body.getByRole("button", { name: "Objetivo anterior" }).click();
  await expect(body.locator(".ov-meta")).toContainText("Objetivo 1 /");
  await body.getByRole("button", { name: "Objetivo siguiente" }).click();
  await expect(body.locator(".ov-meta")).toContainText("Objetivo 2 /");
});

test("completo: «Misiones» es la lista del diario y «Completar» comparte el estado", async ({ page, context }) => {
  await openApp(page, { "silvestre:overlayMode": "full" });
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

test("completo: «Objetos» marca lo conseguido en la página y copia el nombre", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openApp(page, { "silvestre:overlayMode": "full" });
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

test("completo: «Guía» con el texto y sus avisos; un paso citado cambia el overlay, no la página", async ({ page, context }) => {
  await openApp(page, { "silvestre:overlayMode": "full" });
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

test("completo: el botón del pie marca el paso como el diario, con la línea «Además»", async ({ page, context }) => {
  const done = { ...upTo(16) };
  delete done[10];
  await openApp(page, { "silvestre:done": done, "silvestre:overlayMode": "full" });
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
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 1 /", { timeout: 15_000 });
  await ov.keyboard.press("ArrowDown");
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 2 /");
  await ov.keyboard.press("ArrowUp");
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 1 /");
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("12");
  await ov.keyboard.press("ArrowLeft");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await ov.keyboard.press(" ");
  await expect(page.locator('.diary-row[data-n="11"]')).toHaveClass(/done/);
});

test("sin las misiones cargadas, mini enseña el título del paso y dónde parar", async ({ page, context }) => {
  // El chunk de las misiones no llega: el overlay no tiene objetivo que enseñar
  await page.route(/quests[^/]*\.js$/, route => route.abort());
  await openApp(page, { "silvestre:done": upTo(10) });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await expect(ov.locator(".ov-qname")).toHaveText("La viajera imprudente");
  await expect(ov.locator(".ov-stop")).toContainText("Hasta tener que pasar Kanigrula");
  await expect(ov.locator(".ov-now")).toHaveCount(0);
  // Sin objetivo que completar, el botón del pie completa el paso
  await expect(ov.getByRole("button", { name: "✓ Completar objetivo" })).toHaveCount(0);
  await ov.locator(".ov-bar").getByRole("button", { name: "✓ Completar paso 11" }).click();
  await expect(page.locator('.diary-row[data-n="11"]')).toHaveClass(/done/);
});

test("mini y «Ahora» completan la misión en curso como el diario, y la cabecera enlaza la guía del paso", async ({ page, context }) => {
  await openApp(page);
  await openStep(page, 93);
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-qname")).toHaveText("El dragón blanco", { timeout: 10_000 });
  // La guía del logro del paso en Torrente Arcano, en otra pestaña
  const guide = ov.locator(".ov-head .ov-guide-link");
  await expect(guide).toHaveText("Guía");
  await expect(guide).toHaveAttribute("href", "https://www.torrentearcano.com/blanco-marfil");
  await expect(guide).toHaveAttribute("target", "_blank");
  await expect(guide).toHaveAttribute("rel", /noopener/);
  // «Completar» termina la misión en curso, en el mismo estado que la página, y pasa a la siguiente
  const done = ov.locator(".ov-head .q-done-btn");
  await expect(done).toHaveText("Completar");
  await done.click();
  await expect(page.locator("#journal .q-item").first().locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
  await expect(ov.locator(".ov-qname")).toHaveText("Examen de paso");
  // En completo, junto al nombre de la misión en «Ahora»
  await ov.getByRole("button", { name: "Ver más" }).click();
  const now = ov.locator(".ov-tab-body .q-done-btn");
  await expect(now).toHaveText("Completar");
  await now.click();
  await expect(page.locator("#journal .q-item").nth(1).locator(".q-done-btn")).toHaveAttribute("aria-pressed", "true");
});

test("en un paso de una sola misión obligatoria, el overlay no lleva «Completar» misión", async ({ page, context }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="4"] .row-main');
  await expect(page.locator("#journal .q-item")).toHaveCount(1, { timeout: 15_000 });
  const ov = await openOverlay(page, context);
  await expect(ov.locator(".ov-meta")).toContainText("Objetivo 1 /", { timeout: 15_000 });
  await expect(ov.locator(".q-done-btn")).toHaveCount(0);
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
  // Con la lista abierta, las flechas no cambian de paso; Escape la cierra
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("11");
  await ov.keyboard.press("Escape");
  await expect(picker).toHaveCount(0);
  await ov.keyboard.press("ArrowRight");
  await expect(ov.locator(".ov-num")).toHaveText("12");
  // Elegir uno lleva el overlay a ese paso y cierra la lista; también en completo
  await ov.getByRole("button", { name: "Ver más" }).click();
  await ov.locator(".ov-num").click();
  await picker.locator('.ov-pick[data-n="50"]').click();
  await expect(picker).toHaveCount(0);
  await expect(ov.locator(".ov-num")).toHaveText("50");
  await expect(page.locator("#journal .journal-num")).not.toHaveText("50");
});
