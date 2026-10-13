import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Progreso guardado con la versión anterior de la guía (sin "silvestre:guide").
// En la v4: el 41 junta los antiguos 41 y 90, el 69 junta 69 y 70, el antiguo 75
// se reparte en los nuevos 74 a 77 y el antiguo 76 pasa a ser el 78.
const V3_DONE = { 1: true, 41: true, 90: true, 69: true, 75: true, 76: true, 88: true };

test("el progreso de la versión anterior se migra a la numeración nueva", async ({ page }) => {
  await openApp(page);
  // Como lo dejó la versión anterior: progreso guardado y sin marca de versión
  await page.evaluate(d => {
    localStorage.setItem("silvestre:done", JSON.stringify(d));
    localStorage.removeItem("silvestre:guide");
  }, V3_DONE);
  await page.reload();
  const done = await readLS(page, "silvestre:done");
  expect(Object.keys(done).map(Number).sort((a, b) => a - b)).toEqual([1, 41, 74, 75, 76, 77, 78]);
  expect(await page.evaluate(() => localStorage.getItem("silvestre:guide"))).toBe("4");
  // Al recargar no se vuelve a migrar
  await page.reload();
  expect(Object.keys(await readLS(page, "silvestre:done")).length).toBe(7);
});

test("el progreso ya migrado no se toca", async ({ page }) => {
  await openApp(page, { "silvestre:guide": "4", "silvestre:done": { 69: true, 90: true } });
  expect(await readLS(page, "silvestre:done")).toEqual({ 69: true, 90: true });
});

test("una copia de seguridad de la versión anterior se migra al restaurarla", async ({ page }) => {
  await openApp(page);
  await page.click("#resetBtn");
  const backup = { app: "silvestre-checklist", version: 1, exportedAt: "2026-01-01T00:00:00Z", data: { done: V3_DONE } };
  await page.setInputFiles("#rdFile", { name: "copia.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(backup)) });
  await expect.poll(async () => Object.keys(await readLS(page, "silvestre:done")).length).toBe(7);
  expect(await readLS(page, "silvestre:done")).toHaveProperty("78", true);
});
