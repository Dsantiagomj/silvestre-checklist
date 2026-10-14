import { OCRE_BY_STEP } from "../data/steps.js";
import { DOFUS_ROAD, OCRE_ICON, imgUrl } from "../lib/assets.js";
import { isPrereqDone, useAppState } from "../state/store.js";

// El Ocre no sale de ningún paso: es un hito "antes del 79" que se marca como prerrequisito
const ROAD = [
  ...DOFUS_ROAD,
  ...(OCRE_ICON ? [{ name: "Dofus Ocre", img: OCRE_ICON, before: OCRE_BY_STEP, prereq: "d1" }] : []),
].sort((a, b) => (a.step ?? a.before) - (b.step ?? b.before));

const obtained = (s, d) => (d.prereq ? isPrereqDone(s, d.prereq) : !!s.done[d.step]);
const at = d => d.step ?? d.before;
const label = d => (d.before ? `${d.name} · antes del paso ${d.before}` : `${d.name} · paso ${d.step}`);

/** "Dofus de pesadilla" -> "Pesadilla" */
const shortName = name => {
  const s = name.replace(/^Dofus (de )?/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function showBoard() {
  document.getElementById("diary")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * DOFUS DEL CAMINO · los Dofus que da la guía antes del Silvestre. Cada uno se
 * consigue en el paso que completa su logro; el Ocre, al marcarlo en prerrequisitos.
 * Mientras avanzas es una fila compacta; con la guía terminada ocupa el sitio del
 * siguiente paso y de "Lo que necesitas".
 */
export default function DofusRoad({ big = false }) {
  const s = useAppState();
  const got = ROAD.filter(d => obtained(s, d)).length;
  if (!ROAD.length) return null;
  return (
    <section className={"road" + (big ? " big" : "")} aria-labelledby="roadTitle">
      <div className="road-head">
        <p className="road-title" id="roadTitle">{big ? "Por el camino conseguiste" : "Dofus del camino"}</p>
        {!big && <span className="road-count">{got}/{ROAD.length}</span>}
      </div>
      {big && <p className="road-sub">Los {ROAD.length} Dofus del camino hasta el Silvestre.</p>}
      <ul className="road-list">
        {ROAD.map(d => {
          const ok = obtained(s, d);
          return (
            <li key={d.name} className={"road-dofus" + (ok ? " obtained" : "")} title={label(d)}>
              <span className="road-art">
                <img src={imgUrl(d.img)} alt={ok ? d.name : `${d.name}, ${d.before ? `antes del paso ${d.before}` : `se consigue en el paso ${d.step}`}`} />
                {!ok && <span className="road-step" aria-hidden="true">{at(d)}</span>}
              </span>
              {big && <span className="road-name">{shortName(d.name)}</span>}
            </li>
          );
        })}
      </ul>
      {big && <button type="button" className="road-go" id="roadGo" onClick={showBoard}>Ver los pasos</button>}
    </section>
  );
}
