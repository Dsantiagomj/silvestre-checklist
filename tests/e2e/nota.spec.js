import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

test("la aclaración es una tarjeta que explica y lleva a los pasos afectados", async ({ page }) => {
  await openApp(page);
  const nota = page.locator("#nota");
  await expect(nota.locator(".nota-title")).toHaveText("Hasta tener que pasar X jefe de mazmorra");
  // El texto de Sandglass se mantiene tal cual
  await expect(nota).toContainText("significa dejar pausada esa misión y no vencer al jefe en ese punto");
  await expect(nota.locator(".nota-art img")).toHaveAttribute("src", /items\/84716\.png$/);
  // Los 33 pasos que usan esa instrucción, a un clic
  const go = nota.locator("#notaSteps");
  await expect(go).toHaveText("Ver los 33 pasos");
  await go.click();
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
