import { test, expect } from "@playwright/test";
import { STEPS } from "../../src/data/steps.js";

// Los resaltados de la guía en torrentearcano: rojo = hasta dónde llegar,
// verde = lo que se resuelve, azul = consejo.
const step = n => STEPS[n - 1];

test("cada paso trae sus resaltados por tipo, sin paréntesis sueltos", () => {
  expect(step(34).marks).toEqual([
    ["stop", "Hasta tener que pasar Lasoberaña"],
    ["tip", "Se pueden matar las araknas de las primeras 4 salas para validar una parte de la misión"],
    ["done", "Se pasa Lasoberaña y se terminan las misiones de los incisos 33 y 34."],
  ]);
  // El paso 43 repite el mismo rojo para dos misiones: cuenta una vez
  const count = k => STEPS.flatMap(s => s.marks || []).filter(m => m[0] === k).length;
  expect([count("stop"), count("done"), count("tip")]).toEqual([62, 25, 60]);
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
  const pairs = STEPS.filter(s => s.closes).map(s => [s.n, s.closes]);
  expect(pairs).toHaveLength(20);
  // Siempre se cierran pasos anteriores
  for (const [n, closes] of pairs) for (const c of closes) expect(c).toBeLessThan(n);
});
