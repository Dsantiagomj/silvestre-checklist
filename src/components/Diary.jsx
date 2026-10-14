import { createContext, memo, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, usePresence, useReducedMotion } from "motion/react";
import { useAnimate } from "motion/react-mini";
import { makeChannel, whenReady } from "../lib/viewSwap.js";
import { useHeightMorph } from "../lib/motion.js";
import { LeavingContext, useLiveId } from "../lib/leaving.js";
import { STEPS, TIER_META } from "../data/steps.js";
import { DOFUS_ROAD, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { CHAPTERS, CLOSED_BY, stepTitle } from "../lib/journal.js";
import {
  clearFilters, goToNextPending, hasActiveFilters, nextPending, revealMapNode, selectStep, setSearch, setStatusFilter,
  setStepsView, takeMapFocus,
  stepMatchesFilters, stepMatchesStatus, toggleStep, useAppState,
} from "../state/store.js";
import Journal from "./Journal.jsx";
import StepMap, { mapPoint } from "./StepMap.jsx";
import ZoneSeals from "./ZoneSeals.jsx";
import QuestMark from "./QuestMark.jsx";

const TABS = [
  ["pending", "Pendientes", "diaryTabPending"],
  ["done", "Hechos", "diaryTabDone"],
  ["all", "Todos", "diaryTabAll"],
];
const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));

/** Lo que identifica al paso en la lista: el Dofus que da, su jefe o su icono. */
function rowArt(n) {
  if (ROAD_AT[n]) return ROAD_AT[n].img;
  const a = assetsFor(n);
  return a?.bosses?.[0]?.img || a?.icon?.src || null;
}

const Row = memo(function Row({ step, done, current }) {
  const n = step.n;
  const art = rowArt(n);
  const thumb = ZONE_IMG[step.zone]?.thumb;
  const closedBy = !done && CLOSED_BY[n];
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
            {closedBy && <span className="row-closed">se cierra en el {closedBy}</span>}
          </span>
        </span>
        <span className="row-art" aria-hidden="true">
          {art ? <img src={imgUrl(art)} alt="" loading="lazy" decoding="async" /> : <QuestMark />}
        </span>
        <span className="row-effort">{TIER_META[step.effort].label}</span>
      </button>
    </li>
  );
});

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
        {CHAPTERS.map(ch => {
          const steps = STEPS.slice(ch.from - 1, ch.to);
          const shown = steps.filter(st => visible.has(st.n));
          if (!shown.length) return null;
          return (
            <section className="diary-group" key={ch.to} aria-label={`Hacia el ${ch.name}`}>
              <h3 className="diary-group-head">
                <img src={imgUrl(ch.img)} alt="" loading="lazy" />
                <span>Hacia el {ch.name}</span>
                <small>{steps.filter(st => s.done[st.n]).length}/{steps.length}</small>
              </h3>
              <ol className="diary-rows">
                {shown.map(st => <Row key={st.n} step={st} done={!!s.done[st.n]} current={st.n === current} />)}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/** Buscador y acceso al siguiente pendiente, junto al título de la sección. */
function DiaryBar({ s }) {
  const next = nextPending(s);
  return (
    <div className="diary-bar">
      <input type="search" className="diary-search" id="searchInput" placeholder="Buscar por número o texto…"
        aria-label="Buscar paso" value={s.filters.search} onChange={e => setSearch(e.target.value)} />
      <button type="button" className="diary-next" id="diaryNext" disabled={next == null} onClick={goToNextPending}>
        {next != null ? <>Siguiente<span className="long"> pendiente</span>: <b>{next}</b></> : "Guía completa"}
      </button>
    </div>
  );
}

// El mapa es la vista por defecto: se recorre el camino y se entra al diario de un paso
const VIEWS = [
  ["map", "Mapa", "stepsViewMap"],
  ["diary", "Diario", "stepsViewDiary"],
];

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

/** 02 · Los 100 pasos: como diario (lista y detalle) o como mapa del camino. */
export default function Diary({ mobile }) {
  const s = useAppState();
  const next = nextPending(s) ?? STEPS.length;
  // Sin nada elegido, el detalle abre el siguiente pendiente (en móvil vive en la hoja)
  const current = s.selectedStep ?? (mobile ? null : next);
  const map = s.stepsView === "map";
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
  if (lastView.current !== s.stepsView) {
    swapInfo.current = reduce ? null : { id: (swapInfo.current?.id ?? 0) + 1, to: s.stepsView };
  }
  useLayoutEffect(() => {
    if (lastView.current === s.stepsView) return;
    lastView.current = s.stepsView;
    if (reduce) return;
    switching.current = true;
    setSwap(height.current);
  }, [s.stepsView]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => { if (!switching.current) height.current = stageRef.current.offsetHeight; });
  useHeightMorph(stageRef, map ? "map" : `diary-${current}`, { skip: () => switching.current });
  const at = mapPoint(stageRef.current?.clientWidth || 1200, s.selectedStep ?? next);
  const origin = `${at.x}px ${at.y}px`;
  return (
    <section className="diary" id="diary" aria-labelledby="diaryTitle">
      <div className="diary-head">
        <h2 className="section-title" id="diaryTitle"><span className="section-num">02</span>Los 100 pasos</h2>
        <div className="steps-view" role="group" aria-label="Vista">
          {VIEWS.map(([key, label, id]) => (
            <button key={key} type="button" id={id} aria-pressed={s.stepsView === key} onClick={() => setStepsView(key)}>{label}</button>
          ))}
        </div>
        <DiaryBar s={s} />
      </div>
      <ZoneSeals s={s} current={current} />
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
              {map ? (
                <StepMap s={s} current={s.selectedStep ?? next} mobile={mobile} />
              ) : (
                <div className="diary-window">
                  <DiaryList s={s} current={current} />
                  {!mobile && current != null && (
                    <div className="diary-detail">
                      {/* key: al cambiar de paso los desplegables vuelven a su estado inicial */}
                      <Journal key={current} n={current} id="journal" />
                    </div>
                  )}
                </div>
              )}
            </ViewLayer>
          </AnimatePresence>
        </SwapContext.Provider>
      </div>
    </section>
  );
}
