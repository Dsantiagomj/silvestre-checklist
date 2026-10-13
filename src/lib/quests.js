// ---------------------------------------------------------------------------
// Misiones de cada paso (src/data/quests.json, cargado en diferido)
// ---------------------------------------------------------------------------
export const MAP_IMG = "https://api.dofusdb.fr/img/maps/0.5/";
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

export const questsOf = n =>
  data ? (data.STEP_QUESTS[n] || []).map(id => ({ id, ...data.QUESTS[id] })) : [];

// Casi todas las misiones (313 de 344) tienen una sola etapa con una docena de
// objetivos, así que el overlay avanza objetivo a objetivo sobre la lista aplanada.
export const flatObjectives = q => q.s.flatMap((stg, j) => stg.o.map(o => ({ ...o, stage: j })));

export function currentQuest(n, questPos, questObj) {
  const list = questsOf(n);
  if (!list.length) return null;
  const i = Math.min(questPos[n] || 0, list.length - 1);
  const q = list[i];
  const objs = flatObjectives(q);
  const k = Math.min(questObj[q.id] || 0, Math.max(objs.length - 1, 0));
  return { list, i, q, objs, k };
}

/** Dónde se hace el objetivo k: el suyo o, si no tiene, el último conocido antes. */
export function locationFor(cur) {
  for (let j = cur.k; j >= 0; j--) {
    const o = cur.objs[j];
    if (o?.m) return { ...o, carried: j !== cur.k };
  }
  return cur.q.st?.m ? { ...cur.q.st, carried: true } : null;
}

export const coordLabel = (x, y) => `${x},${y}`;
