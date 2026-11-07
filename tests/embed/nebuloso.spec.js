import { test, expect } from "@playwright/test";
import path from "node:path";
import { SITE, readLS, servePages } from "./harness.js";

// El embebido del Nebuloso (embed/nebuloso.js, npm run build:embed:nebuloso) en una página como
// la de Torrente Arcano en Squarespace (checklist-nebuloso): se monta en #nebuloso-root, carga
// sus trozos y las imágenes de GitHub Pages (las de la raíz) y guarda con su prefijo
const PAGE_URL = "https://www.torrentearcano.com/checklist-nebuloso";
const HARNESS = path.join(import.meta.dirname, "fixtures/squarespace-nebuloso.html");
const app = page => page.locator("#nebuloso-root");

async function openNebuloso(page) {
  const errors = [];
  const context = page.context();
  await context.route(`${SITE}**`, servePages);
  await context.route("https://www.torrentearcano.com/**", route =>
    route.request().url() === PAGE_URL
      ? route.fulfill({ status: 200, path: HARNESS, headers: { "content-type": "text/html; charset=utf-8" } })
      : route.fulfill({ status: 404, body: "" }));
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
  await page.addInitScript(() => {
    if (!localStorage.getItem("nebuloso:stepsView")) localStorage.setItem("nebuloso:stepsView", "diary");
  });
  await page.goto(PAGE_URL);
  await expect(app(page).locator(".diary-row")).toHaveCount(26, { timeout: 20_000 });
  return errors;
}

test("el Nebuloso se monta en #nebuloso-root con sus 26 pasos, sin errores", async ({ page }) => {
  const errors = await openNebuloso(page);
  expect(await app(page).evaluate(el => el.shadowRoot?.mode)).toBe("open");
  expect(await page.evaluate(() => document.querySelectorAll(".diary-row, .hero").length)).toBe(0);
  // Pantalla alta: el hero con su polvo de nebulosa y el Dofus de los Vigilantes en el camino
  await expect(app(page).locator(".hero")).toHaveClass(/\bfx-nebula\b/);
  const egg = app(page).locator('#winRoad .road-dofus[data-step="4"] img');
  await expect(egg).toHaveAttribute("src", `${SITE}img/items/23020.png`);
  expect(await egg.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  // La cabecera fija de la página: la barra de la ventana se pega debajo (--nebuloso-top)
  expect(await app(page).evaluate(el => getComputedStyle(el).getPropertyValue("--nebuloso-top"))).toBe("80px");
  // Su paleta va dentro de la shadow root: el acento lavanda en «Siguiente»
  expect(await app(page).locator("#diaryNext").evaluate(el => getComputedStyle(el).backgroundColor)).toBe("rgb(195, 177, 245)");
  expect(errors).toEqual([]);
});

test("marcar un paso del Nebuloso guarda con su prefijo, sin tocar los de los otros checklists", async ({ page }) => {
  await openNebuloso(page);
  await app(page).locator('.diary-row[data-n="1"] .row-check').click();
  await expect(app(page).locator('.diary-row[data-n="1"]')).toHaveClass(/done/);
  expect(await readLS(page, "nebuloso:done")).toEqual({ 1: true });
  expect(await readLS(page, "silvestre:done")).toBeNull();
  expect(await readLS(page, "hielos:done")).toBeNull();
});

test("trae los pasos del checklist clásico de Torrente Arcano (dofus_nebuloso_clean_v1)", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("dofus_nebuloso_clean_v1")) {
      localStorage.setItem("dofus_nebuloso_clean_v1",
        JSON.stringify({ checked: [true, true, true, ...Array(23).fill(false)], darkMode: true }));
    }
  });
  const errors = await openNebuloso(page);
  for (const n of [1, 2, 3]) await expect(app(page).locator(`.diary-row[data-n="${n}"]`)).toHaveClass(/done/);
  await expect(app(page).locator('.diary-row[data-n="4"]')).not.toHaveClass(/done/);
  // El clásico solo se lee
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem("dofus_nebuloso_clean_v1"))).checked.slice(0, 4))
    .toEqual([true, true, true, false]);
  expect(errors).toEqual([]);
});

test("en el embebido el tema sigue en el menú «⋯», con el Vigilantes y el Nebuloso, y se guarda en nebuloso:theme", async ({ page }) => {
  await openNebuloso(page);
  await app(page).locator("#moreBtn").click();
  const btn = app(page).locator("#themeBtn");
  await expect(btn).toHaveAttribute("aria-label", "Modo oscuro · Dofus Nebuloso");
  await expect(app(page).locator("#tsLight")).toHaveAttribute("src", `${SITE}img/items/23020.png`);
  await expect(app(page).locator("#tsDark")).toHaveAttribute("src", `${SITE}img/items/23016.png`);
  await btn.click();
  await expect(btn).toHaveAttribute("aria-label", "Modo claro · Dofus de los Vigilantes");
  await expect(app(page).locator(".app-root")).toHaveAttribute("data-theme", "light");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("nebuloso:theme"))).toBe("light");
});
