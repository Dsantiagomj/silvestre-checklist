import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, usePresence, useReducedMotion } from "motion/react";
import { useAnimate } from "motion/react-mini";
import { makeChannel, whenReady } from "../lib/viewSwap.js";
import { EASE, morphHeight, prefersReducedMotion, restartClass, useHeightMorph } from "../lib/motion.js";
import { LeavingContext, useLiveId } from "../lib/leaving.js";
import { STEPS } from "../data/steps.js";
import { DOFUS_ROAD, imgUrl } from "../lib/assets.js";
import { CLOSED_BY, resolvedBoss, stepTitle } from "../lib/journal.js";
import { ALL_ROWS } from "../lib/resources.js";
import {
  clearFilters, hasActiveFilters, isMobile, isStepsView, nextPending, ownedCount, prereqsPending, revealMapNode, selectStep,
  setSearch, setStatusFilter, setStepsView, showStepsWindow, takeMapFocus,
  stepMatchesFilters, stepMatchesStatus, toggleStep, useAppState,
} from "../state/store.js";
import Journal from "./Journal.jsx";
import Needs, { NeedsBar } from "./Needs.jsx";
import { ItemsTools } from "./needs/ItemsPanel.jsx";
import StepMap, { mapPoint, mapScrollTop } from "./StepMap.jsx";
import WinStrip from "./WinStrip.jsx";
import ZoneSeals from "./ZoneSeals.jsx";
import SearchField from "./SearchField.jsx";
import { appRoot, eventTarget } from "../lib/root.js";

const TABS = [
  ["pending", "Pendientes", "diaryTabPending"],
  ["done", "Hechos", "diaryTabDone"],
  ["all", "Todos", "diaryTabAll"],
];
const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));

/**
 * Lo que se gana en el paso: el Dofus que da o, si no, el jefe que resuelve. Si no hay
 * ninguno, nada: un icono de relleno no diría nada del paso.
 */
function rowArt(n) {
  if (ROAD_AT[n]) return { img: ROAD_AT[n].img, name: ROAD_AT[n].name };
  const boss = resolvedBoss(n);
  return boss ? { img: boss.img, name: boss.name } : null;
}

const Row = memo(function Row({ step, done, current, instant }) {
  const n = step.n;
  const ref = useRef(null);
  const [present, safeToRemove] = usePresence();
  // Al salir de la lista por marcarla (con el filtro Pendientes, por ejemplo) se queda un
  // momento para que se vea la ✓ y se pliega; lo de debajo sube en vez de saltar. Al
  // cambiar de filtro o de búsqueda se va sin más: plegar decenas de filas sería lento
  useEffect(() => {
    if (present) return;
    if (instant.current || prefersReducedMotion()) return safeToRemove();
    const el = ref.current;
    el.animate(
      [{ height: `${el.offsetHeight}px`, opacity: 1, overflow: "clip" }, { height: "0px", opacity: 0, overflow: "clip" }],
      { duration: 240, delay: 280, easing: EASE, fill: "forwards" },
    ).finished.then(safeToRemove, safeToRemove);
  }, [present]); // eslint-disable-line react-hooks/exhaustive-deps
  const art = rowArt(n);
  const closedBy = !done && CLOSED_BY[n];
  const closes = !done && step.closes;
  // Dentro del botón de la fila: un clic lleva a ese paso sin abrir este (con teclado,
  // los mismos enlaces están en el detalle)
  const go = m => e => { e.stopPropagation(); selectStep(m); };
  return (
    <li ref={ref} className={"diary-row" + (done ? " done" : "") + (current ? " current" : "")} data-n={n}
      aria-current={current ? "step" : undefined} inert={!present}>
      <button type="button" className="row-check" aria-pressed={done} aria-label={`${done ? "Desmarcar" : "Marcar"} paso ${n}`}
        onClick={() => toggleStep(n)}></button>
      <button type="button" className="row-main" onClick={() => selectStep(n)}>
        <span className="row-num">{n}</span>
        <span className="row-text">
          <span className="row-title">{stepTitle(step)}</span>
          <span className="row-sub"><span className="row-zone">{step.zone}</span></span>
        </span>
        {/* A la derecha: dónde se cierra o qué cierra, y lo que se gana */}
        <span className="row-tags">
          {closedBy && <span className="row-closed" title={`Ir al paso ${closedBy}`} onClick={go(closedBy)}>se cierra en el {closedBy}</span>}
          {closes && (
            <span className="row-closes" title={`Ir al paso ${closes[0]}`} onClick={go(closes[0])}>
              cierra el {closes.join(", ")}
            </span>
          )}
        </span>
        <span className="row-art" aria-hidden="true">
          {art && <img src={imgUrl(art.img)} alt={art.name} title={art.name} loading="lazy" decoding="async" />}
        </span>
      </button>
    </li>
  );
});

/**
 * La ventana del diario (lista y detalle): en escritorio llena lo que deja la cabecera
 * de la ventana y cada lado se desplaza por dentro. Al cambiar de paso, el detalle
 * vuelve arriba, sin mover la página.
 */
function DiaryWindow({ step, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    ref.current.querySelector(".diary-detail")?.scrollTo(0, 0);
  }, [step]);
  return <div className="diary-window" ref={ref}>{children}</div>;
}

/** La lista de pasos por capítulos, con las pestañas de estado. */
function DiaryList({ s, current }) {
  const listRef = useRef(null);
  const tabId = useLiveId;
  const status = s.filters.status;
  const matching = STEPS.filter(st => stepMatchesFilters(s, st));
  const count = st => matching.filter(x => stepMatchesStatus(s, x, st)).length;
  const visible = new Set(matching.filter(st => stepMatchesStatus(s, st)).map(st => st.n));
  // Cambiar de filtro, de búsqueda o de zona quita las filas al momento (ver Row)
  const filterKey = `${status}|${s.filters.search}|${s.filters.zones.join()}`;
  const lastKey = useRef(filterKey);
  const instant = useRef(false);
  // En un efecto de diseño y no al renderizar: corre antes de que las filas que se van
  // decidan cómo irse, y un render repetido (StrictMode) no lo falsea
  useLayoutEffect(() => {
    instant.current = lastKey.current !== filterKey;
    lastKey.current = filterKey;
  });

  // El paso abierto siempre a la vista dentro de la lista, sin mover la página
  useLayoutEffect(() => {
    const box = listRef.current;
    const row = box?.querySelector(`.diary-row[data-n="${current}"]`);
    if (!box || !row || box.scrollHeight <= box.clientHeight) return;
    const top = row.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + row.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 3;
    }
  }, [current, status]);

  return (
    <div className="diary-side">
      <div className="diary-tabs">
        <div className="seg seg-fill" role="group" aria-label="Mostrar">
          {TABS.map(([key, label, id]) => (
            <button key={key} type="button" id={tabId(id)} aria-pressed={status === key} onClick={() => setStatusFilter(key)}>
              {label} <span className="n">{count(key)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="diary-list" ref={listRef}>
        {visible.size === 0 && (
          <div className="diary-empty">
            <p>Ningún paso coincide.</p>
            {hasActiveFilters(s) && <button type="button" className="btn-secondary" onClick={clearFilters}>Quitar filtros</button>}
          </div>
        )}
        <ol className="diary-rows">
          <AnimatePresence initial={false}>
            {STEPS.filter(st => visible.has(st.n)).map(st => (
              <Row key={st.n} step={st} done={!!s.done[st.n]} current={st.n === current} instant={instant} />
            ))}
          </AnimatePresence>
        </ol>
      </div>
    </div>
  );
}

/** Buscador de pasos, en la barra de herramientas de la ventana. */
function DiaryBar({ s }) {
  return (
    <div className="diary-bar">
      <SearchField className="diary-search" id="searchInput" matchesId="searchMatches" clearId="searchClear" value={s.filters.search} onChange={setSearch}
        placeholder="Buscar paso por número o texto" label="Buscar paso"
        matches={STEPS.filter(st => stepMatchesFilters(s, st)).length} total={STEPS.length} />
    </div>
  );
}

// Pestañas de la ventana: las dos vistas de los pasos (el mapa es la de por defecto: se
// recorre el camino y se entra al diario de un paso) y, aparte, lo que hay que reunir
const VIEWS = [
  ["map", "Mapa", "stepsViewMap"],
  ["diary", "Diario", "stepsViewDiary"],
];
const NEEDS = [
  ["prereqs", "Prerrequisitos", "tabPrereqs", "prereqsCount", s => prereqsPending(s)],
  ["items", "Objetos", "tabItems", "itemsCount", s => ALL_ROWS.length - ownedCount(s)],
];

const TAB_ORDER = [...VIEWS, ...NEEDS].map(t => t[0]);

/** Lo que falta en una lista; sin nada pendiente, una ✓. Rebota al cambiar. También en el overlay. */
export function WinBadge({ n, id }) {
  const ref = useRef(null);
  const last = useRef(n);
  useLayoutEffect(() => {
    if (last.current === n) return;
    last.current = n;
    if (!prefersReducedMotion()) restartClass(ref.current, "bump");
  }, [n]);
  return (
    <span ref={ref} className={"win-badge" + (n ? "" : " done")} id={id}
      aria-label={n ? `${n} pendientes` : "completo"}>{n || "✓"}</span>
  );
}

/**
 * La marca de la pestaña activa: una sola píldora bajo las cuatro que se desliza hasta
 * la elegida (y sigue su ancho si cambia, por ejemplo al cambiar una insignia).
 */
function useTabPill(listRef, pillRef, view) {
  useLayoutEffect(() => {
    const list = listRef.current;
    const pill = pillRef.current;
    const place = () => {
      const tab = list.querySelector('[aria-selected="true"]');
      if (!tab) return;
      const a = list.getBoundingClientRect(), b = tab.getBoundingClientRect();
      pill.style.transform = `translate(${b.left - a.left + list.scrollLeft}px, ${b.top - a.top}px)`;
      pill.style.width = `${b.width}px`;
      pill.style.height = `${b.height}px`;
    };
    place();
    // La primera vez, en su sitio sin viajar; después, cada cambio se desliza
    const ready = requestAnimationFrame(() => pill.classList.add("ready"));
    const ro = new ResizeObserver(place);
    ro.observe(list);
    list.querySelectorAll('[role="tab"]').forEach(t => ro.observe(t));
    return () => { cancelAnimationFrame(ready); ro.disconnect(); };
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
}

function WinTab({ s, view, label, id, children }) {
  const on = s.stepsView === view;
  return (
    <button type="button" role="tab" id={id} aria-selected={on} tabIndex={on ? 0 : -1}
      onClick={() => setStepsView(view)}>{label}{children}</button>
  );
}

/** Las cuatro pestañas; con las flechas se pasa de una a otra, como en una lista de pestañas. */
function WinTabs({ s }) {
  const onKey = e => {
    const order = TAB_ORDER;
    const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    // Sin que la flecha llegue al teclado del diario, que cambiaría de paso
    e.stopPropagation();
    const list = e.currentTarget;
    const next = order[(order.indexOf(s.stepsView) + step + order.length) % order.length];
    setStepsView(next);
    requestAnimationFrame(() => list.querySelector(`[aria-selected="true"]`)?.focus());
  };
  const listRef = useRef(null);
  const pillRef = useRef(null);
  useTabPill(listRef, pillRef, s.stepsView);
  return (
    <div className="win-tabs" role="tablist" aria-label="Ventana de pasos" onKeyDown={onKey} ref={listRef}>
      <div className="steps-view">
        {VIEWS.map(([key, label, id]) => <WinTab key={key} s={s} view={key} label={label} id={id} />)}
      </div>
      <div className="needs-view-tabs">
        {NEEDS.map(([key, label, id, countId, pending]) => {
          const n = pending(s);
          return (
            <WinTab key={key} s={s} view={key} label={label} id={id}>
              <WinBadge n={n} id={countId} />
            </WinTab>
          );
        })}
      </div>
      <span className="win-tab-pill" ref={pillRef} aria-hidden="true"></span>
    </div>
  );
}

// "/" lleva al buscador de objetos desde cualquier parte de la página. En escritorio el
// buscador va fijo en la ventana: se lleva la ventana entera a la vista
function useSlashToItems() {
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = eventTarget(e);
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;
      e.preventDefault();
      setStepsView("items");
      requestAnimationFrame(() => {
        const input = appRoot().getElementById("needsSearch");
        if (isMobile()) {
          input?.focus();
          input?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        input?.focus({ preventScroll: true });
        showStepsWindow();
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

/**
 * Un juego de herramientas de la fila: el de los pasos (mapa y diario comparten el
 * suyo), el de los prerrequisitos o el de los objetos. Todos ocupan la misma celda de
 * la fila, así que cambiar de pestaña no mueve nada: el que se va se apaga mientras se
 * apaga la vista vieja y el nuevo se enciende con la vista nueva. Mientras se va, inerte y sin ids.
 */
function ToolSet({ group, enter, reduce, children }) {
  const [present, safeToRemove] = usePresence();
  const ref = useRef(null);
  // Al llegar, antes de pintarse: invisible hasta que la vista vieja se ha ido
  useLayoutEffect(() => {
    if (enter && !reduce) ref.current.animate([{ opacity: 0 }, { opacity: 1 }], TOOL_IN);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (present) return;
    if (reduce) return safeToRemove();
    ref.current.animate([{ opacity: 1 }, { opacity: 0 }], TOOL_OUT).finished.then(safeToRemove, safeToRemove);
  }, [present]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="win-tool" data-tool={group} ref={ref} inert={!present} aria-hidden={!present || undefined}>
      <LeavingContext.Provider value={!present}>{children}</LeavingContext.Provider>
    </div>
  );
}

/**
 * La fila de herramientas de la ventana, siempre con el mismo alto: el buscador de pasos
 * y la zona en el mapa y el diario, "Marcar todo" y "Limpiar" en los prerrequisitos, y
 * el buscador, el orden, la vista y el filtro en los objetos.
 */
function WinTools({ s, current, enter, reduce }) {
  const group = isStepsView(s.stepsView) ? "steps" : s.stepsView;
  return (
    <div className="win-tools">
      <AnimatePresence initial={false}>
        <ToolSet key={group} group={group} enter={enter} reduce={reduce}>
          {group === "steps" ? (
            <>
              <DiaryBar s={s} />
              <ZoneSeals s={s} current={current} />
            </>
          ) : group === "prereqs" ? <NeedsBar tab="prereqs" /> : <ItemsTools />}
        </ToolSet>
      </AnimatePresence>
    </div>
  );
}

// Cambio entre diario y mapa: un zoom sutil sobre el sello del paso actual (0,3 s,
// easeInOut, en la línea de duffus.fr) que hace de pantalla de carga. Del mapa al diario
// se entra (el mapa crece); del diario al mapa se sale (el diario se encoge). La vista
// que se va se queda así hasta que la que llega, preparada invisible encima, avisa de
// que está lista (lib/viewSwap.js); entonces se cruzan.
const ZOOM = { duration: 0.3, ease: "easeInOut" };
const ZOOMED = { map: "scale(1.15)", diary: "scale(0.94)" };     // de dónde llega cada vista
const LEAVING = { map: "scale(0.9)", diary: "scale(1.15)" };     // a dónde va la que se va
// Cambio de pestaña con las listas: un fundido en dos tiempos. La vieja se aparta un
// poco hacia un lado y se apaga del todo (con ella, las herramientas de su pestaña);
// solo entonces llega la nueva desde el lado de su pestaña, y sus herramientas se
// encienden a la vez. Nunca se ven dos vistas a la vez ni se mueve nada
const SHIFT = 12;
const OUT_MS = 140;
const SLIDE_OUT = { duration: OUT_MS / 1000, ease: [0.4, 0, 1, 1] };
const SLIDE_IN = { duration: 0.24, delay: OUT_MS / 1000 + 0.02, ease: [0.2, 0.8, 0.2, 1] };
// Las herramientas de la fila: solo opacidad, al compás de las vistas
const TOOL_OUT = { duration: OUT_MS, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" };
const TOOL_IN = { duration: OUT_MS, delay: OUT_MS + 20, easing: EASE, fill: "backwards" };

/** El cambio en curso: { id, to, kind: "zoom" | "slide", dir } y el canal por el que la nueva avisa a la vieja. */
const SwapContext = createContext(null);

/** Una de las dos vistas. La que se va queda inerte y sin ids mientras sale. */
function ViewLayer({ ref, view, origin, reduce, children }) {
  const [present, safeToRemove] = usePresence();
  const swap = useContext(SwapContext);
  const [scope, animate] = useAnimate();
  // Estable: una función nueva en cada render haría que React soltara la ref (null) y la
  // volviera a poner en cada commit, y AnimatePresence (popLayout) la lee justo en medio.
  // Sin ella no saca del flujo la vista que se va: la nueva quedaba debajo, fuera de la
  // pantalla, y aparecía de golpe al terminar
  const setRef = useCallback(el => {
    scope.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  }, [ref]); // eslint-disable-line react-hooks/exhaustive-deps

  // La que llega: invisible y en su sitio de partida hasta estar lista, luego aparece
  useLayoutEffect(() => {
    const el = scope.current;
    if (!swap.current || swap.current.to !== view || reduce) return;
    const { id, kind, dir } = swap.current;
    if (kind === "slide") {
      el.style.opacity = "0";
      el.style.transform = `translateX(${dir * SHIFT}px)`;
      animate(el, { opacity: [0, 1], transform: [`translateX(${dir * SHIFT}px)`, "translateX(0px)"] }, SLIDE_IN)
        .then(() => { el.style.opacity = ""; el.style.transform = ""; });
      return;
    }
    el.style.opacity = "0";
    el.style.transform = ZOOMED[view];
    let alive = true;
    whenReady(el, view).then(() => {
      if (!alive) return;
      swap.channel.ready(id);
      animate(el, { opacity: [0, 1], transform: [ZOOMED[view], "scale(1)"] }, ZOOM).then(() => {
        el.style.opacity = "";
        el.style.transform = "";
      });
    });
    return () => { alive = false; swap.channel.ready(id); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // La que se va: hace su zoom y, cuando la nueva está lista, se desvanece mientras esta aparece
  useEffect(() => {
    if (present) return;
    if (reduce || !swap.current) return safeToRemove();
    const el = scope.current;
    const { id, to, kind, dir } = swap.current;
    if (kind === "slide") {
      animate(el, { opacity: 0, transform: `translateX(${-dir * SHIFT}px)` }, SLIDE_OUT).then(safeToRemove);
      return;
    }
    // El zoom y el fundido van a la vez en cuanto la nueva está lista: la nueva entra
    // encima mientras esta se aleja, sin esperar a que acabe su zoom
    Promise.all([
      animate(el, { transform: LEAVING[to] }, ZOOM),
      swap.channel.when(id).then(() => animate(el, { opacity: 0 }, ZOOM)),
    ]).then(safeToRemove);
  }, [present]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={setRef} className="steps-layer" style={{ transformOrigin: origin }}
      inert={!present} aria-hidden={!present || undefined}>
      <LeavingContext.Provider value={!present}>{children}</LeavingContext.Provider>
    </div>
  );
}

/**
 * Los 100 pasos: una ventana con los Dofus del camino y el progreso arriba y, en
 * pestañas, el mapa del camino, el diario (lista y detalle), los prerrequisitos y los
 * objetos.
 */
export default function Diary({ mobile }) {
  const s = useAppState();
  useSlashToItems();
  const next = nextPending(s) ?? STEPS.length;
  // Sin nada elegido, el detalle abre el siguiente pendiente (en móvil vive en la hoja)
  const current = s.selectedStep ?? (mobile ? null : next);
  const map = s.stepsView === "map";
  const steps = isStepsView(s.stepsView);
  // En móvil la ventana sigue el flujo de la página: cambiar de paso o de pestaña mueve
  // lo de debajo con suavidad y el cambio de vista lo lleva el zoom. En escritorio la
  // ventana tiene el alto de la pantalla y la vista llena lo que queda: no hay alturas
  // que animar
  const stageRef = useRef(null);
  const reduce = useReducedMotion();
  const flow = mobile;
  // En móvil, mientras conviven las dos vistas la sección guarda la altura de antes
  // (minHeight) y no se anima la altura: recalcular la página en cada fotograma daba tirones
  const [swap, setSwap] = useState(null);
  const switching = useRef(false);
  const height = useRef(0);
  // El paso a dejar a la vista al volver al mapa. Se mira cuando la página ya tiene su
  // altura final: un fotograma antes la vista nueva sigue debajo de la que se fue, el
  // paso parece fuera de la pantalla y el desplazamiento acababa demasiado abajo
  const focus = useRef(null);
  const [settled, setSettled] = useState(0);
  useEffect(() => {
    const n = focus.current;
    focus.current = null;
    if (n != null) revealMapNode(n);
  }, [settled]);
  // El cambio en curso se decide al renderizar, para que la vista nueva lo vea al montarse
  const lastView = useRef(s.stepsView);
  // Lo que aparece después de montarse la página se anima; lo que ya estaba, no
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; }, []);
  const swapInfo = useRef({ current: null, seq: 0, channel: makeChannel() }).current;
  // El zoom es solo entre mapa y diario; a las listas y desde ellas se cambia sin más
  // Entre mapa y diario, el zoom; a las listas y desde ellas, un deslizamiento hacia el
  // lado de la pestaña elegida
  if (lastView.current !== s.stepsView) {
    const from = lastView.current, to = s.stepsView;
    const id = ++swapInfo.seq;
    swapInfo.current = reduce ? null
      : isStepsView(from) && steps ? { id, to, kind: "zoom" }
      : { id, to, kind: "slide", dir: Math.sign(TAB_ORDER.indexOf(to) - TAB_ORDER.indexOf(from)) };
  }
  useLayoutEffect(() => {
    if (lastView.current === s.stepsView) return;
    lastView.current = s.stepsView;
    if (swapInfo.current?.kind !== "zoom") return;
    switching.current = true;
    setSwap(height.current);
  }, [s.stepsView]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (!switching.current) height.current = stageRef.current.offsetHeight; });
  // Al acabar el zoom la sección suelta la altura de antes: si la vista nueva es más baja
  // (del mapa al diario) lo de debajo sube con suavidad en vez de saltar
  const endHeight = useRef(null);
  useLayoutEffect(() => {
    const from = endHeight.current;
    endHeight.current = null;
    const el = stageRef.current;
    if (swap != null || from == null || reduce || !flow || Math.abs(from - el.offsetHeight) < 2) return;
    morphHeight(el, from);
  }, [swap]); // eslint-disable-line react-hooks/exhaustive-deps
  useHeightMorph(stageRef, steps ? (map ? "map" : `diary-${current}`) : s.stepsView, { skip: () => switching.current || !flow });
  // El centro del zoom, el sello del paso en pantalla: en escritorio, descontando lo
  // desplazado dentro del mapa
  const at = mapPoint(stageRef.current?.clientWidth || 1200, s.selectedStep ?? next);
  const origin = `${at.x}px ${at.y - (flow ? 0 : mapScrollTop())}px`;
  return (
    <section className="diary" id="diary" aria-labelledby="diaryTitle">
      <div className="diary-head">
        <h2 className="section-title" id="diaryTitle">Los 100 pasos</h2>
      </div>
      {/* Una sola ventana: los Dofus del camino y el progreso arriba, las pestañas y,
          debajo, lo que se elija */}
      <div className="steps-win">
        <WinStrip s={s} />
        <WinTabs s={s} />
        <WinTools s={s} current={current} enter={mounted.current} reduce={reduce} />
        <div className={"steps-stage" + (swap != null ? " swap" : "")} ref={stageRef}
          style={swap != null && flow ? { minHeight: swap } : undefined}>
          <SwapContext.Provider value={swapInfo}>
            <AnimatePresence mode="popLayout" initial={false}
              onExitComplete={() => {
                if (switching.current) endHeight.current = stageRef.current.offsetHeight;
                switching.current = false;
                setSwap(null);
                focus.current = takeMapFocus();
                setSettled(c => c + 1);
              }}>
              <ViewLayer key={s.stepsView} view={s.stepsView} origin={origin} reduce={reduce}>
                {!steps ? (
                  <Needs tab={s.stepsView} />
                ) : map ? (
                  <StepMap s={s} current={s.selectedStep ?? next} mobile={mobile} />
                ) : (
                  <DiaryWindow step={current}>
                    <DiaryList s={s} current={current} />
                    {!mobile && current != null && (
                      <div className="diary-detail">
                        {/* key: al cambiar de paso los desplegables vuelven a su estado inicial */}
                        <Journal key={current} n={current} id="journal" />
                      </div>
                    )}
                  </DiaryWindow>
                )}
              </ViewLayer>
            </AnimatePresence>
          </SwapContext.Provider>
        </div>
      </div>
    </section>
  );
}
