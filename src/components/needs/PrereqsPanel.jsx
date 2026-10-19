import { OCRE_STEP, PREREQS_HECHIZOS, PREREQS_LOGROS, PREREQS_OCRE, PREREQS_OFICIOS } from "../../data/steps.js";
import { useLiveIds } from "../../lib/leaving.js";
import { OCRE_ICON, PREREQ_ICONS, imgUrl } from "../../lib/assets.js";
import { PREREQ_STEP, aggregate } from "../../lib/resources.js";
import { achievementGuide, missionGuide } from "../../lib/guides.js";
import { isPrereqDone, openInDiary, rowHave, togglePrereq, toggleRowOwned, useAppState } from "../../state/store.js";
import Slot from "./Slot.jsx";
import QuestMark from "../QuestMark.jsx";
import { appRoot } from "../../lib/root.js";

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

/**
 * La guía del logro que nombra el prerrequisito, aunque pida solo algunas de sus
 * misiones; si es una misión suelta ('misión "X"'), la de la misión.
 */
const prereqGuide = text => {
  const achievement = text.match(/Logro "([^"]+)"/)?.[1];
  if (achievement) return achievementGuide(achievement);
  const mission = text.match(/misión "([^"]+)"/)?.[1];
  return mission ? missionGuide(mission) : null;
};

/**
 * Tarjeta de un prerrequisito: pulsarla lo marca. La guía va aparte, encima de la
 * esquina, porque un enlace no puede ir dentro del botón.
 */
function PrereqCard({ p, done }) {
  const guide = prereqGuide(p.text);
  const icons = (PREREQ_ICONS[p.id] || []).filter(i => i.img);
  const { zone, title, sub } = prereqParts(p.text);
  const layout = icons.length >= 3 ? " quad" : icons.length === 2 ? " pair" : "";
  // "Opcional" va como etiqueta propia; debajo queda solo para qué sirve
  const optional = sub?.lead === "Opcional";
  const note = optional ? sub.tail.replace(/^./, c => c.toUpperCase()) : null;
  return (
    <div className={"pr-item" + (guide ? " has-guide" : "")} data-id={p.id}>
      <button type="button" className={"pr-card" + (done ? " done" : "") + (optional ? " optional" : "")} data-id={p.id}
        aria-pressed={String(done)} onClick={() => togglePrereq(p.id)} title={p.text}>
        <span className={"pr-icons" + layout} aria-hidden="true">
          {icons.length
            ? icons.slice(0, 4).map((i, k) => <img key={k} src={imgUrl(i.img)} alt="" loading="lazy" />)
            : <span className="pr-quest"><QuestMark /></span>}
        </span>
        <span className="pr-body">
          {zone && <span className="pr-zone">{zone}</span>}
          <span className="pr-title">{title}</span>
          {optional ? (
            note && <span className="pr-sub">{note}</span>
          ) : sub && (
            <span className="pr-sub">
              {sub.lead && <b>{sub.lead}</b>}
              {sub.lead && sub.tail ? " · " : ""}{sub.tail}
            </span>
          )}
        </span>
        {optional && <span className="pr-tag optional">Opcional</span>}
      </button>
      {guide && (
        <a className="pr-guide" href={guide} target="_blank" rel="noopener" title="Guía del logro en Torrente Arcano">Guía ↗</a>
      )}
    </div>
  );
}

function showStep(n) {
  openInDiary(n);
  appRoot().getElementById("diary")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * La recomendación de Sandglass sobre el Dofus Ocre: lo da la misión "La eterna
 * cosecha", larga, que la guía termina en el paso 79 ("El fin de la eternidad").
 */
function OcreNote() {
  return (
    <aside className="pr-ocre">
      {OCRE_ICON && <img src={imgUrl(OCRE_ICON)} alt="" />}
      <div>
        <b>Empieza el Dofus Ocre cuanto antes</b>
        <p>{PREREQS_OCRE}</p>
        <p className="pr-ocre-step">
          Lo da la misión «La eterna cosecha», que la guía termina en el{" "}
          <button type="button" className="step-ref" data-n={OCRE_STEP} onClick={() => showStep(OCRE_STEP)}>paso {OCRE_STEP}</button>{" "}
          con el logro «El fin de la eternidad».
        </p>
      </div>
    </aside>
  );
}

/** PRERREQUISITOS · tarjetas por grupo y, debajo, los objetos que piden. */
export default function PrereqsPanel() {
  const live = useLiveIds();
  const s = useAppState();
  return (
    <div className="needs-panel prereqs-panel" id={live("prereqs")} role="tabpanel" aria-labelledby={live("tabPrereqs")}>
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
