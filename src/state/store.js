// ============================================================================
// STORE — única fuente de verdad. Toda la UI se deriva de este estado, así que
// ya no hace falta acordarse de llamar a renderX() tras cada cambio.
// ============================================================================
import { useSyncExternalStore } from "react";
import { prefersReducedMotion } from "../lib/motion.js";
import { STEPS, ALL_PREREQS, PREVIOUS_STEPS, TIER_POINTS, TOTAL_PTS } from "../data/steps.js";
import { currentQuest, loadQuests as loadQuestsData, questsData } from "../lib/quests.js";
import { ALL_ROWS, PREREQ_OF_ROW, PREREQ_STEP, ROW_BY_KEY, STEPS_WITH_ITEMS } from "../lib/resources.js";

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
  needsCollapsed: "silvestre:needsCollapsed",
  stepsView: "silvestre:stepsView",
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

const readObj = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || "{}") || {};
  } catch {
    return {};
  }
};

export const isMobile = () => window.matchMedia("(max-width: 900px)").matches;

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
  const pendingPrereqs = ALL_PREREQS.filter(p => !prereqs[p.id]).length;
  return {
    done,
    prereqs,
    owned: readObj(LS.owned),
    theme: localStorage.getItem(LS.theme) || "dark",
    questPos, // paso -> índice de misión
    questObj: readObj(LS.questObj), // misión -> índice de objetivo
    // "Lo que necesitas" abre en prerrequisitos mientras falte alguno
    needsTab: pendingPrereqs > 0 && Object.keys(done).length < STEPS.length ? "prereqs" : "items",
    // Contraída a mano mientras la guía no está completa (al 100 % se contrae sola)
    needsCollapsed: localStorage.getItem(LS.needsCollapsed) === "1",
    selectedStep: null,
    sheetOpen: false,
    // Los 100 pasos como diario (lista + detalle) o como mapa del camino
    stepsView: localStorage.getItem(LS.stepsView) === "map" ? "map" : "diary",
    // status: all | pending | done (las pestañas del diario)
    filters: { zones: [], status: "all", search: "" },
    shopTab: "todo",
    shopPendingOnly: true,
    shopSort: "soon",   // soon (Pronto primero) | qty | az
    shopView: localStorage.getItem(LS.itemsView) === "list" ? "list" : "grid",
    shopPageSize: readPageSize(),
    shopPage: 0,
    shopQuery: "",
    // Cada vez que la versión vanilla repintaba la lista entera se repetía la
    // animación de entrada; este contador remonta la rejilla en esos mismos casos.
    shopEpoch: 0,
    questsLoaded: questsData() != null,
    toast: { seq: 0, visible: false, text: "", actionLabel: "", ms: 8000 },
  };
}

let state = initialState();
const listeners = new Set();

const PERSISTED = ["done", "prereqs", "owned", "questPos", "questObj"];

function setState(patch) {
  const prev = state;
  const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
  if (next === prev) return;
  state = next;
  for (const k of PERSISTED) {
    if (next[k] !== prev[k]) localStorage.setItem(LS[k], JSON.stringify(next[k]));
  }
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
export const donePts = s => STEPS.reduce((a, st) => a + (s.done[st.n] ? TIER_POINTS[st.effort] : 0), 0);
export const progressPct = s => (TOTAL_PTS ? Math.round((donePts(s) / TOTAL_PTS) * 1000) / 10 : 0);
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
/** Conseguido a mano para ese paso: el objeto entero (clave sola) o solo esa parte ("clave#paso"). */
const stepOwned = (s, k, n) => !!s.owned[k] || !!s.owned[`${k}#${n}`];

/**
 * Los próximos pasos pendientes (los prerrequisitos primero si faltan). Son la
 * franja "Pronto" de los objetos: lo que hay que reunir ya.
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
export const overlayStep = s => s.selectedStep ?? nextPending(s) ?? STEPS.length;

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

export function selectStep(n) {
  if (n < 1 || n > STEPS.length) return;
  setState({ selectedStep: n, ...(isMobile() ? { sheetOpen: true } : null) });
}

/** Desde el overlay: cambia el paso sin abrir la hoja móvil. */
export function overlayGo(n) {
  if (n < 1 || n > STEPS.length) return;
  setState({ selectedStep: n });
}

export const clearSelection = () => setState({ selectedStep: null });

export function setStepsView(view) {
  localStorage.setItem(LS.stepsView, view);
  setState({ stepsView: view });
}
/**
 * Desde el diario: vuelve al mapa con ese paso abierto (en móvil cierra la hoja) y lo
 * deja a la vista, centrado, cuando el mapa ya está pintado.
 */
export function showOnMap(n) {
  setState({ selectedStep: n, sheetOpen: false });
  setStepsView("map");
  // Después del zoom y solo si hace falta: desplazar y escalar a la vez daba tirones
  setTimeout(() => {
    const node = document.querySelector(`.map-node[data-n="${n}"]`);
    const r = node?.getBoundingClientRect();
    if (r && (r.top < 80 || r.bottom > innerHeight)) node.scrollIntoView({ behavior: "smooth", block: "center" });
  }, prefersReducedMotion() ? 0 : 340);
}

/** Desde el mapa: abre el paso en el diario. */
export function openInDiary(n) {
  setStepsView("diary");
  selectStep(n);
}
export const closeSheet = () => setState({ sheetOpen: false });

export function toggleStep(n) {
  setState(s => {
    const done = { ...s.done };
    if (done[n]) delete done[n];
    else done[n] = true;
    return { done, shopEpoch: s.shopEpoch + 1 };
  });
}

/** Marca varios pasos a la vez (los que cierra un mismo combate). */
export function markSteps(ns) {
  setState(s => ({ done: { ...s.done, ...Object.fromEntries(ns.map(n => [n, true])) }, shopEpoch: s.shopEpoch + 1 }));
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

// Lo que necesitas: pestaña activa y acceso desde el hero
export const setNeedsTab = tab => setState({ needsTab: tab });
export function setNeedsCollapsed(collapsed) {
  localStorage.setItem(LS.needsCollapsed, collapsed ? "1" : "0");
  setState({ needsCollapsed: collapsed });
}
export function openNeeds(tab) {
  setNeedsCollapsed(false);
  setNeedsTab(tab);
  document.getElementById("needs")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
 * Marca o desmarca filas de objetos para sus pasos (row.steps). Una fila de "Pronto"
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
  const i = Math.max(0, Math.min(cur.list.length - 1, cur.i + delta));
  setState(s => ({ questPos: { ...s.questPos, [n]: i } }));
}

export function moveObjective(delta) {
  const cur = currentQuest(overlayStep(state), state.questPos, state.questObj);
  if (!cur) return;
  const next = cur.k + delta;
  if (next >= cur.objs.length) return moveQuest(1); // fin de la misión: pasa a la siguiente
  if (next < 0) return;
  setState(s => ({ questObj: { ...s.questObj, [cur.q.id]: next } }));
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
    // Los 100 pasos como diario (lista + detalle) o como mapa del camino
    stepsView: localStorage.getItem(LS.stepsView) === "map" ? "map" : "diary",
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
