import {
  ALL_PREREQS, PREREQS_HECHIZOS, PREREQS_INTRO, PREREQS_LOGROS, PREREQS_OFICIOS,
} from "../data/steps.js";
import { isPrereqDone, prereqsDone, setPrereqsOpen, togglePrereq, useAppState } from "../state/store.js";
import { PREREQ_ICONS, imgUrl } from "../lib/assets.js";
import { PREREQ_STEP } from "../lib/resources.js";
import { ReqBlock } from "./StepParts.jsx";

const GROUPS = [
  { id: "prereqsLogros", title: "Logros previos requeridos", items: PREREQS_LOGROS },
  { id: "prereqsOficios", title: "Niveles de oficios", items: PREREQS_OFICIOS },
  { id: "prereqsHechizos", title: "Hechizos necesarios", items: PREREQS_HECHIZOS },
];

function PrereqItem({ p, done }) {
  const icons = PREREQ_ICONS[p.id] || [];
  return (
    <div className={"prereq-item" + (done ? " done" : "")} data-id={p.id} onClick={() => togglePrereq(p.id)}>
      <span className="chk"></span>
      {icons.length > 0 && (
        <span className="pr-icons">
          {icons.map((i, k) => i.img
            ? <img key={k} src={imgUrl(i.img)} alt="" title={i.label} loading="lazy" />
            : <span key={k} className="pr-quest" title={i.label}>📜</span>)}
        </span>
      )}
      <span className="txt">{p.text}</span>
    </div>
  );
}

/** PRERREQUISITOS */
export default function Prereqs() {
  const s = useAppState();
  const done = prereqsDone(s);
  const total = ALL_PREREQS.length;
  return (
    <div className={"prereqs" + (s.prereqsOpen ? " open" : "")} id="prereqs">
      <button className="prereqs-head" id="prereqsHead" aria-expanded={String(s.prereqsOpen)} aria-controls="prereqsBody"
        onClick={() => setPrereqsOpen(!s.prereqsOpen, true)}>
        <span className="chev">▶</span>
        <h2>Prerrequisitos</h2>
        <span className={"count" + (done < total ? " pending" : "")} id="prereqsCount">{`${done}/${total} completados`}</span>
      </button>
      <div className="prereqs-body" id="prereqsBody">
        <div className="prereqs-content">
          <p className="prereqs-intro" id="prereqsIntro">{PREREQS_INTRO}</p>
          {GROUPS.map(g => (
            <div className="prereqs-group" key={g.id}>
              <h3>{g.title}</h3>
              <div id={g.id}>
                {g.items.map(p => <PrereqItem key={p.id} p={p} done={isPrereqDone(s, p.id)} />)}
              </div>
            </div>
          ))}
          <ReqBlock n={PREREQ_STEP} open s={s} title="Objetos para los prerrequisitos" />
        </div>
      </div>
    </div>
  );
}
