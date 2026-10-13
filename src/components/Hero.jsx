import { useEffect } from "react";
import { TOTAL_PTS } from "../data/steps.js";
import {
  donePts, doneCount, nextPending, prereqsPending, progressPct, setPrereqsOpen, useAppState,
} from "../state/store.js";
import { HERO_BG, imgUrl } from "../lib/assets.js";

/** HERO a sangre: el header transparente queda encima */
export default function Hero() {
  const s = useAppState();
  const done = doneCount(s);
  const pts = donePts(s);
  const pct = progressPct(s);
  const next = nextPending(s);
  const pendingPrereqs = prereqsPending(s);
  // Un mapa por tema: el claro es un bosque de día, que se lee sin velo encima
  const heroMap = HERO_BG?.[s.theme] ?? null;

  // Puntos ponderados ocultos del UI (sistema interno sigue calculando pct)
  // Exponer en window para debug/dev:
  useEffect(() => {
    window.__silvestreStats = { done, pts, pct, total: TOTAL_PTS };
  }, [done, pts, pct]);

  function openPrereqs() {
    setPrereqsOpen(true, false);
    document.getElementById("prereqs").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="hero" aria-label="Progreso global"
      style={heroMap ? { "--hero-bg": `url("${imgUrl(heroMap)}")` } : undefined}>
      <div className="hero-inner">
        <p className="hero-eyebrow">Guía de Sandglass · 100 pasos</p>
        <h1 className="hero-title">Checklist del Dofus <span className="hl">Silvestre</span></h1>
        <p className="hero-sub">Progreso ponderado por esfuerzo, los objetos que vas a necesitar y un overlay que se queda encima del juego.</p>
        <button className={"hero-warn" + (pendingPrereqs > 0 ? "" : " hidden")} id="heroWarn"
          aria-label="Ver prerrequisitos pendientes" onClick={openPrereqs}>
          ⚠ <span id="heroWarnTxt">
            {`${pendingPrereqs} prerrequisito${pendingPrereqs === 1 ? "" : "s"} pendiente${pendingPrereqs === 1 ? "" : "s"}`}
          </span>
        </button>
        <div className="hero-pct" id="heroPct">{pct + "%"}</div>
        <div className="bar-outer"><div className="bar-fill" id="heroFill" style={{ width: pct + "%" }}></div></div>
        <div className="hero-stats">
          <span><b id="statDone">{done}</b>/100 pasos completados</span>
          <span className="sep">·</span>
          <span>Siguiente: <b id="statNext">{next ? "Paso " + next : "—"}</b></span>
        </div>
      </div>
    </section>
  );
}
