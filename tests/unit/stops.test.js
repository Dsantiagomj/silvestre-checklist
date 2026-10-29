// Dónde para un paso según el texto de su guía (src/tools/checklist/lib/stops.js), en las dos formas de
// decirlo: «hasta tener que pasar X» (Silvestre) y «hasta que te pida pasar la mazmorra
// del X» (Hielos, paso 12). Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { FOLLOW_UP, followUpStop, stopPoint } from "../../src/tools/checklist/lib/stops.js";

const step = (...marks) => ({ marks });

test("la parada que deja el verde: «hasta tener que pasar X»", () => {
  const st = step(["done", "Se pasa Nelwynn y se actualiza la misión 1 del inciso 43 hasta tener que pasar Kodámade."]);
  assert.equal(followUpStop(st), "Hasta tener que pasar Kodámade");
});

test("la parada que deja el verde: «hasta que te pida pasar la mazmorra del X»", () => {
  const st = step(["stop", "Avanza hasta tener que farmear grasa de güino."],
    ["done", "Se terminan las misiones de las etapas 9, 10 y 11 y se actualiza la etapa 12 hasta que te pida pasar la mazmorra del Morsagüino Real."]);
  assert.equal(followUpStop(st), "Hasta que te pida pasar la mazmorra del Morsagüino Real");
});

test("sin parada en el verde, ninguna", () => {
  assert.equal(followUpStop(step(["done", "Se pasa la mazmorra del Jalamut Real y se terminan las etapas 3 y 6."])), null);
  assert.equal(followUpStop(step(["stop", "Avanza hasta tener que pasar Esmígol."])), null);
});

test("la coletilla se quita del verde y deja lo que se resuelve", () => {
  const done = "Se terminan las etapas 9, 10 y 11 y se actualiza la etapa 12 hasta que te pida pasar la mazmorra del Morsagüino Real.";
  assert.equal(done.replace(FOLLOW_UP, "").trim(), "Se terminan las etapas 9, 10 y 11 y se actualiza la etapa 12");
});

const quests = [{
  id: 577, n: "Pesca en aguas congeladas",
  s: [{ n: "", o: [
    { t: "Entrégale a Damar: 50 x Grasa de güino" },
    { t: "Consigue la alianza de Damar que tiene el Morsagüino Real y entrégasela a Kristina Pielhova" },
  ] }],
}];

test("«pasar la mazmorra del X» para antes del objetivo que nombra a X", () => {
  const at = stopPoint(step(["stop", "Hasta que te pida pasar la mazmorra del Morsagüino Real"]), quests);
  assert.deepEqual(at, { quest: 577, index: 1, text: "Hasta que te pida pasar la mazmorra del Morsagüino Real" });
});

test("«pasar la mazmorra de X» y «pasar X» siguen igual", () => {
  assert.equal(stopPoint(step(["stop", "Hasta tener que pasar la mazmorra de Morsagüino Real"]), quests).index, 1);
  assert.equal(stopPoint(step(["stop", "Avanza hasta tener que pasar Morsagüino Real."]), quests).index, 1);
});
