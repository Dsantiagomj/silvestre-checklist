// Piezas compartidas por el detalle del paso y el overlay.
import { Fragment, useEffect, useRef, useState } from "react";
import { RES_ITEMS, rowName, rowQty, rowsOf } from "../lib/resources.js";
import { imgUrl } from "../lib/assets.js";
import { rowHave } from "../state/store.js";
import { OBJ_ICON, coordLabel } from "../lib/quests.js";
import { copyText } from "../lib/motion.js";

/** Chip de coordenadas: al pulsarlo copia el comando /travel del juego. */
export function CoordChip({ x, y }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  if (x == null || y == null) return null;
  const label = coordLabel(x, y);

  async function copyTravel(e) {
    const doc = e.currentTarget.ownerDocument;
    const text = `/travel ${label}`;
    if (await copyText(doc, text)) {
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 1200);
    } else {
      doc.defaultView.prompt("Copia el comando:", text);
    }
  }

  return (
    <button className={"coord-chip" + (copied ? " ok" : "")} data-travel={label} title={`Copiar /travel ${label}`} onClick={copyTravel}>
      {copied ? "Copiado" : `⌖ [${label}]`}
    </button>
  );
}

// Medallones de la ruta: un dibujo por tipo de objetivo, del color del oro del tablero
const OBJ_SVG = {
  npc: <path d="M4 5.5C4 4.1 5.1 3 6.5 3h11C18.9 3 20 4.1 20 5.5v7c0 1.4-1.1 2.5-2.5 2.5H11l-4.5 4v-4h0A2.5 2.5 0 0 1 4 12.5z" />,
  fight: <path d="M5 3l7 7M3 5l2-2M19 3l-7 7M21 5l-2-2M8.5 13.5L4 18l2 2 4.5-4.5M15.5 13.5L20 18l-2 2-4.5-4.5M7 11l6 6M17 11l-6 6" />,
  bring: <path d="M7 8V6.5a5 5 0 0 1 10 0V8M5 8h14l-1.2 11.2A2 2 0 0 1 15.8 21H8.2a2 2 0 0 1-2-1.8z" />,
  map: <path d="M12 21s7-6.6 7-11.5A7 7 0 0 0 5 9.5C5 14.4 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" />,
  craft: <path d="M14 4l6 6-3 3-6-6zM11 7L3.5 14.5a2.1 2.1 0 0 0 3 3L14 10" />,
  free: <path d="M12 3l2.6 5.6 6.1.7-4.5 4.1 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.1 6.1-.7z" />,
};

// "Entrégale a Cirle Drawde: 5 x Lana de jalató" -> a quién y qué, para la casilla
const BRING = /^(.*?):\s*(\d+)\s*x\s*(.+)$/;
const ITEM_BY_NAME = new Map(Object.values(RES_ITEMS).map(it => [it.name.toLowerCase(), it]));

function ObjText({ o, route }) {
  const bring = route && o.k === "bring" && o.t.match(BRING);
  const item = bring && ITEM_BY_NAME.get(bring[3].trim().toLowerCase());
  const where = o.a ? <>{" "}<span className="obj-a">· {o.a}</span></> : null;
  if (!bring) return <span className="obj-t">{o.t}{where}</span>;
  return (
    <span className="obj-t">
      {bring[1]}{where}
      <span className="obj-item">
        {item?.img && <img src={imgUrl(item.img)} alt="" loading="lazy" />}
        {bring[2]} × {bring[3]}
      </span>
    </span>
  );
}

/**
 * Lista de objetivos de una etapa. La comparten el overlay y el detalle.
 * `stop` ({ index, text }) pinta la parada roja de la guía antes de ese objetivo.
 * Con `route` (el detalle) es una ruta de medallones: `at` es el objetivo actual de
 * la etapa; los de antes salen hechos (más allá del final, todos).
 */
export function Objectives({ objs, stop, route = false, at = -1 }) {
  return (
    <ul className={"obj-list" + (route ? " route" : "")}>
      {objs.map((o, i) => (
        <Fragment key={i}>
        {stop?.index === i && (
          <li className="obj-stop" role="separator"><span>{stop.text}</span></li>
        )}
        <li className={`obj-row k-${o.k}` + (route && i < at ? " done" : route && i === at ? " now" : "")}
          aria-current={route && i === at ? "step" : undefined}>
          {route ? (
            <span className="obj-med" aria-hidden="true">
              <svg viewBox="0 0 24 24">{OBJ_SVG[o.k] || OBJ_SVG.free}</svg>
            </span>
          ) : (
            <span className="obj-ic" aria-hidden="true">{OBJ_ICON[o.k] || "•"}</span>
          )}
          <ObjText o={o} route={route} />
          <CoordChip x={o.x} y={o.y} />
        </li>
        </Fragment>
      ))}
    </ul>
  );
}

/**
 * Desplegable "Objetos necesarios (N)" de un paso, según la lista de torrentearcano.
 * Lo usan el detalle, el overlay y los prerrequisitos (paso 0). Pulsar un objeto
 * copia su nombre, para buscarlo en el mercadillo del juego.
 */
export function ReqBlock({ n, open, s, title = "Objetos necesarios" }) {
  const [copied, setCopied] = useState(null);
  const timer = useRef();
  useEffect(() => () => clearTimeout(timer.current), []);
  const rows = rowsOf(n);
  if (!rows.length) return null;

  async function copy(e, name) {
    const doc = e.currentTarget.ownerDocument;
    if (await copyText(doc, name)) {
      setCopied(name);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(null), 2500);
    } else {
      doc.defaultView.prompt("Copia el nombre:", name);
    }
  }

  return (
    <details className="req" open={open}>
      <summary>{title} <span className="n">({rows.length})</span></summary>
      <div className="req-grid">
        {rows.map(row => {
          const name = RES_ITEMS[row.a[0][0]].name;
          const tip = [`${rowQty(row)} × ${rowName(row)}`, row.g, row.n, "Pulsa para copiar el nombre"].filter(Boolean).join(" · ");
          return (
            <button type="button" key={row.k} title={tip} onClick={e => copy(e, name)}
              className={"req-item" + (rowHave(s, row, [n]) ? " owned" : "") + (row.a.length > 1 ? " alt" : "") + (copied === name ? " copied" : "")}>
              {row.a.map(([id]) => RES_ITEMS[id].img
                ? <img key={id} src={imgUrl(RES_ITEMS[id].img)} alt={RES_ITEMS[id].name} loading="lazy" />
                : <span key={id} className="item-unknown" role="img" aria-label={RES_ITEMS[id].name}>?</span>)}
              <span className="q">{row.a[0][1]}</span>
            </button>
          );
        })}
      </div>
      <p className="req-copied" role="status">{copied ? <>📋 «{copied}» copiado · pégalo en el buscador del mercadillo</> : null}</p>
    </details>
  );
}
