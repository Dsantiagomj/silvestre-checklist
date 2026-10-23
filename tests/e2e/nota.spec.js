import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// La nota va siempre en un diálogo, que se abre desde el menú «⋯» o la «i» del paso
test.use({ viewport: { width: 1280, height: 720 } });

/** Abre la aclaración desde el menú «⋯» de la barra. */
async function openNota(page) {
  await page.click("#moreBtn");
  await page.click("#notaOpen");
  await expect(page.locator("#notaDialog")).toBeVisible();
}

test("la aclaración explica la pausa con un ejemplo real de la guía", async ({ page }) => {
  await openApp(page);
  await openNota(page);
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
  await expect(page.locator("#notaDialog")).toHaveAttribute("aria-labelledby", "notaTitle");
});

test("la aclaración no ocupa sitio en la página: se abre y se cierra en un diálogo", async ({ page }) => {
  // Aunque se cerrara en una versión anterior, sigue al alcance
  await openApp(page, { "silvestre:notaDismissed": "1" });
  await expect(page.locator("#nota")).toBeHidden();
  await openNota(page);
  await page.click("#notaClose");
  await expect(page.locator("#notaDialog")).toBeHidden();
  await openNota(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#notaDialog")).toBeHidden();
  // Escape cierra el diálogo y no el paso abierto
  await expect(page.locator("#journal")).toHaveCount(1);
});

test("la «i» junto a las notas de un paso con pausa abre la aclaración", async ({ page }) => {
  await openApp(page);
  // El 43 se para ante Kodámade; el 2 no se para ni lo termina otro
  await page.locator('.diary-row[data-n="2"] .row-num').click();
  await expect(page.locator("#journal .nota-open")).toHaveCount(0);
  await page.locator('.diary-row[data-n="43"] .row-num').click();
  const info = page.locator("#journal .nota-open");
  await expect(info).toHaveAttribute("aria-label", "Qué significa «hasta tener que pasar»");
  await info.click();
  await expect(page.locator("#notaDialog")).toBeVisible();
});

test("la aclaración lleva a los pasos con pausa", async ({ page }) => {
  await openApp(page);
  await openNota(page);
  await expect(page.locator("#notaSteps")).toHaveText("Ver los 33 pasos");
  await page.click("#notaSteps");
  await expect(page.locator("#notaDialog")).toBeHidden();
  await expect(page.locator("#searchInput")).toHaveValue("hasta tener que pasar");
  await expect(page.locator("#diary")).toBeInViewport();
});

/** Opacidad de la ✓ de cada casilla del ejemplo y filtro del retrato del jefe. */
const exampleState = page => page.locator(".nota-track").evaluate(track => ({
  checks: [...track.querySelectorAll(".nota-step")].map(el => Number(getComputedStyle(el, "::after").opacity)),
  boss: getComputedStyle(track.querySelector(".nota-boss img")).filter,
}));

test("el ejemplo se cuenta una vez al verlo: el jefe cae y la ✓ vuelve hacia atrás", async ({ page }) => {
  await openApp(page);
  await openNota(page);
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

  // Se detiene la animación y se salta a cada momento: no depende de lo rápida que vaya la máquina
  const at = ms => page.locator(".nota-track").evaluate((t, ms) => {
    for (const a of t.getAnimations({ subtree: true })) { a.pause(); a.currentTime = ms; }
  }, ms);
  const finish = () => page.locator(".nota-track").evaluate(t => {
    for (const a of t.getAnimations({ subtree: true })) a.finish();
  });

  // Pasar el ratón a mitad de la historia no la corta
  const run = Number(await page.locator(".nota-track").getAttribute("data-run"));
  await page.mouse.move(5, 5);
  await page.locator(".nota-example").hover();
  await expect(page.locator(".nota-track")).toHaveAttribute("data-run", String(run));
  // Terminada, pasar el ratón la rebobina con suavidad y la repite desde el principio
  await finish();
  await page.mouse.move(5, 5);
  await page.locator(".nota-example").hover();
  await expect(page.locator(".nota-track")).toHaveClass(/\brewind\b/);
  await expect(page.locator(".nota-track")).toHaveAttribute("data-run", String(run + 1));
  await expect(page.locator(".nota-track")).toHaveClass(/\bplay\b/);
  const pauses = () => page.locator(".nota-step.paused").evaluateAll(els =>
    els.map(el => Number(getComputedStyle(el, "::before").opacity)));

  // Al empezar no hay pausas: las deja el punto al pasar (43 a 0,5 s, 44 a 1,2 s)
  await at(100);
  expect(await pauses()).toEqual([0, 0]);
  await at(900);
  expect(await pauses()).toEqual([1, 0]);
  // Con las dos pausas puestas el jefe sigue en pie: hay tiempo para seguir la historia
  await at(2300);
  expect(await pauses()).toEqual([1, 1]);
  expect((await exampleState(page)).boss).not.toContain("grayscale(1)");
  // El jefe cae antes de que se marque nada
  await at(3500);
  expect(await exampleState(page)).toMatchObject({ checks: [0, 0, 0], boss: expect.stringContaining("grayscale(1)") });
  // El 45 primero, luego hacia atrás
  await at(4100);
  expect((await exampleState(page)).checks).toEqual([0, 0, 1]);
  await at(4800);
  expect((await exampleState(page)).checks).toEqual([0, 1, 1]);
  // Final: los tres con ✓, sin pausas, y se queda así
  await at(7000);
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
  expect(await pauses()).toEqual([0, 0]);
});

test("con movimiento reducido el ejemplo muestra directamente el final", async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  await openApp(page);
  await openNota(page);
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
  await expect(page.locator(".nota-marker")).toBeHidden();
  await ctx.close();
});

test("el rebobinado parte del final, sin saltar al principio", async ({ page }) => {
  await openApp(page);
  await openNota(page);
  await expect(page.locator(".nota-track")).toHaveClass(/\bplay\b/);
  await page.locator(".nota-track").evaluate(t => { for (const a of t.getAnimations({ subtree: true })) a.finish(); });
  // Congela las animaciones en el mismo instante en que empieza el rebobinado
  await page.locator(".nota-track").evaluate(t => {
    new MutationObserver((_, obs) => {
      if (!t.classList.contains("rewind")) return;
      for (const a of t.getAnimations({ subtree: true })) a.pause();
      obs.disconnect();
    }).observe(t, { attributes: true, attributeFilter: ["class"] });
  });
  await page.mouse.move(5, 5);
  await page.locator(".nota-example").hover();
  await expect(page.locator(".nota-track")).toHaveClass(/\brewind\b/);
  // Al empezar a rebobinar todo sigue como al final: ✓ visibles y el jefe en gris
  expect(await exampleState(page)).toMatchObject({ checks: [1, 1, 1], boss: expect.stringContaining("grayscale(1)") });
});

test("en pantalla alta la aclaración también va en el diálogo, no en la página", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openApp(page);
  await expect(page.locator(".hero")).toBeVisible();
  await expect(page.locator(".wrap > #nota")).toHaveCount(0);
  await expect(page.locator("#notaDialog")).toBeHidden();
  await openNota(page);
  await expect(page.locator("#notaDialog #nota")).toBeVisible();
  await expect(page.locator(".nota-track")).toHaveClass(/\bplay\b/);
  await page.click("#notaSteps");
  await expect(page.locator("#notaDialog")).toBeHidden();
  await expect(page.locator("#searchInput")).toHaveValue("hasta tener que pasar");
  await expect(page.locator("#diary")).toBeInViewport();
});
