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
