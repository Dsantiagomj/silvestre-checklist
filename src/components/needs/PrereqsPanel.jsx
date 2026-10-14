import { PREREQS_HECHIZOS, PREREQS_INTRO, PREREQS_LOGROS, PREREQS_OFICIOS } from "../../data/steps.js";
import { PREREQ_ICONS, imgUrl } from "../../lib/assets.js";
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
 *   "Campesino nivel 100"                   -> título "Campesino", etiqueta "Nv. 100"
 *   "Llamilla (obligatorio)"                -> título "Llamilla", etiqueta "Obligatorio"
 */
export function prereqParts(text) {
  let title = text.trim().replace(/\.$/, "");
  let zone = null, badge = null, sub = null;
  const paren = title.match(/^(.*?)\s*\(([^)]*)\)$/);
  if (paren && /obligatorio|etc\./i.test(paren[2])) {
    title = paren[1];
    const [kind, ...rest] = paren[2].split(/,\s*/);
    if (/^no obligatorio$/i.test(kind)) badge = "Opcional";
    else if (/^obligatorio$/i.test(kind)) badge = "Obligatorio";
    else rest.unshift(kind);
    if (rest.length) sub = rest.join(", ").replace(/^./, c => c.toUpperCase());
  }
  const level = title.match(/^(.*?)\s+nivel\s+(\d+)$/i);
  if (level) { title = level[1]; badge = `Nv. ${level[2]}`; }
  const colon = title.indexOf(": ");
  if (colon > 0) { zone = title.slice(0, colon); title = title.slice(colon + 2); }
  return { zone, title, badge, sub };
}

function PrereqCard({ p, done }) {
  const icons = (PREREQ_ICONS[p.id] || []).filter(i => i.img);
  const { zone, title, badge, sub } = prereqParts(p.text);
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
        {sub && <span className="pr-sub">{sub}</span>}
      </span>
      {badge && <span className={"pr-badge" + (badge === "Opcional" ? " soft" : "")}>{badge}</span>}
    </button>
  );
}

/** PRERREQUISITOS · tarjetas por grupo y, debajo, los objetos que piden. */
export default function PrereqsPanel() {
  const s = useAppState();
  return (
    <div className="needs-panel prereqs-panel" id="prereqs" role="tabpanel" aria-labelledby="tabPrereqs">
      <p className="pr-intro">{PREREQS_INTRO}</p>
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
