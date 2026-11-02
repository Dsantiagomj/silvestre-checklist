// Lo conseguido guardado con claves de objeto que ya no existen pasa a las nuevas
// (src/tools/checklist/lib/owned.js). El paso 78 del Silvestre llevaba los recursos de su
// orden con su grupo («519@orden espiritu de la salvacion»); ahora son objetos como los
// demás («519») y los de la misión de orden 4 van al paso 80. Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateOwned } from "../../src/tools/checklist/lib/owned.js";

const MOVES = {
  "519@orden espiritu de la salvacion": ["519", [78, 80]],
  "17060@orden espiritu de la salvacion": ["17060", [80]],
  "14443@orden espiritu de la salvacion": ["14443", [78]],
};

test("un objeto entero con la clave vieja pasa a sus partes en los pasos donde está ahora", () => {
  assert.deepEqual(migrateOwned({ "519@orden espiritu de la salvacion": true }, MOVES), { "519#78": true, "519#80": true });
  assert.deepEqual(migrateOwned({ "17060@orden espiritu de la salvacion": true }, MOVES), { "17060#80": true });
});

test("la parte de un paso («clave#78») pasa igual que el objeto entero", () => {
  const owned = { "14443@orden espiritu de la salvacion#78": true, "17060@orden espiritu de la salvacion#78": true };
  assert.deepEqual(migrateOwned(owned, MOVES), { "14443#78": true, "17060#80": true });
});

test("lo demás no cambia: ni las claves de siempre ni lo que ya está marcado con la nueva", () => {
  const owned = { "519": true, "311#80": true, "x:esencia de cil": true, "519#78": true };
  assert.deepEqual(migrateOwned(owned, MOVES), owned);
  // Marcado entero con la clave de siempre: cubre también las partes nuevas, no se toca
  assert.deepEqual(migrateOwned({ "519": true, "519@orden espiritu de la salvacion": true }, MOVES),
    { "519": true, "519#78": true, "519#80": true });
});

test("sin cambios de clave (el Hielos, la guía global) lo devuelve igual", () => {
  const owned = { "7013#26": true, "11248": true };
  assert.deepEqual(migrateOwned(owned, {}), owned);
  assert.deepEqual(migrateOwned(owned), owned);
});

test("aplicarlo dos veces da lo mismo", () => {
  const once = migrateOwned({ "519@orden espiritu de la salvacion#78": true }, MOVES);
  assert.deepEqual(migrateOwned(once, MOVES), once);
});
