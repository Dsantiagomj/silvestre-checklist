import { useLayoutEffect, useRef } from "react";
import { STEPS } from "@dofus/steps.js";
import { SOLO_ROAD, STRIP_ROAD, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion, restartClass } from "../lib/motion.js";
import { doneCount, goToNextPending, nextPending, progressPct, selectStep } from "../state/store.js";

/**
 * Al conseguir un Dofus del camino (al marcar su paso, nunca al cargar), su huevo se
 * enciende con un destello y un rebote y la cuenta sube de un salto. Desmarcarlo solo
 * lo apaga. Con movimiento reducido cambia sin más (el aviso lo da el store).
 */
function useDofusWon(listRef, countRef, won) {
  const seen = useRef(won.seq);
  useLayoutEffect(() => {
    if (seen.current === won.seq) return;
    seen.current = won.seq;
    if (prefersReducedMotion()) return;
    for (const n of won.steps) {
      const egg = listRef.current.querySelector(`.road-dofus[data-step="${n}"]`);
      if (egg) restartClass(egg, "won");
    }
    restartClass(countRef.current, "tick");
  }, [won.seq]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * La cabecera de la franja. Con Dofus del camino, cuántos van. Sin ellos (SOLO_ROAD, el
 * Hielos) la franja lleva solo el del checklist: su nombre y en qué paso se consigue, o
 * que ya se tiene.
 */
function RoadHead({ s, countRef }) {
  if (SOLO_ROAD) {
    const [d] = STRIP_ROAD;
    return (
      <div className="road-head">
        <p className="road-title">El Dofus de la guía</p>
        <b className="road-name">{d.name}</b>
        <b className="road-count" ref={countRef}>{s.done[d.step] ? "¡Obtenido!" : `Paso ${d.step}`}</b>
      </div>
    );
  }
  const got = STRIP_ROAD.filter(d => s.done[d.step]).length;
  return (
    <div className="road-head">
      <p className="road-title">Dofus del camino</p>
      <b className="road-count" ref={countRef}>{got}/{STRIP_ROAD.length}</b>
    </div>
  );
}

/**
 * Franja de arriba de la ventana de pasos en pantalla alta (la primera fila de WinBar):
 * los Dofus que da la guía antes del Silvestre (cada uno se consigue en el paso que
 * completa su logro), el progreso global y el acceso al siguiente pendiente. Sin Dofus
 * del camino, el huevo del del checklist en grande (is-solo). En pantalla baja la barra
 * lo resume en una fila (WinProgress, RoadMenu).
 */
export default function WinStrip({ s }) {
  const pct = progressPct(s);
  const next = nextPending(s);
  const listRef = useRef(null);
  const countRef = useRef(null);
  useDofusWon(listRef, countRef, s.dofusWon);
  return (
    <div className={"win-strip" + (SOLO_ROAD ? " is-solo" : "")} id="winRoad">
      <RoadHead s={s} countRef={countRef} />
      <ul className="road-list" ref={listRef}>
        {STRIP_ROAD.map(d => {
          const ok = !!s.done[d.step];
          // Pulsar uno abre su paso: es donde se consigue. "won" solo dura la celebración
          return (
            <li key={d.name}>
              <button type="button" className={"road-dofus" + (ok ? " obtained" : "")} data-step={d.step}
                title={`${d.name} · paso ${d.step}`} style={{ "--egg": `url(${imgUrl(d.img)})` }}
                aria-label={`${d.name}, paso ${d.step}${ok ? ", conseguido" : ""}`} onClick={() => selectStep(d.step)}
                onAnimationEnd={e => { if (e.animationName === "egg-won") e.currentTarget.classList.remove("won"); }}>
                <img src={imgUrl(d.img)} alt="" />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="win-progress">
        <b className="win-pct" id="winPct">{pct}%</b>
        <span className="win-meter" aria-hidden="true"><i id="winFill" style={{ width: pct + "%" }}></i></span>
        <span className="win-done"><b id="winDone">{doneCount(s)}</b>/{STEPS.length} pasos</span>
      </div>
      <button type="button" className="diary-next" id="diaryNext" disabled={next == null} onClick={goToNextPending}>
        {next != null ? <>Siguiente: <b>{next}</b> <span aria-hidden="true">→</span></> : "Guía completa"}
      </button>
    </div>
  );
}
