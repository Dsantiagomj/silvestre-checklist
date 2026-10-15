import { createContext, memo, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, usePresence, useReducedMotion } from "motion/react";
import { useAnimate } from "motion/react-mini";
import { makeChannel, whenReady } from "../lib/viewSwap.js";
import { useHeightMorph } from "../lib/motion.js";
import { LeavingContext, useLiveId } from "../lib/leaving.js";
import { STEPS, TIER_META } from "../data/steps.js";
import { DOFUS_ROAD, ZONE_IMG, imgUrl } from "../lib/assets.js";
import { CLOSED_BY, resolvedBoss, stepTitle } from "../lib/journal.js";
import { ALL_ROWS } from "../lib/resources.js";
import {
  clearFilters, hasActiveFilters, isStepsView, nextPending, ownedCount, prereqsPending, revealMapNode, selectStep,
  setSearch, setStatusFilter, setStepsView, takeMapFocus,
  stepMatchesFilters, stepMatchesStatus, toggleStep, useAppState,
} from "../state/store.js";
import Journal from "./Journal.jsx";
import Needs from "./Needs.jsx";
import StepMap, { mapPoint } from "./StepMap.jsx";
import WinStrip from "./WinStrip.jsx";
import ZoneSeals from "./ZoneSeals.jsx";

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

const Row = memo(function Row({ step, done, current }) {
  const n = step.n;
  const art = rowArt(n);
  const thumb = ZONE_IMG[step.zone]?.thumb;
  const closedBy = !done && CLOSED_BY[n];
  const closes = !done && step.closes;
  // Dentro del botón de la fila: un clic lleva a ese paso sin abrir este (con teclado,
  // los mismos enlaces están en el detalle)
  const go = m => e => { e.stopPropagation(); selectStep(m); };
  return (
    <li className={"diary-row" + (done ? " done" : "") + (current ? " current" : "")} data-n={n} aria-current={current ? "step" : undefined}>
      <button type="button" className="row-check" aria-pressed={done} aria-label={`${done ? "Desmarcar" : "Marcar"} paso ${n}`}
        onClick={() => toggleStep(n)}></button>
      <button type="button" className="row-main" onClick={() => selectStep(n)}>
        <span className="row-thumb" style={thumb ? { backgroundImage: `url(${imgUrl(thumb)})` } : undefined} aria-hidden="true"></span>
        <span className="row-num">{n}</span>
        <span className="row-text">
          <span className="row-title">{stepTitle(step)}</span>
          <span className="row-sub">
            <span className="row-zone">{step.zone}</span>
            {closedBy && <span className="row-closed" title={`Ir al paso ${closedBy}`} onClick={go(closedBy)}>se cierra en el {closedBy}</span>}
            {closes && (
              <span className="row-closes" title={`Ir al paso ${closes[0]}`} onClick={go(closes[0])}>
                cierra el {closes.join(", ")}
              </span>
            )}
          </span>
        </span>
        <span className="row-art" aria-hidden="true">
          {art && <img src={imgUrl(art.img)} alt={art.name} title={art.name} loading="lazy" decoding="async" />}
        </span>
        <span className="row-effort">{TIER_META[step.effort].label}</span>
      </button>
    </li>
  );
});

/**
 * La ventana del diario (lista y detalle): un panel del alto de la pantalla en el que
 * cada lado se desplaza por dentro. Al cambiar de paso, el detalle vuelve arriba.
 */
function DiaryWindow({ step, children }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    ref.current.querySelector(".diary-detail")?.scrollTo(0, 0);
    ref.current.querySelector(".diary-detail .journal-body")?.scrollTo(0, 0);
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
      <div className="diary-tabs" role="group" aria-label="Mostrar">
        {TABS.map(([key, label, id]) => (
          <button key={key} type="button" id={tabId(id)} aria-pressed={status === key} onClick={() => setStatusFilter(key)}>
            {label} <span className="n">{count(key)}</span>
          </button>
        ))}
      </div>
      <div className="diary-list" ref={listRef}>
        {visible.size === 0 && (
          <div className="diary-empty">
            <p>Ningún paso coincide.</p>
            {hasActiveFilters(s) && <button type="button" className="btn-secondary" onClick={clearFilters}>Quitar filtros</button>}
          </div>
        )}
        <ol className="diary-rows">
          {STEPS.filter(st => visible.has(st.n)).map(st => (
            <Row key={st.n} step={st} done={!!s.done[st.n]} current={st.n === current} />
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Buscador de pasos, en la barra de herramientas de la ventana. */
function DiaryBar({ s }) {
  return (
    <div className="diary-bar">
      <input type="search" className="diary-search" id="searchInput" placeholder="Buscar por número o texto…"
        aria-label="Buscar paso" value={s.filters.search} onChange={e => setSearch(e.target.value)} />
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
    const order = [...VIEWS, ...NEEDS].map(t => t[0]);
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
  return (
    <div className="win-tabs" role="tablist" aria-label="Ventana de pasos" onKeyDown={onKey}>
      <div className="steps-view">
        {VIEWS.map(([key, label, id]) => <WinTab key={key} s={s} view={key} label={label} id={id} />)}
      </div>
      <div className="needs-view-tabs">
        {NEEDS.map(([key, label, id, countId, pending]) => {
          const n = pending(s);
          return (
            <WinTab key={key} s={s} view={key} label={label} id={id}>
              {/* Lo que falta; sin nada pendiente, una ✓ */}
              <span className={"win-badge" + (n ? "" : " done")} id={countId}
                aria-label={n ? `${n} pendientes` : "completo"}>{n || "✓"}</span>
            </WinTab>
          );
        })}
      </div>
    </div>
  );
}

// "/" lleva al buscador de objetos desde cualquier parte de la página
function useSlashToItems() {
  useEffect(() => {
    const onKey = e => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable) return;
      e.preventDefault();
      setStepsView("items");
      requestAnimationFrame(() => {
        const input = document.getElementById("needsSearch");
        input?.focus();
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

// Cambio entre diario y mapa: un zoom sutil sobre el sello del paso actual (0,3 s,
// easeInOut, en la línea de duffus.fr) que hace de pantalla de carga. Del mapa al diario
// se entra (el mapa crece); del diario al mapa se sale (el diario se encoge). La vista
// que se va se queda así hasta que la que llega, preparada invisible encima, avisa de
// que está lista (lib/viewSwap.js); entonces se cruzan.
const ZOOM = { duration: 0.3, ease: "easeInOut" };
const ZOOMED = { map: "scale(1.15)", diary: "scale(0.94)" };     // de dónde llega cada vista
const LEAVING = { map: "scale(0.9)", diary: "scale(1.15)" };     // a dónde va la que se va

/** El cambio en curso: { id, to } y el canal por el que la nueva avisa a la vieja. */
const SwapContext = createContext(null);

/** Una de las dos vistas. La que se va queda inerte y sin ids mientras sale. */
function ViewLayer({ ref, view, origin, reduce, children }) {
  const [present, safeToRemove] = usePresence();
  const swap = useContext(SwapContext);
  const [scope, animate] = useAnimate();
  const setRef = el => {
    scope.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  // La que llega: invisible y en su sitio de partida hasta estar lista, luego aparece
  useLayoutEffect(() => {
    const el = scope.current;
    if (!swap.current || swap.current.to !== view || reduce) return;
    const { id } = swap.current;
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

  // La que se va: hace su zoom, espera a la nueva y se desvanece mientras esta aparece
  useEffect(() => {
    if (present) return;
    if (reduce || !swap.current) return safeToRemove();
    const el = scope.current;
    const { id, to } = swap.current;
    (async () => {
      await animate(el, { transform: LEAVING[to] }, ZOOM);
      await swap.channel.when(id);
      await animate(el, { opacity: 0 }, ZOOM);
      safeToRemove();
    })();
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
  // Cambiar de paso mueve lo de debajo con suavidad; el cambio de vista lo lleva el zoom
  const stageRef = useRef(null);
  const reduce = useReducedMotion();
  // Mientras conviven las dos vistas la sección guarda la altura de antes (minHeight) y
  // no se anima la altura: recalcular la página en cada fotograma daba tirones
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
  const swapInfo = useRef({ current: null, channel: makeChannel() }).current;
  // El zoom es solo entre mapa y diario; a las listas y desde ellas se cambia sin más
  if (lastView.current !== s.stepsView) {
    swapInfo.current = reduce || !isStepsView(lastView.current) || !steps
      ? null : { id: (swapInfo.current?.id ?? 0) + 1, to: s.stepsView };
  }
  useLayoutEffect(() => {
    if (lastView.current === s.stepsView) return;
    lastView.current = s.stepsView;
    if (!swapInfo.current) return;
    switching.current = true;
    setSwap(height.current);
  }, [s.stepsView]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (!switching.current) height.current = stageRef.current.offsetHeight; });
  useHeightMorph(stageRef, steps ? (map ? "map" : `diary-${current}`) : s.stepsView, { skip: () => switching.current });
  const at = mapPoint(stageRef.current?.clientWidth || 1200, s.selectedStep ?? next);
  const origin = `${at.x}px ${at.y}px`;
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
        {steps && (
          <>
            <div className="win-tools">
              <DiaryBar s={s} />
            </div>
            <ZoneSeals s={s} current={current} />
          </>
        )}
        <div className={"steps-stage" + (swap != null ? " swap" : "")} ref={stageRef}
          style={swap != null ? { minHeight: swap } : undefined}>
          <SwapContext.Provider value={swapInfo}>
            <AnimatePresence mode="popLayout" initial={false}
              onExitComplete={() => {
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
