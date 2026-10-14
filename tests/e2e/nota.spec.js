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

  // Se detiene la animación y se salta a cada momento: no depende de lo rápida que vaya la máquina
  const at = ms => page.locator(".nota-track").evaluate((t, ms) => {
    for (const a of t.getAnimations({ subtree: true })) { a.pause(); a.currentTime = ms; }
  }, ms);
  const pauses = () => page.locator(".nota-step.paused").evaluateAll(els =>
    els.map(el => Number(getComputedStyle(el, "::before").opacity)));

  // Al empezar no hay pausas: las deja el punto al pasar (43 a 0,5 s, 44 a 1,2 s)
  await at(100);
  expect(await pauses()).toEqual([0, 0]);
  await at(900);
  expect(await pauses()).toEqual([1, 0]);
  // Con las dos pausas puestas el jefe sigue en pie: hay tiempo para seguir la historia
  await at(2500);
  expect(await pauses()).toEqual([1, 1]);
  expect((await exampleState(page)).boss).not.toContain("grayscale(1)");
  // El jefe cae antes de que se marque nada
  await at(4700);
  expect(await exampleState(page)).toMatchObject({ checks: [0, 0, 0], boss: expect.stringContaining("grayscale(1)") });
  // El 45 primero, luego hacia atrás
  await at(5300);
  expect((await exampleState(page)).checks).toEqual([0, 0, 1]);
  await at(6000);
  expect((await exampleState(page)).checks).toEqual([0, 1, 1]);
  // Final: los tres con ✓, sin pausas, y se queda así
  await at(8000);
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
  expect(await pauses()).toEqual([0, 0]);
});

test("con movimiento reducido el ejemplo muestra directamente el final", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await openApp(page);
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
  await expect(page.locator(".nota-marker")).toBeHidden();
  await ctx.close();
});
