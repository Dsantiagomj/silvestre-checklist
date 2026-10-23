import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// La paleta del Silvestre es la de global.css: sin palette en su config.js, nada la cambia
// (el Hielos lleva la suya, tests/hielos). El acento lima en los botones, en los dos temas
const BUTTONS = ["#diaryNext", "#heroNextGo", "#overlayBtn"];
const bg = (page, sel) => page.locator(sel).evaluate(el => getComputedStyle(el).backgroundColor);

for (const [theme, accent, ink] of [["dark", "rgb(183, 220, 105)", "rgb(20, 34, 8)"], ["light", "rgb(166, 214, 90)", "rgb(20, 34, 8)"]]) {
  test(`el acento del Silvestre sigue siendo el lima en el tema ${theme === "dark" ? "oscuro" : "claro"}`, async ({ page }) => {
    await openApp(page, { "silvestre:theme": theme });
    for (const sel of BUTTONS) expect(await bg(page, sel)).toBe(accent);
    expect(await page.locator("#diaryNext").evaluate(el => getComputedStyle(el).color)).toBe(ink);
    await expect(page.locator("style[data-palette]")).toHaveCount(0);
  });
}
