import { useLiveIds } from "../lib/leaving.js";
import { ALL_PREREQS, PREREQS_INTRO } from "@dofus/steps.js";
import {
  getState, prereqsDone, restoreMarks, rowHave, setAllPrereqs, setRowsOwned, showToast, useAppState,
} from "../state/store.js";
import ItemsPanel, { itemsView } from "./needs/ItemsPanel.jsx";
import PrereqsPanel from "./needs/PrereqsPanel.jsx";

/**
 * "Marcar todo" y "Limpiar" de una pestaña, junto a la explicación de qué hacen. Actúan
 * sobre lo que se ve y se pueden deshacer. En Prerrequisitos van en la fila de
 * herramientas de la ventana; en Objetos, esa fila es del buscador y van sobre la lista.
 */
export function NeedsBar({ tab }) {
  const live = useLiveIds();
  const s = useAppState();
  const items = tab === "items" ? itemsView(s) : null;
  const toMark = tab === "items" ? items.visible.filter(r => !rowHave(s, r)) : null;
  const toClear = tab === "items" ? items.visible.filter(r => rowHave(s, r)) : null;

  function act(on) {
    const before = getState();
    if (tab === "prereqs") {
      setAllPrereqs(on);
      showToast(on ? "Prerrequisitos marcados." : "Prerrequisitos limpiados.", "Deshacer",
        () => restoreMarks(before.owned, before.prereqs));
      return;
    }
    const rows = on ? toMark : toClear;
    setRowsOwned(rows, on);
    const n = rows.length;
    showToast(`${on ? "Marcados" : "Limpiados"} ${n} ${n === 1 ? "objeto" : "objetos"}.`, "Deshacer",
      () => restoreMarks(before.owned, before.prereqs));
  }

  const canMark = tab === "prereqs" ? prereqsDone(s) < ALL_PREREQS.length : toMark.length > 0;
  const canClear = tab === "prereqs" ? Object.keys(s.prereqs).length > 0 : toClear.length > 0;

  return (
    <div className="needs-bar">
      <p className="needs-hint" id={live("needsHint")}>
        {tab === "prereqs"
          ? `«Marcar todo» marca los ${ALL_PREREQS.length} prerrequisitos y «Limpiar» los desmarca. Las dos se pueden deshacer.`
          : "«Marcar todo» y «Limpiar» actúan sobre lo que ves: la categoría y la búsqueda actuales. «Limpiar» solo quita lo que marcaste a mano; lo que cubren los pasos ya hechos sigue contando."}
      </p>
      <div className="needs-actions">
        <button type="button" className="needs-act mark" id={live("needsMarkAll")} disabled={!canMark} onClick={() => act(true)}>
          ✓ Marcar todo
        </button>
        <button type="button" className="needs-act clear" id={live("needsClear")} disabled={!canClear} onClick={() => act(false)}>
          Limpiar
        </button>
      </div>
    </div>
  );
}

/**
 * LO QUE NECESITAS · prerrequisitos u objetos, como pestaña de la ventana de pasos.
 * Sus controles fijos (el buscador de objetos, "Marcar todo" de los prerrequisitos) van
 * en la fila de herramientas de la ventana (Diary.jsx).
 */
export default function Needs({ tab }) {
  const live = useLiveIds();
  return (
    <div className="needs" id={live("needs")} role="tabpanel" aria-labelledby={live(tab === "prereqs" ? "tabPrereqs" : "tabItems")}>
      <p className="needs-intro" id={live("needsIntro")}>{PREREQS_INTRO}</p>
      {tab === "prereqs" ? <PrereqsPanel /> : <><NeedsBar tab="items" /><ItemsPanel /></>}
    </div>
  );
}
