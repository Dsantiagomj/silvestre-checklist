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

function PrereqCard({ p, done }) {
  const icons = PREREQ_ICONS[p.id] || [];
  return (
    <button type="button" className={"pr-card" + (done ? " done" : "")} data-id={p.id}
      aria-pressed={String(done)} onClick={() => togglePrereq(p.id)}>
      <span className="pr-icons" aria-hidden="true">
        {icons.length
          ? icons.map((i, k) => i.img
            ? <img key={k} src={imgUrl(i.img)} alt="" title={i.label} loading="lazy" />
            : <span key={k} className="pr-quest" title={i.label}>📜</span>)
          : <span className="pr-quest">📜</span>}
      </span>
      <span className="pr-text">{p.text}</span>
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
          <h3>{g.title}</h3>
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
