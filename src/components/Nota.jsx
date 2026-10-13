import { dismissNota, useAppState } from "../state/store.js";

/** NOTA ACLARATORIA · estilo "log del juego" */
export default function Nota() {
  const { notaDismissed } = useAppState();
  return (
    <div className={"nota" + (notaDismissed ? " hidden" : "")} id="nota">
      <span className="ic" aria-hidden="true">›</span>
      <div>
        <b>Aclaración —</b> La instrucción "Hasta tener que pasar X jefe de mazmorra" significa dejar pausada esa misión y no vencer al jefe en ese punto, ya que seguramente hay otra misión que pide pasar dicha mazmorra.
      </div>
      <button className="close" id="notaClose" aria-label="Cerrar nota" onClick={dismissNota}>×</button>
    </div>
  );
}
