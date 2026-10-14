// ---------------------------------------------------------------------------
// Diario de pasos: lo que la lista y el detalle derivan de la guía
// ---------------------------------------------------------------------------
import { STEPS } from "../data/steps.js";
import { BRAND_ICON, DOFUS_ROAD, OBJ_ICONS, assetsFor } from "./assets.js";

/**
 * Título corto del paso: el logro que persigue o, si no hay, el texto base sin
 * punto final ni comillas ("Alineamiento Bontariano: Misión 19").
 */
export function stepTitle(step) {
  const ach = assetsFor(step.n)?.achievements?.[0]?.name;
  if (ach) return ach;
  return step.base.replace(/["«»]/g, "").replace(/\.$/, "");
}

/**
 * Avisos que muestra el detalle. Un paso con verde se resuelve en sí mismo: su rojo
 * no es dónde parar sino dónde se retoma (la línea verde de la ruta), así que no va
 * como aviso; lo que añade tras su primera frase ("Retomar sala 5 como…") queda como nota.
 */
export function stepCalls(step) {
  const marks = step.marks || [];
  if (!resolvesHere(step)) return marks;
  return marks.flatMap(([kind, text]) => {
    if (kind !== "stop") return [[kind, text]];
    const extra = text.match(/^.*?\.\s+(\S[\s\S]*)$/)?.[1];
    return extra ? [["note", extra]] : [];
  });
}
export const resolvesHere = step => !!step.marks?.some(m => m[0] === "done");
/** Lo que se resuelve: el jefe que se pasa; sin jefe, la espada del juego. */
export const doneIcon = n => assetsFor(n)?.bosses?.[0]?.img || OBJ_ICONS.fight;

/** Capítulos de la lista: cada uno termina en el paso que da un Dofus; el último, en el Silvestre. */
export const CHAPTERS = (() => {
  const ends = [...DOFUS_ROAD.map(d => ({ name: d.name, img: d.img, to: d.step }))];
  if (ends.at(-1)?.to !== STEPS.length) ends.push({ name: "Dofus Silvestre", img: BRAND_ICON, to: STEPS.length });
  return ends.map((c, i) => ({ ...c, from: i ? ends[i - 1].to + 1 : 1 }));
})();

/** Paso -> paso posterior cuyo combate termina sus misiones (el verde de la guía). */
export const CLOSED_BY = (() => {
  const out = {};
  for (const step of STEPS) for (const n of step.closes || []) out[n] ??= step.n;
  return out;
})();

/** El siguiente pendiente a partir de n; si no queda ninguno después, el primero que quede. */
export function nextPendingAfter(done, n) {
  const after = STEPS.find(st => st.n > n && !done[st.n]);
  return (after || STEPS.find(st => !done[st.n]))?.n ?? null;
}

/** Lo que se muestra en el escenario: el jefe del paso o, si no tiene, su icono. */
export function showcase(n) {
  const a = assetsFor(n);
  const boss = a?.bosses?.[0];
  if (boss) return { img: boss.img, name: boss.name, label: "Jefe del paso" };
  if (a?.icon) return { img: a.icon.src, name: a.icon.label, label: a.icon.from === "item" ? "Recompensa" : "Del paso" };
  return null;
}

const norm = s => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * Dónde cae la parada roja dentro de las misiones: si dice "hasta tener que pasar X",
 * antes del primer objetivo que nombra a X. Devuelve { quest, index, text } con el
 * índice sobre los objetivos aplanados de la misión, o null.
 */
export function stopPoint(step, quests) {
  for (const [kind, text] of step.marks || []) {
    if (kind !== "stop") continue;
    // "Hasta tener que pasar X": el objetivo que nombra al jefe. "Hasta que puedas entrar
    // a la mazmorra X": el primero que ocurre dentro (su zona es la mazmorra)
    const boss = text.match(/pasar (?:la mazmorra (?:de )?)?(?:a )?(.+?)(?:\s+con\b|[.,;)]|$)/i);
    const dungeon = !boss && text.match(/entrar a la mazmorra (?:de )?(.+?)(?:[.,;)]|$)/i);
    if (!boss && !dungeon) continue;
    const name = norm((boss || dungeon)[1]);
    // Dentro de la mazmorra: por la zona (el texto puede nombrarla sin estar dentro,
    // como "Llave del Laboratorio de Brumen Tinctorias"). "Pasar la mazmorra X" busca
    // antes en el texto y, si ningún objetivo la nombra, en la zona
    const byText = o => norm(o.t).includes(name);
    const byArea = o => norm(o.a || "").includes(name);
    const tries = dungeon ? [byArea] : /pasar la mazmorra/i.test(text) ? [byText, byArea] : [byText];
    for (const match of tries) {
      for (const q of quests) {
        const index = q.s.flatMap(stg => stg.o).findIndex(match);
        if (index >= 0) return { quest: q.id, index, text };
      }
    }
  }
  return null;
}
