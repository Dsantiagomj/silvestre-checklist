import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

/** Lo que se ve de un buscador: su caja, la letra, el icono y el aro al enfocarlo. */
const look = (page, id) => page.evaluate(id => {
  const input = document.getElementById(id);
  const box = input.closest(".search-field");
  const cs = getComputedStyle(input);
  return {
    inField: !!box,
    icon: !!box?.querySelector(".search-field-ic"),
    font: cs.font, radius: cs.borderRadius, height: input.offsetHeight,
    paddingLeft: cs.paddingLeft, background: cs.backgroundColor, border: cs.borderColor,
    placeholder: getComputedStyle(input, "::placeholder").color,
  };
}, id);
const ring = (page, id) => page.evaluate(id => {
  const input = document.getElementById(id);
  input.focus();
  const cs = getComputedStyle(input);
  return { shadow: cs.boxShadow, border: cs.borderColor };
}, id);

for (const theme of ["dark", "light"]) {
  test(`los buscadores de pasos y de objetos son el mismo control (${theme})`, async ({ page }) => {
    await page.addInitScript(t => localStorage.setItem("silvestre:theme", t), theme);
    await openApp(page);
    const steps = await look(page, "searchInput");
    const stepsRing = await ring(page, "searchInput");
    await page.click("#tabItems");
    await expect(page.locator(".steps-stage > .steps-layer")).toHaveCount(1);
    const items = await look(page, "needsSearch");
    const itemsRing = await ring(page, "needsSearch");
    expect(steps.inField && steps.icon).toBe(true);
    expect(items).toEqual(steps);
    expect(itemsRing).toEqual(stepsRing);
  });
}

test("el buscador de pasos se borra con su × y con Escape, y dice cuántos coinciden", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#searchClear")).toHaveCount(0);
  await page.fill("#searchInput", "Lasoberaña");
  await expect(page.locator("#searchMatches")).toHaveText(/^\d+ de 100$/);
  await page.click("#searchClear");
  await expect(page.locator("#searchInput")).toHaveValue("");
  await expect(page.locator("#searchInput")).toBeFocused();
  await expect(page.locator(".diary-row")).toHaveCount(100);
  await page.fill("#searchInput", "Lasoberaña");
  await page.press("#searchInput", "Escape");
  await expect(page.locator("#searchInput")).toHaveValue("");
});

test("los interruptores de varias opciones se ven igual en toda la ventana", async ({ page }) => {
  await openApp(page);
  const pressed = sel => page.locator(`${sel} [aria-pressed="true"]`).first().evaluate(el => {
    const cs = getComputedStyle(el), track = getComputedStyle(el.parentElement);
    return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, weight: cs.fontWeight,
      trackBg: track.backgroundColor, trackBorder: track.borderColor, trackRadius: track.borderRadius };
  });
  const diary = await pressed(".diary-tabs");
  await page.click("#tabItems");
  await page.click('.needs-view [data-view="list"]');
  // Tras el cambio de color de la opción pulsada
  await page.waitForTimeout(400);
  const sort = await pressed(".needs-sort");
  const view = await pressed(".needs-view");
  const size = await pressed(".pager-size");
  for (const other of [sort, view, size]) expect(other).toEqual(diary);
});
