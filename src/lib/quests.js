// ---------------------------------------------------------------------------
// Misiones de cada paso (src/data/quests.json, cargado en diferido)
// ---------------------------------------------------------------------------
export const MAP_IMG = "https://api.dofusdb.fr/img/maps/0.5/";
/** El mismo mapa a escala 1 (1910 px de ancho), para fondos a todo el ancho. */
export const MAP_IMG_HD = "https://api.dofusdb.fr/img/maps/1/";
export const OBJ_ICON = { npc: "💬", fight: "⚔️", bring: "🎒", map: "🧭", craft: "🔨", free: "•" };

let data = null;
let pending = null;

/** Datos ya cargados, o null mientras el chunk no ha llegado. */
export const questsData = () => data;

/**
 * Pide el JSON una sola vez. Vite lo separa en su propio chunk gracias al
 * import() dinámico; `onLoad` se llama cuando ya está disponible.
 */
export function loadQuests(onLoad) {
  if (data) return Promise.resolve(data);
  if (!pending) {
    pending = import("../data/quests.json").then(mod => {
      data = mod.default;
      return data;
    });
  }
  return pending.then(d => {
    onLoad?.(d);
    return d;
  });
}

/** Los logros de las misiones del paso, si son varios: [[nombre, icono, cuántas], …] en orden. */
export const groupsOf = n => (data?.STEP_GROUPS?.[n] || null);

/**
 * Lo que pide la guía de cada misión del paso (build_quests_js.py): "mandatory" (por
 * defecto), "optional" ("opcional pero útil": no cuenta ni la marca «Paso hecho") o
 * "take" (basta con tenerla tomada: no se hace).
 */
export const questKind = (n, id) => data?.STEP_QUEST_KINDS?.[n]?.[id] || "mandatory";

export const questsOf = n =>
  data ? (data.STEP_QUESTS[n] || []).map(id => ({ id, kind: questKind(n, id), ...data.QUESTS[id] })) : [];

/** La siguiente misión que se hace tras la `i` (las de solo tomarla no), o -1. */
export const nextWalked = (list, i) => list.findIndex((q, j) => j > i && q.kind !== "take");

const objTotal = q => q.s.reduce((a, stg) => a + stg.o.length, 0);

/**
 * La siguiente que se hace tras la `i` y no está terminada según `questObj`: tras una
 * misión madre, sus hijas ya hechas se saltan. Si lo están todas, la siguiente (o -1).
 */
export function nextOpen(list, i, questObj) {
  const j = list.findIndex((q, k) => k > i && q.kind !== "take" && (questObj[q.id] || 0) < objTotal(q));
  return j >= 0 ? j : nextWalked(list, i);
}

/**
 * Las misiones que empiezan dentro de otra y cumplen sus objetivos (build_quests_js.py):
 * [[índice del objetivo, [ids de las hijas]], …] o null.
 */
export const childrenOf = id => data?.PARENT?.[id] || null;

/** El puesto en `list` de la misión obligatoria de la que `id` es hija, o -1. */
export const parentIn = (list, id) =>
  list.findIndex(q => q.kind === "mandatory" && (childrenOf(q.id) || []).some(([, kids]) => kids.includes(id)));

// Casi todas las misiones (313 de 344) tienen una sola etapa con una docena de
// objetivos, así que el overlay avanza objetivo a objetivo sobre la lista aplanada.
export const flatObjectives = q => q.s.flatMap((stg, j) => stg.o.map(o => ({ ...o, stage: j })));

/**
 * La misión en curso del paso. El overlay recorre las que se hacen (las opcionales
 * también); las de solo tomarla se saltan. `at` y `walk` son su puesto y cuántas hay.
 */
export function currentQuest(n, questPos, questObj) {
  const list = questsOf(n);
  const walked = list.map((q, j) => j).filter(j => list[j].kind !== "take");
  if (!walked.length) return null;
  const pos = Math.min(questPos[n] || 0, list.length - 1);
  // Un avance guardado sobre una de solo tomarla vuelve a la anterior que se hace
  const i = walked.findLast(j => j <= pos) ?? walked[0];
  const q = list[i];
  const objs = flatObjectives(q);
  const k = Math.min(questObj[q.id] || 0, Math.max(objs.length - 1, 0));
  return { list, i, q, objs, k, walked, at: walked.indexOf(i) };
}

export const coordLabel = (x, y) => `${x},${y}`;
