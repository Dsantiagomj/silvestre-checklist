import { DOFUS_ROAD, imgUrl } from "../lib/assets.js";
import { useAppState } from "../state/store.js";

/** "Dofus de pesadilla" -> "Pesadilla" */
const shortName = name => {
  const s = name.replace(/^Dofus (de )?/i, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

function showBoard() {
  document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/**
 * DOFUS DEL CAMINO · los Dofus que da la guía antes del Silvestre. Cada uno se
 * consigue en el paso que completa su logro. Mientras avanzas es una fila compacta;
 * con la guía terminada ocupa el sitio del siguiente paso y de "Lo que necesitas".
 */
export default function DofusRoad({ big = false }) {
  const s = useAppState();
  const got = DOFUS_ROAD.filter(d => s.done[d.step]).length;
  if (!DOFUS_ROAD.length) return null;
  return (
    <section className={"road" + (big ? " big" : "")} aria-labelledby="roadTitle">
      <div className="road-head">
        <p className="road-title" id="roadTitle">{big ? "Por el camino conseguiste" : "Dofus del camino"}</p>
        {!big && <span className="road-count">{got}/{DOFUS_ROAD.length}</span>}
      </div>
      {big && <p className="road-sub">Los {DOFUS_ROAD.length} Dofus que da la guía antes del Silvestre.</p>}
      <ul className="road-list">
        {DOFUS_ROAD.map(d => {
          const ok = !!s.done[d.step];
          return (
            <li key={d.name} className={"road-dofus" + (ok ? " obtained" : "")} title={`${d.name} · paso ${d.step}`}>
              <span className="road-art">
                <img src={imgUrl(d.img)} alt={ok ? d.name : `${d.name}, se consigue en el paso ${d.step}`} />
                {!ok && <span className="road-step" aria-hidden="true">{d.step}</span>}
              </span>
              {big && <span className="road-name">{shortName(d.name)}</span>}
            </li>
          );
        })}
      </ul>
      {big && <button type="button" className="road-go" id="roadGo" onClick={showBoard}>Ver el tablero</button>}
    </section>
  );
}
