// Piezas compartidas por el detalle del paso y el overlay.
import { useEffect, useRef, useState } from "react";
import { ITEMS, assetsFor, imgUrl, mergeItems } from "../lib/assets.js";
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

/** Lista de objetivos de una etapa. La comparten el overlay y el detalle. */
export function Objectives({ objs }) {
  return (
    <ul className="obj-list">
      {objs.map((o, i) => (
        <li key={i} className={`obj-row k-${o.k}`}>
          <span className="obj-ic" aria-hidden="true">{OBJ_ICON[o.k] || "•"}</span>
          <span className="obj-t">{o.t}{o.a ? <>{" "}<span className="obj-a">· {o.a}</span></> : null}</span>
          <CoordChip x={o.x} y={o.y} />
        </li>
      ))}
    </ul>
  );
}

/** Desplegable "Objetos necesarios (N)" de un paso. Lo usan el detalle y el overlay. */
export function ReqBlock({ n, open, owned }) {
  const a = assetsFor(n);
  const list = mergeItems(a?.items || []);
  if (!list.length) return null;
  return (
    <details className="req" open={open}>
      <summary>Objetos necesarios <span className="n">({list.length})</span></summary>
      {a.partial && <p className="req-note">Incluye todo el logro: este paso solo cubre una parte.</p>}
      <div className="req-grid">
        {list.map(([id, q]) => {
          const it = ITEMS[id];
          const tip = `${q}× ${it.name} · ${it.type} nv. ${it.lvl}`;
          return (
            <div key={id} className={"req-item" + (owned[id] ? " owned" : "")} title={tip}>
              {it.img && <img src={imgUrl(it.img)} alt={it.name} loading="lazy" />}
              <span className="q">{q}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
