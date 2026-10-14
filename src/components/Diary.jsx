import { memo, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, m, useIsPresent, useReducedMotion } from "motion/react";
import { useHeightMorph } from "../lib/motion.js";
import { LeavingContext, useLiveId } from "../lib/leaving.js";
import { STEPS, TIER_META } from "../data/steps.js";
import { DOFUS_ROAD, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { CHAPTERS, CLOSED_BY, stepTitle } from "../lib/journal.js";
import {
  clearFilters, goToNextPending, hasActiveFilters, nextPending, selectStep, setSearch, setStatusFilter, setStepsView,
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

// Cambio entre diario y mapa: un zoom sutil sobre el sello del paso actual, en la línea
// de duffus.fr (0,3 s, easeInOut). Del mapa al diario se entra (la vista que se va crece
// y la que llega sale de más lejos); del diario al mapa se sale (al revés). `custom` es
// la vista de destino, que AnimatePresence pasa también a la que se va.
const ZOOM = {
  enter: to => ({ opacity: 0, transform: to === "map" ? "scale(1.15)" : "scale(0.94)" }),
  center: { opacity: 1, transform: "scale(1)" },
  exit: to => ({ opacity: 0, transform: to === "map" ? "scale(0.9)" : "scale(1.15)" }),
};
const ZOOM_EASE = { duration: 0.3, ease: "easeInOut" };
const loadFeatures = () => import("../lib/motionFeatures.js").then(mod => mod.default);

/** Una de las dos vistas. La que se va queda inerte y sin ids mientras sale. */
function ViewLayer({ ref, origin, reduce, children }) {
  const present = useIsPresent();
  return (
    <m.div ref={ref} className="steps-layer" variants={ZOOM} initial="enter" animate="center" exit="exit"
      transition={reduce ? { duration: 0 } : ZOOM_EASE}
      style={{ transformOrigin: origin }} inert={!present} aria-hidden={!present || undefined}>
      <LeavingContext.Provider value={!present}>{children}</LeavingContext.Provider>
    </m.div>
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
  const lastView = useRef(s.stepsView);
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
        <LazyMotion features={loadFeatures} strict>
          <AnimatePresence mode="popLayout" initial={false} custom={s.stepsView}
            onExitComplete={() => { switching.current = false; setSwap(null); }}>
            <ViewLayer key={s.stepsView} origin={origin} reduce={reduce}>
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
        </LazyMotion>
      </div>
    </section>
  );
}
