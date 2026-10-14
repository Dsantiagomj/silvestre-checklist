import { useLayoutEffect, useRef, useState } from "react";
import { STEPS, TIER_META, ZONE_COLOR } from "../data/steps.js";
import { DOFUS_ROAD, ZONE_IMG, assetsFor, imgUrl } from "../lib/assets.js";
import { showcase, stepTitle } from "../lib/journal.js";
import { clearSelection, openInDiary, selectStep, stepMatchesFilters, toggleStep } from "../state/store.js";

const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));
const ROW_H = 108;
const PAD = 48;
const TOP = 54;

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

/** Arco del paso abierto a cada paso que su combate cierra (el verde de la guía). */
function arcPath(a, b) {
  const lift = Math.max(46, Math.abs(a.x - b.x) / 3);
  return `M${b.x} ${b.y - 30} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${a.x} ${a.y - 30}`;
}

function Card({ step, at, width, height, done }) {
  const show = showcase(step.n);
  const zone = ZONE_IMG[step.zone];
  const stops = (step.marks || []).filter(m => m[0] === "stop");
  const above = at.y + 300 > height;
  const left = Math.min(Math.max(at.x - 175, 8), width - 358);
  return (
    <div className={"map-card" + (above ? " above" : "")} id="mapCard" style={{ left, top: above ? at.y - 44 : at.y + 44 }}>
      <div className="map-card-hd" style={zone ? { backgroundImage: `url(${imgUrl(zone.img)})` } : undefined}>
        {show && <img src={imgUrl(show.img)} alt="" />}
        <button type="button" className="map-card-x" aria-label="Cerrar" onClick={clearSelection}>×</button>
      </div>
      <div className="map-card-bd">
        <span className="map-card-zone" style={{ "--zone-color": ZONE_COLOR[step.zone] }}>{step.zone} · {TIER_META[step.effort].label}</span>
        <h3 className="map-card-title">{step.n} · {stepTitle(step)}</h3>
        {stops.map(([, text], i) => <p key={i} className="map-card-line stop">⛔ {text}</p>)}
        {step.closes && <p className="map-card-line done">⚔️ Cierra también el {step.closes.join(", ")}</p>}
        <div className="map-card-cta">
          <button type="button" className="map-card-done" onClick={() => toggleStep(step.n)}>{done ? "Desmarcar" : "✓ Hecho"}</button>
          <button type="button" className="map-card-open" onClick={() => openInDiary(step.n)}>Abrir en el diario</button>
        </div>
      </div>
    </div>
  );
}

/** El camino de los 100 pasos: un sello por paso con el paisaje de su zona. */
export default function StepMap({ s, current, mobile }) {
  const boxRef = useRef(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  const { pos, height } = width ? layout(width) : { pos: [], height: 600 };
  const selected = s.selectedStep;
  const sel = selected != null ? STEPS[selected - 1] : null;
  const zone = current != null ? ZONE_IMG[STEPS[current - 1].zone] : null;

  return (
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
            <Card key={sel.n} step={sel} at={pos[sel.n - 1]} width={width} height={height} done={!!s.done[sel.n]} />
          )}
        </>
      )}
      <div className="step-map-legend" aria-hidden="true">
        <span><i className="lg-egg"></i>Dofus del camino</span>
        <span><i className="lg-boss"></i>Su combate cierra otros pasos</span>
      </div>
    </div>
  );
}
