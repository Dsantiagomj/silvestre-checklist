import { test, expect } from "@playwright/test";
import fs from "node:fs";
import { openApp, readLS } from "./helpers.js";

const SEED = {
  "silvestre:done": { 1: true, 2: true, 3: true, 17: true, 19: true },
  "silvestre:prereqs": { l1: true, o1: true },
  "silvestre:owned": { 421: true, 306: true },
  "silvestre:questObjective": { 1905: 4 },
};

test("el diálogo muestra los conteos reales y exige elegir algo", async ({ page }) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  await expect(page.locator("#resetDialog")).toBeVisible();
  await expect(page.locator("#rdNSteps")).toHaveText("5");
  await expect(page.locator("#rdNPre")).toHaveText("2");
  // Solo se puede reiniciar el progreso de la guía: objetos y overlay no son opciones
  await expect(page.locator('#resetDialog input[name="owned"]')).toHaveCount(0);
  await expect(page.locator('#resetDialog input[name="overlay"]')).toHaveCount(0);
  await page.uncheck('#resetDialog input[name="steps"]');
  await page.uncheck('#resetDialog input[name="prereqs"]');
  await expect(page.locator("#rdConfirm")).toBeDisabled();
});

test("reiniciar borra solo lo elegido y se puede deshacer", async ({ page }) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  await page.click("#rdConfirm");
  await expect(page.locator("#toast")).toHaveClass(/show/, { timeout: 3_000 });
  await expect(page.locator("#resetDialog")).toBeHidden();
  await expect(page.locator(".cell.done")).toHaveCount(0);
  expect(await readLS(page, "silvestre:done")).toEqual({});
  expect(await readLS(page, "silvestre:prereqs")).toEqual({});
  expect(Object.keys(await readLS(page, "silvestre:owned"))).toHaveLength(2);
  await page.click("#toastAction");
  await expect(page.locator(".cell.done")).toHaveCount(5);
  expect(Object.keys(await readLS(page, "silvestre:done"))).toHaveLength(5);
});

test("la copia descargada se puede restaurar tras un reinicio", async ({ page }, info) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#rdBackup")]);
  const file = info.outputPath("copia.json");
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(backup.app).toBe("silvestre-checklist");
  expect(Object.keys(backup.data).sort()).toEqual(["done", "owned", "prereqs", "questObj", "questPos"]);

  await page.click("#rdConfirm");
  await expect(page.locator("#resetDialog")).toBeHidden({ timeout: 3_000 });
  await expect(page.locator(".cell.done")).toHaveCount(0);
  // El reinicio nunca toca los objetos conseguidos ni la posición del overlay
  expect(Object.keys(await readLS(page, "silvestre:owned"))).toHaveLength(2);
  expect(await readLS(page, "silvestre:questObjective")).toEqual({ 1905: 4 });

  await page.click("#resetBtn");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#rdRestore")]);
  await chooser.setFiles(file);
  await expect(page.locator("#toastTxt")).toHaveText("Copia restaurada.");
  await expect(page.locator(".cell.done")).toHaveCount(5);
  expect(await readLS(page, "silvestre:questObjective")).toEqual({ 1905: 4 });
});
