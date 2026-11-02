// ---------------------------------------------------------------------------
// Lo conseguido (owned) con claves de objeto que ya no existen. Sin imports: lo prueba
// tests/unit/owned.test.js fuera de Vite
// ---------------------------------------------------------------------------

/**
 * Pasa lo conseguido de las claves viejas a las nuevas: moves es clave vieja -> [clave
 * nueva, pasos donde está ahora] (ownedMoves en config.js). Lo marcado con la vieja, entero
 * o solo la parte de un paso («clave#78»), queda marcado en esas partes de la nueva
 * («clave#78», «clave#80»): nunca entero, porque la nueva puede ser también de otros pasos.
 * El formato no cambia ({ clave: true }) y aplicarlo dos veces da lo mismo.
 */
export function migrateOwned(owned = {}, moves = {}) {
  const out = {};
  for (const [k, v] of Object.entries(owned)) {
    const move = moves[k.split("#")[0]];
    if (!move) {
      out[k] = v;
      continue;
    }
    const [to, steps] = move;
    for (const n of steps) out[`${to}#${n}`] = true;
  }
  return out;
}
