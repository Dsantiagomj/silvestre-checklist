import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

// El Silvestre en el sitio «Dofus Tools»: vive en silvestre/ y lleva encima la cabecera del
// sitio (src/site/shell/), fuera de la app. No se pega: al bajar, la barra de la ventana
// queda arriba del todo y nada la tapa

test("el Silvestre vive en silvestre/, con la cabecera del sitio encima de la app", async ({ page, baseURL }) => {
  const errors = await openApp(page);
  expect(new URL(page.url()).pathname).toMatch(/\/silvestre\/$/);
  const shell = page.locator("header.dt-shell");
  await expect(shell).toHaveCount(1);
  // Antes de la app, fuera de su raíz
  expect(await shell.evaluate(el => el.nextElementSibling?.id)).toBe("root");
  const box = await shell.boundingBox();
  expect(box.y).toBe(0);
  expect(box.height).toBeLessThanOrEqual(60);
  // La marca lleva a la raíz del sitio, la home; la página actual es el Silvestre
  const root = new URL("../", baseURL).href;
  expect(await shell.getByRole("link", { name: "Dofus Tools" }).evaluate(a => a.href)).toBe(root);
  const nav = shell.getByRole("navigation").getByRole("link");
  await expect(nav).toHaveCount(3);
  await expect(nav.nth(0)).toHaveAccessibleName("Dofus Silvestre");
  await expect(nav.nth(0)).toHaveAttribute("aria-current", "page");
  expect(await nav.nth(0).evaluate(a => a.href)).toBe(new URL("silvestre/", root).href);
  for (const i of [1, 2]) await expect(nav.nth(i)).not.toHaveAttribute("aria-current");
  expect(errors).toEqual([]);
});

test("la cabecera del sitio no se pega: al bajar, la barra de la ventana queda arriba y a la vista", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  await page.evaluate(() => scrollBy(0, 400));
  const bar = page.locator("#winBar");
  await expect.poll(() => bar.evaluate(el => Math.round(el.getBoundingClientRect().top))).toBeLessThanOrEqual(10);
  await expect(page.locator("header.dt-shell")).not.toBeInViewport();
  // Lo que se ve en medio de la barra es la barra
  expect(await bar.evaluate(el => {
    const r = el.getBoundingClientRect();
    return el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
  })).toBe(true);
});

test("sus favicons cargan: van con su build, que no lleva public/", async ({ page, request }) => {
  await openApp(page);
  for (const rel of ["icon", "apple-touch-icon"]) {
    for (const link of await page.locator(`link[rel="${rel}"]`).all()) {
      const href = await link.evaluate(l => l.href);
      expect((await request.get(href)).ok(), href).toBe(true);
    }
  }
});

test("el tema es de todo el sitio: se elige en la home y lo siguen el Silvestre y la cosecha", async ({ page, baseURL }) => {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  const html = page.locator("html");
  const sw = page.locator(".dt-shell").getByRole("switch");
  const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.goto(new URL("../", baseURL).href);
  await expect(page.locator(".home a.card")).toHaveCount(3);
  await expect(html).toHaveAttribute("data-theme", "dark");
  await sw.click();
  await expect(html).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  // La home en pergamino
  await expect.poll(bodyBg).toBe("rgb(244, 236, 220)");
  expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("light");

  await page.locator(".dt-shell").getByRole("link", { name: "Dofus Silvestre" }).click();
  await expect(page.locator(".diary-row, .map-node").first()).toBeVisible();
  await expect(html).toHaveAttribute("data-theme", "light");
  await expect(sw).toHaveAttribute("aria-checked", "false");
  await expect.poll(bodyBg).not.toBe("rgb(13, 14, 12)");

  await page.locator(".dt-shell").getByRole("link", { name: "La eterna cosecha" }).click();
  const widget = page.locator("#cosecha .cosecha");
  await expect(widget).toHaveAttribute("data-theme", "light");
  await expect(html).toHaveAttribute("data-theme", "light");
  // Cambiarlo aquí cambia el checklist de la shadow root y se guarda para todo el sitio
  await sw.click();
  await expect(widget).toHaveAttribute("data-theme", "dark", { timeout: 3_000 });
  await expect(html).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("dofus-tools:theme"))).toBe("dark");
  expect(errors).toEqual([]);
});
