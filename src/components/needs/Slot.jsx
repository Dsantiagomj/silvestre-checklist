import { useEffect, useRef, useState } from "react";
import { imgUrl } from "../../lib/assets.js";
import { copyText } from "../../lib/motion.js";
import { ALL_PREREQS } from "../../data/steps.js";
import { PREREQ_STEP, RES_ITEMS, rowLeft, rowName, rowPartial, rowQty } from "../../lib/resources.js";

const LONG_PRESS_MS = 550;
const COPIED_MS = 1200;

// El nombre de cada prerrequisito, lo que va entre comillas: 'Logro "Pan Koko Mío", …'
const PREREQ_NAME = Object.fromEntries(ALL_PREREQS.map(p => [p.id, p.text.match(/"([^"]+)"/)?.[1]]));

/**
 * "el paso 42", "los pasos 41 y 45", "«Pan Koko Mío»" (el prerrequisito que lo pide)
 * o los dos: "«Pan Koko Mío» y el paso 4".
 */
function forSteps(steps, prereq) {
  const nums = steps.filter(n => n !== PREREQ_STEP);
  const parts = steps.includes(PREREQ_STEP) ? [PREREQ_NAME[prereq] ? `«${PREREQ_NAME[prereq]}»` : "los prerrequisitos"] : [];
  if (nums.length === 1) parts.push(`el paso ${nums[0]}`);
  else if (nums.length) parts.push(`los pasos ${nums.slice(0, -1).join(", ")} y ${nums.at(-1)}`);
  return parts.join(" y ");
}

/** "Paso 57", "Pasos 57, 63, 70 y 6 más" */
function laterSteps(steps) {
  if (steps.length === 1 && steps[0] === PREREQ_STEP) return "Prerrequisitos";
  const list = steps.map(n => (n === PREREQ_STEP ? "prerrequisitos" : n));
  if (list.length === 1) return `Paso ${list[0]}`;
  const shown = list.slice(0, 3);
  const more = list.length - shown.length;
  return `Pasos ${shown.join(", ")}${more ? ` y ${more} más` : ""}`;
}

function typeLine(row) {
  if (row.a.length > 1) return "Cualquiera de los dos";
  const it = RES_ITEMS[row.a[0][0]];
  return it.type ? `${it.type} · nv. ${it.lvl}` : "";
}

/**
 * Casilla de inventario: un objeto (o sus alternativas) con su cantidad.
 * Pulsarla lo marca como conseguido; el icono de la esquina copia el nombre para
 * buscarlo en el mercadillo. En pantallas táctiles, mantenerla pulsada lo copia.
 */
export default function Slot({ row, band, have, dim, match, later, list = false, onToggle }) {
  const [copied, setCopied] = useState(false);
  const pressTimer = useRef(0);
  const copiedTimer = useRef(0);
  const skipClick = useRef(false);
  useEffect(() => () => { clearTimeout(pressTimer.current); clearTimeout(copiedTimer.current); }, []);

  // La guía pide la primera alternativa: es la que se copia
  const name = RES_ITEMS[row.a[0][0]].name;
  async function copy() {
    if (!(await copyText(document, name))) return;
    setCopied(true);
    clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }

  const onPointerDown = e => {
    if (e.pointerType !== "touch") return;
    skipClick.current = false;
    pressTimer.current = setTimeout(() => { skipClick.current = true; copy(); }, LONG_PRESS_MS);
  };
  const cancelPress = () => clearTimeout(pressTimer.current);
  const onClick = () => {
    if (skipClick.current) { skipClick.current = false; return; }
    onToggle(row);
  };

  const first = Math.min(...row.steps);
  const badge = band === "soon" ? (first === PREREQ_STEP ? "Pre" : first) : null;
  // A medias (unas partes cogidas y otras no): se ve lo que falta, no el total
  const partial = !have && rowPartial(row);
  const qty = partial ? row.left[0] : row.a[0][1];
  const qtyText = partial ? `${rowLeft(row)} de ${rowQty(row)}` : rowQty(row);
  const cls = "slot" + (list ? " list" : "") + (have ? " owned" : "") + (dim ? " dim" : "") + (match ? " match" : "") +
    (copied ? " copied" : "") + (partial ? " partial" : "");
  const art = (
    <span className={"slot-art" + (row.a.length > 1 ? " alt" : "")} aria-hidden="true">
      {row.a.map(([id]) => RES_ITEMS[id].img
        ? <img key={id} src={imgUrl(RES_ITEMS[id].img)} alt="" loading="lazy" />
        : <span key={id} className="item-unknown">?</span>)}
    </span>
  );
  const pressHandlers = {
    onClick, onPointerDown, onPointerUp: cancelPress, onPointerLeave: cancelPress, onPointerCancel: cancelPress,
    onContextMenu: e => { if (skipClick.current) e.preventDefault(); },
  };
  const copyButton = (
    <button type="button" className="slot-copy" onClick={copy} aria-label={`Copiar el nombre: ${name}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <rect x="5" y="5" width="8.5" height="9" rx="1.6" />
        <path d="M3.5 10.5V3.6c0-.9.7-1.6 1.6-1.6h5.4" />
      </svg>
    </button>
  );

  // Fila de la vista de lista: todo a la vista, sin tooltip
  if (list) {
    const extra = [row.g, row.n || typeLine(row)].filter(Boolean).join(" · ");
    return (
      <div className={cls} data-id={row.k}>
        <button type="button" className="slot-main" aria-pressed={String(have)} {...pressHandlers}>
          <span className="slot-check" aria-hidden="true"></span>
          {art}
          <span className="slot-info">
            <span className="slot-name">{rowName(row)}</span>
            {(extra || later > 0) && (
              <span className="slot-sub">
                {extra}{extra && later > 0 ? " · " : ""}{later > 0 ? `${later.toLocaleString("es")} más adelante` : ""}
              </span>
            )}
          </span>
          <span className={"slot-when" + (band === "soon" || band === "prereq" ? " soon" : "")}>{laterSteps(row.steps)}</span>
          <span className="q">×{partial ? rowLeft(row) : rowQty(row)}</span>
          {copied && <span className="slot-copied" role="status">Copiado</span>}
        </button>
        {copyButton}
      </div>
    );
  }

  return (
    <div className={cls} data-id={row.k}>
      <button type="button" className="slot-main" aria-pressed={String(have)} {...pressHandlers}
        aria-label={`${rowName(row)}, ${partial ? `faltan ${qtyText}` : rowQty(row)}${have ? ", conseguido" : ""}`}>
        {art}
        {badge != null && <span className="st" aria-hidden="true">{badge}</span>}
        {row.g && <span className="slot-tag" aria-hidden="true">{row.g.startsWith("Orden") ? "Orden" : "Opc."}</span>}
        <span className="q" aria-hidden="true">{qty}</span>
        {copied && <span className="slot-copied" role="status">Copiado</span>}
      </button>
      {copyButton}
      <span className="slot-tip" role="tooltip">
        <b>{rowName(row)} ×{partial ? qtyText : rowQty(row)}</b>
        {band === "soon" || band === "prereq"
          ? <span className="slot-tip-when">Para {forSteps(row.steps, row.p)}</span>
          : <span>{laterSteps(row.steps)}</span>}
        {later > 0 && <span>Y {later.toLocaleString("es")} más adelante</span>}
        {row.g && <span className="slot-tip-when">{row.g}</span>}
        {(row.n || typeLine(row)) && <span>{row.n || typeLine(row)}</span>}
      </span>
    </div>
  );
}
