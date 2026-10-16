// ============================================================================
// STORE — única fuente de verdad. Toda la UI se deriva de este estado, así que
// ya no hace falta acordarse de llamar a renderX() tras cada cambio.
// ============================================================================
import { useSyncExternalStore } from "react";
import { prefersReducedMotion } from "../lib/motion.js";
import { STEPS, ALL_PREREQS, PREVIOUS_STEPS } from "../data/steps.js";
// El peso de cada paso y de cada una de sus misiones: su nivel (.build/build_weights.py)
import WEIGHTS from "../data/weights.json";
import { childrenOf, currentQuest, loadQuests as loadQuestsData, nextOpen, nextWalked, parentIn, questsData, questsOf } from "../lib/quests.js";
import { ALL_ROWS, PREREQ_OF_ROW, PREREQ_STEP, ROW_BY_KEY, STEPS_WITH_ITEMS } from "../lib/resources.js";
import { DOFUS_ROAD } from "../lib/assets.js";
import { OPTIONAL_DONE_BY, list, resolvesHere, stopPoints } from "../lib/journal.js";

export const LS = {
  done: "silvestre:done",
  prereqs: "silvestre:prereqs",
  theme: "silvestre:theme",
  owned: "silvestre:owned",
  questPos: "silvestre:questPos",
  questObj: "silvestre:questObjective",
  guide: "silvestre:guide",
  itemsView: "silvestre:itemsView",
  itemsPageSize: "silvestre:itemsPageSize",
  stepsView: "silvestre:stepsView",
  selectedStep: "silvestre:selectedStep",
};

// Tamaños de página de la lista de objetos; "all" = sin paginar
export const PAGE_SIZES = [10, 25, 50, 100, "all"];
const readPageSize = () => {
  const v = localStorage.getItem(LS.itemsPageSize);
  return v === "all" ? "all" : PAGE_SIZES.includes(Number(v)) ? Number(v) : 25;
};

// Versión de la guía de Sandglass con la que se numeran los pasos guardados
export const GUIDE_VERSION = 4;

/**
 * Pasa progreso de la versión anterior de la guía a la numeración actual. Un paso
 * nuevo queda hecho si lo estaban todos los antiguos que lo forman; la misión en
 * curso solo se conserva cuando el paso no se fusionó ni se dividió.
 */
export function migrateProgress(done = {}, questPos = {}) {
  const uses = {};
  PREVIOUS_STEPS.flat().forEach(p => { uses[p] = (uses[p] || 0) + 1; });
  const out = { done: {}, questPos: {} };
  PREVIOUS_STEPS.forEach((prev, i) => {
    const n = i + 1;
    if (prev.every(p => done[p])) out.done[n] = true;
    if (prev.length === 1 && uses[prev[0]] === 1 && questPos[prev[0]] != null) out.questPos[n] = questPos[prev[0]];
  });
  return out;
}

const readSelectedStep = () => {
  const n = Number(localStorage.getItem(LS.selectedStep));
  return Number.isInteger(n) && n >= 1 && n <= STEPS.length ? n : null;
};
const readObj = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
};

export const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

// Pestañas de la ventana de pasos: las dos vistas de los pasos y las dos listas de lo
// que necesitas. Se guarda la abierta con la clave de siempre (antes solo mapa o diario)
export const WIN_TABS = ["map", "diary", "prereqs", "items"];
export const isStepsView = v => v === "map" || v === "diary";
const readStepsView = () => {
  const v = localStorage.getItem(LS.stepsView);
  return WIN_TABS.includes(v) ? v : "map";
};

/** Progreso guardado, migrado una sola vez si viene de la versión anterior de la guía. */
function readProgress() {
  let done = readObj(LS.done);
  let questPos = readObj(LS.questPos);
  if (localStorage.getItem(LS.guide) !== String(GUIDE_VERSION)) {
    if (Object.keys(done).length || Object.keys(questPos).length) {
      ({ done, questPos } = migrateProgress(done, questPos));
      localStorage.setItem(LS.done, JSON.stringify(done));
      localStorage.setItem(LS.questPos, JSON.stringify(questPos));
    }
    localStorage.setItem(LS.guide, String(GUIDE_VERSION));
  }
  return { done, questPos };
}

function initialState() {
  const { done, questPos } = readProgress();
  const prereqs = readObj(LS.prereqs);
  return {
    done,
    prereqs,
    owned: readObj(LS.owned),
    theme: localStorage.getItem(LS.theme) || "dark",
    questPos, // paso -> índice de misión
    questObj: readObj(LS.questObj), // misión -> índice de objetivo
    // El paso abierto en la ventana sobrevive a recargar: se puede ir por delante del
    // siguiente pendiente. El hero sigue mostrando el siguiente pendiente
    selectedStep: readSelectedStep(),
    // El paso del overlay, si se ha movido desde él; null: sigue al de la página
    overlayN: null,
    sheetOpen: false,
    // Pestaña de la ventana de pasos: mapa del camino (por defecto), diario (lista +
    // detalle), prerrequisitos u objetos
    stepsView: readStepsView(),
    // status: all | pending | done (las pestañas del diario)
    filters: { zones: [], status: "all", search: "" },
    shopTab: "todo",
    shopPendingOnly: true,
    shopSort: "soon",   // soon (Por paso) | qty | az
    shopView: localStorage.getItem(LS.itemsView) === "list" ? "list" : "grid",
    shopPageSize: readPageSize(),
    shopPage: 0,
    shopQuery: "",
    // Cada vez que la versión vanilla repintaba la lista entera se repetía la
    // animación de entrada; este contador remonta la rejilla en esos mismos casos.
    shopEpoch: 0,
    questsLoaded: questsData() != null,
    toast: { seq: 0, visible: false, text: "", actionLabel: "", ms: 8000 },
    // Los Dofus del camino recién conseguidos al marcar (los celebra la franja de la
    // ventana). Solo cambia al marcar: ni al cargar ni al restaurar una copia
    dofusWon: { seq: 0, steps: [] },
  };
}

let state = initialState();
const listeners = new Set();

const PERSISTED = ["done", "prereqs", "owned", "questPos", "questObj"];

function persistSelected(prev, next) {
  if (next.selectedStep === prev.selectedStep) return;
  if (next.selectedStep == null) localStorage.removeItem(LS.selectedStep);
  else localStorage.setItem(LS.selectedStep, String(next.selectedStep));
}

function setState(patch) {
  const prev = state;
  const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
  if (next === prev) return;
  // La página manda: si elige otro paso, el overlay vuelve a seguirla
  if (next.selectedStep !== prev.selectedStep && next.overlayN === prev.overlayN) next.overlayN = null;
  state = next;
  for (const k of PERSISTED) {
    if (next[k] !== prev[k]) localStorage.setItem(LS[k], JSON.stringify(next[k]));
  }
  persistSelected(prev, next);
  listeners.forEach(l => l());
}

export const getState = () => state;
const subscribe = l => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Hook de lectura: devuelve el estado completo (inmutable). */
export const useAppState = () => useSyncExternalStore(subscribe, getState);

// ============================================================================
// SELECTORES
// ============================================================================
export const isDone = (s, n) => !!s.done[n];
export const doneCount = s => STEPS.filter(st => s.done[st.n]).length;
const weight = n => WEIGHTS[n]?.w ?? 1;
const TOTAL_PTS = STEPS.reduce((a, st) => a + weight(st.n), 0);

// Paso -> pasos que lo cierran (todos, no solo el primero como CLOSED_BY)
const CLOSERS = {};
for (const st of STEPS) for (const c of st.closes || []) (CLOSERS[c] ??= []).push(st.n);

/**
 * Lo que el paso deja a medias: solo las misiones donde cae una parada roja, no las de
 * después, que la guía termina en el mismo paso (el 52 termina «El S.L.I.P. está que
 * arde» tras la parada de «Almacén de avituallamiento»). En un paso que se resuelve en sí
 * mismo (lleva verde), su rojo es donde se retoma: queda abierta la parada que deja el
 * verde («…hasta tener que pasar Kodámade») o, si otro paso lo cierra y el verde no
 * deja ninguna, las de su rojo (el 84 pasa Mizz Frizz y su misión sigue hasta Klim, en
 * el 94). Una madre cuya hija del paso queda abierta, también: sus objetivos esperan a la
 * hija (en el 68, «Cuando el despertar…» espera a «La última muralla»). `later` son las
 * paradas que no termina el paso que cierra este, sino uno posterior que lleva la misión
 * (STOP_AT con `later`), con el objetivo donde paran: { id: índice }.
 */
function openOf(st, quests) {
  const stops = stopPoints(st, quests);
  const own = !resolvesHere(st) ? stops
    : stops.some(p => p.followUp) ? stops.filter(p => p.followUp || p.later)
    : CLOSERS[st.n] ? stops : stops.filter(p => p.later);
  const mandatory = new Set(quests.filter(q => q.kind === "mandatory").map(q => String(q.id)));
  const open = new Set(own.map(p => String(p.quest)).filter(id => mandatory.has(id)));
  const later = Object.fromEntries(own.filter(p => p.later).map(p => [String(p.quest), p.index]));
  for (let grew = true; grew;) {
    grew = false;
    for (const q of quests) {
      const id = String(q.id);
      if (!mandatory.has(id) || open.has(id)) continue;
      if ((childrenOf(q.id) || []).some(([, kids]) => kids.some(k => open.has(String(k))))) {
        open.add(id);
        grew = true;
      }
    }
  }
  return { open, later, stops };
}

/**
 * Misión -> pasos que la llevan como obligatoria, y paso -> lo que deja a medias (openOf).
 * Necesita las misiones (las paradas se sitúan en sus objetivos): se calcula una vez,
 * cuando llegan.
 */
let questIndex = null;
function questIndexOf() {
  if (questIndex || !questsData()) return questIndex;
  const steps = {};
  const open = {};
  const later = {};
  for (const st of STEPS) {
    const quests = questsOf(st.n);
    const o = openOf(st, quests);
    if (o.open.size) open[st.n] = o.open;
    later[st.n] = o.later;
    quests.forEach(q => {
      if (q.kind === "mandatory") (steps[q.id] ??= []).push(st.n);
    });
  }
  return (questIndex = { steps, open, later });
}

/**
 * La misión `qid`, terminada en otro paso que la lleva: hecho y sin dejarla a medias, o
 * dejándola a medias pero con hechos también los pasos que lo cierran. Devuelve el paso
 * donde se terminó (el que cierra, en el segundo caso) o null. Una que el paso deja para
 * uno posterior (`later`) no la terminan los que lo cierran: la termina ese paso, que
 * también la lleva. Sin las misiones cargadas no se sabe dónde paran los pasos: null, y
 * el porcentaje la suma cuando llegan (el hero se vuelve a pintar al cambiar
 * `questsLoaded`).
 */
export function questDoneElsewhere(s, qid, except) {
  const idx = questIndexOf();
  if (!idx) return null;
  for (const m of idx.steps[qid] || []) {
    if (m === except || !s.done[m]) continue;
    if (!idx.open[m]?.has(String(qid))) return m;
    if (String(qid) in idx.later[m]) continue;
    const by = CLOSERS[m] || [];
    if (by.length && by.every(c => s.done[c])) return by.at(-1);
  }
  return null;
}

/** El paso hecho que termina la misión opcional `qid` (OPTIONAL_DONE_BY), o null. */
export const optionalDoneBy = (s, qid) => (s.done[OPTIONAL_DONE_BY[qid]] ? OPTIONAL_DONE_BY[qid] : null);

/**
 * Lo que valen las misiones terminadas de un paso sin marcar, con el mismo avance que
 * el diario: las de antes de la actual, cualquiera pasada de su último objetivo, aunque
 * vaya por delante, y las que terminó otro paso hecho (questDoneElsewhere). Las
 * opcionales y las de solo tomarla valen 0.
 */
function questPts(s, n) {
  const { q = [], ids = [], os = [] } = WEIGHTS[n] || {};
  const pos = Math.min(s.questPos[n] || 0, q.length - 1);
  return q.reduce((a, p, i) => a + (i < pos || (s.questObj[ids[i]] || 0) >= os[i] || questDoneElsewhere(s, ids[i], n) ? p : 0), 0);
}
export const donePts = s => STEPS.reduce((a, st) => a + (s.done[st.n] ? weight(st.n) : questPts(s, st.n)), 0);
/**
 * Lo hecho, pesado por el nivel de las misiones de cada paso (las ya terminadas de un
 * paso a medias cuentan), con un decimal: 100 solo con todos los pasos marcados y 0 solo
 * sin nada (un paso ligero no se pierde en el redondeo).
 */
export const progressPct = s => {
  const pts = donePts(s);
  if (!pts) return 0;
  if (doneCount(s) === STEPS.length) return 100;
  return Math.min(99.9, Math.max(0.1, Math.round((pts / TOTAL_PTS) * 1000) / 10));
};
// Terminar la guía implica tener los prerrequisitos y los objetos, aunque no se marcaran a mano
export const guideComplete = s => doneCount(s) === STEPS.length;
export const isPrereqDone = (s, id) => guideComplete(s) || !!s.prereqs[id];
export const prereqsDone = s => ALL_PREREQS.filter(p => isPrereqDone(s, p.id)).length;
/** Un paso ya no pide nada si está hecho; el "paso 0" son los prerrequisitos. */
export const stepCovered = (s, n) =>
  n === PREREQ_STEP ? ALL_PREREQS.every(p => isPrereqDone(s, p.id)) : !!s.done[n];
/**
 * Un objeto ya no hace falta si lo marcaste como conseguido o si hiciste todos los
 * pasos que lo piden. Así el contador avanza solo al completar pasos.
 */
export const rowHave = (s, row, steps = row.steps) =>
  guideComplete(s) || steps.every(n => rowCovered(s, row.k, n) || stepOwned(s, row.k, n));
/**
 * Un objeto de los prerrequisitos está gastado cuando se completa el prerrequisito
 * que lo pide (no hace falta completarlos todos). Al revés no: tener el objeto no
 * completa el prerrequisito, se puede comprar antes.
 */
const rowCovered = (s, k, n) =>
  n === PREREQ_STEP && PREREQ_OF_ROW[k] ? isPrereqDone(s, PREREQ_OF_ROW[k]) : stepCovered(s, n);
/**
 * Esa parte del objeto ya se gastó: su paso está hecho o, en los prerrequisitos, el
 * prerrequisito que la pide está completo (no hace falta que lo estén todos).
 */
export const rowUsed = (s, k, n) => guideComplete(s) || rowCovered(s, k, n);
/** Conseguido a mano para ese paso: el objeto entero (clave sola) o solo esa parte ("clave#paso"). */
const stepOwned = (s, k, n) => !!s.owned[k] || !!s.owned[`${k}#${n}`];

/**
 * Los próximos pasos pendientes (los prerrequisitos primero si faltan). Son la
 * franja "Tus próximos pasos" de los objetos: lo que hay que reunir ya.
 */
export function soonSteps(s, count = 5) {
  const out = ALL_PREREQS.every(p => isPrereqDone(s, p.id)) ? [] : [PREREQ_STEP];
  for (const st of STEPS) {
    if (out.length - (out[0] === PREREQ_STEP ? 1 : 0) >= count) break;
    if (!s.done[st.n]) out.push(st.n);
  }
  return out;
}
export const pendingItemSteps = s => STEPS_WITH_ITEMS.filter(n => !stepCovered(s, n));
export const ownedCount = s => ALL_ROWS.filter(r => rowHave(s, r)).length;
export const prereqsPending = s => ALL_PREREQS.length - prereqsDone(s);
export const nextPending = s => {
  const st = STEPS.find(x => !s.done[x.n]);
  return st ? st.n : null;
};
export const overlayStep = s => s.overlayN ?? s.selectedStep ?? nextPending(s) ?? STEPS.length;

/** Zona y búsqueda; el estado (pendiente/hecho) va aparte porque las pestañas lo cuentan. */
export const stepMatchesFilters = (s, step) => {
  const { zones, search } = s.filters;
  if (zones.length && !zones.includes(step.zone)) return false;
  const q = search.trim().toLowerCase();
  if (q && !step.text.toLowerCase().includes(q) && !String(step.n).includes(q)) return false;
  return true;
};
export const stepMatchesStatus = (s, step, status = s.filters.status) =>
  status === "all" || (status === "done") === !!s.done[step.n];
export const stepMatches = (s, step) => stepMatchesFilters(s, step) && stepMatchesStatus(s, step);

export const hasActiveFilters = s => {
  const f = s.filters;
  return f.zones.length > 0 || f.search.trim().length > 0;
};

// ============================================================================
// ACCIONES
// ============================================================================
export function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  localStorage.setItem(LS.theme, t);
  setState({ theme: t });
}

/**
 * La última vista de los pasos (mapa o diario): a ella se vuelve al abrir un paso desde
 * prerrequisitos u objetos. Sin ninguna aún, el diario, que es donde se lee el paso.
 */
let lastStepsView = isStepsView(state.stepsView) ? state.stepsView : "diary";

export function selectStep(n) {
  if (n < 1 || n > STEPS.length) return;
  if (isMobile()) return setState({ selectedStep: n, sheetOpen: true });
  // En escritorio el paso se ve en la ventana: si estaba en una lista, vuelve a los pasos
  if (!isStepsView(state.stepsView)) setStepsView(lastStepsView);
  setState({ selectedStep: n });
}

/**
 * Desde el overlay: cambia su paso y no el de la página, que puede quedarse en otro
 * (sin abrir la hoja móvil ni cambiar de vista).
 */
export function overlayGo(n) {
  if (n < 1 || n > STEPS.length) return;
  setState({ overlayN: n });
}

export const clearSelection = () => setState({ selectedStep: null });

export function setStepsView(view) {
  localStorage.setItem(LS.stepsView, view);
  if (isStepsView(view)) lastStepsView = view;
  setState({ stepsView: view });
}
/**
 * Desde el diario: vuelve al mapa con ese paso abierto (en móvil cierra la hoja) y lo
 * deja a la vista, centrado, cuando el mapa ya está pintado.
 */
let mapFocus = null;
/** El paso que el mapa debe dejar a la vista cuando termine de llegar (lo usa Diary). */
export function takeMapFocus() {
  const n = mapFocus;
  mapFocus = null;
  return n;
}
/**
 * Deja a la vista el sello del paso n, solo si no lo está ya. En escritorio el mapa se
 * desplaza dentro de la ventana: se mueve el mapa, no la página (que solo baja hasta
 * la ventana si esta no se ve entera). En móvil el mapa va en la página.
 */
export function revealMapNode(n) {
  const node = document.querySelector(`.map-node[data-n="${n}"]`);
  if (!node) return;
  const behavior = prefersReducedMotion() ? "auto" : "smooth";
  const r = node.getBoundingClientRect();
  const box = node.closest(".step-map-scroll");
  if (box && box.scrollHeight > box.clientHeight + 1) {
    const b = box.getBoundingClientRect();
    let shift = 0;
    if (r.top < b.top + 40 || r.bottom > b.bottom - 40) {
      const top = Math.min(Math.max(0, box.scrollTop + r.top - b.top - (b.height - r.height) / 2), box.scrollHeight - box.clientHeight);
      shift = top - box.scrollTop;
      box.scrollTo({ top, behavior });
    }
    // Donde quedará el sello: si ni así se ve, la página baja hasta la ventana
    const head = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    if (r.top - shift < head || r.bottom - shift > innerHeight) showStepsWindow();
    return;
  }
  if (r.top < 80 || r.bottom > innerHeight) node.scrollIntoView({ behavior, block: "center" });
}

/** Lleva la página hasta la ventana de los pasos, que queda entera a la vista en escritorio. */
export function showStepsWindow() {
  document.getElementById("diary")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
}

export function showOnMap(n) {
  const already = state.stepsView === "map";
  setState({ selectedStep: n, sheetOpen: false });
  if (already) return requestAnimationFrame(() => revealMapNode(n));
  // Se desplaza cuando el mapa ya llegó (Diary, al terminar el cambio): desplazar
  // mientras se escala daba tirones y dejaba el paso fuera de sitio
  mapFocus = n;
  setStepsView("map");
}

/** Desde el mapa: abre el paso en el diario. */
export function openInDiary(n) {
  setStepsView("diary");
  selectStep(n);
}
export const closeSheet = () => setState({ sheetOpen: false });

export function toggleStep(n) {
  const before = state;
  setState(s => {
    const done = { ...s.done };
    if (done[n]) delete done[n];
    else done[n] = true;
    return { done, shopEpoch: s.shopEpoch + 1 };
  });
  celebrateDofus(before.done);
  // Desmarcar no termina nada en otro paso
  if (state.done[n]) completeOthers(before);
}

/** Marca varios pasos a la vez (los que cierra un mismo combate). */
export function markSteps(ns) {
  const before = state;
  setState(s => ({ done: { ...s.done, ...Object.fromEntries(ns.map(n => [n, true])) }, shopEpoch: s.shopEpoch + 1 }));
  celebrateDofus(before.done);
  completeOthers(before);
}

/** Los pasos que n cierra y siguen pendientes (ninguno si n ya está hecho). */
export const pendingCloses = (s, n) => (s.done[n] ? [] : (STEPS[n - 1]?.closes || []).filter(c => !s.done[c]));

const objCount = q => q.s.reduce((a, stg) => a + stg.o.length, 0);

/**
 * Lo que un paso termina de los que cierra: no el paso entero, sino lo que este dejó a
 * medias (openOf), las misiones donde cae su parada roja (ni opcionales ni de solo
 * tomarla). Las demás se hacen en el propio paso, también las de después de la parada, y
 * no todo el mundo sigue la guía en orden. Una parada que termina un paso posterior
 * (`later`) no la termina este: cuenta como hecha si se llegó a ella. Devuelve esas
 * misiones ({ id: objetivos }), los pasos que con ellas quedan hechos y los que siguen
 * pendientes con las obligatorias que les faltan.
 */
export function closingPlan(s, closes) {
  const out = { questObj: {}, done: [], pending: [] };
  for (const c of closes) {
    const quests = questsOf(c);
    const { open, later, stops } = openOf(STEPS[c - 1], quests);
    // Sin las misiones (llegan en diferido) o sin parada que situar no se sabe qué deja
    // el paso a medias: se marca entero, como siempre
    if (!stops.some(p => quests.some(q => q.id === p.quest))) {
      out.done.push(c);
      continue;
    }
    quests.forEach(q => {
      if (open.has(String(q.id)) && !(String(q.id) in later)) out.questObj[q.id] = objCount(q);
    });
    // Hecha como en el diario y en el porcentaje: pasada de largo o en su último objetivo
    const pos = Math.min(s.questPos[c] || 0, quests.length - 1);
    const missing = quests.filter((q, i) => q.kind === "mandatory" && i >= pos
      && (out.questObj[q.id] ?? s.questObj[q.id] ?? 0) < (later[String(q.id)] ?? objCount(q)) && !questDoneElsewhere(s, q.id, c));
    if (missing.length) out.pending.push({ n: c, missing });
    else out.done.push(c);
  }
  return out;
}

/** "El 5 sigue pendiente: falta «…».", "El 25 y el 26 siguen pendientes: les faltan…" */
export function pendingText(pending) {
  if (pending.length > 1) {
    const els = list(pending.map(p => `el ${p.n}`));
    return `E${els.slice(1)} siguen pendientes: les faltan misiones.`;
  }
  const { n, missing } = pending[0];
  return `El ${n} sigue pendiente: ${missing.length > 1 ? `le faltan ${missing.length} misiones` : `falta «${missing[0].n}»`}.`;
}

/**
 * Lo que «Completar paso N» hace además en los pasos que cierra, para la línea bajo el
 * botón: "Además: el 77 queda completado y en el 78 completa 2 misiones." Un paso que
 * queda hecho lo dice así, aunque este clic no le termine ninguna misión; uno que sigue
 * pendiente, las misiones que le termina (las de closingPlan que no estaban ya
 * completas). Sin las misiones cargadas no se sabe qué queda a medias: null.
 */
export function alsoText(s, closes) {
  if (!closes.length || !s.questsLoaded) return null;
  const plan = closingPlan(s, closes);
  const parts = closes.flatMap(c => {
    if (plan.done.includes(c)) return [`el ${c} queda completado`];
    const quests = questsOf(c).filter(q => q.id in plan.questObj && (s.questObj[q.id] || 0) < plan.questObj[q.id]);
    if (!quests.length) return [];
    return [`en el ${c} completa ${quests.length > 1 ? `${quests.length} misiones` : `«${quests[0].n}»`}`];
  });
  return parts.length ? `Además: ${list(parts)}.` : null;
}

/**
 * «Hecho» en un paso que cierra otros: marca n y termina lo que les queda (closingPlan).
 * Los que aún tienen misiones sin hacer siguen pendientes y un aviso lo dice,
 * con la opción de marcarlos. Va después del aviso del Dofus: este pide algo, y la
 * franja ya celebra el Dofus.
 */
export function closeSteps(n, closes) {
  const plan = closingPlan(state, closes);
  const before = state;
  setState(s => ({
    done: { ...s.done, [n]: true, ...Object.fromEntries(plan.done.map(c => [c, true])) },
    questObj: { ...s.questObj, ...plan.questObj },
    shopEpoch: s.shopEpoch + 1,
  }));
  celebrateDofus(before.done);
  if (plan.pending.length) {
    const ns = plan.pending.map(p => p.n);
    showToast(pendingText(plan.pending), `Las hice, marcar el ${list(ns)}`, () => markSteps(ns));
  }
  completeOthers(before);
}

/**
 * Las misiones obligatorias del paso, todas hechas (pasadas de largo o en su último
 * objetivo, como en el diario). Sin misiones cargadas o sin ninguna obligatoria, no.
 */
function questsAllDone(s, n) {
  const quests = questsOf(n);
  const pos = Math.min(s.questPos[n] || 0, quests.length - 1);
  const needed = quests.filter(q => q.kind === "mandatory");
  return needed.length > 0 && quests.every((q, i) => q.kind !== "mandatory" || i < pos
    || (s.questObj[q.id] || 0) >= objCount(q) || questDoneElsewhere(s, q.id, n));
}

/**
 * Con todas sus misiones obligatorias hechas, el paso queda hecho solo, sin cambiar de
 * paso: como «Hecho», también termina lo que queda de los que cierra.
 */
function completeIfDone(n) {
  if (state.done[n] || !questsAllDone(state, n)) return;
  const closes = pendingCloses(state, n);
  if (closes.length) closeSteps(n, closes);
  else markSteps([n]);
}

/** Los pasos pendientes con todas sus misiones obligatorias hechas. */
const readySteps = s => (questsData() ? STEPS.filter(st => !s.done[st.n] && questsAllDone(s, st.n)).map(st => st.n) : []);

/**
 * Tras marcar pasos, los pendientes que con eso tienen hechas todas sus obligatorias
 * (las terminó el paso marcado, questDoneElsewhere) quedan hechos también, como con
 * completeIfDone. Solo los que no lo estaban ya antes: uno que se desmarcó a mano con
 * todo hecho sigue pendiente. Cada paso hecho puede completar otro: se repite hasta que
 * no queda ninguno (como mucho, un paso por vuelta). Sin las misiones cargadas, nada.
 */
let cascading = false;
function completeOthers(before) {
  if (cascading) return;
  cascading = true;
  try {
    const skip = new Set(readySteps(before));
    for (let i = 0; i < STEPS.length; i++) {
      const n = readySteps(state).find(m => !skip.has(m));
      if (n == null) break;
      completeIfDone(n);
      skip.add(n);
    }
  } finally {
    cascading = false;
  }
}

/** "¡Dofus Esmeralda obtenido!", "¡Piñata de pino obtenida!", "¡Dofus Marfil y Dofus Ébano obtenidos!" */
export function dofusWonText(road) {
  const names = road.map(d => d.name);
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} y ${names.at(-1)}` : names[0];
  const ending = names.length > 1 ? "obtenidos" : /^Piñata/.test(names[0]) ? "obtenida" : "obtenido";
  return `¡${list} ${ending}!`;
}

/**
 * Si al marcar se ha conseguido algún Dofus del camino que no se tenía, lo anuncia: la
 * franja de la ventana lo enciende (dofusWon) y un aviso lo dice, aunque la franja no
 * esté a la vista.
 */
function celebrateDofus(before) {
  const won = DOFUS_ROAD.filter(d => !before[d.step] && state.done[d.step]);
  if (!won.length) return;
  setState(s => ({ dofusWon: { seq: s.dofusWon.seq + 1, steps: won.map(d => d.step) } }));
  showToast(dofusWonText(won), "", null, 4500);
}

export function goToNextPending() {
  const n = nextPending(state);
  if (n == null) return;
  // Un paso que la pestaña o los filtros ocultan no se podría ver en la lista
  if (!stepMatches(state, STEPS[n - 1])) setFilters({ zones: [], status: "all", search: "" });
  selectStep(n);
  // En escritorio, a la vista el diario; en móvil la hoja ya está abierta
  if (!isMobile()) document.getElementById("diary")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function togglePrereq(id) {
  setState(s => {
    const prereqs = { ...s.prereqs };
    if (prereqs[id]) delete prereqs[id];
    else prereqs[id] = true;
    return { prereqs };
  });
}

export function setAllPrereqs(on) {
  setState({ prereqs: on ? Object.fromEntries(ALL_PREREQS.map(p => [p.id, true])) : {} });
}


// Filtros
const setFilters = patch => setState(s => ({ filters: { ...s.filters, ...patch } }));
/** Los sellos eligen una zona o ninguna (null = todas); volver a pulsar la misma la quita. */
export const setZone = z => setFilters({ zones: z == null || state.filters.zones[0] === z ? [] : [z] });
export const setSearch = v => setFilters({ search: v });
export const setStatusFilter = status => setFilters({ status });
export const clearFilters = () => setFilters({ zones: [], search: "" });

// Objetos necesarios
// Cualquier cambio de lo que se ve vuelve a la primera página de la lista
export const setShopTab = tab => setState(s => ({ shopTab: tab, shopPage: 0, shopEpoch: s.shopEpoch + 1 }));
export const setShopPendingOnly = b => setState(s => ({ shopPendingOnly: b, shopPage: 0, shopEpoch: s.shopEpoch + 1 }));
export const setShopSort = sort => setState(s => ({ shopSort: sort, shopPage: 0, shopEpoch: s.shopEpoch + 1 }));
export const setShopQuery = q => setState({ shopQuery: q, shopPage: 0 });
export function setShopView(view) {
  localStorage.setItem(LS.itemsView, view);
  setState({ shopView: view, shopPage: 0 });
}
export function setShopPageSize(size) {
  localStorage.setItem(LS.itemsPageSize, String(size));
  setState({ shopPageSize: size, shopPage: 0 });
}
export const setShopPage = page => setState({ shopPage: page });

/**
 * Marca o desmarca filas de objetos para sus pasos (row.steps). Una fila de "Tus próximos pasos"
 * marca solo esa parte ("clave#paso"); lo marcado como objeto entero se respeta y,
 * al desmarcar una parte, se reparte en los pasos que quedan.
 */
export function setRowsOwned(rows, on) {
  setState(s => {
    const owned = { ...s.owned };
    for (const row of rows) {
      if (on) {
        for (const n of row.steps) owned[`${row.k}#${n}`] = true;
        continue;
      }
      if (owned[row.k]) {
        delete owned[row.k];
        for (const m of ROW_BY_KEY.get(row.k)?.steps || []) {
          if (!row.steps.includes(m)) owned[`${row.k}#${m}`] = true;
        }
      }
      for (const n of row.steps) delete owned[`${row.k}#${n}`];
    }
    return { owned };
  });
}
export const toggleRowOwned = row => setRowsOwned([row], !rowHave(state, row));
/** Deshacer de "Marcar todo"/"Limpiar": vuelve a lo marcado antes, sin tocar nada más. */
export const restoreMarks = (owned, prereqs) => setState({ owned, prereqs });

// Misiones del overlay
export function loadQuests() {
  if (state.questsLoaded) return;
  loadQuestsData(() => {
    if (!state.questsLoaded) setState({ questsLoaded: true });
  });
}

export function moveQuest(delta) {
  const n = overlayStep(state);
  const cur = currentQuest(n, state.questPos, state.questObj);
  if (!cur) return;
  // Entre las que se hacen: las de solo tomarla se saltan
  const i = cur.walked[Math.max(0, Math.min(cur.walked.length - 1, cur.at + delta))];
  setState(s => ({ questPos: { ...s.questPos, [n]: i } }));
}

/**
 * Desde el diario: deja la misión `qi` del paso `n` en su objetivo `k` (los de antes,
 * hechos). Pasado el último (`k` = `total`), la misión queda terminada y el paso sigue
 * con su siguiente misión que se hace. Es el mismo avance que lleva el overlay. Una
 * opcional guarda solo su objetivo: no mueve la misión en curso.
 */
export function setObjective(n, qi, qid, k, total) {
  const list = questsOf(n);
  const next = nextWalked(list, qi);
  // En un paso hecho todas sus obligatorias cuentan como completadas. Deshacer una lo
  // desmarca: las demás quedan completadas de verdad y esa, donde se ha dejado
  if (state.done[n] && list[qi]?.kind !== "optional") {
    if (k >= total) return;
    setState(s => {
      const done = { ...s.done };
      delete done[n];
      const full = Object.fromEntries(list.filter(q => q.kind === "mandatory").map(q => [q.id, objCount(q)]));
      return {
        done,
        questPos: { ...s.questPos, [n]: qi },
        questObj: { ...s.questObj, ...full, [qid]: Math.max(0, k) },
        shopEpoch: s.shopEpoch + 1,
      };
    });
    return;
  }
  setState(s => {
    // Deshacer una terminada que va por delante del avance no lo adelanta: las de antes
    // siguen como estaban (se terminó la 2.ª, se deshizo la 1.ª y luego la 2.ª)
    const undo = k < total && (s.questObj[qid] || 0) >= total;
    // Terminada, se sigue por la siguiente sin terminar (las hijas ya hechas se saltan)
    let at = k >= total && next >= 0 ? nextOpen(list, qi, { ...s.questObj, [qid]: total }) : undo ? Math.min(s.questPos[n] || 0, qi) : qi;
    // Una hija no pasa de largo a su madre sin terminar: le quedan los objetivos de después
    const mother = k >= total ? parentIn(list, qid) : -1;
    if (mother >= 0 && mother < at && (s.questPos[n] || 0) <= mother
      && (s.questObj[list[mother].id] || 0) < objCount(list[mother])) at = mother;
    return {
      questPos: list[qi]?.kind === "optional" ? s.questPos : { ...s.questPos, [n]: at },
      questObj: { ...s.questObj, [qid]: Math.max(0, Math.min(k, total)) },
    };
  });
  completeIfDone(n);
}

export function moveObjective(delta) {
  const n = overlayStep(state);
  const cur = currentQuest(n, state.questPos, state.questObj);
  if (!cur) return;
  const next = cur.k + delta;
  if (next < 0) return;
  // Fin de la misión: queda terminada y se pasa a la siguiente (en la última, el paso
  // puede quedar hecho)
  if (next >= cur.objs.length) {
    setState(s => ({ questObj: { ...s.questObj, [cur.q.id]: cur.objs.length } }));
    moveQuest(1);
  } else {
    setState(s => ({ questObj: { ...s.questObj, [cur.q.id]: next } }));
  }
  completeIfDone(n);
}

// ---------------------------------------------------------------------------
// Instantánea del progreso: la usan el reinicio, el deshacer y la copia de seguridad
// ---------------------------------------------------------------------------
export const takeSnapshot = () => ({
  guide: GUIDE_VERSION,
  done: { ...state.done },
  prereqs: { ...state.prereqs },
  owned: { ...state.owned },
  questPos: { ...state.questPos },
  questObj: { ...state.questObj },
});

export function applySnapshot(snap) {
  // Una copia hecha con la versión anterior de la guía trae la numeración vieja
  if (snap.guide !== GUIDE_VERSION) snap = { ...snap, ...migrateProgress(snap.done, snap.questPos) };
  setState(s => ({
    done: snap.done || {},
    prereqs: snap.prereqs || {},
    owned: snap.owned || {},
    questPos: snap.questPos || {},
    questObj: snap.questObj || {},
    selectedStep: null,
    sheetOpen: false,
    stepsView: readStepsView(),
    shopEpoch: s.shopEpoch + 1,
  }));
  // La versión vanilla siempre reescribía las cinco claves, aunque no cambiaran.
  for (const k of PERSISTED) localStorage.setItem(LS[k], JSON.stringify(state[k]));
}

// ---------------------------------------------------------------------------
// Aviso inferior con acción
// ---------------------------------------------------------------------------
let toastTimer;
let toastAction = null;
export function showToast(text, actionLabel = "", onAction = null, ms = 8000) {
  toastAction = onAction;
  clearTimeout(toastTimer);
  setState(s => ({ toast: { seq: s.toast.seq + 1, visible: true, text, actionLabel, ms } }));
  toastTimer = setTimeout(hideToast, ms);
}
export function hideToast() {
  clearTimeout(toastTimer);
  setState(s => ({ toast: { ...s.toast, visible: false } }));
}
export function runToastAction() {
  const fn = toastAction;
  hideToast();
  fn?.();
}
