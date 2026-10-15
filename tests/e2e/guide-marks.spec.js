import { test, expect } from "@playwright/test";
import { STEPS } from "../../src/data/steps.js";

// Los resaltados de la guía en torrentearcano: rojo = hasta dónde llegar,
// verde = lo que se resuelve. El azul mezcla cosas y se separa por lo que dice:
// lo que abarca el paso, lo que también hay que hacer, consejos y notas.
const step = n => STEPS[n - 1];

test("cada paso trae sus resaltados por tipo, sin paréntesis sueltos", () => {
  expect(step(34).marks).toEqual([
    ["stop", "Hasta tener que pasar Lasoberaña"],
    ["tip", "Se pueden matar las araknas de las primeras 4 salas para validar una parte de la misión"],
    ["done", "Se pasa Lasoberaña y se terminan las misiones de los incisos 33 y 34."],
  ]);
  // El paso 43 repite el mismo rojo para dos misiones: cuenta una vez. Los que solo
  // decían "Completo" (2 rojos y 17 azules) pasan a ser step.complete
  const count = k => STEPS.flatMap(s => s.marks || []).filter(m => m[0] === k).length;
  const blue = ["includes", "must", "tip", "note"].reduce((a, k) => a + count(k), 0);
  expect([count("stop"), count("done"), blue]).toEqual([60, 25, 43]);
});

test("el texto base no repite lo resaltado y el texto completo no cambia", () => {
  expect(step(34).base).toBe('Reino de Amakna: Logro "El árbol que esconde el bosque", hasta la misión 2: Arak-hais, ¿dónde vais?');
  expect(step(34).text).toContain("(Hasta tener que pasar Lasoberaña)");
  // Sin resaltados, el texto base es el texto entero
  const plain = STEPS.find(s => !s.marks);
  expect(plain.base).toBe(plain.text);
});

test("el verde dice qué otros pasos se cierran; lo que solo se actualiza no cuenta", () => {
  expect(step(34).closes).toEqual([33]);
  expect(step(28).closes).toEqual([25, 26, 27]);
  expect(step(59).closes).toEqual([11]);
  expect(step(54).closes).toBeUndefined();
  expect(step(43).closes).toBeUndefined();
  // También una nota azul que lo dice tal cual: «se termina la misión del inciso 92», no
  // «un recurso necesario para terminar la misión del inciso 63» (81) ni la opcional del 7
  expect(step(93).closes).toEqual([92]);
  expect(step(93).updates).toEqual([84]);
  expect(step(94).closes).toEqual([84]);
  expect(step(81).closes).toBeUndefined();
  expect(step(97).closes).toBeUndefined();
  const pairs = STEPS.filter(s => s.closes).map(s => [s.n, s.closes]);
  expect(pairs).toHaveLength(22);
  // Siempre se cierran pasos anteriores
  for (const [n, closes] of pairs) for (const c of closes) expect(c).toBeLessThan(n);
});

test("un resaltado entre paréntesis los pierde aunque lleve otros dentro", () => {
  expect(step(77).marks[0][1]).toBe(
    "Hasta tener que pasar Roble Blando o Ugah (según la orden escogida, véase el inciso 78) con el ídolo del dios Sadida");
});

test("«(Completo)» no es un aviso: marca el paso como logro completo", () => {
  const complete = STEPS.filter(s => s.complete).map(s => s.n);
  expect(complete).toHaveLength(25);
  expect(complete).toEqual(expect.arrayContaining([1, 2, 18, 21, 49, 69, 99]));
  // Ningún aviso es solo "Completo" ni empieza por él
  for (const s of STEPS) for (const [, t] of s.marks || []) expect(t).not.toMatch(/^\(?Completos?\)?(\s|$)/);
  // Lo que acompañaba a "(Completo)" se queda como aviso
  expect(step(1).marks[0]).toEqual(["includes", expect.stringMatching(/^Este paso incluye también el logro/)]);
  expect(step(18).marks?.some(([, t]) => t === "Completo")).toBeFalsy();
  expect(step(34).complete).toBeUndefined();
});

test("el azul se separa: lo que incluye, lo que también hay que hacer, consejos y notas", () => {
  const kinds = n => (step(n).marks || []).map(m => m[0]);
  // Lo que abarca el paso
  expect(kinds(1)).toEqual(["includes"]);
  expect(kinds(12)).toEqual(["includes"]);
  // Tareas que la guía exige además de lo del paso
  for (const n of [21, 54, 90, 99, 100]) expect(kinds(n)).toContain("must");
  expect(kinds(28)).toEqual(expect.arrayContaining(["tip", "must"]));
  // Consejos: lo que se recomienda, se puede hacer o se aprovecha
  for (const n of [16, 18, 29, 34, 53, 55, 71, 97]) expect(kinds(n)).toContain("tip");
  // El resto son notas: avisos, desbloqueos y el desglose de los logros largos
  for (const n of [7, 40, 50, 93, 94]) expect(kinds(n)).toContain("note");
  // Nada queda sin clasificar
  const all = STEPS.flatMap(s => s.marks || []).map(m => m[0]);
  expect(new Set(all)).toEqual(new Set(["stop", "done", "includes", "must", "tip", "note"]));
});
