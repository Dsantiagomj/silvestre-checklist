import { PREREQS_HECHIZOS, PREREQS_LOGROS, PREREQS_OCRE, PREREQS_OFICIOS } from "../../data/steps.js";
import { OCRE_ICON, PREREQ_ICONS, imgUrl } from "../../lib/assets.js";
import { PREREQ_STEP, aggregate } from "../../lib/resources.js";
import { isPrereqDone, rowHave, togglePrereq, toggleRowOwned, useAppState } from "../../state/store.js";
import Slot from "./Slot.jsx";

const GROUPS = [
  { title: "Logros previos", items: PREREQS_LOGROS },
  { title: "Oficios", items: PREREQS_OFICIOS },
  { title: "Hechizos", items: PREREQS_HECHIZOS },
];
const PREREQ_ROWS = aggregate([PREREQ_STEP]);

/**
 * Parte el texto de Sandglass para la tarjeta, sin cambiar lo que dice:
 *   'Isla de Otomaï: Logro "X". (Completo)' -> zona "Isla de Otomaï", título 'Logro "X". (Completo)'
 *   "Campesino nivel 100"                   -> título "Campesino", detalle "Nivel 100"
 *   "Zanahowia (no obligatorio, útil …)"    -> título "Zanahowia", detalle "Opcional · útil …"
 * El detalle va en palabras bajo el nombre: una etiqueta suelta no decía qué era.
 */
export function prereqParts(text) {
  let title = text.trim().replace(/\.$/, "");
  let zone = null, lead = null, rest = [];
  const paren = title.match(/^(.*?)\s*\(([^)]*)\)$/);
  if (paren && /^opcional(es)? pero útil(es)?$/i.test(paren[2])) {
    title = paren[1].replace(/\.$/, "");
    lead = "Opcional";
    rest = ["útil"];
  } else if (paren && /obligatorio|etc\./i.test(paren[2])) {
    title = paren[1];
    const [kind, ...more] = paren[2].split(/,\s*/);
    if (/^no obligatorio$/i.test(kind)) lead = "Opcional";
    else if (/^obligatorio$/i.test(kind)) lead = "Obligatorio";
    else more.unshift(kind);
    rest = more;
  }
  const level = title.match(/^(.*?)\s+nivel\s+(\d+)$/i);
  if (level) { title = level[1]; lead = `Nivel ${level[2]}`; }
  const colon = title.indexOf(": ");
  if (colon > 0) { zone = title.slice(0, colon); title = title.slice(colon + 2); }
  const tail = rest.join(", ");
  const sub = lead ? { lead, tail } : tail ? { lead: null, tail: tail.replace(/^./, c => c.toUpperCase()) } : null;
  return { zone, title, sub };
}

function PrereqCard({ p, done }) {
  const icons = (PREREQ_ICONS[p.id] || []).filter(i => i.img);
  const { zone, title, sub } = prereqParts(p.text);
  const layout = icons.length >= 3 ? " quad" : icons.length === 2 ? " pair" : "";
  return (
    <button type="button" className={"pr-card" + (done ? " done" : "")} data-id={p.id}
      aria-pressed={String(done)} onClick={() => togglePrereq(p.id)} title={p.text}>
      <span className={"pr-icons" + layout} aria-hidden="true">
        {icons.length
          ? icons.slice(0, 4).map((i, k) => <img key={k} src={imgUrl(i.img)} alt="" loading="lazy" />)
          : <span className="pr-quest">📜</span>}
      </span>
      <span className="pr-body">
        {zone && <span className="pr-zone">{zone}</span>}
        <span className="pr-title">{title}</span>
        {sub && (
          <span className="pr-sub">
            {sub.lead && <b className={sub.lead === "Opcional" ? "soft" : ""}>{sub.lead}</b>}
            {sub.lead && sub.tail ? " · " : ""}{sub.tail}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * La recomendación de Sandglass sobre el Dofus Ocre. No es ningún paso de la guía:
 * lo da la misión "La eterna cosecha", que se hace aparte.
 */
function OcreNote() {
  return (
    <aside className="pr-ocre">
      {OCRE_ICON && <img src={imgUrl(OCRE_ICON)} alt="" />}
      <div>
        <b>Empieza el Dofus Ocre cuanto antes</b>
        <p>{PREREQS_OCRE}</p>
        <p className="pr-ocre-step">Lo da la misión «La eterna cosecha», que no forma parte de los 100 pasos.</p>
      </div>
    </aside>
  );
}

/** PRERREQUISITOS · tarjetas por grupo y, debajo, los objetos que piden. */
export default function PrereqsPanel() {
  const s = useAppState();
  return (
    <div className="needs-panel prereqs-panel" id="prereqs" role="tabpanel" aria-labelledby="tabPrereqs">
      <OcreNote />
      {GROUPS.map(g => (
        <section className="pr-group" key={g.title} aria-label={g.title}>
          <h3>{g.title} <span className="pr-count">{g.items.filter(p => isPrereqDone(s, p.id)).length}/{g.items.length}</span></h3>
          <div className="pr-cards">
            {g.items.map(p => <PrereqCard key={p.id} p={p} done={isPrereqDone(s, p.id)} />)}
          </div>
        </section>
      ))}
      {PREREQ_ROWS.length > 0 && (
        <section className="pr-group" aria-label="Objetos para los prerrequisitos">
          <h3>Objetos para los prerrequisitos</h3>
          <div className="slots">
            {PREREQ_ROWS.map(r => (
              <Slot key={r.k} row={r} band="prereq" have={rowHave(s, r)} onToggle={toggleRowOwned} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
