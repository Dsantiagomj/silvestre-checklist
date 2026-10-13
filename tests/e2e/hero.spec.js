import { test, expect } from "@playwright/test";
import { openApp } from "./helpers.js";

const heroBg = page => page.locator(".hero").evaluate(el => getComputedStyle(el).getPropertyValue("--hero-bg"));

test("el fondo del hero es un mapa distinto en cada tema", async ({ page }) => {
  await openApp(page);
  // Oscuro: Refugio Silvestre. Claro: Mazmorra de los Escarahojas, un bosque de día.
  await expect.poll(() => heroBg(page)).toContain("223350028");
  await page.click("#themeBtn");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light", { timeout: 3_000 });
  await expect.poll(() => heroBg(page)).toContain("88080387");
  // Los dos mapas existen y cargan
  for (const id of ["223350028", "88080387"]) {
    const res = await page.request.get(`img/maps/1/${id}.jpg`);
    expect(res.ok()).toBe(true);
  }
});
