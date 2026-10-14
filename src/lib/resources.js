// ============================================================================
// OBJETOS NECESARIOS — lo que pide cada paso según la lista de torrentearcano.
// Generado por .build/build_resources.py. El paso "0" son los prerrequisitos.
// ============================================================================
import DATA from "../data/resources.json";

export const RES_ITEMS = DATA.items;
const RES_STEPS = DATA.steps;
export const PREREQ_STEP = 0;

export const CATEGORIES = [
  ["recursos", "Recursos"], ["consumibles", "Consumibles"], ["equipables", "Equipables"],
  ["almas", "Almas"], ["criaturas", "Criaturas"], ["cosmeticos", "Cosméticos"],
];
const CAT_ORDER = Object.fromEntries(CATEGORIES.map(([k], i) => [k, i]));

export const rowName = row => row.a.map(([id]) => RES_ITEMS[id].name).join(" o ");
export const rowQty = row => row.a.map(([, q]) => q).join(" / ");

/** Filas de un paso tal cual: cada una es un objeto (o varias alternativas) con su cantidad. */
export const rowsOf = n => RES_STEPS[String(n)] || [];

/**
 * Suma las filas de varios pasos. Los objetos que se conservan tras usarse (r) cuentan
 * el máximo, no la suma, y las filas solo necesarias en un caso concreto (x) no cuentan:
 * son las reglas del compilado de la propia página.
 */
export function aggregate(steps) {
  const rows = new Map();
  for (const n of steps) {
    for (const row of rowsOf(n)) {
      if (row.x) continue;
      const cur = rows.get(row.k);
      if (!cur) {
        rows.set(row.k, { ...row, steps: [n] });
        continue;
      }
      cur.a = cur.a.map(([id, q], i) => [id, row.r ? Math.max(q, row.a[i][1]) : q + row.a[i][1]]);
      cur.steps.push(n);
    }
  }
  return [...rows.values()].sort((a, b) =>
    (CAT_ORDER[a.c] - CAT_ORDER[b.c]) || (!!a.g - !!b.g) || (a.g || "").localeCompare(b.g || "", "es") ||
    (b.a[0][1] - a.a[0][1]) || rowName(a).localeCompare(rowName(b), "es"));
}

/** Todos los pasos que piden algo, prerrequisitos incluidos. */
export const STEPS_WITH_ITEMS = Object.keys(RES_STEPS).map(Number);
/**
 * Lo que pide la guía entera, también lo de misiones opcionales y de cada orden: van
 * ligados a sus pasos, así que completarlos los cubre aunque no se marquen.
 */
export const ALL_ROWS = aggregate(STEPS_WITH_ITEMS);
/** Cada objeto con todos los pasos que lo piden. */
export const ROW_BY_KEY = new Map(ALL_ROWS.map(r => [r.k, r]));

/** Minúsculas y sin tildes: "bambu" encuentra "Madera de bambú". */
export const normText = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export const rowMatches = (row, q) => !q || row.a.some(([id]) => normText(RES_ITEMS[id].name).includes(q));
