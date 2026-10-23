import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * El diario compacto: filas bajas en una columna estrecha y, en pantallas bajas (menos
 * de 900 px de alto o de 901 de ancho, lib/screen.js), un detalle con primero qué hacer,
 * luego las notas en fichas que se despliegan, las misiones y los objetos, y el
 * estandarte en un distintivo junto al título. En pantallas altas, el detalle de antes
 * (screens.spec.js).
 */
test.use({ viewport: { width: 1280, height: 720 } });

const upTo = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [i + 1, true]));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const waitQuests = page => expect(page.locator("#journal .q-item").first()).toBeAttached({ timeout: 15_000 });

test("la lista es compacta: filas de unos 42 px en una columna de unos 300 px", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  const side = await page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().width);
  expect(side).toBeGreaterThanOrEqual(280);
  expect(side).toBeLessThanOrEqual(320);
  for (const n of [2, 5, 22]) {
    const h = await row(page, n).evaluate(el => el.getBoundingClientRect().height);
    expect(h, `fila ${n}`).toBeGreaterThanOrEqual(38);
    expect(h, `fila ${n}`).toBeLessThanOrEqual(46);
  }
  // En una pantalla ancha la columna crece: los títulos largos no se cortan tanto
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(() => page.locator(".diary-side").evaluate(el => el.getBoundingClientRect().width)).toBeGreaterThan(380);
  await page.setViewportSize({ width: 1440, height: 900 });
  // Sigue llevando la casilla, el número, el título, la zona y la etiqueta de cierre
  const r = row(page, 5);
  for (const sel of [".row-check", ".row-num", ".row-title", ".row-zone", ".row-closed"]) await expect(r.locator(sel), sel).toBeVisible();
  await expect(r.locator(".row-closed")).toHaveText("se cierra en el 22");
  // A 1440×900 caben más de 15 pasos a la vista
  const visible = await page.locator(".diary-list").evaluate(list => {
    const b = list.getBoundingClientRect();
    return [...list.querySelectorAll(".diary-row")].filter(el => {
      const r = el.getBoundingClientRect();
      return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
    }).length;
  });
  expect(visible).toBeGreaterThanOrEqual(15);
});

test("en pantalla baja el detalle va en orden: cabecera, qué hacer, notas, misiones y objetos", async ({ page }) => {
  await openApp(page);
  await row(page, 1).locator(".row-num").click();
  await waitQuests(page);
  const order = await page.locator("#journal").evaluate(j => [".journal-head", ".goal-guide", ".goal-calls", ".journal-quests", ".journal-needs"]
    .map(sel => j.querySelector(sel)).map(el => el && el.getBoundingClientRect().top));
  expect(order.every(Boolean), JSON.stringify(order)).toBe(true);
  for (let i = 1; i < order.length; i++) expect(order[i], `${i}`).toBeGreaterThan(order[i - 1]);
  await expect(page.locator("#journal .goal-guide-label")).toHaveText("Qué hacer");
});

test("la cabecera del paso lleva su título y una línea con zona, inicio, misiones y objetos", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(40) });
  await row(page, 41).locator(".row-num").click();
  await waitQuests(page);
  const meta = page.locator("#journal .journal-meta");
  await expect(page.locator("#journal .journal-title")).toHaveText("Negro ébano");
  await expect(meta).toContainText("Misiones de Mundo");
  await expect(meta).toContainText("Meriana");
  await expect(meta).toContainText("3 misiones");
  await expect(meta).toContainText(/\d+ objetos? que reunir/);
  await expect(page.locator("#journal .journal-head .journal-to-map")).toBeVisible();
});

test("las notas del paso son fichas en una línea que se despliegan al pulsarlas", async ({ page }) => {
  await openApp(page, { "silvestre:done": upTo(40) });
  await row(page, 41).locator(".row-num").click();
  const calls = page.locator("#journal .goal-calls .call");
  expect(await calls.count()).toBeGreaterThanOrEqual(3);
  // Plegadas: una sola línea
  const tops = await calls.evaluateAll(els => els.map(el => Math.round(el.getBoundingClientRect().top)));
  expect(new Set(tops).size).toBe(1);
  const tip = page.locator("#journal .call.tip");
  const head = tip.locator(".call-head");
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await expect(tip.locator(".call-body")).toBeHidden();
  await expect(tip.locator(".call-peek")).toBeVisible();
  await head.click();
  await expect(head).toHaveAttribute("aria-expanded", "true");
  const body = tip.locator(".call-body");
  await expect(body).toBeVisible();
  await expect(body).toContainText("Selocalipsis: Resonancia");
  expect(await head.getAttribute("aria-controls")).toBe(await body.getAttribute("id"));
  // Lo que lleva dentro se puede pulsar: el inciso lleva a su paso
  await expect(body.locator('.step-ref[data-n="93"]')).toBeVisible();
  // Con el teclado se pliega igual
  await head.focus();
  await page.keyboard.press("Enter");
  await expect(head).toHaveAttribute("aria-expanded", "false");
  await expect(body).toBeHidden();
  // «Se termina más adelante» lleva al paso que lo cierra
  const closed = page.locator("#journal .call.closedin");
  await closed.locator(".call-head").click();
  await closed.locator('.step-ref[data-n="91"]').click();
  await expect(page.locator("#journal .journal-num")).toHaveText("91");
});

test("las fichas se pliegan otra vez al cambiar de paso", async ({ page }) => {
  await openApp(page);
  await row(page, 34).locator(".row-num").click();
  await page.locator("#journal .call.tip .call-head").click();
  await expect(page.locator("#journal .call.tip .call-body")).toBeVisible();
  await row(page, 35).locator(".row-num").click();
  await row(page, 34).locator(".row-num").click();
  await expect(page.locator("#journal .call.tip .call-head")).toHaveAttribute("aria-expanded", "false");
});

test("las acciones del paso se quedan fijas al pie del detalle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openApp(page);
  await row(page, 1).locator(".row-num").click();
  await waitQuests(page);
  await page.locator(".diary-detail").evaluate(el => el.scrollTo(0, 300));
  await expect(page.locator("#journal .journal-cta")).toBeInViewport({ ratio: 1 });
  await expect(page.locator("#toggleBtn")).toBeVisible();
});

for (const [w, h] of [[1280, 720], [1279, 804]]) {
  test(`a ${w}×${h} (pantalla baja) el estandarte se queda en un distintivo de 48 px junto al título`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await openApp(page, { "silvestre:done": upTo(40) });
    await row(page, 41).locator(".row-num").click();
    await expect(page.locator("#journal .journal-top .journal-banner")).toBeHidden();
    // Solo el distintivo: el icono del logro junto al título sobra
    await expect(page.locator("#journal .journal-top .goal-ach")).toBeHidden();
    const badge = page.locator("#journal .journal-badge");
    await expect(badge).toBeVisible();
    await expect(badge.locator(".journal-badge-num")).toHaveText("41");
    await expect(badge.locator("img")).toHaveAttribute("src", /\.(png|webp|jpg)$/);
    const b = await badge.boundingBox();
    expect(Math.round(b.width)).toBe(48);
    expect(Math.round(b.height)).toBe(48);
    const title = await page.locator("#journal .journal-title").boundingBox();
    expect(title.x).toBeGreaterThan(b.x + b.width - 0.5);
    expect(Math.abs(title.y + title.height / 2 - (b.y + b.height / 2))).toBeLessThan(30);
    // Lo primero del detalle, qué hacer, a la vista sin desplazarlo
    await expect(page.locator("#journal .goal-guide")).toBeInViewport({ ratio: 1 });
  });
}

test("a 1920×1080 el detalle lleva el estandarte de siempre", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await openApp(page, { "silvestre:done": upTo(40) });
  await row(page, 41).locator(".row-num").click();
  await expect(page.locator("#journal .journal-top .journal-banner")).toBeVisible();
  await expect(page.locator("#journal .journal-badge")).toBeHidden();
  const banner = await page.locator("#journal .journal-top .journal-banner").boundingBox();
  expect(banner.width).toBeGreaterThan(120);
});
