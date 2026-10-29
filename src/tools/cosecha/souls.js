// ============================================================================
// LAS CUENTAS DE LA COSECHA — cómo se agrupan las almas en el carril, qué deja cada filtro y
// lo que se lee de localStorage. Sin DOM: lo pinta src/tools/cosecha/cosecha.js.
// ============================================================================

/** Lo que se recuerda de la vista si no hay nada guardado. */
export const DEFAULT_UI = { by: "etapa", type: "all", hide: false, sel: { etapa: 1, region: null } };

const BY = ["etapa", "region"];
const TYPES = ["all", "boss", "archi"];

/** Sin tildes y en minúsculas: «jalato» encuentra a «Jalató». */
export const norm = s => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const typeOk = (soul, type) => type === "all" || soul.t === type;

/**
 * Los grupos del carril, ya con el filtro de tipo: las 18 etapas en el orden de la misión
 * o las regiones, de la que más almas tiene a la que menos. Un grupo sin almas del tipo no sale.
 */
export function groupsOf(souls, by, type) {
  const map = new Map();
  for (const s of souls) {
    if (!typeOk(s, type)) continue;
    const key = by === "etapa" ? s.e : s.r;
    (map.get(key) || map.set(key, []).get(key)).push(s);
  }
  const groups = [...map].map(([key, list]) => ({
    key,
    // Las etapas dicen qué piden; las 1 a 3 son de jefes
    label: by === "etapa" ? (list.every(s => s.t === "boss") ? "Jefes" : "Archis") : key,
    souls: list,
  }));
  return by === "etapa"
    ? groups.sort((a, b) => a.key - b.key)
    : groups.sort((a, b) => b.souls.length - a.souls.length || a.key.localeCompare(b.key, "es"));
}

/** Si el alma coincide con lo buscado: nombre, mazmorra, subzona o región. */
export function matches(soul, q) {
  const needle = norm(q.trim());
  return !needle || norm(`${soul.n} ${soul.d || ""} ${soul.z || ""} ${soul.r || ""}`).includes(needle);
}

/** Las almas marcadas (cosecha:done, la misma clave que la página anterior). */
export function parseDone(raw) {
  try {
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter(Number.isInteger) : []);
  } catch {
    return new Set();
  }
}

/** La vista guardada (cosecha:ui); lo que no se entiende vuelve a lo de siempre. */
export function parseUi(raw) {
  let ui;
  try { ui = JSON.parse(raw); } catch { ui = null; }
  if (!ui || typeof ui !== "object") ui = {};
  const sel = ui.sel && typeof ui.sel === "object" ? ui.sel : {};
  return {
    by: BY.includes(ui.by) ? ui.by : DEFAULT_UI.by,
    type: TYPES.includes(ui.type) ? ui.type : DEFAULT_UI.type,
    hide: ui.hide === true,
    sel: {
      etapa: Number.isInteger(sel.etapa) ? sel.etapa : DEFAULT_UI.sel.etapa,
      region: typeof sel.region === "string" ? sel.region : DEFAULT_UI.sel.region,
    },
  };
}
