import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test("la aclaración explica la pausa con un ejemplo real de la guía", async ({ page }) => {
  await openApp(page);
  const nota = page.locator("#nota");
  await expect(nota.locator(".nota-title")).toHaveText("Hasta tener que pasar X jefe de mazmorra");
  await expect(nota.locator(".nota-text")).toHaveText(
    "Ahí el paso queda en pausa: puedes avanzar en la mazmorra hasta la sala del jefe y abandonarla. " +
    "Un paso posterior te pedirá pasar y completar esa misma mazmorra, y al hacerlo se terminan dos o más pasos a la vez.");
  // Ejemplo: los pasos 43 y 44 se detienen ante Kodámade y el 45 los termina todos
  const steps = nota.locator(".nota-step");
  await expect(steps).toHaveText(["43", "44", "45"]);
  await expect(nota.locator(".nota-boss img")).toHaveAttribute("src", /monsters\/2088\.png$/);
  await expect(nota.locator("figcaption")).toContainText("Kodámade");
  // El ejemplo es solo una ilustración: nada en él se puede pulsar
  await expect(nota.locator(".nota-example button")).toHaveCount(0);
  // Sin líneas encima ni debajo: el hero y los prerrequisitos ya tienen las suyas
  for (const side of ["borderTopStyle", "borderBottomStyle"]) {
    expect(await nota.evaluate((el, p) => getComputedStyle(el)[p], side)).toBe("none");
  }
});

test("la aclaración lleva a los pasos con pausa", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("#notaSteps")).toHaveText("Ver los 33 pasos");
  await page.click("#notaSteps");
  await expect(page.locator("#searchInput")).toHaveValue("hasta tener que pasar");
  await expect(page.locator("#grid")).toBeInViewport();
});

test("la aclaración siempre está visible y no se puede cerrar", async ({ page }) => {
  // Aunque se cerrara en una versión anterior, ya no se oculta
  await openApp(page, { "silvestre:notaDismissed": "1" });
  await expect(page.locator("#nota")).toBeVisible();
  await expect(page.locator("#notaClose")).toHaveCount(0);
});

/** Opacidad de la ✓ de cada casilla del ejemplo y filtro del retrato del jefe. */
const exampleState = page => page.locator(".nota-track").evaluate(track => ({
  checks: [...track.querySelectorAll(".nota-step")].map(el => Number(getComputedStyle(el, "::after").opacity)),
  boss: getComputedStyle(track.querySelector(".nota-boss img")).filter,
}));

test("el ejemplo se cuenta una vez al verlo: el jefe cae y la ✓ vuelve hacia atrás", async ({ page }) => {
  await openApp(page);
  await page.locator("#nota").scrollIntoViewIfNeeded();
  await expect(page.locator(".nota-track")).toHaveClass(/\bplay\b/);
  await expect(page.locator(".nota-marker")).toHaveCount(1);
  // El punto va por el camino, por detrás de las casillas y del retrato
  const z = await page.locator(".nota-track").evaluate(t => ({
    marker: Number(getComputedStyle(t.querySelector(".nota-marker")).zIndex) || 0,
    step: Number(getComputedStyle(t.querySelector(".nota-step")).zIndex) || 0,
    boss: Number(getComputedStyle(t.querySelector(".nota-boss")).zIndex) || 0,
  }));
  expect(z.marker).toBeLessThan(z.step);
  expect(z.marker).toBeLessThan(z.boss);
  // Pasar el ratón la repite desde el principio
  const run = Number(await page.locator(".nota-track").getAttribute("data-run"));
  await page.locator(".nota-example").hover();
  await expect(page.locator(".nota-track")).toHaveAttribute("data-run", String(run + 1));
  // La pausa aparece en cada casilla cuando el punto pasa por ella, no antes
  const pauses = () => page.locator(".nota-step.paused").evaluateAll(els =>
    els.map(el => Number(getComputedStyle(el, "::before").opacity)));
  expect(await pauses()).toEqual([0, 0]);
  await expect.poll(pauses, { timeout: 2_000 }).toEqual([1, 1]);
  // Da tiempo a seguirla: a los 2 s todavía no ha caído el jefe
  await page.waitForTimeout(500);
  expect((await exampleState(page)).boss).not.toContain("grayscale(1)");
  // Al terminar: los tres pasos con ✓ y el jefe vencido, y se queda así
  await expect.poll(() => exampleState(page), { timeout: 10_000 })
    .toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
});

test("con movimiento reducido el ejemplo muestra directamente el final", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await openApp(page);
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
  await expect(page.locator(".nota-marker")).toBeHidden();
  await ctx.close();
});
