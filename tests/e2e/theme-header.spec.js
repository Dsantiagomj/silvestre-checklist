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

test("los botones de overlay y reinicio usan objetos del juego", async ({ page }) => {
  await openApp(page);
  for (const id of ["#overlayBtn", "#resetBtn"]) {
    const img = page.locator(`${id} img.btn-icon`);
    await expect.poll(() => img.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);
    await expect(img).toHaveAttribute("alt", "");
  }
  await expect(page.locator("#overlayBtn")).toHaveAttribute("aria-label", "Abrir overlay sobre el juego");
  await expect(page.locator("#resetBtn")).toHaveAttribute("aria-label", "Reiniciar progreso");
  // Al pasar el ratón, el reloj de arena se da la vuelta: rotate(180deg) = matrix(-1, 0, 0, -1, …)
  await page.hover("#resetBtn");
  await expect.poll(() => page.locator("#resetBtn img.btn-icon").evaluate(el => getComputedStyle(el).transform))
    .toMatch(/^matrix\(-1, [^,]+, [^,]+, -1/);
});

test("al dejar atrás el hero, el header muestra una barra de experiencia a todo el ancho", async ({ page }) => {
  await openApp(page, { "silvestre:done": { 1: true, 2: true, 3: true } });
  const pct = parseFloat(await page.locator("#heroPct").innerText());
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(page.locator("header")).toHaveClass(/show-progress/);
  const xp = page.locator("header .tb-xp");
  await expect(xp).toBeVisible();
  const [bar, header] = await Promise.all([xp.boundingBox(), page.locator("header").boundingBox()]);
  expect(bar.width).toBe(1440);
  expect(Math.abs((bar.y + bar.height) - (header.y + header.height))).toBeLessThanOrEqual(2);
  const fill = await page.locator("#sbFill").evaluate(el => el.style.width);
  expect(parseFloat(fill)).toBeCloseTo(pct, 1);
  await expect(page.locator("#sbPct")).toHaveText(`${pct}%`);
});

test("el progreso oculto del header no ocupa sitio", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await openApp(page);
  expect(await page.locator("header .tb-progress").evaluate(el => el.getBoundingClientRect().width)).toBeLessThanOrEqual(1);
  // Márgenes simétricos: el contenido del header cabe dentro de su relleno
  const left = await page.locator("header .brand").evaluate(el => el.getBoundingClientRect().left);
  const right = await page.locator("#resetBtn").evaluate(el => innerWidth - el.getBoundingClientRect().right);
  expect(right).toBeGreaterThanOrEqual(left - 2);

  // Al aparecer, el porcentaje se ve entero y todo sigue cabiendo
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect(page.locator("header")).toHaveClass(/show-progress/);
  // Se espera a la condición, no a un tiempo fijo: la transición tarda más con la máquina cargada
  await expect.poll(() => page.locator("header .tb-progress").evaluate(el => el.scrollWidth > el.clientWidth + 1))
    .toBe(false);
  await expect.poll(() => page.locator("#resetBtn").evaluate(el => innerWidth - el.getBoundingClientRect().right))
    .toBeGreaterThanOrEqual(left - 2);
  await ctx.close();
});
