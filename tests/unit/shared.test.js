// Lo que un checklist comparte con los demás en localStorage (src/tools/checklist/lib/shared.js): las
// misiones que da por terminadas y los objetos que tiene, cada uno en su entrada.
// Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import { NO_SHARED, completedBy, entryOf, othersOf, ownedKeys, parseShared, withEntry, withPrereqs } from "../../src/tools/checklist/lib/shared.js";

const HIELOS = { name: "Dofus de los Hielos", quests: ["612", "581"], owned: ["391"] };
const SILVESTRE = { name: "Dofus Silvestre", quests: ["612", "1958"], owned: ["421"] };

test("se lee lo guardado; lo roto o vacío no rompe nada", () => {
  const all = { hielos: HIELOS, silvestre: SILVESTRE };
  assert.deepEqual(parseShared(JSON.stringify(all)), all);
  for (const bad of [null, "", "{", "null", "[]", "42", '"x"']) assert.deepEqual(parseShared(bad), {});
});

test("las entradas mal formadas se descartan y las listas se quedan con textos", () => {
  const raw = JSON.stringify({
    hielos: { name: "Dofus de los Hielos", quests: [612, "581", null, {}], owned: "391" },
    roto: "nada",
    sinNombre: { quests: ["1"] },
  });
  assert.deepEqual(parseShared(raw), { hielos: { name: "Dofus de los Hielos", quests: ["612", "581"], owned: [] } });
});

test("de los demás checklists: cada misión y objeto con el nombre de quien lo tiene", () => {
  const all = { hielos: HIELOS, silvestre: SILVESTRE };
  assert.deepEqual(othersOf(all, "silvestre"), {
    quests: { 612: "Dofus de los Hielos", 581: "Dofus de los Hielos" },
    owned: { 391: "Dofus de los Hielos" },
  });
  // Lo propio no cuenta: sin otros, nada
  assert.deepEqual(othersOf({ silvestre: SILVESTRE }, "silvestre"), NO_SHARED);
});

test("las que necesitaban terminadas para empezar también lo están, con el mismo nombre", () => {
  const quests = { 583: "Dofus de los Hielos", 614: "Dofus Silvestre" };
  const prereqs = { 583: [581, 582], 614: [613], 1: [2] };
  assert.deepEqual(withPrereqs(quests, prereqs), {
    583: "Dofus de los Hielos", 581: "Dofus de los Hielos", 582: "Dofus de los Hielos",
    614: "Dofus Silvestre", 613: "Dofus Silvestre",
  });
  // Sin las misiones cargadas, solo las publicadas
  assert.deepEqual(withPrereqs(quests, null), quests);
});

// COMPLETED_BY: «Bienvenido a Frigost» (649) se termina sola con 612 a 615; «Lo esencial está
// en el lago helado» (650), con 577 y 578. 650 pide terminada 649 (PREREQS)
const TABLE = { 649: [612, 613, 614, 615], 650: [577, 578] };
const PREREQS = { 650: [613, 649], 614: [613] };
const doneIn = marks => id => marks[id];

test("una misión que se termina sola lo está con todas las suyas hechas, de este checklist", () => {
  const own = { 612: true, 613: true, 614: true, 615: true };
  // La que la termina, la última de su lista; ninguno de otro checklist
  assert.deepEqual(completedBy(TABLE, PREREQS, doneIn(own)), { 649: { by: "615", there: null } });
  // Con una sin hacer, no
  assert.deepEqual(completedBy(TABLE, PREREQS, doneIn({ ...own, 613: undefined })), {});
  // Ya hecha, no sale
  assert.deepEqual(completedBy(TABLE, PREREQS, doneIn({ ...own, 649: true })), {});
  // Sin la tabla (las misiones sin cargar), ninguna
  assert.deepEqual(completedBy(null, PREREQS, doneIn(own)), {});
});

test("con alguna de las suyas hecha en otro checklist, sale con su nombre", () => {
  const marks = { 612: true, 613: "Dofus Silvestre", 614: true, 615: "Dofus Silvestre" };
  assert.deepEqual(completedBy(TABLE, PREREQS, doneIn(marks)), { 649: { by: "615", there: "Dofus Silvestre" } });
});

test("una terminada sola cuenta para las demás, y las que pide también quedan hechas", () => {
  // 650 sale de 577 y 578; con ella, 649 (que pide) aunque falten las suyas, por 650
  assert.deepEqual(completedBy(TABLE, PREREQS, doneIn({ 577: true, 578: "Dofus Silvestre", 613: true })), {
    650: { by: "578", there: "Dofus Silvestre" },
    649: { by: "650", there: "Dofus Silvestre" },
  });
  // Y al revés: 649, terminada sola, completa la lista de otra (orden de la tabla al margen)
  const table = { 2: [1], 1: [612, 613] };
  assert.deepEqual(completedBy(table, {}, doneIn({ 612: true, 613: true })), {
    1: { by: "613", there: null },
    2: { by: "1", there: null },
  });
});

test("se publican los objetos enteros: ni partes de un paso ni claves compuestas", () => {
  const owned = { 391: true, 421: false, "444#65": true, "8918@1": true, "13423|6812": true, 312: true };
  assert.deepEqual(ownedKeys(owned), ["312", "391"]);
});

test("la entrada propia: sin repetidas y en orden, y se escribe sin tocar las demás", () => {
  const entry = entryOf("Dofus Silvestre", [612, "1958", "612"], { 421: true, "421#3": true });
  assert.deepEqual(entry, { name: "Dofus Silvestre", quests: ["1958", "612"], owned: ["421"] });
  const all = { hielos: HIELOS, silvestre: { name: "Dofus Silvestre", quests: ["1"], owned: [] } };
  assert.deepEqual(withEntry(all, "silvestre", entry), { hielos: HIELOS, silvestre: entry });
  // Sin progreso, la entrada queda vacía (reiniciar deja de compartir lo de antes)
  assert.deepEqual(entryOf("Dofus Silvestre", [], {}), { name: "Dofus Silvestre", quests: [], owned: [] });
});
