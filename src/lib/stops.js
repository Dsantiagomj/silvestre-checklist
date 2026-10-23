// ---------------------------------------------------------------------------
// Dónde para un paso, leído del texto de su guía. Sin imports: lo prueban
// tests/unit/stops.test.js (npm run test:unit) fuera de Vite
// ---------------------------------------------------------------------------

/**
 * La coletilla del verde que deja una parada nueva: "…y se actualiza la misión 1 del
 * inciso 43 hasta tener que pasar Kodámade." (Silvestre) o "…se actualiza la etapa 12
 * hasta que te pida pasar la mazmorra del Morsagüino Real." (Hielos). Grupos: el verbo
 * ("tener que", "que te pida") y lo que hay que pasar.
 */
export const FOLLOW_UP = /\s+hasta (tener que|que te pida) pasar (.+?)\.?$/i;

/**
 * La parada que deja el verde: tras resolver lo del paso, una misión sigue y vuelve a
 * parar. "Hasta tener que pasar Kodámade", o null.
 */
export function followUpStop(step) {
  const done = step.marks?.find(m => m[0] === "done")?.[1];
  const m = done?.match(FOLLOW_UP);
  return m ? `Hasta ${m[1]} pasar ${m[2]}` : null;
}

export const norm = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * La parada que se deduce del texto del rojo: si dice "hasta tener que pasar X",
 * antes del primer objetivo que nombra a X. Devuelve { quest, index, text } con el
 * índice sobre los objetivos aplanados de la misión, o null.
 */
export function stopPoint(step, quests) {
  for (const [kind, text] of step.marks || []) {
    if (kind !== "stop") continue;
    // "Hasta tener que pasar X": el objetivo que nombra al jefe. "Hasta que puedas entrar
    // a la mazmorra X": el primero que ocurre dentro (su zona es la mazmorra). "Pasar la
    // mazmorra de X" o "del X"
    const boss = text.match(/pasar (?:la mazmorra (?:del? )?)?(?:a )?(.+?)(?:\s+con\b|[.,;)]|$)/i);
    const dungeon = !boss && text.match(/entrar a la mazmorra (?:de )?(.+?)(?:[.,;)]|$)/i);
    if (!boss && !dungeon) continue;
    const name = norm((boss || dungeon)[1]);
    // Dentro de la mazmorra: por la zona (el texto puede nombrarla sin estar dentro,
    // como "Llave del Laboratorio de Brumen Tinctorias"). "Pasar la mazmorra X" busca
    // antes en el texto y, si ningún objetivo la nombra, en la zona. Siempre por palabras
    // enteras: "Cil" no es la "cil" de "Hoticili"
    const word = new RegExp(`(?<![a-z0-9])${escapeRe(name)}(?![a-z0-9])`);
    const byText = o => word.test(norm(o.t));
    const byArea = o => word.test(norm(o.a || ""));
    const tries = dungeon ? [byArea] : /pasar la mazmorra/i.test(text) ? [byText, byArea] : [byText];
    for (const match of tries) {
      // Las de solo tomarla no se hacen: «La eterna cosecha», tomada en el 33, también
      // nombra a Lasoberaña
      for (const q of quests.filter(x => x.kind !== "take")) {
        const index = q.s.flatMap(stg => stg.o).findIndex(match);
        if (index >= 0) return { quest: q.id, index, text };
      }
    }
  }
  return null;
}
