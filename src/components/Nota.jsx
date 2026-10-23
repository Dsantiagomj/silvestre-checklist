import { useEffect, useRef, useState } from "react";
import { STEPS } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion } from "../lib/motion.js";
import { setSearch, showStepsWindow } from "../state/store.js";
import { appRoot } from "../lib/root.js";

// La instrucción que explica la nota, tal como la escribe Sandglass en los pasos
const PHRASE = "hasta tener que pasar";
const PAUSED = STEPS.filter(s => s.text.toLowerCase().includes(PHRASE)).length;

// Ejemplo real: los pasos 43 y 44 se detienen ante Kodámade; el 45 pasa la mazmorra
// y "se terminan las misiones de los incisos 43, 44 y 45".
const EXAMPLE = { paused: [43, 44], closer: 45 };
const BOSS = assetsFor(EXAMPLE.closer)?.bosses?.[0] ?? null;
// Cuándo pasa el punto por cada casilla en pausa y la deja marcada (s)
const PAUSE_AT = { 43: 0.5, 44: 1.2 };
// Cuándo se marca cada casilla (s): primero el 45 al vencer al jefe, luego hacia atrás
const CHECK_AT = { 45: 3.6, 44: 4.3, 43: 5.0 };
// Lo que tarda el rebobinado antes de repetir (ms); igual que en el CSS
const REWIND_MS = 450;

const dialog = () => appRoot().getElementById("notaDialog");

/**
 * Lleva a la nota (desde el menú «⋯» o la «i» junto a las fichas del paso): en pantalla
 * baja la abre en su diálogo; en alta va en la página y se baja hasta ella.
 */
export function openNota() {
  const d = dialog();
  if (d) return d.showModal();
  appRoot().getElementById("nota")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
}

function showPaused() {
  dialog()?.close();
  setSearch(PHRASE);
  showStepsWindow();
}

/**
 * NOTA ACLARATORIA · qué significa "Hasta tener que pasar X jefe", con un ejemplo de la guía.
 * Es la clave para leer un tercio de los pasos: en pantalla alta va en la página, entre
 * el hero y la ventana; en baja no ocupa sitio y se abre en un diálogo (NotaDialog). El
 * ejemplo se cuenta al verlo.
 */
export function Nota() {
  // run: 0 = aún sin ver; cada valor nuevo remonta la pista y repite la animación
  const [run, setRun] = useState(0);
  // La historia terminó (se puede repetir) o se está rebobinando para repetirla
  const [ended, setEnded] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const figRef = useRef(null);
  const rewindTimer = useRef(0);
  useEffect(() => () => clearTimeout(rewindTimer.current), []);

  // Se cuenta una vez al entrar en pantalla
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setRun(r => r || 1); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(figRef.current);
    return () => io.disconnect();
  }, []);

  // Solo se repite al terminar, y primero se rebobina para no saltar de golpe al principio
  const replay = () => {
    if (prefersReducedMotion() || !ended || rewinding) return;
    setRewinding(true);
    rewindTimer.current = setTimeout(() => {
      setRewinding(false);
      setEnded(false);
      setRun(r => r + 1);
    }, REWIND_MS);
  };
  // La última ✓ (la del 43) cierra la historia
  const onAnimationEnd = e => {
    if (e.animationName === "nota-check" && e.target.dataset.last) setEnded(true);
  };

  return (
    <div className="nota" id="nota">
      <figure className="nota-example" ref={figRef} onMouseEnter={replay}>
        {/* Solo ilustra: el pie de foto lo cuenta para quien no lo ve */}
        <div key={run} className={"nota-track" + (rewinding ? " rewind" : run ? " play" : "")} data-run={run}
          aria-hidden="true" onAnimationEnd={onAnimationEnd}>
          <span className="nota-marker"></span>
          {EXAMPLE.paused.map(n => (
            <span key={n} className="nota-step paused" data-last={n === EXAMPLE.paused[0] ? "1" : undefined}
              style={{ "--pause-at": `${PAUSE_AT[n]}s`, "--check-at": `${CHECK_AT[n]}s` }}>{n}</span>
          ))}
          <span className="nota-boss">{BOSS && <img src={imgUrl(BOSS.img)} alt="" />}</span>
          <span className="nota-step closer" style={{ "--check-at": `${CHECK_AT[EXAMPLE.closer]}s` }}>{EXAMPLE.closer}</span>
        </div>
        <figcaption>
          Los pasos 43 y 44 se detienen ante {BOSS?.name ?? "el jefe"}. En el 45 se pasa la mazmorra y se terminan los tres.
        </figcaption>
      </figure>
      <div className="nota-body">
        <h2 className="nota-title" id="notaTitle">Hasta tener que pasar X jefe de mazmorra</h2>
        <p className="nota-text">
          Ahí el paso queda en pausa: puedes avanzar en la mazmorra hasta la sala del jefe y abandonarla. Un paso
          posterior te pedirá pasar y completar esa misma mazmorra, y al hacerlo se terminan dos o más pasos a la vez.
        </p>
        <p className="nota-links">
          <button type="button" id="notaSteps" onClick={showPaused}>Ver los {PAUSED} pasos</button>
        </p>
      </div>
    </div>
  );
}

/** El diálogo de la nota: nativo (foco atrapado y Escape gratis); un clic fuera lo cierra. */
export default function NotaDialog() {
  const ref = useRef(null);
  return (
    <dialog className="nota-dialog" id="notaDialog" aria-labelledby="notaTitle" ref={ref}
      onClick={e => { if (e.target === ref.current) ref.current.close(); }}>
      <button type="button" className="nota-close" id="notaClose" aria-label="Cerrar" onClick={() => ref.current.close()}>×</button>
      <Nota />
    </dialog>
  );
}
