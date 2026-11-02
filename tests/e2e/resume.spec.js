import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/**
 * Volver a la página la deja donde se dejó: la pestaña de la ventana, el paso abierto y,
 * a la vista, ese paso. La primera vez (nada guardado) la ventana abre los prerrequisitos.
 * Al recargar, el navegador devuelve la página adonde estaba; al abrirla de nuevo (otra
 * pestaña, otro día), la app lleva la página hasta el paso.
 */

const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const node = (page, n) => page.locator(`.map-node[data-n="${n}"]`);

/** Abre el diario y, en él, el paso n, como lo haría quien lo usa. */
async function openDiaryStep(page, n) {
  await openApp(page, null, { view: null });
  await page.click("#stepsViewDiary");
  await row(page, n).locator(".row-num").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
}

async function expectDiaryAt(page, n) {
  await expect(page.locator("#stepsViewDiary")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(row(page, n)).toHaveAttribute("aria-current", "step");
  await expect(row(page, n)).toBeInViewport();
  await expect(page.locator("#journal .journal-num")).toBeInViewport();
}

test("sin nada guardado, la ventana se abre en los prerrequisitos y la página no se mueve", async ({ page }) => {
  await openApp(page, null, { view: null });
  await expect(page.locator("#tabPrereqs")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#prereqs")).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(0);
});

test("quien ya tenía una pestaña guardada la conserva", async ({ page }) => {
  await openApp(page, null, { view: "map" });
  await expect(page.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
});

test("en el diario en el paso 75, al recargar sigue ahí y a la vista", async ({ page }) => {
  await openDiaryStep(page, 75);
  await page.reload();
  await expectDiaryAt(page, 75);
});

test("en el diario en el paso 75, otra pestaña con lo guardado vuelve a él y lo deja a la vista", async ({ page, context }) => {
  await openDiaryStep(page, 75);
  const again = await context.newPage();
  await page.close();
  await again.goto("");
  await expectDiaryAt(again, 75);
});

test("cerrar el navegador y volver otro día (lo guardado, en otro contexto) deja el paso 75 a la vista", async ({ page, context, browser }) => {
  await openDiaryStep(page, 75);
  const storageState = await context.storageState();
  await context.close();
  const later = await browser.newContext({ storageState, viewport: { width: 1440, height: 900 } });
  const again = await later.newPage();
  await again.goto("");
  await expectDiaryAt(again, 75);
  await later.close();
});

test("en el mapa con el paso 75 abierto, al volver la ficha y el sello están a la vista", async ({ page, context }) => {
  await openApp(page, null, { view: "map" });
  await node(page, 75).click();
  await expect(page.locator("#mapCard .journal-num")).toHaveText("75");
  const again = await context.newPage();
  await page.close();
  await again.goto("");
  await expect(again.locator("#stepsViewMap")).toHaveAttribute("aria-selected", "true");
  await expect(again.locator("#mapCard .journal-num")).toHaveText("75");
  await expect(node(again, 75)).toBeInViewport();
});

test("con movimiento reducido, la página llega al paso sin desplazamiento suave", async ({ page, context }) => {
  await openDiaryStep(page, 75);
  const again = await context.newPage();
  await page.close();
  await again.emulateMedia({ reducedMotion: "reduce" });
  await again.goto("");
  await expectDiaryAt(again, 75);
  // Ya llegó: no hay un desplazamiento en marcha
  const y = await again.evaluate(() => scrollY);
  await again.waitForTimeout(300);
  expect(await again.evaluate(() => scrollY)).toBe(y);
});

test("con un #ancla en la dirección, la página no se mueve hasta el paso guardado", async ({ page, context }) => {
  await openDiaryStep(page, 75);
  const again = await context.newPage();
  await page.close();
  await again.goto("#arriba");
  await expect(again.locator("#journal .journal-num")).toHaveText("75");
  await again.waitForTimeout(500);
  expect(await again.evaluate(() => scrollY)).toBe(0);
});

test.describe("en móvil", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("al volver al diario, el paso 75 queda a la vista en la lista, sin abrir la hoja", async ({ page, context }) => {
    await openApp(page);
    await row(page, 75).locator(".row-num").click();
    await expect(page.locator("#sheet")).toHaveClass(/open/);
    const again = await context.newPage();
    await page.close();
    await again.goto("");
    await expect(row(again, 75)).toHaveAttribute("aria-current", "step");
    await expect(row(again, 75)).toBeInViewport();
    await expect(again.locator("#sheet")).not.toHaveClass(/open/);
  });
});
