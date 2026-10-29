// ---------------------------------------------------------------------------
// Diario de pasos: lo que la lista y el detalle derivan de la guía
// ---------------------------------------------------------------------------
import { STEPS } from "@dofus/steps.js";
import { DOFUS_ROAD, OBJ_ICONS, assetsFor } from "./assets.js";
import FIGURES from "@dofus/figures.json";
import PLANS from "@dofus/plans.json";
import DOFUS from "@dofus/config.js";
import { FOLLOW_UP, followUpStop, norm, stopPoint } from "./stops.js";

export { followUpStop, stopPoint };

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
 * Misiones que la guía marca "misión N (opcional pero útil): Nombre" (pasos 7 y 27):
 * [{ k, name }], con el nombre de la misión tal como sale en el logro. Las lee el build
 * (`opt` en plans.json), el mismo que les da su tipo en quests.json.
 */
export function optionalMissions(step) {
  return (PLANS[step.n] || []).filter(e => e.t === "a")
    .flatMap(e => (e.opt || []).map(k => ({ k, name: e.m[k - 1] })));
}

/**
 * La nota suelta "Opcional pero útil" dice de qué misión habla, por su nombre: el número
 * es el del logro y no el del paso (en el 27 es la 2.ª del logro y va primera).
 */
function namedOptional(step) {
  const marks = ownMarks(step);
  const opt = optionalMissions(step);
  if (opt.length !== 1) return marks;
  return marks.map(([kind, text]) => (kind === "note" && /^opcional pero útil\.?$/i.test(text.trim())
    ? [kind, `La misión «${opt[0].name}» es opcional pero útil.`]
    : [kind, text]));
}

/**
 * Una nota que empieza por «Misión N: Nombre.» habla de esa misión (las del 93 y la del
 * 94: «Misión 1: El dragón blanco. (Se pasa Miauvisor y se dropea el tótem de
 * sorpresa)»). N es el número de la misión en el logro, el de `m` en plans.json, como en
 * optionalMissions; el nombre de la guía puede venir mal escrito («Nordalia»). Devuelve
 * { name, text }: el nombre de la misión como sale en la lista y el texto sin el prefijo
 * ni el paréntesis que lo envuelve. O null.
 */
const MISSION_NOTE = /^Misión (\d+):\s*([^.]+)\.\s*(\S[\s\S]*)$/;
// «En el logro "Vivir así es morir de corrupción", misión 3: Muerte y renovación. = Se
// puede encadenar…» (consejos del 75, el 76 y el 77): el logro, el número y el nombre
const LOGRO_NOTE = /^En el logro "([^"]+)", misión (\d+):\s*([^.]+)\.\s*=?\s*(\S[\s\S]*)$/;
function missionNote(step, text) {
  const m = text.match(MISSION_NOTE);
  const l = !m && text.match(LOGRO_NOTE);
  if (!m && !l) return null;
  const [ach, num, said, rest] = m ? [null, m[1], m[2], m[3]] : [l[1], l[2], l[3], l[4]];
  const named = (PLANS[step.n] || []).filter(e => e.t === "a" && (!ach || norm(e.name) === norm(ach)))
    .map(e => e.m[Number(num) - 1]).filter(Boolean);
  const name = named.find(x => norm(x) === norm(said)) || named[0];
  return name ? { name, text: rest.replace(/^\(([\s\S]*)\)$/, "$1").trim() } : null;
}

// Los avisos que pueden hablar de una misión e ir dentro de ella: notas y consejos
const IN_QUEST = new Set(["note", "tip"]);

/** Las notas y consejos del paso que van dentro de su misión (missionNote): [{ name, text, kind }]. */
export const missionNotes = step => (step.marks || [])
  .filter(([kind]) => IN_QUEST.has(kind)).map(([kind, text]) => {
    const note = missionNote(step, text);
    return note && { ...note, kind };
  }).filter(Boolean);

/**
 * Los avisos sin las notas que van dentro de su misión ni la que solo las presenta,
 * acabada en dos puntos («A medida que se realiza el logro…, se actualizan algunas
 * misiones:»).
 */
function ownMarks(step) {
  const marks = step.marks || [];
  const inQuest = marks.map(([kind, text]) => IN_QUEST.has(kind) && !!missionNote(step, text));
  return marks.filter(([kind, text], i) => !inQuest[i] && !(kind === "note" && /:$/.test(text.trim()) && inQuest[i + 1]));
}

// Notas escritas a mano, para lo que la guía no dice: sueltas en el paso (EXTRA_NOTES) y
// dentro de una de sus misiones (QUEST_NOTES: paso -> { id de la misión: texto }, van con
// las de missionNotes). Son del Dofus: journal en su config.js
const EXTRA_NOTES = DOFUS.journal.extraNotes;
export const QUEST_NOTES = DOFUS.journal.questNotes;

/**
 * Avisos que muestra el detalle. Un paso con verde se resuelve en sí mismo: su rojo
 * no es dónde parar sino dónde se retoma (la línea verde de la ruta), así que no va
 * como aviso; lo que añade tras su primera frase ("Retomar sala 5 como…") queda como nota.
 * Salvo si otro paso lo termina (redIsStop): entonces el rojo sí es dónde parar.
 */
export function stepCalls(step) {
  const marks = EXTRA_NOTES[step.n] ? [...namedOptional(step), ["note", EXTRA_NOTES[step.n]]] : namedOptional(step);
  if (redIsStop(step)) return marks;
  const calls = marks.flatMap(([kind, text]) => {
    if (kind !== "stop") return [[kind, text]];
    const extra = text.match(/^.*?\.\s+(\S[\s\S]*)$/)?.[1];
    return extra ? [["note", extra]] : [];
  });
  // Si lo que se resuelve sigue "hasta tener que pasar X", esa sí es una parada
  const next = followUpStop(step);
  return next ? [...calls, ["stop", next]] : calls;
}

export const resolvesHere = step => !!step.marks?.some(m => m[0] === "done");
/**
 * El rojo del paso es dónde parar: sin verde, o con verde pero sus misiones las termina
 * otro paso y el verde no deja su propia parada (el 41 para en la run de sueños y lo
 * cierra el 91; el 84, el 94). Si el verde la deja («…hasta tener que pasar Kodámade»,
 * en el 43 y el 72), esa es la parada y el rojo es dónde se retoma (como openOf en store).
 */
export const redIsStop = step => !resolvesHere(step) || (!!CLOSED_BY[step.n] && !followUpStop(step));
/**
 * El jefe que el paso resuelve: el que nombra su verde ("Se pasa Nelwynn…"), sin
 * contar el que deja pendiente ("…hasta tener que pasar Kodámade"). O null.
 */
export function resolvedBoss(n) {
  const done = STEPS[n - 1]?.marks?.find(m => m[0] === "done")?.[1];
  if (!done) return null;
  const text = norm(done.replace(FOLLOW_UP, ""));
  return assetsFor(n)?.bosses?.find(b => text.includes(norm(b.name))) || null;
}
/**
 * Los jefes que nombra un texto verde, en el orden en que salen (el 80: Roble blando y
 * Ugah). Sin el «hasta tener que pasar X» del final, que es la parada siguiente.
 */
export function bossesIn(n, text) {
  const t = norm(text.replace(FOLLOW_UP, ""));
  return (assetsFor(n)?.bosses || [])
    .map(b => ({ b, at: t.indexOf(norm(b.name)) }))
    .filter(x => x.at >= 0)
    .sort((x, y) => x.at - y.at)
    .map(x => x.b);
}
const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));

/**
 * La figura del estandarte del paso: el Dofus que da; si no, la elegida para su logro
 * (el dragón primordial, el jinete, Draconiros, Silvosse) o el PNJ que lo empieza
 * (build_figures.py); y, si no hay nada, el jefe que resuelve.
 */
export function bannerFigure(n) {
  const egg = ROAD_AT[n];
  if (egg) return { img: egg.img, name: egg.name, as: "Se gana", kind: "egg" };
  const f = FIGURES[n]?.f;
  if (f) return { ...f, kind: "figure" };
  const boss = resolvedBoss(n);
  return boss ? { img: boss.img, name: boss.name, as: "Jefe del paso", kind: "boss" } : null;
}

/** El mapa del juego donde empieza la primera misión del paso (id de DofusDB). */
export const startMap = n => FIGURES[n]?.m ?? null;

/** Lo que se resuelve: el jefe que se pasa; sin jefe, la espada del juego. */
export const doneIcon = n => resolvedBoss(n)?.img || OBJ_ICONS.fight;

/** El jefe ante el que para el paso: el que nombra el texto de su parada, o null. */
export function stopBoss(n, text) {
  const t = ` ${norm(text).replace(/[^a-z0-9]+/g, " ")} `;
  return assetsFor(n)?.bosses?.find(b => t.includes(` ${norm(b.name).replace(/[^a-z0-9]+/g, " ").trim()} `)) || null;
}


/**
 * Misión opcional -> paso que la termina sin cerrar el suyo (journal.optionalDoneBy en
 * config.js: «Arma letal», que termina el 93 y no el 7).
 */
export const OPTIONAL_DONE_BY = DOFUS.journal.optionalDoneBy;

/** Paso -> paso posterior cuyo combate termina sus misiones (el verde de la guía). */
export const CLOSED_BY = (() => {
  const out = {};
  for (const step of STEPS) for (const n of step.closes || []) out[n] ??= step.n;
  return out;
})();

/**
 * Paso -> pasos posteriores que actualizan su misión sin terminarla ("se actualiza la
 * misión del inciso 53"): allí se retoma. Solo se muestra; no marca nada.
 */
export const RESUMED_IN = (() => {
  const out = {};
  for (const step of STEPS) for (const n of step.updates || []) (out[n] ??= []).push(step.n);
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

// Paradas que el texto no permite situar: ningún objetivo nombra al jefe o la zona.
// Paso -> [misión, comienzo del objetivo que va justo después de la parada], escritas a
// mano por Dofus (journal.stopAt en su config.js). Un tercer elemento, { later, text }, es
// una misión madre que espera a una hija de otro paso (closingPlan en store.js)
export const STOP_AT = DOFUS.journal.stopAt;

/**
 * Dónde caen las paradas rojas dentro de las misiones: las de STOP_AT o, si el rojo dice
 * "hasta tener que pasar X", antes del primer objetivo que nombra a X. Devuelve
 * [{ quest, index, text }] con el índice sobre los objetivos aplanados de la misión.
 */
export function stopPoints(step, quests) {
  const next = followUpStop(step);
  const after = next && stopPoint({ marks: [["stop", next]] }, quests);
  return [...ownStops(step, quests), ...(after ? [{ ...after, followUp: true }] : [])];
}

/**
 * Las líneas que el diario pinta dentro de las misiones del paso: la roja de «hasta dónde»
 * (aquí se detiene) y, en un paso que se resuelve solo, la verde con lo que se resuelve
 * (aquí se retoma). La parada que deja el propio verde («…hasta tener que pasar
 * Kodámade») y la de una madre que espera a una hija de otro paso (STOP_AT con `later`)
 * siguen en rojo. Si el verde se reparte entre varias paradas (STOP_AT con `done`, el 28:
 * las peleas y luego la mazmorra), cada línea lleva su parte. [{ quest, index, text, resume? }],
 * como stopPoints.
 */
export function questStops(step, quests) {
  // En la línea verde, sin la coletilla "hasta tener que pasar X": esa la dice la roja
  const done = !redIsStop(step) && step.marks.find(m => m[0] === "done")[1].replace(FOLLOW_UP, ".");
  return stopPoints(step, quests).map(p => (done && !p.followUp && !p.later ? { ...p, text: p.done || done, resume: true } : p));
}

/**
 * Las misiones que se despliegan en el diario: las que llevan, en este paso, una de las
 * líneas de questStops (aquí se detiene o aquí se retoma) entre sus objetivos. Solo en
 * ellas importa por qué objetivo se va; las demás se hacen enteras y se marcan con un
 * clic. Es por paso: la misma misión se despliega en el paso que la para y no en otro.
 */
export const expandableQuests = (step, quests) => new Set(questStops(step, quests).map(p => p.quest));

function ownStops(step, quests) {
  const stops = (step.marks || []).filter(m => m[0] === "stop").map(m => m[1]);
  const at = STOP_AT[step.n];
  if (at && stops.length) {
    const found = at.map(([name, start, opts], i) => {
      const q = quests.find(x => x.n === name);
      const index = q ? q.s.flatMap(stg => stg.o).findIndex(o => o.t.startsWith(start)) : -1;
      const text = opts?.text || stops[Math.min(i, stops.length - 1)];
      return index >= 0 ? { quest: q.id, index, text, ...(opts?.later ? { later: true } : {}), ...(opts?.done ? { done: opts.done } : {}) } : null;
    }).filter(Boolean);
    if (found.length) return found;
  }
  const one = stopPoint(step, quests);
  return one ? [one] : [];
}


/** Números de paso en una frase: "33", "25, 26 y 27". */
export const list = ns => (ns.length > 1 ? `${ns.slice(0, -1).join(", ")} y ${ns.at(-1)}` : String(ns[0]));
