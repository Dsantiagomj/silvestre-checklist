import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { openApp, readLS } from "./helpers.js";

// Una misión «madre» tiene objetivos que cumplen misiones que empiezan dentro de ella
// (Qa=madre&Qo=objetivo en DofusDB). Si las dos van en el mismo paso, la ruta de la madre
// dice dónde se hacen las hijas, y la madre no se da por terminada antes de tiempo

const QUESTS = JSON.parse(readFileSync(new URL("../../src/dofus/silvestre/quests.json", import.meta.url), "utf8"));
const row = (page, n) => page.locator(`.diary-row[data-n="${n}"]`);
const quest = (page, name) => page.locator("#journal .q-item")
  .filter({ has: page.locator(".q-name").getByText(name, { exact: true }) });
const btn = (page, name) => quest(page, name).locator(".q-check");

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
  // En el 83, «Birk, hija de Bork» para en el paso y se despliega; sus hijas no
  const errors = await openApp(page);
  await openStep(page, 83);
  const birk = quest(page, "Birk, hija de Bork");
  const kids = birk.locator(".obj-kids");
  await expect(kids).toHaveText(["Aquí se hace «Los enemigos de mis enemigos son mis enemigos»", "Aquí se hace «Los nanoinsumisos»"]);
  // No es una parada
  await expect(kids.first()).not.toHaveCSS("color", await page.locator("body").evaluate(() => {
    const el = document.createElement("li");
    el.className = "obj-stop";
    document.body.append(el);
    const c = getComputedStyle(el).color;
    el.remove();
    return c;
  }));
  // Pulsar una hija la pone a la vista; como no para en el paso, no se despliega
  const nano = quest(page, "Los nanoinsumisos");
  await kids.getByRole("button", { name: "«Los nanoinsumisos»" }).click();
  await expect(nano.locator(".q-head")).toBeInViewport();
  await expect(nano.locator("summary")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("en escritorio, llevar a una hija baja la página hasta ella, bajo la barra de la ventana", async ({ page }) => {
  await openApp(page);
  await openStep(page, 83);
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.getElementById("diary").scrollIntoView({ block: "start", behavior: "instant" }));
  const birk = quest(page, "Birk, hija de Bork");
  // La madre, ya abierta del todo
  await expect(birk.locator(".obj-list").first()).toBeVisible();
  await page.waitForTimeout(600);
  const y = await page.evaluate(() => scrollY);
  // Sin Playwright, que desplazaría la página para dejar a la vista lo que pulsa
  await birk.locator(".obj-kids").getByRole("button", { name: "«Los nanoinsumisos»" }).evaluate(el => el.click());
  const nano = quest(page, "Los nanoinsumisos");
  await expect(nano.locator(".q-head")).toBeInViewport();
  await page.waitForTimeout(1200);
  // La hija queda arriba, justo bajo la barra de la ventana: lo que se ha desplazado es la página
  const r = await page.evaluate(() => {
    const detail = document.querySelector(".diary-detail");
    const kid = [...document.querySelectorAll("#journal .q-item")].find(q => q.querySelector(".q-name")?.textContent === "Los nanoinsumisos");
    return { y: scrollY, scroll: detail.scrollTop, gap: kid.getBoundingClientRect().top - document.getElementById("winBar").getBoundingClientRect().bottom,
      end: Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 1 };
  });
  expect(r.y).toBeGreaterThan(y);
  expect(r.scroll).toBe(0);
  expect(r.gap).toBeGreaterThanOrEqual(0);
  // Arriba, bajo la barra; salvo que la página ya no baje más (la hija va al final del paso)
  if (!r.end) expect(r.gap, JSON.stringify(r)).toBeLessThanOrEqual(30);
});

test("una madre que no para en el paso no se despliega ni dice dónde van sus hijas: «Nordalía» en el 93", async ({ page }) => {
  await openApp(page);
  await openStep(page, 93);
  const nordalia = quest(page, "Nordalía");
  await expect(nordalia.locator("summary, .obj-kids")).toHaveCount(0);
  // Sus hijas siguen en la lista, cada una con su fila
  for (const name of ["La felicidad está en campo rociado", "Una voz de cristal", "Muerto en vida", "El Guerrero Negro"]) {
    await expect(quest(page, name).locator(".q-check")).toHaveCount(1);
  }
});

test("solo con la hija en el mismo paso: «La bruja mala del Este» en el 38 no la nombra", async ({ page }) => {
  await openApp(page);
  await openStep(page, 38);
  await expect(page.locator("#journal .obj-kids")).toHaveCount(0);
  // Una de solo tomarla no se hace: «La biblia de los rencores» no sale en «Birk, hija de Bork»
  await openStep(page, 83);
  const birk = quest(page, "Birk, hija de Bork");
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
  // La que sigue no se abre sola: queda plegada hasta que se abra a mano
  await expect(quest(page, "El dragón de los vientos").locator(".obj-list")).toHaveCount(0);
  await expect(row(page, 81)).not.toHaveClass(/\bdone\b/);
});
