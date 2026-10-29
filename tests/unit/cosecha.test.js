// Las cuentas de «La eterna cosecha» (src/cosecha/souls.js): cómo se agrupan las almas, qué
// deja cada filtro y lo que se lee de localStorage.
// Run: npm run test:unit
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { DEFAULT_UI, groupsOf, initials, matches, parseDone, parseUi } from "../../src/cosecha/souls.js";

const SOULS = JSON.parse(fs.readFileSync(new URL("../../public/cosecha/cosecha.json", import.meta.url), "utf8"));

test("por etapa: las 18 de la misión, en su orden, las tres primeras de jefes", () => {
  const groups = groupsOf(SOULS, "etapa", "all");
  assert.deepEqual(groups.map(g => g.key), Array.from({ length: 18 }, (_, i) => i + 1));
  assert.deepEqual(groups.map(g => g.label), [...Array(3).fill("Jefes"), ...Array(15).fill("Archis")]);
  assert.deepEqual(groups.map(g => g.souls.length), [20, 20, 11, ...Array(14).fill(20), 6]);
  // Dentro, en el orden de la misión
  assert.deepEqual(groups[0].souls.map(s => s.id), SOULS.filter(s => s.e === 1).map(s => s.id));
});

test("por región: de la que más almas tiene a la que menos", () => {
  const groups = groupsOf(SOULS, "region", "all");
  assert.equal(groups.length, 19);
  assert.deepEqual(groups.slice(0, 3).map(g => [g.key, g.souls.length]), [["Amakna", 85], ["Llanuras de Cania", 49], ["Isla de Otomai", 46]]);
  for (let i = 1; i < groups.length; i++) assert.ok(groups[i - 1].souls.length >= groups[i].souls.length);
});

test("el tipo quita los grupos sin almas de ese tipo y deja solo las suyas", () => {
  const bosses = groupsOf(SOULS, "etapa", "boss");
  assert.deepEqual(bosses.map(g => g.key), [1, 2, 3]);
  const archis = groupsOf(SOULS, "region", "archi");
  assert.ok(archis.every(g => g.souls.length && g.souls.every(s => s.t === "archi")));
  assert.equal(archis.reduce((n, g) => n + g.souls.length, 0), 286);
});

test("las iniciales de una región: dos palabras largas o las dos primeras letras", () => {
  assert.equal(initials("Amakna"), "AM");
  assert.equal(initials("Llanuras de Cania"), "LC");
  assert.equal(initials("Isla del Minotauroro"), "ID");
});

test("la búsqueda no distingue tildes ni mayúsculas y mira nombre, mazmorra, subzona y región", () => {
  const rata = SOULS.filter(s => matches(s, "RATA"));
  assert.deepEqual(rata.map(s => s.n), ["Rata Negra", "Rata Blanca", "Milirratatúi el Gastrónomo"]);
  assert.ok(matches(SOULS[0], "castillo de arena"));
  assert.ok(matches(SOULS[0], "astrub"));
  assert.ok(matches({ n: "Jalató Real", z: "x", r: "y" }, "jalato"));
  assert.ok(matches(SOULS[0], "  "));
});

test("lo guardado roto no rompe nada", () => {
  assert.deepEqual([...parseDone(JSON.stringify([928, 147]))], [928, 147]);
  for (const bad of [null, "", "{", "null", "{}", '"x"']) assert.deepEqual([...parseDone(bad)], []);
  assert.deepEqual([...parseDone(JSON.stringify([1, "2", null]))], [1]);
  assert.deepEqual(parseUi(null), DEFAULT_UI);
  assert.deepEqual(parseUi("{"), DEFAULT_UI);
  const ui = parseUi(JSON.stringify({ by: "region", type: "boss", hide: true, sel: { region: "Amakna" } }));
  assert.deepEqual(ui, { by: "region", type: "boss", hide: true, sel: { etapa: 1, region: "Amakna" } });
  // Valores que no existen vuelven a los de siempre
  assert.deepEqual(parseUi(JSON.stringify({ by: "x", type: 3, hide: "si" })), DEFAULT_UI);
});
