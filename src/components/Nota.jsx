import { STEPS } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { dismissNota, isMobile, selectStep, setSearch, useAppState } from "../state/store.js";

// La instrucción que explica la nota, tal como la escribe Sandglass en los pasos
const PHRASE = "hasta tener que pasar";
const PAUSED = STEPS.filter(s => s.text.toLowerCase().includes(PHRASE)).length;

// Ejemplo real: los pasos 43 y 44 se detienen ante Kodámade; el 45 pasa la mazmorra
// y "se terminan las misiones de los incisos 43, 44 y 45".
const EXAMPLE = { paused: [43, 44], closer: 45 };
const BOSS = assetsFor(EXAMPLE.closer)?.bosses?.[0] ?? null;

function showPaused() {
  setSearch(PHRASE);
  document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openStep(n) {
  selectStep(n);
  if (!isMobile()) document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** NOTA ACLARATORIA · qué significa "Hasta tener que pasar X jefe", con un ejemplo de la guía */
export default function Nota() {
  const { notaDismissed } = useAppState();
  return (
    <aside className={"nota" + (notaDismissed ? " hidden" : "")} id="nota" aria-labelledby="notaTitle">
      <figure className="nota-example">
        <div className="nota-track">
          {EXAMPLE.paused.map(n => (
            <button key={n} type="button" className="nota-step paused" onClick={() => openStep(n)}
              aria-label={`Paso ${n}: se detiene antes del jefe`}>{n}</button>
          ))}
          <span className="nota-boss" aria-hidden="true">
            {BOSS && <img src={imgUrl(BOSS.img)} alt="" />}
          </span>
          <button type="button" className="nota-step closer" onClick={() => openStep(EXAMPLE.closer)}
            aria-label={`Paso ${EXAMPLE.closer}: pasa la mazmorra y termina los tres`}>{EXAMPLE.closer}</button>
        </div>
        <figcaption>
          Los pasos 43 y 44 se detienen ante {BOSS?.name ?? "el jefe"}. En el 45 se pasa la mazmorra y se terminan los tres.
        </figcaption>
      </figure>
      <div className="nota-body">
        <p className="nota-title" id="notaTitle">Hasta tener que pasar X jefe de mazmorra</p>
        <p className="nota-text">
          Ahí la misión se deja en pausa, sin vencer al jefe. Un paso posterior pide pasar y completar esa misma
          mazmorra, y al hacerlo se terminan dos o más pasos a la vez.
        </p>
        <p className="nota-links">
          <button type="button" id="notaSteps" onClick={showPaused}>Ver los {PAUSED} pasos con pausa</button>
          <button type="button" id="notaClose" onClick={dismissNota}>Entendido</button>
        </p>
      </div>
    </aside>
  );
}
