import { STEPS } from "../data/steps.js";
import { assetsFor, imgUrl } from "../lib/assets.js";
import { dismissNota, setSearch, useAppState } from "../state/store.js";

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

/** NOTA ACLARATORIA · qué significa "Hasta tener que pasar X jefe", con un ejemplo de la guía */
export default function Nota() {
  const { notaDismissed } = useAppState();
  return (
    <aside className={"nota" + (notaDismissed ? " hidden" : "")} id="nota" aria-labelledby="notaTitle">
      <figure className="nota-example">
        {/* Solo ilustra: el pie de foto lo cuenta para quien no lo ve */}
        <div className="nota-track" aria-hidden="true">
          {EXAMPLE.paused.map(n => <span key={n} className="nota-step paused">{n}</span>)}
          <span className="nota-boss">{BOSS && <img src={imgUrl(BOSS.img)} alt="" />}</span>
          <span className="nota-step closer">{EXAMPLE.closer}</span>
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
          <button type="button" id="notaSteps" onClick={showPaused}>Ver los {PAUSED} pasos</button>
          <button type="button" id="notaClose" onClick={dismissNota}>Entendido</button>
        </p>
      </div>
    </aside>
  );
}
