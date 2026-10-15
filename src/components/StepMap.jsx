import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { CALL_ICONS, DOFUS_ROAD, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { doneIcon, showcase, stepCalls, stepTitle } from "../lib/journal.js";
import { clearSelection, openInDiary, selectStep, stepMatchesFilters, toggleStep } from "../state/store.js";
import { useLeaving, useLiveId } from "../lib/leaving.js";

const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));
const ROW_H = 108;
const PAD = 48;
// Sitio arriba para el Dofus que asoma sobre el primer paso y su halo de paso actual
const TOP = 70;

/** Cuántos pasos caben por fila: el camino serpentea más cerrado en pantallas estrechas. */
const colsFor = w => (w >= 1100 ? 12 : w >= 800 ? 9 : w >= 560 ? 6 : 4);

/** Posición de cada paso: filas de izquierda a derecha y vuelta, como un camino. */
function layout(width) {
  const cols = colsFor(width);
  const gap = (width - PAD * 2) / (cols - 1);
  const pos = STEPS.map((st, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 ? cols - 1 - (i % cols) : i % cols;
    return { x: PAD + col * gap, y: TOP + row * ROW_H };
  });
  return { pos, height: TOP + Math.ceil(STEPS.length / cols) * ROW_H - 20 };
}

/** Dónde cae el sello del paso n en un mapa de este ancho (el centro del zoom entre vistas). */
export function mapPoint(width, n) {
  return layout(width).pos[n - 1];
}

/** Arco del paso abierto a cada paso que su combate cierra (el verde de la guía). */
function arcPath(a, b) {
  const lift = Math.max(46, Math.abs(a.x - b.x) / 3);
  return `M${b.x} ${b.y - 30} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${a.x} ${a.y - 30}`;
}

const CARD_W = 350;
const NODE_R = 36; // radio del sello más grande (el actual), con su halo
const GAP = 14;

/**
 * Dónde va la ficha: debajo, arriba, en diagonal o al lado del paso, la primera
 * que no tape ni el paso ni sus vecinos (el camino gira en los extremos de cada
 * fila, así que el siguiente puede estar debajo).
 */
function placeCard(pos, n, cardH, width, height) {
  const at = pos[n - 1];
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const rect = (left, top) => ({ left: clamp(left, 8, width - CARD_W - 8), top: clamp(top, 8, height - cardH - 8) });
  const below = at.y + NODE_R + GAP;
  const above = at.y - NODE_R - GAP - cardH;
  // En las esquinas del camino un vecino va al lado y el otro debajo: quedan las diagonales
  const options = [
    rect(at.x - CARD_W / 2, below),
    rect(at.x - CARD_W / 2, above),
    rect(at.x + NODE_R, below),
    rect(at.x - NODE_R - CARD_W, below),
    rect(at.x + NODE_R, above),
    rect(at.x - NODE_R - CARD_W, above),
    rect(at.x + NODE_R + GAP, at.y - cardH / 2),
    rect(at.x - NODE_R - GAP - CARD_W, at.y - cardH / 2),
  ];
  const keep = [n - 1, n, n + 1].filter(m => m >= 1 && m <= pos.length).map(m => pos[m - 1]);
  const covers = (r, p) => p.x + NODE_R > r.left && p.x - NODE_R < r.left + CARD_W &&
    p.y + NODE_R > r.top && p.y - NODE_R < r.top + cardH;
  return options.find(r => !keep.some(p => covers(r, p))) || options[0];
}

function Card({ step, pos, width, height, done }) {
  const ref = useRef(null);
  const [cardH, setCardH] = useState(240);
  useLayoutEffect(() => setCardH(ref.current.offsetHeight), [step.n]);
  // Se cierra al pulsar fuera o con Escape. Pulsar otro paso la cambia a ese paso (lo
  // hace el propio sello), así que los sellos no cuentan como fuera
  const leaving = useLeaving();
  useEffect(() => {
    if (leaving) return;
    const outside = e => {
      if (!ref.current?.contains(e.target) && !e.target.closest?.(".map-node")) clearSelection();
    };
    const esc = e => { if (e.key === "Escape") clearSelection(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [leaving]);
  const show = showcase(step.n);
  const zone = ZONE_IMG[step.zone];
  // Las mismas paradas que el detalle: si el paso se resuelve solo, solo la que deja el verde
  const stops = stepCalls(step).filter(m => m[0] === "stop");
  const { left, top } = placeCard(pos, step.n, cardH, width, height);
  return (
    <div className="map-card" id={useLiveId("mapCard")} ref={ref} style={{ left, top, width: CARD_W }}>
      <div className="map-card-hd" style={zone ? { backgroundImage: `url(${imgUrl(zone.img)})` } : undefined}>
        {show && <img src={imgUrl(show.img)} alt="" />}
        <button type="button" className="map-card-x" aria-label="Cerrar" onClick={clearSelection}>×</button>
      </div>
      <div className="map-card-bd">
        <span className="map-card-zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}>{step.zone}</span>
        <h3 className="map-card-title">{step.n} · {stepTitle(step)}</h3>
        {stops.map(([, text], i) => (
          <p key={i} className="map-card-line stop"><img src={imgUrl(CALL_ICONS.stop)} alt="" />{text}</p>
        ))}
        {step.closes && (
          <p className="map-card-line done"><img src={imgUrl(doneIcon(step.n))} alt="" />Cierra también el {step.closes.join(", ")}</p>
        )}
        <div className="map-card-cta">
          <button type="button" className="map-card-done" onClick={() => toggleStep(step.n)}>{done ? "Desmarcar" : "✓ Hecho"}</button>
          <button type="button" className="map-card-open" onClick={() => openInDiary(step.n)}>Abrir en el diario</button>
        </div>
      </div>
    </div>
  );
}

// Hasta dónde estaba desplazado el mapa: al volver del diario sigue donde se dejó
// (null: aún no se ha abierto)
let lastScroll = null;
/** Lo desplazado del mapa (en escritorio, dentro de su marco): el zoom entre vistas lo descuenta. */
export const mapScrollTop = () => lastScroll || 0;

/** El camino de los 100 pasos: un sello por paso con el paisaje de su zona. */
export default function StepMap({ s, current, mobile }) {
  const boxRef = useRef(null);
  const scrollRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  // En escritorio el mapa se desplaza dentro de la ventana. Al volver, donde se dejó; la
  // primera vez, con el paso actual a la vista. Antes de pintarse: sin saltos
  const placed = useRef(false);
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (placed.current || !width || box.scrollHeight <= box.clientHeight) return;
    placed.current = true;
    if (lastScroll != null) box.scrollTop = lastScroll;
    else if (current != null) {
      const at = layout(width).pos[current - 1];
      if (at.y + NODE_R > box.clientHeight) box.scrollTop = at.y - box.clientHeight / 2;
    }
    lastScroll = box.scrollTop;
  }, [width]); // eslint-disable-line react-hooks/exhaustive-deps

  const { pos, height } = width ? layout(width) : { pos: [], height: 600 };
  const selected = s.selectedStep;
  const sel = selected != null ? STEPS[selected - 1] : null;
  const zone = current != null ? ZONE_IMG[STEPS[current - 1].zone] : null;

  return (
    <div className="step-map-scroll" ref={scrollRef} onScroll={e => { lastScroll = e.currentTarget.scrollTop; }}>
      <div className="step-map" ref={boxRef} style={{ height }}>
        {zone && <div className="step-map-bg" style={{ backgroundImage: `url(${imgUrl(zone.img)})` }} aria-hidden="true"></div>}
        {width > 0 && (
          <>
            <svg className="step-map-path" width={width} height={height} aria-hidden="true">
              <polyline points={pos.map(p => `${p.x},${p.y}`).join(" ")} />
              {sel?.closes?.map(c => <path key={c} className="map-arc" d={arcPath(pos[c - 1], pos[sel.n - 1])} />)}
            </svg>
            {STEPS.map((st, i) => {
              const n = st.n;
              const road = ROAD_AT[n];
              const boss = st.closes && assetsFor(n)?.bosses?.[0];
              const thumb = ZONE_IMG[st.zone]?.thumb;
              const cls = "map-node" + (s.done[n] ? " done" : "") + (n === current ? " current" : "") +
                (road ? " dofus" : "") + (stepMatchesFilters(s, st) ? "" : " dimmed");
              return (
                <button key={n} type="button" className={cls} data-n={n}
                  style={{ left: pos[i].x, top: pos[i].y, "--zone-color": ZONE_COLOR[st.zone], backgroundImage: thumb ? `url(${imgUrl(thumb)})` : undefined }}
                  aria-label={`Paso ${n}: ${stepTitle(st)}${s.done[n] ? " (hecho)" : ""}`}
                  aria-current={n === current ? "step" : undefined}
                  onClick={() => selectStep(n)}>
                  {road && <img className="node-egg" src={imgUrl(road.img)} alt="" />}
                  <span className="node-num">{n}</span>
                  {boss && <img className="node-boss" src={imgUrl(boss.img)} alt="" title={`Al pasar ${boss.name} se cierran otros pasos`} />}
                </button>
              );
            })}
            {!mobile && sel && (
              <Card key={sel.n} step={sel} pos={pos} width={width} height={height} done={!!s.done[sel.n]} />
            )}
          </>
        )}
        <div className="step-map-legend" aria-hidden="true">
          <span><i className="lg-egg"></i>Dofus del camino</span>
          <span><i className="lg-boss"></i>Su combate cierra otros pasos</span>
        </div>
      </div>
    </div>
  );
}
