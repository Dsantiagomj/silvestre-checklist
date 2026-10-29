// ============================================================================
// CHECKLIST CLÁSICO — el de torrentearcano.com/checklist-silvestre. Montada la app en
// ese mismo dominio, su progreso está en el mismo localStorage. Solo se lee: sus claves
// nunca se tocan.
// ============================================================================
import { PREVIOUS_STEPS } from "@dofus/steps.js";
import DOFUS from "@dofus/config.js";

// Las claves del clásico (config.js): "dofus_silvestre_clean_v4" y la numeración anterior
// de la guía, la v3; el clásico la pasaba a la v4 con la misma tabla
const { v4: V4, v3: V3 } = DOFUS.classicKeys;

const readJSON = key => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v && typeof v === "object" && Array.isArray(v.checked) ? v : null;
  } catch {
    return null;
  }
};

const checkedSteps = checked => checked.flatMap((on, i) => (on === true ? [i + 1] : []));

/**
 * Lo que tiene marcado el clásico: los pasos hechos (numeración actual) y su tema, o
 * null si no hay nada guardado. La v3 solo cuenta sin v4: un paso nuevo queda hecho si
 * lo estaban todos los antiguos que lo forman.
 */
export function readClassic() {
  const v4 = readJSON(V4);
  const src = v4 || readJSON(V3);
  if (!src) return null;
  let steps = checkedSteps(src.checked).filter(n => n <= PREVIOUS_STEPS.length);
  if (!v4) {
    const old = new Set(steps);
    steps = PREVIOUS_STEPS.flatMap((prev, i) => (prev.every(p => old.has(p)) ? [i + 1] : []));
  }
  const theme = typeof src.darkMode === "boolean" ? (src.darkMode ? "dark" : "light") : null;
  return { steps, theme };
}

/** La huella del conjunto de pasos del clásico: al cerrar el aviso, calla hasta que cambie. */
export const classicKey = steps => steps.join(",");
