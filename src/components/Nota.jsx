import { useEffect, useRef, useState } from "react";
import { STEPS } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion } from "../lib/motion.js";
import { setSearch } from "../state/store.js";

// La instrucción que explica la nota, tal como la escribe Sandglass en los pasos
const PHRASE = "hasta tener que pasar";
const PAUSED = STEPS.filter(s => s.text.toLowerCase().includes(PHRASE)).length;

// Ejemplo real: los pasos 43 y 44 se detienen ante Kodámade; el 45 pasa la mazmorra
// y "se terminan las misiones de los incisos 43, 44 y 45".
const EXAMPLE = { paused: [43, 44], closer: 45 };
const BOSS = assetsFor(EXAMPLE.closer)?.bosses?.[0] ?? null;
// Cuándo se marca cada casilla (s): primero el 45 al vencer al jefe, luego hacia atrás
const CHECK_AT = { 45: 1.8, 44: 2.15, 43: 2.45 };

function showPaused() {
  setSearch(PHRASE);
  document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/**
 * NOTA ACLARATORIA · qué significa "Hasta tener que pasar X jefe", con un ejemplo de la guía.
 * Siempre visible: es la clave para leer un tercio de los pasos.
 */
export default function Nota() {
  // run: 0 = aún sin ver; cada valor nuevo remonta la pista y repite la animación
  const [run, setRun] = useState(0);
  const figRef = useRef(null);

  // Se cuenta una vez al entrar en pantalla
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setRun(r => r || 1); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(figRef.current);
    return () => io.disconnect();
  }, []);

  const replay = () => { if (!prefersReducedMotion()) setRun(r => r + 1); };

  return (
    <aside className="nota" id="nota" aria-labelledby="notaTitle">
      <figure className="nota-example" ref={figRef} onMouseEnter={replay}>
        {/* Solo ilustra: el pie de foto lo cuenta para quien no lo ve */}
        <div key={run} className={"nota-track" + (run ? " play" : "")} data-run={run} aria-hidden="true">
          <span className="nota-marker"></span>
          {EXAMPLE.paused.map(n => (
            <span key={n} className="nota-step paused" style={{ "--d": `${CHECK_AT[n]}s` }}>{n}</span>
          ))}
          <span className="nota-boss">{BOSS && <img src={imgUrl(BOSS.img)} alt="" />}</span>
          <span className="nota-step closer" style={{ "--d": `${CHECK_AT[EXAMPLE.closer]}s` }}>{EXAMPLE.closer}</span>
        </div>
        <figcaption>
          Los pasos 43 y 44 se detienen ante {BOSS?.name ?? "el jefe"}. En el 45 se pasa la mazmorra y se terminan los tres.
        </figcaption>
      </figure>
      <div className="nota-body">
        <p className="nota-title" id="notaTitle">Hasta tener que pasar X jefe de mazmorra</p>
        <p className="nota-text">
          Ahí el paso queda en pausa: puedes avanzar en la mazmorra hasta la sala del jefe y abandonarla. Un paso
          posterior te pedirá pasar y completar esa misma mazmorra, y al hacerlo se terminan dos o más pasos a la vez.
        </p>
        <p className="nota-links">
          <button type="button" id="notaSteps" onClick={showPaused}>Ver los {PAUSED} pasos</button>
        </p>
      </div>
    </aside>
  );
}
