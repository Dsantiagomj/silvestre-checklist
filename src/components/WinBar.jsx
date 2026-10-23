import { useLayoutEffect, useRef, useState } from "react";
import { STEPS } from "../data/steps.js";
import { BRAND_ICON, DOFUS_ROAD, HEADER_ICONS, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion, restartClass } from "../lib/motion.js";
import { useDismiss } from "../lib/useDismiss.js";
import { doneCount, goToNextPending, nextPending, progressPct, selectStep } from "../state/store.js";
import ThemeSwitch from "./ThemeSwitch.jsx";
import { openNota } from "./Nota.jsx";
import WinStrip from "./WinStrip.jsx";

/** Icono de botón sacado de un objeto del juego; sin datos, cae al glifo de siempre. */
function GameIcon({ path, fallback, kind }) {
  if (!path) return <span aria-hidden="true">{fallback}</span>;
  return <img className="btn-icon" data-kind={kind} src={imgUrl(path)} alt="" />;
}

// La Piñata de pino: la da el paso 99 y es la que se convierte en el Dofus Silvestre
const PINATA = DOFUS_ROAD.find(d => d.step === 99);

/**
 * El huevo del anillo: el Silvestre apagado hasta el final; con el paso 99 hecho, la
 * Piñata de pino; con el 100, el Silvestre encendido.
 */
const eggStage = s => (s.done[100] ? "silvestre" : s.done[99] && PINATA ? "pinata" : "off");

/**
 * El progreso en pequeño, al principio de la barra: el anillo con el huevo del Silvestre
 * (o la Piñata), el porcentaje ponderado con su nota y cuántos pasos van hechos.
 */
function WinProgress({ s }) {
  const pct = progressPct(s);
  const obtained = pct >= 100;
  const stage = eggStage(s);
  const egg = stage === "pinata" ? PINATA.img : BRAND_ICON;
  return (
    <div className={"win-progress" + (obtained ? " obtained" : "")} id="winProgress">
      <span className="win-ring" data-stage={stage} style={{ "--p": pct }} aria-hidden="true">
        {egg && <img src={imgUrl(egg)} alt="" />}
      </span>
      <span className="win-progress-txt">
        <span className="win-pct-row">
          <b className="win-pct" id="winPct">{pct}%</b>
          <button type="button" className="pct-info" id="pctInfo" aria-describedby="pctNote"
            aria-label="Cómo se calcula el porcentaje">i</button>
          <span className="pct-note" id="pctNote" role="tooltip">
            No todos los pasos valen lo mismo: cuentan más los que tienen misiones de más
            nivel y más largas.
          </span>
        </span>
        <small className="win-done">
          {obtained && <span className="win-got">¡Obtenido! · </span>}
          <b id="winDone">{doneCount(s)}</b>/{STEPS.length}<span className="win-done-unit"> pasos</span>
        </small>
      </span>
    </div>
  );
}

/**
 * Los huevos que se ven en el botón, tres: los dos últimos conseguidos y el siguiente
 * que falta (sin conseguidos, los tres primeros; con todos, los tres últimos).
 */
function miniEggs(s) {
  const got = DOFUS_ROAD.filter(d => s.done[d.step]);
  const rest = DOFUS_ROAD.filter(d => !s.done[d.step]);
  const last = got.slice(-(rest.length ? 2 : 3));
  return [...last, ...rest.slice(0, 3 - last.length)];
}

/**
 * Al conseguir un Dofus del camino (al marcar su paso, nunca al cargar), su huevo se
 * enciende con un destello y un rebote, en el botón y en el desplegable si está abierto,
 * y la cuenta sube de un salto. Desmarcarlo solo lo apaga. Con movimiento reducido
 * cambia sin más (el aviso lo da el store).
 */
function useDofusWon(boxRef, countRef, won) {
  const seen = useRef(won.seq);
  useLayoutEffect(() => {
    if (seen.current === won.seq) return;
    seen.current = won.seq;
    if (prefersReducedMotion()) return;
    for (const n of won.steps) {
      for (const egg of boxRef.current.querySelectorAll(`[data-step="${n}"]`)) restartClass(egg, "won");
    }
    restartClass(countRef.current, "tick");
  }, [won.seq]); // eslint-disable-line react-hooks/exhaustive-deps
}

const endWon = e => { if (e.animationName === "egg-won") e.currentTarget.classList.remove("won"); };

/**
 * Los Dofus que da la guía antes del Silvestre (cada uno se consigue en el paso que
 * completa su logro), en pequeño: unos huevos y la cuenta. Al pulsarlo se despliegan los
 * doce; pulsar uno abre su paso.
 */
function RoadMenu({ s }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  const countRef = useRef(null);
  const got = DOFUS_ROAD.filter(d => s.done[d.step]).length;
  useDofusWon(boxRef, countRef, s.dofusWon);
  useDismiss(open, () => setOpen(false), boxRef);
  const pick = n => { setOpen(false); selectStep(n); };
  return (
    <div className="road-menu bar-menu" ref={boxRef}>
      <button type="button" className="road-btn" id="roadBtn" ref={btnRef} aria-expanded={open} aria-controls="winRoad"
        aria-label={`Dofus del camino: ${got} de ${DOFUS_ROAD.length}`} title="Dofus del camino" onClick={() => setOpen(o => !o)}>
        <span className="road-minis" aria-hidden="true">
          {miniEggs(s).map(d => (
            <span key={d.name} className={"road-mini" + (s.done[d.step] ? " obtained" : "")} data-step={d.step}
              style={{ "--egg": `url(${imgUrl(d.img)})` }} onAnimationEnd={endWon}>
              <img src={imgUrl(d.img)} alt="" />
            </span>
          ))}
        </span>
        <b className="road-count" ref={countRef}>{got}/{DOFUS_ROAD.length}</b>
      </button>
      {open && (
        <div className="bar-pop road-pop" id="winRoad" role="group" aria-labelledby="roadTitle">
          <p className="road-head">
            <span className="road-title" id="roadTitle">Dofus del camino</span>
            <b className="road-total">{got}/{DOFUS_ROAD.length}</b>
          </p>
          <ul className="road-list">
            {DOFUS_ROAD.map(d => {
              const ok = !!s.done[d.step];
              // Pulsar uno abre su paso: es donde se consigue. "won" solo dura la celebración
              return (
                <li key={d.name}>
                  <button type="button" className={"road-dofus" + (ok ? " obtained" : "")} data-step={d.step}
                    title={`${d.name} · paso ${d.step}`} style={{ "--egg": `url(${imgUrl(d.img)})` }}
                    aria-label={`${d.name}, paso ${d.step}${ok ? ", conseguido" : ""}`} onClick={() => pick(d.step)}
                    onAnimationEnd={endWon}>
                    <img src={imgUrl(d.img)} alt="" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** «Siguiente: N ›»: abre el siguiente pendiente. Con la guía terminada, apagado. */
function NextButton({ s }) {
  const next = nextPending(s);
  return (
    <button type="button" className="diary-next" id="diaryNext" disabled={next == null} onClick={goToNextPending}>
      {next != null ? <>Siguiente: <b>{next}</b> <span aria-hidden="true">›</span></> : "Guía completa"}
    </button>
  );
}

/**
 * El menú «⋯» del final de la barra: el tema, qué significan las pausas y el reinicio
 * (con la copia de seguridad dentro de su diálogo). Cambiar el tema deja el menú abierto
 * para poder volver; lo demás lo cierra.
 */
function MoreMenu({ onReset }) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const btnRef = useRef(null);
  // Al cerrarse con el foco dentro, vuelve al botón
  const close = () => {
    if (boxRef.current?.contains(boxRef.current.getRootNode().activeElement)) btnRef.current?.focus();
    setOpen(false);
  };
  useDismiss(open, close, boxRef);
  const then = fn => () => { setOpen(false); fn(); };
  return (
    <div className="more-menu bar-menu" ref={boxRef}>
      <button type="button" className="bar-icon-btn more-btn" id="moreBtn" ref={btnRef} aria-expanded={open} aria-controls="moreMenu"
        aria-label="Más opciones" title="Más opciones" onClick={() => setOpen(o => !o)}>
        <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="4" cy="10" r="1.8" /><circle cx="10" cy="10" r="1.8" /><circle cx="16" cy="10" r="1.8" /></svg>
      </button>
      {open && (
        <div className="bar-pop more-pop" id="moreMenu" role="group" aria-label="Más opciones">
          <div className="more-item more-theme">
            <span className="more-label">Tema</span>
            <ThemeSwitch />
          </div>
          <button type="button" className="more-item" id="notaOpen" onClick={then(openNota)}>
            <span className="more-ic" aria-hidden="true">i</span>
            <span className="more-label">Qué es «hasta tener que pasar»</span>
          </button>
          <button type="button" className="more-item danger" id="resetBtn" aria-label="Reiniciar progreso" onClick={then(onReset)}>
            <GameIcon path={HEADER_ICONS?.reset} fallback="↺" kind="hourglass" />
            <span className="more-label">Reiniciar</span>
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * La barra de la ventana de los pasos, pegada arriba bajo la cabecera fija de la página
 * que aloja la app (--silvestre-top). En pantalla baja, una sola fila (dos o tres si no
 * cabe): el progreso, los Dofus del camino y «Siguiente»; las pestañas y sus
 * herramientas; el overlay y el menú «⋯». En pantalla alta (lib/screen.js), dos: la
 * franja de los Dofus del camino de siempre (WinStrip) y, debajo, las pestañas, el
 * buscador entero, la zona, el overlay y el menú.
 */
export default function WinBar({ s, tall, tabs, tools, onOverlay, onReset }) {
  return (
    <div className={"win-bar" + (tall ? " is-tall" : "")} id="winBar">
      {tall && <WinStrip s={s} />}
      <div className="win-bar-in">
        {!tall && (
          <div className="win-bar-status">
            <WinProgress s={s} />
            <RoadMenu s={s} />
            <NextButton s={s} />
          </div>
        )}
        <div className="win-bar-views">
          {tabs}
          {tools}
        </div>
        <div className="win-bar-end">
          <button type="button" className="icon-btn primary has-icon" id="overlayBtn" aria-label="Abrir overlay sobre el juego" onClick={onOverlay}>
            <GameIcon path={HEADER_ICONS?.overlay} fallback="⧉" kind="spyglass" />
            <span className="lbl">Overlay</span>
          </button>
          <MoreMenu onReset={onReset} />
        </div>
      </div>
    </div>
  );
}
