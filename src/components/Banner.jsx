import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ZONE_COLOR } from "@dofus/steps.js";
import { ZONE_IMG, imgUrl } from "../lib/assets.js";
import { bannerFigure, startMap } from "../lib/journal.js";

// La punta del pendón: lo que baja el centro respecto de los lados. La pone el CSS
// (--tip, la misma del clip-path); el pendón pequeño del diario la lleva más corta
const TIP = 26;

/** Ancho, alto y punta de un elemento, al día con sus cambios de tamaño. */
function useSize() {
  const ref = useRef(null);
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const el = ref.current;
    const measure = () => setSize(prev => {
      const w = el.offsetWidth, h = el.offsetHeight;
      const tip = parseFloat(getComputedStyle(el).getPropertyValue("--tip")) || TIP;
      return prev && prev.w === w && prev.h === h && prev.tip === tip ? prev : { w, h, tip };
    });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

/**
 * El marco dorado del pendón, con la punta incluida: el borde de fuera y el filete de
 * dentro. Va en SVG porque un borde de CSS no sigue las diagonales del clip-path.
 */
function BannerFrame({ w, h, tip }) {
  // El contorno metido `d` px hacia dentro: los lados y el techo, d; las diagonales de
  // la punta bajan con pendiente tip / (w/2) y, desplazadas d en su normal, suben d/cos
  const outline = d => {
    const slope = tip / (w / 2);
    const up = d * Math.hypot(1, slope);
    const side = h - tip + d * slope - up;
    return `M${d} ${d} H${w - d} V${side} L${w / 2} ${h - up} L${d} ${side} Z`;
  };
  return (
    <svg className="banner-frame" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path className="frame-out" d={outline(1)} />
      <path className="frame-in" d={outline(6)} />
    </svg>
  );
}

/**
 * La URL que ya se puede pintar entera: hasta que la imagen carga, nada. Así el fondo
 * entra de una vez (con su animación) y no a trozos ni encima de otro.
 */
function useLoaded(src) {
  const [loaded, setLoaded] = useState(null);
  useEffect(() => {
    if (!src) return;
    const img = new Image();
    let live = true;
    img.onload = img.onerror = () => live && setLoaded(src);
    img.src = src;
    return () => { live = false; };
  }, [src]);
  return loaded === src;
}

/**
 * El estandarte (izquierda): sobre el mapa del juego donde empieza el paso, su número,
 * su zona y lo que lo representa (bannerFigure). Sin mapa, el paisaje de la zona. Un
 * solo fondo, alojado aquí (fetch_start_maps.py): con el mapa de DofusDB encima del
 * paisaje, se veía el paisaje y un segundo después lo tapaba el mapa.
 */
export default function Banner({ step, className = "" }) {
  const fig = bannerFigure(step.n);
  const map = startMap(step.n);
  const zone = ZONE_IMG[step.zone];
  const bg = map ? imgUrl(`maps/start/${map}.jpg`) : zone ? imgUrl(zone.img) : null;
  const ready = useLoaded(bg);
  const [ref, size] = useSize();
  return (
    <aside className={"journal-banner" + (className ? ` ${className}` : "")} ref={ref} style={{ "--zone-color": ZONE_COLOR[step.zone] }}>
      {bg && ready && <div className="journal-bg" key={bg} style={{ backgroundImage: `url("${bg}")` }}></div>}
      {/* Oculto (el distintivo de pantalla baja lo cambia por el suyo) mide 0: sin marco */}
      {size?.w > 0 && size.h > 0 && <BannerFrame {...size} />}
      <span className="journal-num">{step.n}</span>
      <span className="banner-zone">{step.zone}</span>
      {fig && (
        <figure className="journal-show" data-kind={fig.kind}>
          <img src={imgUrl(fig.img)} alt="" decoding="async" />
          <figcaption>
            <small className="journal-show-label">{fig.as}</small>
            <b className="journal-show-name">{fig.name}</b>
          </figcaption>
        </figure>
      )}
    </aside>
  );
}
