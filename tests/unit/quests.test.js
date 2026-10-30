// El bando elegido (src/tools/checklist/lib/quests.js): sin bando se ven todas las misiones;
// con uno, las del otro bando se quitan y las sin bando se quedan. Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { questOnSide, questSide, setQuestSide } from "../../src/tools/checklist/lib/quests.js";

const bonta = { id: 1, n: "El destino", side: "bonta" };
const brakmar = { id: 2, n: "La fatalidad", side: "brakmar" };
const none = { id: 3, n: "Kartier Tremai confiesa", side: null };
const old = { id: 4, n: "Sin campo side" };

test("sin bando elegido, todas las misiones", () => {
  setQuestSide(null);
  assert.equal(questSide(), null);
  for (const q of [bonta, brakmar, none, old]) assert.equal(questOnSide(q), true);
});

test("con Bonta, solo se quitan las de Brakmar", () => {
  setQuestSide("bonta");
  assert.equal(questSide(), "bonta");
  assert.equal(questOnSide(bonta), true);
  assert.equal(questOnSide(brakmar), false);
  assert.equal(questOnSide(none), true);
  assert.equal(questOnSide(old), true);
});

test("con Brakmar, solo se quitan las de Bonta; un valor raro cuenta como ninguno", () => {
  setQuestSide("brakmar");
  assert.equal(questOnSide(bonta), false);
  assert.equal(questOnSide(brakmar), true);
  setQuestSide("otro");
  assert.equal(questSide(), null);
  assert.equal(questOnSide(bonta), true);
});
