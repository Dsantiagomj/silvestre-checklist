import { STEPS } from "../data/steps.js";
import { DOFUS_ROAD, imgUrl } from "../lib/assets.js";
import { doneCount, goToNextPending, nextPending, progressPct, selectStep } from "../state/store.js";

/**
 * Franja de arriba de la ventana de pasos: los Dofus que da la guía antes del Silvestre
 * (cada uno se consigue en el paso que completa su logro), el progreso global y el
 * acceso al siguiente pendiente. Va con la ventana, así se ve mientras se recorren los
 * pasos sin que haga falta una barra en el header.
 */
export default function WinStrip({ s }) {
  const got = DOFUS_ROAD.filter(d => s.done[d.step]).length;
  const pct = progressPct(s);
  const next = nextPending(s);
  return (
    <div className="win-strip" id="winRoad">
      <div className="road-head">
        <p className="road-title">Dofus del camino</p>
        <b className="road-count">{got}/{DOFUS_ROAD.length}</b>
      </div>
      <ul className="road-list">
        {DOFUS_ROAD.map(d => {
          const ok = !!s.done[d.step];
          // Pulsar uno abre su paso: es donde se consigue
          return (
            <li key={d.name}>
              <button type="button" className={"road-dofus" + (ok ? " obtained" : "")} title={`${d.name} · paso ${d.step}`}
                aria-label={`${d.name}, paso ${d.step}${ok ? ", conseguido" : ""}`} onClick={() => selectStep(d.step)}>
                <img src={imgUrl(d.img)} alt="" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="win-progress">
        <b className="win-pct" id="winPct">{pct}%</b>
        <span className="win-bar" aria-hidden="true"><i id="winFill" style={{ width: pct + "%" }}></i></span>
        <span className="win-done"><b id="winDone">{doneCount(s)}</b>/{STEPS.length} pasos</span>
      </div>
      <button type="button" className="diary-next" id="diaryNext" disabled={next == null} onClick={goToNextPending}>
        {next != null ? <>Siguiente: <b>{next}</b> <span aria-hidden="true">→</span></> : "Guía completa"}
      </button>
    </div>
  );
}
