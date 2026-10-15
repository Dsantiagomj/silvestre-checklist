import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const range = (a, b) => Object.fromEntries(Array.from({ length: b - a + 1 }, (_, i) => [a + i, true]));
const node = (page, n) => page.locator(`.map-node[data-n="${n}"]`);

async function openMap(page, seed) {
  await openApp(page, seed);
  await page.click("#stepsViewMap");
  await expect(page.locator(".map-node")).toHaveCount(100);
  // Hasta que acaba el zoom entre vistas
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
}

/** La caja de un elemento cuando deja de moverse (animación de entrada, desplazamiento). */
async function stable(page, sel) {
  let last = null;
  for (let i = 0; i < 40; i++) {
    const box = await page.locator(sel).boundingBox();
    if (last && Math.abs(box.x - last.x) < 0.5 && Math.abs(box.y - last.y) < 0.5 && Math.abs(box.height - last.height) < 0.5) return box;
    last = box;
    await page.waitForTimeout(60);
  }
  return last;
}

/** El título del paso tal como lo dice el botón de su sello ("Paso 19: …"). */
const titleOf = async (page, n) =>
  (await node(page, n).getAttribute("aria-label")).replace(/^Paso \d+: /, "").replace(/ \(hecho\)$/, "");

test("el mapa recorre los 100 pasos y la elección se recuerda", async ({ page }) => {
  await openMap(page, { "silvestre:done": range(1, 32) });
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".diary-window")).toHaveCount(0);
  await expect(page.locator(".map-node.done")).toHaveCount(32);
  await expect(node(page, 33)).toHaveClass(/current/);
  // Los 12 Dofus del camino son hitos con su huevo; el Ocre en el 79 y la Piñata en el 99
  await expect(page.locator(".map-node .node-egg")).toHaveCount(12);
  await expect(node(page, 99).locator(".node-egg")).toHaveAttribute("src", /items\/23035\.png$/);
  await expect(node(page, 79).locator(".node-egg")).toHaveAttribute("src", /items\/23012\.png$/);
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
});

test("el camino es una curva continua y lo andado se enciende hasta el último paso hecho", async ({ page }) => {
  await openMap(page, { "silvestre:done": range(1, 23) });
  // Un solo trazo con curvas (no una línea quebrada) que pasa por los 100 pasos
  const d = await page.locator(".map-trail").getAttribute("d");
  expect(d).toMatch(/^M[\d.]+ [\d.]+ C/);
  expect(d.match(/C/g)).toHaveLength(99);
  // Lo andado: del primer paso al último hecho, y acaba justo en su sello
  const lit = page.locator(".map-trail-lit");
  await expect(lit).toHaveAttribute("data-to", "23");
  const gap = await page.evaluate(() => {
    const path = document.querySelector(".map-trail-lit");
    const end = path.getPointAtLength(path.getTotalLength());
    const el = document.querySelector('.map-node[data-n="23"]');
    return Math.hypot(end.x - parseFloat(el.style.left), end.y - parseFloat(el.style.top));
  });
  expect(gap).toBeLessThan(1);
  // Sin nada hecho no hay nada encendido
  await page.evaluate(() => localStorage.setItem("silvestre:done", "{}"));
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
  await expect(page.locator(".map-trail-lit")).toHaveCount(0);
});

test("el siguiente paso lleva «Estás aquí» y los hechos se encienden con su ✓", async ({ page }) => {
  await openMap(page, { "silvestre:done": range(1, 23) });
  await expect(page.locator(".map-here")).toHaveCount(1);
  await expect(node(page, 24).locator(".map-here")).toHaveText("Estás aquí");
  await expect(node(page, 24)).toHaveAttribute("aria-current", "step");
  // Elegir otro paso no mueve el «Estás aquí»
  await node(page, 40).click();
  await expect(node(page, 24).locator(".map-here")).toHaveCount(1);
  await expect(node(page, 40)).toHaveClass(/selected/);
  await expect(node(page, 23)).toHaveAttribute("aria-label", /\(hecho\)$/);
});

test("los Dofus son hitos grandes: encendidos si se tienen, apagados si no", async ({ page }) => {
  await openMap(page, { "silvestre:done": range(1, 23) });
  await expect(page.locator(".map-node.dofus")).toHaveCount(12);
  const big = await page.locator(".map-node.dofus:not(.current)").first().evaluate(el => el.offsetWidth);
  const small = await page.locator(".map-node:not(.dofus):not(.current)").first().evaluate(el => el.offsetWidth);
  expect(big).toBeGreaterThan(small);
  const grey = sel => page.locator(sel).first().evaluate(el => /grayscale\((1|0\.[5-9])/.test(getComputedStyle(el).filter));
  expect(await grey(".map-node.dofus.done .node-egg")).toBe(false);
  expect(await grey(".map-node.dofus:not(.done) .node-egg")).toBe(true);
});

test("al pasar el ratón por un paso sale su píldora con la figura, el número, el título y la zona", async ({ page }) => {
  await openMap(page);
  await node(page, 19).hover();
  const tip = page.locator("#mapTip");
  await expect(tip).toBeVisible();
  await expect(tip).toContainText("19");
  await expect(tip).toContainText(await titleOf(page, 19));
  await expect(tip).toContainText("Misiones de Mundo");
  await expect(tip.locator("img")).toHaveAttribute("alt", "Meriana");
  // Junto al paso, sin taparlo
  const a = await tip.boundingBox(), b = await node(page, 19).boundingBox();
  expect(a.x >= b.x + b.width - 2 || a.x + a.width <= b.x + 2).toBe(true);
  // Fuera del paso se va
  await page.mouse.move(5, 5);
  await expect(tip).toHaveCount(0);
});

test("la ficha del paso: estandarte, título, lo que se gana, la parada y lo que cierra", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  const card = page.locator("#mapCard");
  // El estandarte del paso, como en el diario
  await expect(card.locator(".journal-banner .journal-num")).toHaveText("34");
  await expect(card.locator(".journal-banner .journal-show-label")).not.toBeEmpty();
  await expect(card.locator(".map-card-title")).toHaveText(await titleOf(page, 34));
  await expect(card.locator(".map-card-zone")).toHaveText("Reino de Amakna");
  // Lo que se gana: el jefe que se pasa, con su retrato
  await expect(card.locator(".map-card-reward")).toContainText("Se pasa Lasoberaña");
  await expect(card.locator(".map-card-reward img")).toHaveAttribute("src", /monsters\/1267\.png$/);
  // Se resuelve solo: sin parada; cierra el 33, que se abre con su ficha
  await expect(card.locator(".map-card-line.stop")).toHaveCount(0);
  await expect(card.locator(".map-card-line.done")).toContainText("Lo que se resuelve");
  await expect(page.locator(".map-arc")).toHaveCount(1);
  // Lo que pide: sus misiones, en cuanto cargan (el 34 no pide objetos)
  await expect(card.locator(".map-card-meta")).toHaveText(/^\d+ misi(ón|ones)$/, { timeout: 15_000 });
  await card.locator('.map-card-line.done .step-chip[data-n="33"]').click();
  await expect(card.locator(".journal-num")).toHaveText("33");
  await expect(card.locator(".map-card-line.stop")).toContainText("Hasta dónde llegar");
  await expect(card.locator(".map-card-line.stop")).toContainText("Hasta tener que pasar Lasoberaña");
  await expect(card.locator(".map-card-line.stop img")).toHaveAttribute("src", /\.png$/);
  // Y se termina en el 34
  await expect(card.locator(".map-card-line.later")).toContainText("Se termina más adelante");
  await card.locator('.map-card-line.later .step-chip[data-n="34"]').click();
  await expect(card.locator(".journal-num")).toHaveText("34");
  // Marcar (con el 33, que cierra) y desmarcar
  await expect(card.locator(".map-card-done")).toHaveText("✓ Hecho, con el 33");
  await card.locator(".map-card-done").click();
  await expect(node(page, 34)).toHaveClass(/done/);
  await expect(node(page, 33)).toHaveClass(/done/);
  await expect(card.locator(".map-card-done")).toHaveText("Desmarcar");
  await card.locator(".map-card-done").click();
  await expect(node(page, 34)).not.toHaveClass(/done/);
  await expect(card.locator(".map-card-done")).toHaveText("✓ Hecho");
});

test("la ficha de un paso con Dofus dice que se gana, con su huevo", async ({ page }) => {
  await openMap(page);
  await node(page, 79).click();
  await expect(page.locator("#mapCard .map-card-reward")).toContainText("Se gana Dofus");
  await expect(page.locator("#mapCard .map-card-reward img")).toHaveAttribute("src", /items\/23012\.png$/);
  await node(page, 77).click();
  await expect(page.locator("#mapCard .map-card-line.stop img")).toHaveAttribute("src", /items\/84228\.png$/);
  await expect(page.locator("#mapCard")).not.toContainText("⛔");
  // Misiones y objetos que pide el paso
  await node(page, 1).click();
  await expect(page.locator("#mapCard .map-card-meta")).toHaveText(/^\d+ misi(ón|ones) · \d+ objetos?$/, { timeout: 15_000 });
});

test("«Abrir en el diario» cambia de vista con ese paso abierto", async ({ page }) => {
  await openMap(page);
  await node(page, 34).click();
  await page.click("#mapCard .map-card-open");
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#journal .journal-num")).toHaveText("34");
});

test("los pasos que pasan un jefe llevan su retrato junto al sello", async ({ page }) => {
  await openMap(page);
  await expect(node(page, 34).locator(".node-boss")).toHaveAttribute("src", /monsters\/1267\.png$/);
  await expect(node(page, 33).locator(".node-boss")).toHaveCount(0);
});

test("los sellos y la búsqueda apagan en el mapa lo que no coincide", async ({ page }) => {
  await openMap(page);
  await page.click("#zoneBtn");
  await page.click('#zoneSeals .seal[data-zone="Astrub"]');
  await expect(page.locator(".map-node.dimmed")).toHaveCount(98);
  await page.click("#zoneBtn");
  await page.locator("#zoneSeals .seal").first().click();
  await expect(page.locator(".map-node.dimmed")).toHaveCount(0);
  await page.fill("#searchInput", "5");
  await expect.poll(() => page.locator(".map-node.dimmed").count()).toBeGreaterThan(50);
  await expect(page.locator(".map-node:not(.dimmed)").first()).toBeVisible();
});

test("el mapa es un pergamino: oscuro en el tema oscuro y claro en el claro", async ({ page }) => {
  const lum = sel => page.locator(sel).evaluate(el => {
    const [r, g, b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).slice(0, 3).map(Number);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  });
  await openMap(page);
  await expect.poll(() => lum(".step-map")).toBeLessThan(0.25);
  // Cálido, como un pergamino: bastante más rojo que azul
  const warm = () => page.locator(".step-map").evaluate(el => {
    const [r, , b] = getComputedStyle(el).backgroundColor.match(/[\d.]+/g).map(Number);
    return r - b >= 12;
  });
  expect(await warm()).toBe(true);
  await page.evaluate(() => localStorage.setItem("silvestre:theme", "light"));
  await page.reload();
  await expect(page.locator(".map-node")).toHaveCount(100);
  await expect.poll(() => lum(".step-map")).toBeGreaterThan(0.75);
  expect(await warm()).toBe(true);
});

test("la ficha va junto a su paso, con la flecha hacia él, y nunca se sale del mapa", async ({ page }) => {
  await openMap(page);
  const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
  for (const n of [1, 9, 10, 30, 37, 55, 91, 100]) {
    await node(page, n).click();
    // Quieta: si no cabía, el mapa se ha desplazado hasta ella
    const card = await stable(page, "#mapCard");
    const box = await page.locator(".step-map-scroll").boundingBox();
    const at = await node(page, n).boundingBox();
    // Dentro de lo que se ve del mapa
    expect(card.x, `paso ${n}`).toBeGreaterThanOrEqual(box.x - 1);
    expect(card.x + card.width, `paso ${n}`).toBeLessThanOrEqual(box.x + box.width + 1);
    expect(card.y, `paso ${n}`).toBeGreaterThanOrEqual(box.y - 1);
    expect(card.y + card.height, `paso ${n}`).toBeLessThanOrEqual(box.y + box.height + 1);
    // Ni el paso ni sus vecinos quedan debajo
    for (const m of [n - 1, n, n + 1].filter(m => m >= 1 && m <= 100)) {
      expect(overlaps(card, await node(page, m).boundingBox()), `paso ${n}: la ficha tapa el ${m}`).toBe(false);
    }
    // La flecha apunta al paso: su punta cae junto al sello
    const arrow = await page.locator("#mapCard .map-card-arrow").boundingBox();
    const cx = arrow.x + arrow.width / 2, cy = arrow.y + arrow.height / 2;
    const dist = Math.hypot(cx - (at.x + at.width / 2), cy - (at.y + at.height / 2));
    expect(dist, `paso ${n}: flecha lejos`).toBeLessThan(at.width / 2 + 30);
    await page.keyboard.press("Escape");
  }
  // Y se puede seguir al siguiente con un clic
  await node(page, 24).click();
  await node(page, 25).click();
  await expect(page.locator("#mapCard .journal-num")).toHaveText("25");
});

test("desde el detalle del diario se vuelve al mapa con ese paso abierto", async ({ page }) => {
  await openApp(page);
  await page.click('.diary-row[data-n="34"] .row-main');
  await page.click("#journal .journal-to-map");
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#mapCard .journal-num")).toHaveText("34");
  await expect(node(page, 34)).toBeInViewport();
});

test("al volver al mapa con un paso lejano, lo desplaza hasta dejarlo a la vista", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await page.evaluate(() => document.getElementById("diary").scrollIntoView());
  await page.click('.diary-row[data-n="97"] .row-main');
  await page.click("#journal .journal-to-map");
  await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1, { timeout: 4000 });
  await expect(node(page, 97)).toBeInViewport({ timeout: 3000 });
  // La ficha acaba a la vista también
  await expect(page.locator("#mapCard")).toBeInViewport({ ratio: 0.95, timeout: 3000 });
});

test("sin nada guardado, los pasos se abren en el mapa y el selector va primero", async ({ page }) => {
  await openApp(page, null, { view: null });
  await expect(page.locator(".map-node")).toHaveCount(100);
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  const order = await page.locator(".steps-view [role=tab]").evaluateAll(bs => bs.map(b => b.id));
  expect(order).toEqual(["stepsViewMap", "stepsViewDiary"]);
});

test("nada sobresale recortado: ni el Dofus del primer paso, ni «Estás aquí», ni el marcador de zona", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, null, { view: null });
  await page.waitForTimeout(800);
  // Lo que asoma por arriba (huevo, «Estás aquí», marcador) cabe en su contenedor
  const room = (inner, outer) => page.evaluate(([i, o]) =>
    Math.round(document.querySelector(i).getBoundingClientRect().top - document.querySelector(o).getBoundingClientRect().top), [inner, outer]);
  expect(await room('.map-node[data-n="1"] .node-egg', ".step-map")).toBeGreaterThanOrEqual(6);
  expect(await room(".map-here", ".step-map")).toBeGreaterThanOrEqual(6);
  await page.click("#zoneBtn");
  await page.locator(".seal.here").hover();
  await page.waitForTimeout(300);
  expect(await room(".seal.here .seal-pin", "#zoneSeals")).toBeGreaterThanOrEqual(2);
});

test("la ficha del mapa se cierra al pulsar fuera o con Escape; otro paso la cambia", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page, null, { view: null });
  await page.waitForTimeout(500);
  await node(page, 34).click();
  await expect(page.locator("#mapCard")).toBeVisible();
  // Dentro de la ficha no se cierra
  await page.locator("#mapCard .map-card-title").click();
  await expect(page.locator("#mapCard")).toBeVisible();
  // Otro paso: la ficha pasa a ese paso
  await node(page, 35).click();
  await expect(page.locator("#mapCard .journal-num")).toHaveText("35");
  // Fuera: se cierra
  await page.locator("#diaryTitle").click();
  await expect(page.locator("#mapCard")).toHaveCount(0);
  await node(page, 34).click();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mapCard")).toHaveCount(0);
  // Con la ×, también
  await node(page, 34).click();
  await page.click("#mapCard .map-card-x");
  await expect(page.locator("#mapCard")).toHaveCount(0);
});

test("con el teclado: Intro abre la ficha con el foco dentro y Escape lo devuelve al paso", async ({ page }) => {
  await openMap(page);
  await node(page, 12).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#mapCard .journal-num")).toHaveText("12");
  await expect.poll(() => page.evaluate(() => !!document.activeElement.closest("#mapCard"))).toBe(true);
  await expect(page.locator("#mapCard")).toHaveAttribute("role", "dialog");
  await page.keyboard.press("Escape");
  await expect(page.locator("#mapCard")).toHaveCount(0);
  await expect(node(page, 12)).toBeFocused();
});

test("las barras de desplazamiento finas llevan los colores del tema, no los del sistema", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openMap(page);
  const colors = sel => page.locator(sel).first().evaluate(el => getComputedStyle(el).scrollbarColor);
  for (const theme of ["dark", "light"]) {
    await page.evaluate(t => document.documentElement.setAttribute("data-theme", t), theme);
    const [thumb, track] = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      const probe = v => { const d = document.createElement("div"); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; };
      return [probe("--line-2"), probe("--inset")];
    });
    expect(await colors(".step-map-scroll"), theme).toBe(`${thumb} ${track}`);
  }
});
