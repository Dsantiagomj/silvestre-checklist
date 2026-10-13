import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

test("el interruptor alterna el tema y lo recuerda", async ({ page }) => {
  await openApp(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeBtn")).toHaveAttribute("aria-checked", "true");
  await page.click("#themeBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  await expect(page.locator("#themeBtn")).toHaveAttribute("aria-checked", "false");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:theme"))).toBe("light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("los huevos del interruptor cargan", async ({ page }) => {
  await openApp(page);
  for (const id of ["#tsLight", "#tsDark"]) {
    await expect.poll(() => page.locator(id).evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
  }
});

test("el header es transparente arriba, sólido al bajar y muestra el progreso tras el hero", async ({ page }) => {
  await openApp(page);
  const header = page.locator("header");
  await expect(header).not.toHaveClass(/is-scrolled/);
  await expect(header).not.toHaveClass(/show-progress/);
  await page.evaluate(() => window.scrollTo(0, 120));
  await expect(header).toHaveClass(/is-scrolled/);
  await expect(header).not.toHaveClass(/show-progress/);
  await page.evaluate(() => window.scrollTo(0, 1000));
  await expect(header).toHaveClass(/show-progress/);
});

test("la marca es un logotipo con la tipografía de Dofus y se lee entera", async ({ page }) => {
  await openApp(page);
  const brand = page.locator("header .brand");
  // 14 letras animables: "Dofus" + "Silvestre"
  await expect(brand.locator(".logo i")).toHaveCount(14);
  await expect.poll(() => page.evaluate(() => document.fonts.check('27px "Lilita One"'))).toBe(true);
  expect(await brand.locator(".logo").evaluate(el => getComputedStyle(el).fontFamily)).toContain("Lilita One");
  // Las letras sueltas se ocultan a lectores de pantalla; el nombre se anuncia completo
  await expect(brand.locator(".logo")).toHaveAttribute("aria-hidden", "true");
  await expect(page.getByText("Dofus Silvestre", { exact: true })).toHaveCount(1);
  await expect.poll(() => page.locator("#brandIcon").evaluate(img => img.naturalWidth)).toBeGreaterThan(0);
});
