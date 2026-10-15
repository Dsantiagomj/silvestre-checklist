import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { STEPS, ZONE_COLOR } from "../data/steps.js";
import { BRAND_ICON, DOFUS_ROAD, imgUrl } from "../lib/assets.js";
import { bannerFigure, resolvedBoss, stepTitle } from "../lib/journal.js";
import { prefersReducedMotion } from "../lib/motion.js";
import {
  clearSelection, nextPending, revealMapNode, selectStep, stepMatchesFilters,
} from "../state/store.js";
import { useLeaving, useLiveId } from "../lib/leaving.js";
import MapCard from "./MapCard.jsx";

const ROAD_AT = Object.fromEntries(DOFUS_ROAD.map(d => [d.step, d]));
const ROW_H = 132;
// Arriba, lo justo para el «Estás aquí» del primer paso
const topFor = w => (w >= 560 ? 84 : 72);
// Abajo, el final del camino: el Dofus Silvestre. Y, en escritorio, sitio para abrir
// debajo la ficha de los pasos de la última fila
const bottomFor = w => (w >= 560 ? 300 : 170);
// Lo que ondula cada fila: el camino no es una regla
const WAVE = 10;

/** Cuántos pasos caben por fila: el camino serpentea más cerrado en pantallas estrechas. */
const colsFor = w => (w >= 1100 ? 9 : w >= 820 ? 7 : w >= 560 ? 5 : 4);
/** Margen a cada lado: ahí se abren las curvas de vuelta entre filas. */
const sideFor = w => (w >= 560 ? 76 : 48);

/**
 * El camino: filas que van y vuelven, cada una ondulando un poco, unidas por curvas
 * cerradas en los extremos. Devuelve la posición de cada paso, el tramo de curva que
 * lleva de cada paso al siguiente y el alto del mapa.
 */
const cache = new Map();
function layout(width) {
  // El diario lo pide en cada render (el centro del zoom): se calcula una vez por ancho
  if (!cache.has(width)) {
    if (cache.size > 6) cache.clear();
    cache.set(width, buildLayout(width));
  }
  return cache.get(width);
}
function buildLayout(width) {
  const cols = colsFor(width);
  const side = sideFor(width);
  const top = topFor(width);
  const gap = (width - side * 2) / (cols - 1);
  const pos = STEPS.map((st, i) => {
    const row = Math.floor(i / cols);
    const col = row % 2 ? cols - 1 - (i % cols) : i % cols;
    return { x: side + col * gap, y: top + row * ROW_H + WAVE * Math.sin(col * 1.3 + row * 0.8) };
  });
  // Tramos con tangente horizontal en cada paso: dentro de la fila, una S suave; al
  // cambiar de fila, una curva en U que se abre hacia el margen (su punta llega a 3/4
  // de los puntos de control)
  const bulge = (side - 16) / 0.75;
  const f = v => Math.round(v * 10) / 10;
  const segs = pos.slice(1).map((b, i) => {
    const a = pos[i];
    if (Math.floor(i / cols) === Math.floor((i + 1) / cols)) {
      const h = (b.x - a.x) / 2;
      return `C${f(a.x + h)} ${f(a.y)} ${f(b.x - h)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
    }
    const k = a.x > width / 2 ? bulge : -bulge;
    return `C${f(a.x + k)} ${f(a.y)} ${f(b.x + k)} ${f(b.y)} ${f(b.x)} ${f(b.y)}`;
  });
  const start = `M${f(pos[0].x)} ${f(pos[0].y)} `;
  const rows = Math.ceil(STEPS.length / cols);
  const height = top + (rows - 1) * ROW_H + bottomFor(width);
  // Del último paso, un tramo que baja hasta el final del camino
  const last = pos.at(-1), end = { x: width / 2, y: height - 120 };
  const tail = `M${f(last.x)} ${f(last.y)} C${f(last.x)} ${f(last.y + 90)} ${f(end.x)} ${f(end.y - 90)} ${f(end.x)} ${f(end.y)}`;
  return { pos, segs, start, tail, height };
}

/** Dónde cae el sello del paso n en un mapa de este ancho (el centro del zoom entre vistas). */
export function mapPoint(width, n) {
  return layout(width).pos[n - 1];
}

/** Arco del paso abierto a cada paso que su combate cierra (el verde de la guía). */
function arcPath(a, b) {
  const lift = Math.max(46, Math.abs(a.x - b.x) / 3);
  return `M${b.x} ${b.y - 26} Q${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${a.x} ${a.y - 26}`;
}

const GAP = 16;   // del borde del sello al de la ficha
const EDGE = 8;   // lo mínimo de la ficha al borde del mapa
const ARROW = 26; // la flecha no se acerca más a una esquina de la ficha

/**
 * Dónde va la ficha: a la derecha, a la izquierda, debajo o encima del paso, la primera
 * que cabe en lo que se ve del mapa sin tapar el paso ni sus vecinos. Si ninguna cabe
 * en lo visible, la primera que cabe en el mapa entero (y el mapa se desplaza hasta
 * ella). La flecha queda frente al paso.
 */
function placeCard({ at, r, w, h, width, height, view, avoid }) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));
  const row = avoid.filter(p => Math.abs(p.y - at.y) < ROW_H / 2);
  const tryIn = ([lo, hi], all = false, keep = avoid) => {
    const midTop = clamp(at.y - h / 2, lo, hi - h);
    const midLeft = clamp(at.x - w / 2, EDGE, width - EDGE - w);
    const options = [
      { side: "right", left: at.x + r + GAP, top: midTop },
      { side: "left", left: at.x - r - GAP - w, top: midTop },
      // Encima o debajo, sin rozar a los vecinos de la fila (la onda los sube o los baja)
      { side: "below", left: midLeft, top: Math.max(at.y + r + GAP, ...row.map(p => p.y + p.r + 2)) },
      { side: "above", left: midLeft, top: Math.min(at.y - r - GAP, ...row.map(p => p.y - p.r - 2)) - h },
    ];
    const fits = o => o.left >= EDGE && o.left + w <= width - EDGE && o.top >= lo && o.top + h <= hi &&
      (o.side === "right" || o.side === "left"
        ? at.y - o.top >= ARROW && at.y - o.top <= h - ARROW
        : at.x - o.left >= ARROW && at.x - o.left <= w - ARROW);
    const covers = o => keep.some(p => p.x + p.r > o.left && p.x - p.r < o.left + w && p.y + p.r > o.top && p.y - p.r < o.top + h);
    const good = options.filter(o => fits(o) && !covers(o));
    return all ? good : good[0];
  };
  const visible = [Math.max(EDGE, view.top + EDGE), Math.min(height - EDGE, view.bottom - EDGE)];
  const seen = tryIn(visible);
  // Si en lo visible no cabe, la que más se vea de las que caben en el mapa entero
  const shown = o => Math.max(0, Math.min(o.top + h, view.bottom) - Math.max(o.top, view.top));
  const anywhere = !seen && tryIn([EDGE, height - EDGE], true).sort((a, b) => shown(b) - shown(a))[0];
  // Y si nada cabe sin tapar a un vecino, al menos sin tapar el propio paso
  const self = avoid.filter(p => p.x === at.x && p.y === at.y);
  const pick = seen || anywhere || tryIn([EDGE, height - EDGE], false, self) || {
    side: "below", left: clamp(at.x - w / 2, EDGE, width - EDGE - w), top: clamp(at.y + r + GAP, EDGE, height - EDGE - h),
  };
  const across = pick.side === "right" || pick.side === "left";
  const arrow = across ? clamp(at.y - pick.top, ARROW, h - ARROW) : clamp(at.x - pick.left, ARROW, w - ARROW);
  return { ...pick, arrow, seen: !!seen };
}

/** El sello de un paso en el mapa (dentro de su `.map-node`, el centro del sello). */
const nodeEl = (box, n) => box?.querySelector(`.map-node[data-n="${n}"]`);

/** La ficha flotante junto al paso elegido (escritorio). */
function FloatingCard({ step, s, layoutInfo, width, scrollRef, focusOnOpen }) {
  const ref = useRef(null);
  const [place, setPlace] = useState(null);
  const leaving = useLeaving();
  const n = step.n;
  const { pos, height } = layoutInfo;
  // Mientras se abre (y el mapa se desplaza hasta el paso, desde el diario) la ficha
  // puede pedir sitio desplazando el mapa; después ya no: no pelea con quien desplaza
  const opened = useRef(0);

  const placeNow = allowScroll => {
    const card = ref.current, box = scrollRef.current;
    if (!card || !box) return;
    const at = pos[n - 1];
    const radius = m => (nodeEl(box, m)?.offsetWidth || 44) / 2;
    const view = { top: box.scrollTop, bottom: box.scrollTop + box.clientHeight };
    const avoid = [n - 1, n, n + 1].filter(m => m >= 1 && m <= STEPS.length).map(m => ({ ...pos[m - 1], r: radius(m) + 4 }));
    const next = placeCard({ at, r: radius(n), w: card.offsetWidth, h: card.offsetHeight, width, height, view, avoid });
    setPlace(prev => (prev && prev.side === next.side && prev.left === next.left && prev.top === next.top && prev.arrow === next.arrow ? prev : next));
    // No cabía en lo que se ve: el mapa se desplaza lo justo para ver la ficha y el paso
    const nodeSeen = at.y >= view.top && at.y <= view.bottom;
    if (!next.seen && allowScroll && nodeSeen) {
      const top = Math.min(next.top, at.y - radius(n)) - EDGE;
      const bottom = Math.max(next.top + card.offsetHeight, at.y + radius(n)) + EDGE;
      if (bottom - top <= box.clientHeight) {
        const to = top < view.top ? top : bottom > view.bottom ? bottom - box.clientHeight : null;
        if (to != null) box.scrollTo({ top: to, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    }
  };

  // Antes de pintarse: medida y colocada, sin saltos
  useLayoutEffect(() => {
    opened.current = performance.now();
    placeNow(true);
  }, [n, width]); // eslint-disable-line react-hooks/exhaustive-deps

  // Si cambia de tamaño (las misiones llegan, se marca) se recoloca; y al terminar de
  // desplazarse el mapa, si el paso se ve pero la ficha no entera
  useEffect(() => {
    const card = ref.current, box = scrollRef.current;
    const ro = new ResizeObserver(() => placeNow(false));
    ro.observe(card);
    const onEnd = () => {
      const c = card.getBoundingClientRect(), b = box.getBoundingClientRect();
      const node = nodeEl(box, n)?.getBoundingClientRect();
      const nodeSeen = node && node.top >= b.top && node.bottom <= b.bottom;
      const cardSeen = c.top >= b.top - 1 && c.bottom <= b.bottom + 1;
      if (nodeSeen && !cardSeen) placeNow(performance.now() - opened.current < 3000);
    };
    box.addEventListener("scrollend", onEnd);
    return () => { ro.disconnect(); box.removeEventListener("scrollend", onEnd); };
  }, [n, width]); // eslint-disable-line react-hooks/exhaustive-deps

  // Con el teclado, el foco entra en la ficha (ya colocada: oculta no lo admite); al
  // cerrarla vuelve al paso
  useEffect(() => {
    if (!place || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    if (!leaving) ref.current.focus({ preventScroll: true });
  }, [place]); // eslint-disable-line react-hooks/exhaustive-deps
  const close = () => {
    const had = ref.current?.contains(document.activeElement);
    clearSelection();
    if (had) nodeEl(scrollRef.current, n)?.focus({ preventScroll: true });
  };

  // Se cierra al pulsar fuera o con Escape. Pulsar otro paso la cambia a ese paso (lo
  // hace el propio sello), así que los sellos no cuentan como fuera
  useEffect(() => {
    if (leaving) return;
    const outside = e => {
      if (!ref.current?.contains(e.target) && !e.target.closest?.(".map-node")) clearSelection();
    };
    const esc = e => { if (e.key === "Escape") close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [leaving, n]); // eslint-disable-line react-hooks/exhaustive-deps

  const style = place
    ? { left: place.left, top: place.top, "--arrow": `${place.arrow}px` }
    : { left: 0, top: 0, visibility: "hidden" };
  return (
    <MapCard step={step} done={!!s.done[n]} questsLoaded={s.questsLoaded} onGo={selectStep} onClose={close}
      className="is-floating" id={useLiveId("mapCard")} ref={ref} style={style} data-side={place?.side}
      role="dialog" tabIndex={-1}
      // Intro y espacio son de los botones de la ficha: sin llegar al atajo de la página
      // (que marcaría el paso)
      onKeyDown={e => {
        if ((e.key === "Enter" || e.key === " ") && e.target !== e.currentTarget) e.stopPropagation();
        // Escape aquí antes que en la página, que cerraría la ficha sin devolver el foco
        if (e.key === "Escape") { e.stopPropagation(); close(); }
      }}>
      <span className="map-card-arrow" aria-hidden="true"></span>
    </MapCard>
  );
}

/** La píldora del paso bajo el ratón: su figura, su número, su título y su zona. */
function Tip({ n, r, at, width }) {
  const st = STEPS[n - 1];
  const fig = bannerFigure(n);
  return (
    <div className={"map-tip" + (at.x > width * 0.62 ? " left" : "")} id={useLiveId("mapTip")} role="tooltip"
      style={{ left: at.x, top: at.y, "--r": `${r}px`, "--zone-color": ZONE_COLOR[st.zone] }}>
      {fig ? <img src={imgUrl(fig.img)} alt={fig.name} decoding="async" /> : <span className="map-tip-blank"></span>}
      <span className="map-tip-num">{n}</span>
      <span className="map-tip-text">
        <b>{stepTitle(st)}</b>
        <small>{st.zone}</small>
      </span>
    </div>
  );
}

/** Los 100 sellos. Aparte y memorizados: pasar el ratón o mover la ficha no los repinta. */
const Nodes = memo(function Nodes({ pos, done, filters, here, selected, onPick }) {
  return STEPS.map((st, i) => {
    const n = st.n;
    const road = ROAD_AT[n];
    const boss = resolvedBoss(n);
    const cls = "map-node" + (done[n] ? " done" : "") + (n === here ? " current" : "") + (n === selected ? " selected" : "") +
      (road ? " dofus" : "") + (stepMatchesFilters({ filters }, st) ? "" : " dimmed");
    return (
      <button key={n} type="button" className={cls} data-n={n}
        style={{ left: pos[i].x, top: pos[i].y, "--zone-color": ZONE_COLOR[st.zone] }}
        aria-label={`Paso ${n}: ${stepTitle(st)}${done[n] ? " (hecho)" : ""}`}
        aria-current={n === here ? "step" : undefined}
        onClick={onPick}>
        {road && <img className="node-egg" src={imgUrl(road.img)} alt="" decoding="async" />}
        <span className="node-num">{n}</span>
        {boss && <img className="node-boss" src={imgUrl(boss.img)} alt="" loading="lazy" decoding="async" />}
        {n === here && <span className="map-here" aria-hidden="true">Estás aquí</span>}
      </button>
    );
  });
});

// Hasta dónde estaba desplazado el mapa: al volver del diario sigue donde se dejó
// (null: aún no se ha abierto)
let lastScroll = null;
/** Lo desplazado del mapa (en escritorio, dentro de su marco): el zoom entre vistas lo descuenta. */
export const mapScrollTop = () => lastScroll || 0;

/**
 * El camino de aventura de los 100 pasos: una senda que serpentea sobre un pergamino,
 * encendida hasta el último paso hecho, con los Dofus como hitos y «Estás aquí» en el
 * siguiente pendiente.
 */
export default function StepMap({ s, current, mobile }) {
  const boxRef = useRef(null);
  const scrollRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState(null);
  const focusOnOpen = useRef(false);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const ro = new ResizeObserver(() => setWidth(box.clientWidth));
    ro.observe(box);
    setWidth(box.clientWidth);
    return () => ro.disconnect();
  }, []);

  const info = width ? layout(width) : null;

  // En escritorio el mapa se desplaza dentro de la ventana. Al volver, donde se dejó; la
  // primera vez, con el paso actual a la vista. Antes de pintarse: sin saltos
  const placed = useRef(false);
  useLayoutEffect(() => {
    const box = scrollRef.current;
    if (placed.current || !info || box.scrollHeight <= box.clientHeight) return;
    placed.current = true;
    if (lastScroll != null) box.scrollTop = lastScroll;
    else if (current != null) {
      const at = info.pos[current - 1];
      if (at.y + 40 > box.clientHeight) box.scrollTop = at.y - box.clientHeight / 2;
    }
    lastScroll = box.scrollTop;
  }, [info]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = s.selectedStep;
  // Con el teclado (las flechas) o desde una ficha se cambia de paso: el nuevo, a la vista
  const lastSel = useRef(selected);
  useEffect(() => {
    if (lastSel.current === selected) return;
    lastSel.current = selected;
    if (selected != null && !mobile) revealMapNode(selected);
  }, [selected, mobile]);

  const here = nextPending(s);
  // Lo andado: del primer paso al último hecho
  const lastDone = STEPS.reduce((m, st) => (s.done[st.n] ? st.n : m), 0);
  const sel = selected != null ? STEPS[selected - 1] : null;

  // Un clic de teclado (detail 0) deja el foco en la ficha
  const onPick = useRef(e => {
    focusOnOpen.current = e.detail === 0;
    selectStep(Number(e.currentTarget.dataset.n));
  }).current;
  const hoverAt = (e, keyboard) => {
    const b = e.target.closest?.(".map-node");
    if (!b || (!keyboard && e.pointerType !== "mouse") || (keyboard && !b.matches(":focus-visible"))) return setTip(null);
    const n = Number(b.dataset.n);
    setTip(t => (t?.n === n ? t : { n, r: b.offsetWidth / 2 }));
  };

  return (
    <div className="step-map-scroll" ref={scrollRef} onScroll={e => { lastScroll = e.currentTarget.scrollTop; }}>
      <div className="step-map" ref={boxRef} style={{ height: info?.height ?? 600 }}
        onPointerOver={e => hoverAt(e, false)} onPointerLeave={() => setTip(null)}
        onFocus={e => hoverAt(e, true)} onBlur={() => setTip(null)}
        // Intro y espacio en un sello lo abren (su clic), sin el atajo de la página
        onKeyDown={e => { if ((e.key === "Enter" || e.key === " ") && e.target.matches(".map-node")) e.stopPropagation(); }}>
        {info && (
          <>
            <svg className="step-map-path" width={width} height={info.height} aria-hidden="true">
              <path className="map-road" d={info.start + info.segs.join(" ")} />
              <path className="map-trail" d={info.start + info.segs.join(" ")} />
              <path className={"map-trail-end" + (s.done[STEPS.length] ? " lit" : "")} d={info.tail} />
              {lastDone >= 2 && (
                <>
                  <path className="map-trail-glow" d={info.start + info.segs.slice(0, lastDone - 1).join(" ")} />
                  <path className="map-trail-lit" data-to={lastDone} d={info.start + info.segs.slice(0, lastDone - 1).join(" ")} />
                </>
              )}
              {sel?.closes?.map(c => <path key={c} className="map-arc" d={arcPath(info.pos[c - 1], info.pos[sel.n - 1])} />)}
            </svg>
            <Nodes pos={info.pos} done={s.done} filters={s.filters} here={here} selected={selected} onPick={onPick} />
            {tip && tip.n !== selected && <Tip n={tip.n} r={tip.r} at={info.pos[tip.n - 1]} width={width} />}
            {!mobile && sel && (
              <FloatingCard key={sel.n} step={sel} s={s} layoutInfo={info} width={width} scrollRef={scrollRef} focusOnOpen={focusOnOpen} />
            )}
          </>
        )}
        <div className={"map-end" + (s.done[STEPS.length] ? " done" : "")}>
          {BRAND_ICON && <img src={imgUrl(BRAND_ICON)} alt="" loading="lazy" decoding="async" />}
          <span className="map-end-label">Fin del camino</span>
          <b className="map-end-name">Dofus Silvestre</b>
        </div>
      </div>
    </div>
  );
}
