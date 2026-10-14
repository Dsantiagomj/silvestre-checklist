import { STEPS } from "../data/steps.js";
import { NOTA_ICON, imgUrl } from "../lib/assets.js";
import { dismissNota, setSearch, useAppState } from "../state/store.js";

// La instrucción que explica la nota, tal como la escribe Sandglass en los pasos
const PHRASE = "hasta tener que pasar";
const AFFECTED = STEPS.filter(s => s.text.toLowerCase().includes(PHRASE)).length;

function showAffected() {
  setSearch(PHRASE);
  document.getElementById("grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** NOTA ACLARATORIA · tarjeta con la llave de la mazmorra que toca dejar para después */
export default function Nota() {
  const { notaDismissed } = useAppState();
  return (
    <aside className={"nota" + (notaDismissed ? " hidden" : "")} id="nota" aria-labelledby="notaTitle">
      <div className="nota-art" aria-hidden="true">
        {NOTA_ICON && <img src={imgUrl(NOTA_ICON)} alt="" />}
      </div>
      <div className="nota-body">
        <p className="nota-kicker">Aclaración de la guía</p>
        <p className="nota-title" id="notaTitle">Hasta tener que pasar X jefe de mazmorra</p>
        <p className="nota-text">
          La instrucción "Hasta tener que pasar X jefe de mazmorra" significa dejar pausada esa misión y no vencer al
          jefe en ese punto, ya que seguramente hay otra misión que pide pasar dicha mazmorra.
        </p>
      </div>
      <div className="nota-actions">
        <button type="button" className="nota-steps" id="notaSteps" onClick={showAffected}>
          Ver los {AFFECTED} pasos
        </button>
        <button type="button" className="nota-ok" id="notaClose" onClick={dismissNota}>Entendido</button>
      </div>
    </aside>
  );
}
