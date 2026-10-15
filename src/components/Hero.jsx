import { Fragment, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";
import { STEPS } from "../data/steps.js";
import {
  doneCount, isMobile, nextPending, progressPct, rowHave, selectStep, useAppState,
} from "../state/store.js";
import { BRAND_ICON, CALL_ICONS, DOFUS_ROAD, HERO_BG, ZONE_IMG, imgUrl } from "../lib/assets.js";
import { MAP_IMG_HD, questsOf } from "../lib/quests.js";
import { rowsOf } from "../lib/resources.js";
import { bannerFigure, doneIcon, startMap, stepCalls, stepTitle } from "../lib/journal.js";
import { prefersReducedMotion } from "../lib/motion.js";
import Banner from "./Banner.jsx";

// Partículas del ambiente: luciérnagas de noche, hojas que caen de día.
// Posiciones y ritmos fijos (no aleatorios) para que el render sea estable.
const FX = [
  [6, 0, 11, 6], [14, 3.2, 14, 4], [23, 7.1, 12, 7], [31, 1.4, 16, 5], [39, 5.6, 13, 4],
  [47, 9.3, 15, 6], [56, 2.5, 12, 5], [63, 6.4, 17, 7], [71, 0.8, 14, 4], [78, 4.7, 11, 6],
  [85, 8.2, 16, 5], [92, 3.9, 13, 7], [18, 10.5, 15, 4], [68, 11.6, 14, 5],
];

// Parallax: el mapa baja a este ritmo respecto al scroll (0 = fijo con la página)
const PARALLAX = 0.35;

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

// Los avisos de la guía que valen para el hero: dónde parar (rojo) o lo que se resuelve (verde)
const CALL_LABEL = { stop: "Hasta dónde llegar", done: "Lo que se resuelve" };

/**
 * El paso en una línea, con lo que sale barato: su zona, dónde empieza y, si ya cargaron
 * las misiones, cuántas son; y los objetos que aún hay que reunir para él.
 */
function stepFacts(s, step, fig) {
  const quests = s.questsLoaded ? questsOf(step.n) : null;
  const st = quests?.[0]?.st;
  const facts = [step.zone];
  if (st?.cls) facts.push("Empieza en el templo de tu clase");
  // El PNJ solo si no es ya la figura del estandarte
  else if (st?.npc && st.npc !== fig?.name) facts.push(`Empieza con ${st.npc}${st.a ? ` en ${st.a}` : ""}`);
  else if (st?.a) facts.push(`Empieza en ${st.a}`);
  if (quests?.length) facts.push(`${quests.length} ${quests.length === 1 ? "misión" : "misiones"}`);
  const left = rowsOf(step.n).filter(row => !rowHave(s, row, [step.n])).length;
  if (left) facts.push(`${left} ${left === 1 ? "objeto" : "objetos"} que reunir`);
  return facts;
}

/**
 * El siguiente paso: su estandarte (el mismo que su detalle) y, al lado, su título, lo
 * que pide, su primer aviso de la guía y «Continuar». El que se va en el fundido no
 * lleva ids ni se puede pulsar.
 */
function HeroStep({ s, step }) {
  const live = useIsPresent();
  const fig = bannerFigure(step.n);
  const call = stepCalls(step).find(([kind]) => CALL_LABEL[kind]);
  const icon = call && (call[0] === "done" ? doneIcon(step.n) : CALL_ICONS.stop);
  return (
    <div className="hero-step-in" id={live ? "heroNext" : undefined} inert={!live}>
      <Banner step={step} className="hero-banner" />
      <div className="hero-step-copy">
        <h2 className="hero-step-title">{stepTitle(step)}</h2>
        <p className="hero-step-meta">
          {stepFacts(s, step, fig).map((fact, i) => <Fragment key={i}>{i > 0 && " "}<span>{fact}</span></Fragment>)}
        </p>
        {call && (
          <p className={`hero-call ${call[0]}`} title={call[1]}>
            {icon && <img src={imgUrl(icon)} alt="" />}
            <b>{CALL_LABEL[call[0]]}:</b> {call[1]}
          </p>
        )}
        <button type="button" className="hero-next-go" id={live ? "heroNextGo" : undefined} onClick={() => goToStep(step.n)}>
          Continuar con el paso {step.n} →
        </button>
      </div>
    </div>
  );
}

// El fundido entre un paso y el siguiente (y entre sus mapas): el que llega sube un poco
const EASE_OUT = [0.2, 0.8, 0.2, 1];
const swap = still => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: still ? 0 : 0.5, ease: EASE_OUT, delay: still ? 0 : 0.12 } },
  exit: { opacity: 0, y: -6, transition: { duration: still ? 0 : 0.28, ease: "easeIn" } },
});
const fade = still => ({
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: still ? 0 : 0.7, ease: "easeOut" } },
  exit: { opacity: 0, transition: { duration: still ? 0 : 0.7, ease: "easeIn" } },
});

/**
 * HERO: el siguiente paso, en grande, sobre el mapa del juego donde empieza; a la
 * derecha, el huevo como progreso. Con la guía terminada, el título y el huevo obtenido.
 */
export default function Hero() {
  const s = useAppState();
  const pct = progressPct(s);
  const done = doneCount(s);
  const next = nextPending(s);
  const nextStep = next ? STEPS[next - 1] : null;
  const obtained = pct >= 100;
  const stage = eggStage(s);
  const morph = useMorph(stage);
  const still = useReducedMotion();
  // Fondo: el mapa (grande) donde empieza el siguiente paso; si no carga, el paisaje de su
  // zona y, por debajo, el mapa del tema. Sin siguiente paso, el del tema: el claro es un
  // bosque de día, que se lee sin velo encima
  const map = next && startMap(next);
  const zone = nextStep && ZONE_IMG[nextStep.zone];
  const themeMap = HERO_BG?.[s.theme];
  const bg = [map && `url("${MAP_IMG_HD}${map}.jpg")`, zone && `url("${imgUrl(zone.img)}")`,
    themeMap && `url("${imgUrl(themeMap)}")`].filter(Boolean).join(", ");

  const heroRef = useRef(null);
  const bgRef = useRef(null);

  // Parallax del mapa, solo mientras el hero está a la vista y sin movimiento reducido
  useEffect(() => {
    const bgEl = bgRef.current;
    let frame = 0;
    const update = () => {
      frame = 0;
      if (prefersReducedMotion()) { bgEl.style.transform = ""; return; }
      const y = Math.min(window.scrollY, heroRef.current.offsetHeight);
      bgEl.style.transform = `translate3d(0, ${y * PARALLAX}px, 0) scale(1.08)`;
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(frame); };
  }, []);

  return (
    <section className={"hero" + (nextStep ? "" : " is-complete")} aria-label="Progreso global" ref={heroRef}>
      {/* Lo casi negro de los mapas (el vacío alrededor de la sala), transparente */}
      <svg className="hero-defs" aria-hidden="true" focusable="false">
        <filter id="heroKnockout" colorInterpolationFilters="sRGB">
          <feColorMatrix values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  6 6 6 0 -0.3" />
        </filter>
      </svg>
      <div className="hero-bg" ref={bgRef} aria-hidden="true">
        <AnimatePresence initial={false}>
          {bg && <motion.div key={bg} className="hero-bg-img" style={{ backgroundImage: bg }} {...fade(still)} />}
        </AnimatePresence>
      </div>
      <div className="hero-veil" aria-hidden="true"></div>
      <div className="hero-fx" aria-hidden="true">
        {FX.map(([x, delay, dur, size], i) => (
          <i key={i} style={{ "--x": `${x}%`, "--d": `${delay}s`, "--t": `${dur}s`, "--s": `${size}px` }}></i>
        ))}
      </div>

      <div className="hero-inner">
        {nextStep ? (
          <div className="hero-main">
            {/* El título de la página, pequeño: la antesala del paso */}
            <div className="hero-eyebrow">
              <h1>Checklist del Dofus Silvestre</h1>
              <span aria-hidden="true">·</span>
              <span>siguiente paso</span>
            </div>
            <div className="hero-stage">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div key={next} className="hero-step" {...swap(still)}>
                  <HeroStep s={s} step={nextStep} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          // Con la guía terminada ya no hay siguiente paso: el título y el huevo obtenido
          <div className="hero-copy">
            <p className="hero-eyebrow">Guía de Sandglass</p>
            <h1 className="hero-title">Checklist del Dofus <span className="hl">Silvestre</span></h1>
            <p className="hero-sub">Los 100 pasos para obtener el Dofus Silvestre en el orden más eficiente, con las misiones, jefes de mazmorra y objetos que vas a necesitar.</p>
          </div>
        )}

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
                No todos los pasos valen lo mismo: cuentan más los que tienen misiones de más
                nivel y más largas. Por eso el porcentaje no es pasos hechos entre 100. Las misiones
                que terminas ya suman, aunque no hayas marcado su paso.
              </span>
            </span>
            <small>{obtained ? "¡Obtenido!" : "Obtención"} · <b id="statDone">{done}</b>/{STEPS.length} pasos</small>
          </div>
        </div>
      </div>
    </section>
  );
}
