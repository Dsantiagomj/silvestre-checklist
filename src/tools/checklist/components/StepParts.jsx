// Piezas compartidas por el detalle del paso y el overlay.
import { Fragment, useEffect, useRef, useState } from "react";
import { RES_ITEMS } from "../lib/resources.js";
import { OBJ_ICONS, imgUrl } from "../lib/assets.js";
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
 * `stop` ({ index, text, resume }) o `stops` (varias) pintan la parada roja de la guía,
 * o la verde donde se retoma, antes de ese objetivo. `kids` ({ index, items: [{ id, n }] })
 * dice qué misiones del paso empiezan ahí y cumplen esos objetivos; `onKid(id, el)` lleva
 * a una de ellas.
 * Con `route` (el detalle) es una ruta de medallones: `at` es el objetivo actual de
 * la etapa; los de antes salen hechos (más allá del final, todos). Con `onPick(k)`
 * cada medallón es un botón: deja el avance en `k` (pulsar uno pendiente lo da por
 * hecho, `k` = el siguiente; uno hecho vuelve a él).
 */
export function Objectives({ objs, stop, stops, kids = [], onKid, route = false, at = -1, onPick }) {
  // Una o varias líneas (una misión puede retomarse en verde y volver a parar en rojo)
  const lines = stops || (stop ? [stop] : []);
  return (
    <ul className={"obj-list" + (route ? " route" : "")}>
      {objs.map((o, i) => (
        <Fragment key={i}>
        {kids.filter(c => c.index === i).map((c, k) => (
          <li key={`c${k}`} className="obj-kids" role="note">
            <span>
              {c.items.length > 1 ? "Aquí se hacen " : "Aquí se hace "}
              {c.items.map((q, j) => (
                <Fragment key={q.id}>
                  {j > 0 && (j === c.items.length - 1 ? " y " : ", ")}
                  <button type="button" className="q-ref" onClick={e => onKid?.(q.id, e.currentTarget)}>«{q.n}»</button>
                </Fragment>
              ))}
            </span>
          </li>
        ))}
        {lines.filter(l => l.index === i).map((l, k) => (
          <li key={k} className={l.resume ? "obj-resume" : "obj-stop"} role="separator"><span>{l.text}</span></li>
        ))}
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
