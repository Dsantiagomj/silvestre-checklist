import { useEffect, useRef } from "react";
import { ALL_PREREQS, STEPS } from "../data/steps.js";
import {
  doneCount, isMobile, nextPending, prereqsDone, prereqsPending, progressPct, selectStep,
  setPrereqsOpen, useAppState,
} from "../state/store.js";
import { BRAND_ICON, HERO_BG, HERO_ICONS, ITEMS, assetsFor, imgUrl } from "../lib/assets.js";
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

function openPrereqs() {
  setPrereqsOpen(true, false);
  document.getElementById("prereqs")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function goToStep(n) {
  selectStep(n);
  // En escritorio el detalle vive junto al tablero; en móvil sube la hoja inferior
  if (!isMobile()) document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** HERO inmersivo: mapa a pantalla completa con parallax, el huevo como progreso */
export default function Hero() {
  const s = useAppState();
  const pct = progressPct(s);
  const done = doneCount(s);
  const pendingPrereqs = prereqsPending(s);
  const owned = Object.keys(s.owned).filter(id => ITEMS[id]).length;
  const next = nextPending(s);
  const nextStep = next ? STEPS[next - 1] : null;
  const nextIcon = next ? assetsFor(next)?.icon : null;
  const hatched = pct >= 100;
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
          <p className="hero-eyebrow">Guía de Sandglass · 100 pasos</p>
          <h1 className="hero-title">Checklist del Dofus <span className="hl">Silvestre</span></h1>
          <p className="hero-sub">Progreso ponderado por esfuerzo, los objetos que vas a necesitar y un overlay que se queda encima del juego.</p>

          <div className="hero-stats">
            <span className="hero-stat">
              {BRAND_ICON && <img src={imgUrl(BRAND_ICON)} alt="" />}
              <span><b id="statDone">{done}</b>/{STEPS.length} pasos</span>
            </span>
            <button className={"hero-stat" + (pendingPrereqs > 0 ? " warn" : "")} id="heroWarn" onClick={openPrereqs}
              aria-label={pendingPrereqs > 0
                ? `${pendingPrereqs} prerrequisitos pendientes. Ver prerrequisitos`
                : "Prerrequisitos completos. Ver prerrequisitos"}>
              {HERO_ICONS?.prereqs && <img src={imgUrl(HERO_ICONS.prereqs)} alt="" />}
              <span><b id="statPre">{prereqsDone(s)}</b>/{ALL_PREREQS.length} prerrequisitos</span>
            </button>
            <span className="hero-stat">
              {HERO_ICONS?.items && <img src={imgUrl(HERO_ICONS.items)} alt="" />}
              <span><b id="statOwned">{owned}</b>/{Object.keys(ITEMS).length} objetos</span>
            </span>
          </div>

          <div className="hero-next" id="heroNext">
            {nextStep ? (
              <>
                <div className="hero-next-art">
                  {nextIcon ? <img src={imgUrl(nextIcon.src)} alt="" /> : <b>{next}</b>}
                </div>
                <div className="hero-next-meta">
                  <p className="hero-next-kicker">Siguiente · Paso {next}</p>
                  <p className="hero-next-name">{stepTitle(nextStep)}</p>
                  <p className="hero-next-sub">{[nextStep.zone, stepScope(nextStep)].filter(Boolean).join(" · ")}</p>
                </div>
                <button className="hero-next-go" id="heroNextGo" onClick={() => goToStep(next)}>Continuar →</button>
              </>
            ) : (
              <div className="hero-next-meta">
                <p className="hero-next-kicker">Checklist completado</p>
                <p className="hero-next-name">Los 100 pasos del Dofus Silvestre</p>
              </div>
            )}
          </div>
        </div>

        <div className="hero-visual">
          <div className={"hero-egg" + (hatched ? " hatched" : "")} style={{ "--p": pct }} aria-hidden="true">
            <div className="egg-ring"></div>
            <div className="egg-glow"></div>
            {BRAND_ICON && (
              <div className="egg-body">
                <img className="egg-off" src={imgUrl(BRAND_ICON)} alt="" />
                <img className="egg-on" src={imgUrl(BRAND_ICON)} alt="" />
              </div>
            )}
          </div>
          <p className="egg-pct">
            <b id="heroPct">{pct}%</b>
            <small>{hatched ? "¡Eclosionado!" : "Eclosión"}</small>
          </p>
        </div>
      </div>
    </section>
  );
}
