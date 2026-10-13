import { useEffect, useRef, useState } from "react";
import { ALL_PREREQS, STEPS } from "../data/steps.js";
import {
  doneCount, isMobile, nextPending, prereqsDone, prereqsPending, progressPct, selectStep,
  setPrereqsOpen, useAppState,
} from "../state/store.js";
import { BRAND_ICON, EASTER_ICONS, HERO_BG, HERO_ICONS, ITEMS, assetsFor, imgUrl } from "../lib/assets.js";
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

// Guiño Xelor: duración del rebobinado (baja a 0 y vuelve) y de la nota
const REWIND_MS = 1400;
const XELOR_NOTE_MS = 5000;
const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

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

function openShop() {
  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
  const totalItems = Object.keys(ITEMS).length;
  const next = nextPending(s);
  const nextStep = next ? STEPS[next - 1] : null;
  const nextIcon = next ? assetsFor(next)?.icon : null;
  const obtained = pct >= 100;
  // Un mapa por tema: el claro es un bosque de día, que se lee sin velo encima
  const heroMap = HERO_BG?.[s.theme] ?? null;

  const heroRef = useRef(null);
  const bgRef = useRef(null);

  // Guiño Xelor: Sandglass juega Xelor, la clase del tiempo, así que su nombre rebobina el progreso
  const [rewindPct, setRewindPct] = useState(null);   // porcentaje mostrado durante el rebobinado
  const [xelorNote, setXelorNote] = useState(false);
  const rewindFrame = useRef(0);
  const noteTimer = useRef(0);
  const shownPct = rewindPct ?? pct;

  useEffect(() => () => { cancelAnimationFrame(rewindFrame.current); clearTimeout(noteTimer.current); }, []);

  function rewindTime() {
    setXelorNote(true);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setXelorNote(false), XELOR_NOTE_MS);
    if (prefersReducedMotion() || rewindFrame.current) return;
    const start = performance.now();
    const tick = now => {
      const t = Math.min((now - start) / REWIND_MS, 1);
      // Primera mitad: el tiempo retrocede hasta 0. Segunda: vuelve a donde estaba
      const k = t < 0.5 ? 1 - easeInOut(t * 2) : easeInOut((t - 0.5) * 2);
      if (t < 1) {
        setRewindPct(Math.round(pct * k * 10) / 10);
        rewindFrame.current = requestAnimationFrame(tick);
      } else {
        rewindFrame.current = 0;
        setRewindPct(null);
      }
    };
    rewindFrame.current = requestAnimationFrame(tick);
  }

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
    <section className={"hero" + (rewindPct !== null ? " rewind" : "")} aria-label="Progreso global" ref={heroRef}
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
          <p className="hero-eyebrow">
            Guía de{" "}
            <span className="sandglass">
              <button type="button" id="sandglassEgg" onClick={rewindTime}>Sandglass</button>
              <span className={"xelor-note" + (xelorNote ? " open" : "")} id="sandglassNote" role="status">
                {xelorNote && (
                  <>
                    {EASTER_ICONS?.xelor && <img src={imgUrl(EASTER_ICONS.xelor)} alt="" />}
                    <span>Sandglass, Xelor de pura cepa. El tiempo está de su lado.</span>
                  </>
                )}
              </span>
            </span>
          </p>
          <h1 className="hero-title">Checklist del Dofus <span className="hl">Silvestre</span></h1>
          <p className="hero-sub">Los 100 pasos para obtener el Dofus Silvestre en el orden más eficiente, con las misiones, jefes de mazmorra y objetos que vas a necesitar.</p>

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

          {/* Requisitos del Dofus: van aparte de los pasos, que son el progreso */}
          <div className="hero-reqs" role="group" aria-labelledby="heroReqsTitle">
            <p className="hero-reqs-title" id="heroReqsTitle">Lo que necesitas</p>
            <div className="hero-reqs-grid">
              <button className={"hero-req" + (pendingPrereqs > 0 ? " warn" : "")} id="heroWarn" onClick={openPrereqs}
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
              <button className="hero-req" id="heroItems" onClick={openShop}
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
        </div>

        <div className="hero-visual">
          <div className={"hero-egg" + (obtained ? " obtained" : "")} style={{ "--p": shownPct }} aria-hidden="true">
            <div className="egg-ring"></div>
            <div className="egg-glow"></div>
            {BRAND_ICON && (
              <div className="egg-body">
                <img className="egg-off" src={imgUrl(BRAND_ICON)} alt="" />
                <img className="egg-on" src={imgUrl(BRAND_ICON)} alt="" />
              </div>
            )}
          </div>
          <div className="egg-pct">
            <span className="egg-pct-row">
              <b id="heroPct">{shownPct}%</b>
              <button type="button" className="pct-info" id="pctInfo" aria-describedby="pctNote"
                aria-label="Cómo se calcula el porcentaje">i</button>
              <span className="pct-note" id="pctNote" role="tooltip">
                Ponderado por esfuerzo: un logro completo cuenta más que una misión corta,
                así que el porcentaje no es solo pasos hechos entre 100.
              </span>
            </span>
            <small>{obtained ? "¡Obtenido!" : "Obtención"} · <b id="statDone">{done}</b>/{STEPS.length} pasos</small>
          </div>
        </div>
      </div>
    </section>
  );
}
