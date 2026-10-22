import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

// Una misión solo da por terminada a otra anterior si la necesita terminada para empezar
// (su startCriterion en DofusDB). PREREQS lleva, de cada misión de la ruta, todas las de
// la ruta que tiene detrás, también las que necesita a través de otras

const QUESTS = JSON.parse(readFileSync(new URL("../../src/data/quests.json", import.meta.url), "utf8"));

test("el build saca de DofusDB qué misiones de la ruta necesita terminadas cada una", () => {
  const { PREREQS } = QUESTS;
  // Qf=X: «Toro de rodeo» pide «El libro de los toros»
  expect(PREREQS[1522]).toContain(1521);
  // Y en cadena: «El tesoro de Totankama» pide «Toro de rodeo», que pide «El libro de los
  // toros», que pide «La hechicera de los pantanos»
  expect(PREREQS[1523]).toEqual(expect.arrayContaining([1462, 1521, 1522]));
  // Una alternativa no obliga: «Cómo perder la pluma» se lanza con «El tesoro de Totankama»
  // empezada o terminada ((Qa=1523&Qo>8635)|Qf=1523), y no pide ninguna de su paso
  expect(PREREQS[1527]).toBeUndefined();
  // Qa= solo la pide empezada: «La razón del más fuerte» no pide «La eterna cosecha»
  expect(PREREQS[2442]).not.toContain(439);
  // En el 16 solo «La huida es la mejor salida» pide otra de los Cazadores
  expect(PREREQS[1849]).toEqual([1848]);
  for (const id of [1851, 1846, 1854, 1848, 1850, 1847]) expect(PREREQS[id]).toBeUndefined();
  // Las de varias clases cuentan como la fila «Misión de clase», que pide «Consejo de clase»
  expect(PREREQS[1960]).toContain("clase");
  expect(PREREQS.clase).toEqual([1958, 1959, 2009]);
  // Y las del «Prólogo invernal» (una por alineamiento), como su fila
  expect(PREREQS[1317]).toEqual(["alt:554:2751"]);
  // Solo filas de la ruta, en orden
  const route = new Set(Object.values(QUESTS.STEP_QUESTS).flat().map(String));
  for (const [id, need] of Object.entries(PREREQS)) {
    expect(route.has(id)).toBe(true);
    for (const x of need) expect(route.has(String(x))).toBe(true);
    expect(need).not.toContain(isNaN(id) ? id : Number(id));
  }
});
