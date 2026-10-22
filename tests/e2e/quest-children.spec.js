import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Una misión «madre» tiene objetivos que cumplen misiones que empiezan dentro de ella
// (Qa=madre&Qo=objetivo en DofusDB). Si las dos van en el mismo paso, la ruta de la madre
// dice dónde se hacen las hijas, y la madre no se da por terminada antes de tiempo

const QUESTS = JSON.parse(readFileSync(new URL("../../src/data/quests.json", import.meta.url), "utf8"));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator("summary .q-name").getByText(name, { exact: true }) });
const btn = (page, name) => quest(page, name).locator(".q-done-btn");

async function openStep(page, n) {
  await row(page, n).locator(".row-num").click();
  await expect(page.locator("#journal .journal-num")).toHaveText(String(n));
  await expect(page.locator("#journal .q-item").first()).toBeVisible({ timeout: 15_000 });
}

test("el build saca de DofusDB qué misiones empiezan dentro de otra y en qué objetivo", () => {
  const { PARENT } = QUESTS;
  // Qo>11555: tras «Ofrécele la gota de rocío a Rosal», el objetivo 15
  expect(PARENT[1786]).toEqual([[15, [1787, 1788, 1789, 1791]]]);
  // Qo=X: en el objetivo X, cada hija en el suyo
  expect(PARENT[1909]).toEqual([[19, [1911]], [20, [1912]], [21, [1913]], [22, [1914]]]);
  // Solo Qa: desde el principio
  expect(PARENT[2406]).toEqual([[0, [2407, 2408, 2160]]]);
  // Sin Qa, por el objetivo: «Detenla si puedes» empieza en «No hay humo sin fuego»
  expect(PARENT[2446]).toEqual([[1, [2451]]]);
  expect(PARENT[1658]).toEqual([[17, [1661]]]);
  expect(PARENT[1659]).toEqual([[1, [1662]]]);
  expect(PARENT[2423]).toEqual([[2, [2425]]]);
  // Una alternativa no es una hija: «La sombra del reino» se puede lanzar en «Esto parece el
  // Sur» o después ((Qa=1656&Qo>9997)|Qf=1656), y «La razón del más fuerte» pide «La eterna
  // cosecha» empezada o terminada
  expect(PARENT[1656]).toBeUndefined();
  expect(PARENT[439]).toBeUndefined();
});

test("en la ruta de la madre, una línea dice qué hijas se hacen ahí y lleva a ellas", async ({ page }) => {
  const errors = await openApp(page);
  await openStep(page, 81);
  const remedio = quest(page, "Un remedio draconiano");
  await remedio.locator("summary .q-name").click();
  const kids = remedio.locator(".obj-kids");
  await expect(kids).toHaveCount(1);
  await expect(kids).toHaveText("Aquí se hacen «El dragón de las aguas», «El dragón de los vientos», «El dragón de las llamas» y «El dragón de los bosques»");
  // Justo antes del objetivo 15, tras «Ofrécele la gota de rocío a Rosal»
  await expect(remedio.locator(".obj-kids + .obj-row")).toHaveText(/^Ve a ver a /);
  await expect(remedio.locator(".obj-row").nth(14)).toContainText("Ofrécele la gota de rocío a Rosal");
  // No es una parada
  await expect(remedio.locator(".obj-stop, .obj-resume")).toHaveCount(0);
  await expect(kids).not.toHaveCSS("color", await page.locator("body").evaluate(() => {
    const el = document.createElement("li");
    el.className = "obj-stop";
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }));
  // Pulsar una hija la abre
  const aguas = quest(page, "El dragón de las aguas");
  await expect(aguas).not.toHaveAttribute("open", "");
  await kids.getByRole("button", { name: "«El dragón de las aguas»" }).click();
  await expect(aguas).toHaveAttribute("open", "");
  await expect(aguas.locator(".obj-row").first()).toBeInViewport();
  expect(errors).toEqual([]);
});

test("en escritorio, llevar a una hija desplaza el detalle por dentro y no la página", async ({ page }) => {
  await openApp(page);
  await openStep(page, 81);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  const remedio = quest(page, "Un remedio draconiano");
  await remedio.locator("summary .q-name").evaluate(el => el.click());
  // La madre, ya abierta del todo
  await expect(remedio).toHaveAttribute("open", "");
  await page.waitForTimeout(600);
  const y = await page.evaluate(() => scrollY);
  // Sin Playwright, que desplazaría la página para dejar a la vista lo que pulsa
  await remedio.locator(".obj-kids").getByRole("button", { name: "«El dragón de los vientos»" }).evaluate(el => el.click());
  const vientos = quest(page, "El dragón de los vientos");
  await expect(vientos).toHaveAttribute("open", "");
  await expect(vientos.locator("summary")).toBeInViewport();
  await page.waitForTimeout(200);
  // La hija queda arriba del detalle, que es lo que se ha desplazado
  const r = await page.evaluate(() => {
    const detail = document.querySelector(".diary-detail");
    const kid = [...document.querySelectorAll("#journal .q-item")].find(q => q.querySelector("summary .q-name")?.textContent === "El dragón de los vientos");
    return { y: scrollY, scroll: detail.scrollTop, gap: kid.getBoundingClientRect().top - detail.getBoundingClientRect().top };
  });
  expect(r.y).toBe(y);
  expect(r.scroll).toBeGreaterThan(0);
  expect(r.gap).toBeGreaterThanOrEqual(0);
  expect(r.gap).toBeLessThanOrEqual(30);
});

test("en el 93, cada hija de «Nordalía» va en su objetivo, una por línea", async ({ page }) => {
  await openApp(page);
  await openStep(page, 93);
  const nordalia = quest(page, "Nordalía");
  await nordalia.locator("summary .q-name").click();
  await expect(nordalia.locator(".obj-kids")).toHaveText(["Aquí se hace «La felicidad está en campo rociado»",
    "Aquí se hace «Una voz de cristal»", "Aquí se hace «Muerto en vida»", "Aquí se hace «El Guerrero Negro»"]);
  await expect(nordalia.locator(".obj-kids + .obj-row").first()).toHaveText(/Obtén la aprobación de Clothurd/);
});

test("solo con la hija en el mismo paso: «La bruja mala del Este» en el 38 no la nombra; en el 62, sí", async ({ page }) => {
  await openApp(page);
  await openStep(page, 38);
  await quest(page, "La bruja mala del Este").locator("summary .q-name").click();
  await expect(page.locator("#journal .obj-kids")).toHaveCount(0);
  await openStep(page, 62);
  const bruja = quest(page, "La bruja mala del Este");
  await bruja.locator("summary .q-name").click();
  await expect(bruja.locator(".obj-kids")).toHaveText("Aquí se hace «La bendición de Viti»");
  // Una de solo tomarla no se hace: «La biblia de los rencores» no sale en «Birk, hija de Bork»
  await openStep(page, 83);
  const birk = quest(page, "Birk, hija de Bork");
  await birk.locator("summary .q-name").click();
  await expect(birk.locator(".obj-kids")).toHaveText(["Aquí se hace «Los enemigos de mis enemigos son mis enemigos»",
    "Aquí se hace «Los nanoinsumisos»"]);
});

test("terminar una hija no da por terminada a la madre; al terminar la madre se sigue por la primera sin hacer", async ({ page }) => {
  // En el 81, en «Un remedio draconiano» (la 4.ª), con las tres de antes hechas: «La sombra
  // de lo que era» terminada pide las otras dos
  await openApp(page, { "silvestre:questPos": { 81: 3 }, "silvestre:questObjective": { 1785: 12 } });
  await openStep(page, 81);
  await btn(page, "El dragón de las aguas").click();
  await expect(btn(page, "El dragón de las aguas")).toHaveAttribute("aria-pressed", "true");
  // La madre sigue en curso: le quedan sus objetivos de después de los dragones
  await expect(btn(page, "Un remedio draconiano")).toHaveAttribute("aria-pressed", "false");
  expect((await readLS(page, "silvestre:questPos"))["81"]).toBe(3);
  await expect(btn(page, "La última piedra")).toHaveAttribute("aria-pressed", "true");
  // Terminada la madre, la siguiente es «El dragón de los vientos»: la de las aguas ya está
  await btn(page, "Un remedio draconiano").click();
  await expect(btn(page, "Un remedio draconiano")).toHaveAttribute("aria-pressed", "true");
  expect((await readLS(page, "silvestre:questPos"))["81"]).toBe(5);
  await expect(quest(page, "El dragón de los vientos")).toHaveAttribute("open", "");
  await expect(row(page, 81)).not.toHaveClass(/\bdone\b/);
});
