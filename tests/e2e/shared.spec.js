import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// El Silvestre y el Hielos comparten localStorage (mismo origen): lo terminado en uno sale
// terminado en el otro, misión a misión (los pasos no coinciden), y los objetos conseguidos
// también. Cada uno escribe su entrada en "dofus-checklists:shared" y lee las demás

const KEY = "dofus-checklists:shared";
const WEIGHTS = JSON.parse(readFileSync(new URL("../../src/dofus/silvestre/weights.json", import.meta.url), "utf8"));
const TOTAL = Array.from({ length: 100 }, (_, i) => WEIGHTS[i + 1].w).reduce((a, x) => a + x, 0);
const pctOf = pts => Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL) * 1000) / 10));
const ptsOf = (n, id) => WEIGHTS[n].q[WEIGHTS[n].ids.indexOf(id)];

const HIELOS = "Dofus de los Hielos";
/** La entrada del Hielos: sus misiones terminadas y sus objetos. */
const hielos = (quests, owned = []) => ({ hielos: { name: HIELOS, quests, owned } });
// El 23 del Silvestre («Frío al cubo») es el 2 del Hielos: sus tres misiones
const STEP_23 = ["612", "613", "614"];

const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });
const check = (page, name) => quest(page, name).locator(".q-check");

async function openStep(page, n) {
  await row(page, n).locator(".row-num").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

/** Hecha en el Hielos: sale hecha, con su etiqueta, y aquí no se deshace. */
async function doneThere(page, name) {
  await expect(check(page, name)).toHaveAttribute("aria-pressed", "true");
  await expect(check(page, name)).toBeDisabled();
  await expect(check(page, name)).toHaveAttribute("title", `Hecha en el ${HIELOS}`);
  await expect(quest(page, name).locator(".q-shared")).toHaveText(`Hecha en el ${HIELOS}`);
}
async function pending(page, name) {
  await expect(check(page, name)).toHaveAttribute("aria-pressed", "false");
  await expect(quest(page, name).locator(".q-shared")).toHaveCount(0);
}

/** Lo que haría otra pestaña: escribe la clave y avisa con el evento `storage`. */
const fromOtherTab = (page, value) => page.evaluate(([k, v]) => {
  const old = localStorage.getItem(k);
  localStorage.setItem(k, JSON.stringify(v));
  window.dispatchEvent(new StorageEvent("storage", { key: k, oldValue: old, newValue: JSON.stringify(v), storageArea: localStorage }));
}, [KEY, value]);

test("las misiones y los objetos del Hielos salen hechos, y el paso con todo hecho se marca solo", async ({ page }) => {
  const errors = await openApp(page, { [KEY]: hielos([...STEP_23, "581"], ["391"]) });
  // Todas las obligatorias del 23, hechas en el Hielos: el paso queda hecho
  await expect(row(page, 23)).toHaveClass(/\bdone\b/);
  // Sin celebración ni aviso: es progreso de otro sitio
  await expect(page.locator("#toast")).not.toHaveClass(/show/);
  // En el 26 solo «Hotel de hielo»: la misión sale hecha, con la etiqueta, y el paso sigue pendiente
  await openStep(page, 26);
  await expect(row(page, 26)).not.toHaveClass(/\bdone\b/);
  await doneThere(page, "Hotel de hielo");
  await pending(page, "La desglaciación");
  // El porcentaje la cuenta como una terminada aquí
  await expect(page.locator("#winPct")).toHaveText(`${pctOf(WEIGHTS[23].w + ptsOf(26, "581"))}%`);
  // La Castaña de cajú del 26, conseguida en el Hielos
  const slot = page.locator('#journal .journal-needs .slot[data-id="391"]');
  await expect(slot.locator(".slot-main")).toHaveAttribute("aria-pressed", "true");
  await expect(slot.locator(".slot-tip")).toContainText(`Conseguido en el ${HIELOS}`);
  // El Silvestre publica lo suyo (el 23, ya marcado aquí) sin tocar la entrada del Hielos
  await expect.poll(async () => (await readLS(page, KEY))?.silvestre?.quests || []).toEqual(expect.arrayContaining(STEP_23));
  const all = await readLS(page, KEY);
  expect(all.silvestre.name).toBe("Dofus Silvestre");
  // Lo que solo está hecho por el Hielos no se publica como propio
  expect(all.silvestre.quests).not.toContain("581");
  expect(all.hielos).toEqual(hielos([...STEP_23, "581"], ["391"]).hielos);
  expect(errors).toEqual([]);
});

test("marcar y desmarcar un paso aquí publica y retira sus misiones", async ({ page }) => {
  await openApp(page);
  // «Los monólogos de la vacuna», la única del 24
  await row(page, 24).locator(".row-check").click();
  await expect.poll(async () => (await readLS(page, KEY))?.silvestre?.quests || []).toContain("615");
  await row(page, 24).locator(".row-check").click();
  await expect.poll(async () => (await readLS(page, KEY))?.silvestre?.quests || ["615"]).not.toContain("615");
});

test("los objetos conseguidos aquí se publican enteros, no por partes", async ({ page }) => {
  await openApp(page, { "silvestre:owned": { 391: true, "2060#26": true } });
  await expect.poll(async () => (await readLS(page, KEY))?.silvestre?.owned).toEqual(["391"]);
});

test("lo que cambia en la otra pestaña llega sin recargar, también al deshacerlo", async ({ page }) => {
  await openApp(page);
  await openStep(page, 26);
  await pending(page, "Hotel de hielo");
  await fromOtherTab(page, hielos(["581", "615"]));
  await doneThere(page, "Hotel de hielo");
  // El 24 tiene todo hecho con lo que acaba de llegar: se marca solo
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
  // Deshecha en el Hielos, vuelve a quedar pendiente aquí. El 24 ya marcado se queda
  await fromOtherTab(page, hielos([]));
  await pending(page, "Hotel de hielo");
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
});

test("un paso desmarcado a mano con todo hecho no se vuelve a marcar con lo del Hielos", async ({ page }) => {
  await openApp(page, { [KEY]: hielos(["615"]) });
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
  await row(page, 24).locator(".row-check").click();
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
  // Llega otra cosa del Hielos: el 24 no cambia, ya estaba listo antes
  await fromOtherTab(page, hielos(["615", "581"]));
  await openStep(page, 26);
  await doneThere(page, "Hotel de hielo");
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
});

test("un paso desmarcado a mano sigue pendiente al recargar, hasta que el Hielos trae misiones nuevas", async ({ page }) => {
  await openApp(page, { [KEY]: hielos(["615"]) });
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
  await row(page, 24).locator(".row-check").click();
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
  await page.reload();
  await openStep(page, 26);
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
  // Lo ya visto no vuelve a marcarlo; deshecho y rehecho allí, sí: es nuevo
  await fromOtherTab(page, hielos([]));
  await fromOtherTab(page, hielos(["615"]));
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
});

test("lo que llega con la app cerrada se aplica al abrirla, una sola vez", async ({ page }) => {
  await openApp(page);
  await expect.poll(() => readLS(page, KEY)).not.toBeNull();
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, hielos(["615"])]);
  await page.reload();
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
});

test("reiniciar no vuelve a marcar al recargar los pasos que el Hielos ya había marcado", async ({ page }) => {
  await openApp(page, { [KEY]: hielos(["615"]) });
  await expect(row(page, 24)).toHaveClass(/\bdone\b/);
  await page.click("#moreBtn");
  await page.click("#resetBtn");
  await page.click("#rdConfirm");
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
  await page.reload();
  await openStep(page, 26);
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
});

test("reiniciar deja la entrada propia vacía y lo roto en la clave no rompe nada", async ({ page }) => {
  const errors = await openApp(page, { "silvestre:done": { 24: true }, [KEY]: "{roto" });
  // Hasta que la app publica, la clave sigue rota
  const mine = () => page.evaluate(k => { try { return JSON.parse(localStorage.getItem(k)).silvestre.quests; } catch { return []; } }, KEY);
  await expect.poll(mine).toContain("615");
  await page.click("#moreBtn");
  await page.click("#resetBtn");
  await page.click("#rdConfirm");
  await expect(row(page, 24)).not.toHaveClass(/\bdone\b/);
  await expect.poll(async () => (await readLS(page, KEY))?.silvestre?.quests).toEqual([]);
  expect(errors).toEqual([]);
});
