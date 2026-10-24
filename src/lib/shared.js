// ============================================================================
// LO COMPARTIDO ENTRE CHECKLISTS — el Silvestre y el Hielos viven en el mismo origen y
// comparten localStorage. Los ids de las misiones (DofusDB) y de los objetos son los
// mismos en los dos: lo terminado en uno sale terminado en el otro. Cada checklist
// escribe solo su entrada ({ name, quests, owned }) y lee las de los demás. Sin imports:
// lo prueban tests/unit en node.
// ============================================================================

// Sin el prefijo de ningún Dofus: es de todos
export const SHARED_KEY = "dofus-checklists:shared";

/** Nada de otros checklists: ni misiones ni objetos. */
export const NO_SHARED = Object.freeze({ quests: Object.freeze({}), owned: Object.freeze({}) });

const texts = xs => (Array.isArray(xs) ? xs.filter(x => typeof x === "string" || typeof x === "number").map(String) : []);

/**
 * Lo guardado en SHARED_KEY: { [id del Dofus]: { name, quests, owned } }. Lo que no se
 * entiende (JSON roto, una entrada sin nombre) no cuenta; las listas, solo con textos.
 */
export function parseShared(text) {
  let raw;
  try {
    raw = JSON.parse(text || "{}");
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [id, e] of Object.entries(raw)) {
    if (!e || typeof e !== "object" || typeof e.name !== "string") continue;
    out[id] = { name: e.name, quests: texts(e.quests), owned: texts(e.owned) };
  }
  return out;
}

/**
 * Lo de los demás checklists (todos menos `self`): cada misión terminada y cada objeto
 * conseguido con el nombre del Dofus de quien lo tiene ({ id: "Dofus de los Hielos" }).
 * Si lo tienen varios, el primero.
 */
export function othersOf(all, self) {
  const quests = {};
  const owned = {};
  for (const [id, e] of Object.entries(all)) {
    if (id === self) continue;
    for (const q of e.quests) quests[q] ??= e.name;
    for (const k of e.owned) owned[k] ??= e.name;
  }
  return Object.keys(quests).length || Object.keys(owned).length ? { quests, owned } : NO_SHARED;
}

/**
 * Como con las propias (impliedDone), las que una terminada en otro checklist necesitaba
 * terminadas para empezar (`prereqs`, PREREQS de las misiones) también lo están, con el
 * nombre de ese checklist. Sin las misiones cargadas, solo las publicadas.
 */
export function withPrereqs(quests, prereqs) {
  if (!prereqs) return quests;
  const out = { ...quests };
  for (const [id, name] of Object.entries(quests)) {
    for (const x of prereqs[id] || []) out[x] ??= name;
  }
  return out;
}

/**
 * Los objetos que se comparten: los conseguidos enteros (clave sola). Las partes de un
 * paso ("clave#paso") y las claves compuestas ("8918@…", "13423|6812") son de cada guía.
 */
export const ownedKeys = owned =>
  Object.keys(owned).filter(k => owned[k] === true && !/[#@|]/.test(k)).sort();

/** La entrada de un checklist: sus misiones terminadas (sin repetir) y sus objetos. */
export const entryOf = (name, quests, owned) =>
  ({ name, quests: [...new Set(quests.map(String))].sort(), owned: ownedKeys(owned) });

/** Lo guardado con la entrada de `self` cambiada: las de los demás no se tocan. */
export const withEntry = (all, self, entry) => ({ ...all, [self]: entry });
