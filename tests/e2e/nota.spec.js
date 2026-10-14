import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test("la aclaración explica la pausa con un ejemplo real de la guía", async ({ page }) => {
  await openApp(page);
  const nota = page.locator("#nota");
  await expect(nota.locator(".nota-title")).toHaveText("Hasta tener que pasar X jefe de mazmorra");
  await expect(nota.locator(".nota-text")).toContainText("se terminan dos o más pasos a la vez");
  // Ejemplo: los pasos 43 y 44 se detienen ante Kodámade y el 45 los termina todos
  const steps = nota.locator(".nota-step");
  await expect(steps).toHaveText(["43", "44", "45"]);
  await expect(nota.locator(".nota-boss img")).toHaveAttribute("src", /monsters\/2088\.png$/);
  await expect(nota.locator("figcaption")).toContainText("Kodámade");
  // Cada paso del ejemplo abre su detalle
  await steps.nth(2).click();
  await expect(page.locator('.cell[data-n="45"]')).toHaveClass(/selected/);
});

test("la aclaración lleva a los pasos con pausa", async ({ page }) => {
  await openApp(page);
  await page.click("#notaSteps");
  await expect(page.locator("#searchInput")).toHaveValue("hasta tener que pasar");
  await expect(page.locator("#grid")).toBeInViewport();
});

test("la aclaración se cierra con Entendido y no vuelve a salir", async ({ page }) => {
  await openApp(page);
  await page.click("#notaClose");
  await expect(page.locator("#nota")).toBeHidden();
  await page.reload();
  await expect(page.locator("#nota")).toBeHidden();
});
