// Piezas compartidas por el detalle del paso y el overlay.
import { Fragment, useEffect, useRef, useState } from "react";
import { RES_ITEMS, rowName, rowQty, rowsOf } from "../lib/resources.js";
import { OBJ_ICONS, imgUrl } from "../lib/assets.js";
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
      {copied ? "Copiado" : <><img src={imgUrl(OBJ_ICONS.map)} alt="" />[{label}]</>}
    </button>
  );
}

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
 * la etapa; los de antes salen hechos (más allá del final, todos). Con `onPick(k)`
 * cada medallón es un botón: deja el avance en `k` (pulsar uno pendiente lo da por
 * hecho, `k` = el siguiente; uno hecho vuelve a él).
 */
export function Objectives({ objs, stop, route = false, at = -1, onPick }) {
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
            <button type="button" className="obj-med" disabled={!onPick}
              aria-label={`${i < at ? "Desmarcar" : "Marcar como hecho"}: ${o.t}`}
              onClick={() => onPick(i < at ? i : i + 1)}>
              <img src={imgUrl(OBJ_ICONS[o.k] || OBJ_ICONS.free)} alt="" />
            </button>
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
