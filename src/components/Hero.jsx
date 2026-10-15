import { useEffect, useRef, useState } from "react";
import { ALL_PREREQS, STEPS } from "../data/steps.js";
import {
  doneCount, isMobile, nextPending, ownedCount, prereqsDone, prereqsPending, progressPct, selectStep,
  openNeeds, useAppState,
} from "../state/store.js";
import { BRAND_ICON, DOFUS_ROAD, HERO_BG, HERO_ICONS, assetsFor, imgUrl } from "../lib/assets.js";
import { ALL_ROWS } from "../lib/resources.js";
import { prefersReducedMotion } from "../lib/motion.js";

// Partículas del ambiente: luciérnagas de noche, hojas que caen de día.
// Posiciones y ritmos fijos (no aleatorios) para que el render sea estable.
const FX = [
  [6, 0, 11, 6], [14, 3.2, 14, 4], [23, 7.1, 12, 7], [31, 1.4, 16, 5], [39, 5.6, 13, 4],
  [47, 9.3, 15, 6], [56, 2.5, 12, 5], [63, 6.4, 17, 7], [71, 0.8, 14, 4], [78, 4.7, 11, 6],
  [85, 8.2, 16, 5], [92, 3.9, 13, 7], [18, 10.5, 15, 4], [68, 11.6, 14, 5],
];

// Parallax: el mapa baja a este ritmo respecto al scroll (0 = fijo con la página)
const PARALLAX = 0.35;

/** Nombre corto de un paso: lo primero entrecomillado del texto de Sandglass. */
function stepTitle(step) {
  const quoted = step.text.match(/["«]([^"»]+)["»]/);
  return quoted ? quoted[1].replace(/[.\s]+$/, "") : step.zone;
}

/** "hasta la misión 7" si el paso solo cubre parte de un logro. */
function stepScope(step) {
  const m = step.text.match(/hasta (?:llegar a )?la misi[oó]n (\d+)/i);
  return m ? `hasta la misión ${m[1]}` : null;
}

function goToStep(n) {
  selectStep(n);
  // En escritorio el detalle vive junto al tablero; en móvil sube la hoja inferior
  if (!isMobile()) document.getElementById("diary")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// La Piñata de pino: la da el paso 99 y es la que se convierte en el Dofus Silvestre
const PINATA = DOFUS_ROAD.find(d => d.step === 99);
// Lo que dura la transformación (egg-morph-* en el CSS): subir al hero y convertirse
const MORPH_MS = 3400;

/**
 * El huevo del anillo: el Silvestre apagado hasta el final; con el paso 99 hecho, la
 * Piñata de pino; con el 100, el Silvestre encendido.
 */
const eggStage = s => (s.done[100] ? "silvestre" : s.done[99] && PINATA ? "pinata" : "off");

// Las dos transformaciones: al marcar el 99, el Silvestre apagado se vuelve la Piñata de
// pino; al marcar el 100, la Piñata se vuelve el Silvestre encendido
const MORPHS = { "off>pinata": "off", "pinata>silvestre": "pinata" };

/**
 * Al pasar de una etapa a la siguiente marcando el paso, sube al hero y transforma el
 * huevo. Devuelve la etapa de la que viene mientras dura, o null. Solo en ese momento:
 * al recargar, el huevo ya sale como corresponde.
 */
function useMorph(stage) {
  const [from, setFrom] = useState(null);
  const prev = useRef(stage);
  useEffect(() => {
    const was = MORPHS[`${prev.current}>${stage}`];
    prev.current = stage;
    if (!was) return;
    const still = prefersReducedMotion();
    window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    if (still) return;
    setFrom(was);
    const t = setTimeout(() => setFrom(null), MORPH_MS);
    return () => { clearTimeout(t); setFrom(null); };
  }, [stage]);
  return from;
}

/** HERO inmersivo: mapa a pantalla completa con parallax, el huevo como progreso */
export default function Hero() {
  const s = useAppState();
  const pct = progressPct(s);
  const done = doneCount(s);
  const pendingPrereqs = prereqsPending(s);
  const owned = ownedCount(s);
  const totalItems = ALL_ROWS.length;
  const next = nextPending(s);
  const nextStep = next ? STEPS[next - 1] : null;
  const nextIcon = next ? assetsFor(next)?.icon : null;
  const obtained = pct >= 100;
  const stage = eggStage(s);
  const morph = useMorph(stage);
  // Un mapa por tema: el claro es un bosque de día, que se lee sin velo encima
  const heroMap = HERO_BG?.[s.theme] ?? null;

  const heroRef = useRef(null);
  const bgRef = useRef(null);

  // Parallax del mapa, solo mientras el hero está a la vista y sin movimiento reducido
  useEffect(() => {
    const bg = bgRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (prefersReducedMotion()) { bg.style.transform = ""; return; }
      const y = Math.min(window.scrollY, heroRef.current.offsetHeight);
      bg.style.transform = `translate3d(0, ${y * PARALLAX}px, 0) scale(1.08)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  return (
    <section className="hero" aria-label="Progreso global" ref={heroRef}
      style={heroMap ? { "--hero-bg": `url("${imgUrl(heroMap)}")` } : undefined}>
      <div className="hero-bg" ref={bgRef} aria-hidden="true"></div>
      <div className="hero-veil" aria-hidden="true"></div>
      <div className="hero-fx" aria-hidden="true">
        {FX.map(([x, delay, dur, size], i) => (
          <i key={i} style={{ "--x": `${x}%`, "--d": `${delay}s`, "--t": `${dur}s`, "--s": `${size}px` }}></i>
        ))}
      </div>

      <div className="hero-inner">
        <div className="hero-copy">
          <p className="hero-eyebrow">Guía de Sandglass</p>
          <h1 className="hero-title">Checklist del Dofus <span className="hl">Silvestre</span></h1>
          <p className="hero-sub">Los 100 pasos para obtener el Dofus Silvestre en el orden más eficiente, con las misiones, jefes de mazmorra y objetos que vas a necesitar.</p>

          {/* Con la guía terminada ya no hay siguiente paso ni nada que reunir: el hero se
              queda con el título y el huevo obtenido */}
          {nextStep && (
            <>
              <div className="hero-next" id="heroNext">
                <div className="hero-next-art">
                  {nextIcon ? <img src={imgUrl(nextIcon.src)} alt="" /> : <b>{next}</b>}
                </div>
                <div className="hero-next-meta">
                  <p className="hero-next-kicker">Siguiente · Paso {next}</p>
                  <p className="hero-next-name">{stepTitle(nextStep)}</p>
                  <p className="hero-next-sub">{[nextStep.zone, stepScope(nextStep)].filter(Boolean).join(" · ")}</p>
                </div>
                <button className="hero-next-go" id="heroNextGo" onClick={() => goToStep(next)}>Continuar →</button>
              </div>

              {/* Requisitos del Dofus: van aparte de los pasos, que son el progreso */}
              <div className="hero-reqs" role="group" aria-labelledby="heroReqsTitle">
                <p className="hero-reqs-title" id="heroReqsTitle">Lo que necesitas</p>
                <div className="hero-reqs-grid">
                  <button className={"hero-req" + (pendingPrereqs === 0 ? " complete" : "")} id="heroWarn" onClick={() => openNeeds("prereqs")}
                    aria-label={pendingPrereqs > 0
                      ? `Prerrequisitos: ${prereqsDone(s)} de ${ALL_PREREQS.length}, ${pendingPrereqs} pendientes. Ver prerrequisitos`
                      : "Prerrequisitos completos. Ver prerrequisitos"}>
                    {HERO_ICONS?.prereqs && <img src={imgUrl(HERO_ICONS.prereqs)} alt="" />}
                    <span className="hero-req-meta">
                      <span className="hero-req-name">Prerrequisitos</span>
                      <span className="hero-req-count"><b id="statPre">{prereqsDone(s)}</b>/{ALL_PREREQS.length}</span>
                    </span>
                    <span className="hero-req-bar"><i style={{ width: `${(prereqsDone(s) / ALL_PREREQS.length) * 100}%` }}></i></span>
                  </button>
                  <button className={"hero-req" + (owned === totalItems ? " complete" : "")} id="heroItems" onClick={() => openNeeds("items")}
                    aria-label={`Objetos necesarios: ${owned} de ${totalItems} conseguidos. Ver objetos`}>
                    {HERO_ICONS?.items && <img src={imgUrl(HERO_ICONS.items)} alt="" />}
                    <span className="hero-req-meta">
                      <span className="hero-req-name">Objetos necesarios</span>
                      <span className="hero-req-count"><b id="statOwned">{owned}</b>/{totalItems}</span>
                    </span>
                    <span className="hero-req-bar"><i style={{ width: `${(owned / totalItems) * 100}%` }}></i></span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hero-visual">
          <div className={"hero-egg" + (obtained ? " obtained" : "") + (morph ? " morphing" : "")} data-stage={stage}
            style={{ "--p": pct }} aria-hidden="true">
            <div className="egg-ring"></div>
            <div className="egg-glow"></div>
            {BRAND_ICON && (
              <div className="egg-body">
                {stage === "off" && <img className="egg-off" src={imgUrl(BRAND_ICON)} alt="" />}
                {morph === "off" && <img className="egg-from is-off" src={imgUrl(BRAND_ICON)} alt="" />}
                {morph === "pinata" && <img className="egg-from" src={imgUrl(PINATA.img)} alt="" />}
                {stage === "pinata" && <img className="egg-on" src={imgUrl(PINATA.img)} alt="" />}
                {stage === "silvestre" && <img className="egg-on" src={imgUrl(BRAND_ICON)} alt="" />}
                {morph && <i className="egg-flash"></i>}
              </div>
            )}
          </div>
          <div className="egg-pct">
            <span className="egg-pct-row">
              <b id="heroPct">{pct}%</b>
              <button type="button" className="pct-info" id="pctInfo" aria-describedby="pctNote"
                aria-label="Cómo se calcula el porcentaje">i</button>
              <span className="pct-note" id="pctNote" role="tooltip">
                Cada paso vale según el nivel de sus misiones: una de nivel 200 cuenta cien veces
                más que una de nivel 2, y la que sale en varios pasos se reparte entre ellos. Por
                eso el porcentaje no es solo pasos hechos entre 100.
              </span>
            </span>
            <small>{obtained ? "¡Obtenido!" : "Obtención"} · <b id="statDone">{done}</b>/{STEPS.length} pasos</small>
          </div>
        </div>
      </div>
    </section>
  );
}
