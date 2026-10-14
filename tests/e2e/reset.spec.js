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
  // Los objetos cuentan lo mismo que en el hero; la posición del overlay no es una opción
  await expect(page.locator("#rdNOwned")).toHaveText(await page.locator("#statOwned").textContent());
  await expect(page.locator('#resetDialog input[name="overlay"]')).toHaveCount(0);
  await page.uncheck('#resetDialog input[name="steps"]');
  await page.uncheck('#resetDialog input[name="prereqs"]');
  await page.uncheck('#resetDialog input[name="owned"]');
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
  expect(await readLS(page, "silvestre:owned")).toEqual({});
  await page.click("#toastAction");
  await expect(page.locator(".cell.done")).toHaveCount(5);
  expect(Object.keys(await readLS(page, "silvestre:done"))).toHaveLength(5);
  expect(Object.keys(await readLS(page, "silvestre:owned"))).toHaveLength(2);
});

test("la copia descargada se puede restaurar tras un reinicio", async ({ page }, info) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#rdBackup")]);
  const file = info.outputPath("copia.json");
  await download.saveAs(file);
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  expect(backup.app).toBe("silvestre-checklist");
  expect(Object.keys(backup.data).sort()).toEqual(["done", "guide", "owned", "prereqs", "questObj", "questPos"]);
  expect(backup.data.guide).toBe(4); // la numeración de pasos con la que se guardó

  const ownedBefore = await page.locator("#statOwned").textContent();
  await page.uncheck('#resetDialog input[name="owned"]');
  await page.click("#rdConfirm");
  await expect(page.locator("#resetDialog")).toBeHidden({ timeout: 3_000 });
  await expect(page.locator(".cell.done")).toHaveCount(0);
  // Lo que no se elige se conserva: también los objetos que cubrían los pasos borrados.
  // La posición del overlay nunca se toca.
  await expect(page.locator("#statOwned")).toHaveText(ownedBefore);
  expect(await readLS(page, "silvestre:owned")).toMatchObject({ 421: true, 306: true });
  expect(await readLS(page, "silvestre:questObjective")).toEqual({ 1905: 4 });

  await page.click("#resetBtn");
  const [chooser] = await Promise.all([page.waitForEvent("filechooser"), page.click("#rdRestore")]);
  await chooser.setFiles(file);
  await expect(page.locator("#toastTxt")).toHaveText("Copia restaurada.");
  await expect(page.locator(".cell.done")).toHaveCount(5);
  expect(await readLS(page, "silvestre:questObjective")).toEqual({ 1905: 4 });
});

/** Suelta un archivo sobre un elemento, como al arrastrarlo desde el escritorio. */
async function dropFile(page, selector, name, content) {
  await page.evaluate(({ selector, name, content }) => {
    const target = document.querySelector(selector);
    const dt = new DataTransfer();
    dt.items.add(new File([content], name, { type: "application/json" }));
    for (const type of ["dragenter", "dragover", "drop"]) {
      target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }));
    }
  }, { selector, name, content });
}

test("la copia de seguridad recuerda cuándo se hizo la última", async ({ page }) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  await expect(page.locator("#rdBackupWhen")).toContainText("Todavía no");
  await Promise.all([page.waitForEvent("download"), page.click("#rdBackup")]);
  await expect(page.locator("#rdBackupWhen")).toContainText("hace un momento");
  expect(await page.evaluate(() => localStorage.getItem("silvestre:lastBackup"))).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  await page.reload();
  await page.click("#resetBtn");
  await expect(page.locator("#rdBackupWhen")).toContainText("Última copia");
});

test("soltar una copia sobre la tarjeta la restaura", async ({ page }) => {
  await openApp(page);
  await page.click("#resetBtn");
  const copy = JSON.stringify({ app: "silvestre-checklist", version: 1, data: { done: { 5: true, 6: true }, prereqs: {}, owned: {}, questPos: {}, questObj: {} } });
  await dropFile(page, "#rdBackupCard", "copia.json", copy);
  await expect(page.locator("#toastTxt")).toHaveText("Copia restaurada.");
  await expect(page.locator(".cell.done")).toHaveCount(2);
});

test("un archivo que no es una copia muestra el error en la tarjeta", async ({ page }) => {
  await openApp(page, SEED);
  await page.click("#resetBtn");
  await dropFile(page, "#rdBackupCard", "otra-cosa.json", JSON.stringify({ hola: "mundo" }));
  await expect(page.locator("#rdBackupCard")).toHaveAttribute("data-state", "error");
  await expect(page.locator("#rdBackupMsg")).toContainText("no es una copia");
  await expect(page.locator("#resetDialog")).toBeVisible();
  await expect(page.locator(".cell.done")).toHaveCount(5);
});

test("con la guía completa, reiniciar solo los pasos conserva los prerrequisitos", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  await page.click("#resetBtn");
  await page.locator('#resetDialog input[name="prereqs"]').uncheck();
  await page.click("#rdConfirm");
  await expect(page.locator("#resetDialog")).toBeHidden({ timeout: 3_000 });
  await expect(page.locator(".cell.done")).toHaveCount(0);
  // Se tenían por estar la guía completa: al conservarlos quedan marcados de verdad
  await expect(page.locator("#prereqsCount")).toHaveText("18/18 completados");
  expect(Object.keys(await readLS(page, "silvestre:prereqs"))).toHaveLength(18);
});

test("con la guía completa, conservar los objetos los deja marcados al reiniciar los pasos", async ({ page }) => {
  const all = Object.fromEntries(Array.from({ length: 100 }, (_, i) => [i + 1, true]));
  await openApp(page, { "silvestre:done": all });
  await page.click("#resetBtn");
  const total = await page.locator("#heroItems .hero-req-count").textContent();
  await expect(page.locator("#rdNOwned")).toHaveText(total.split("/")[1]);
  await page.locator('#resetDialog input[name="owned"]').uncheck();
  await page.click("#rdConfirm");
  await expect(page.locator("#resetDialog")).toBeHidden({ timeout: 3_000 });
  await expect(page.locator(".cell.done")).toHaveCount(0);
  await expect(page.locator("#heroItems .hero-req-count")).toHaveText(total);
});
