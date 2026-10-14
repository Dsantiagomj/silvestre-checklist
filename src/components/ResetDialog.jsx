import { useImperativeHandle, useRef, useState } from "react";
import {
  applySnapshot, doneCount, getState, isPrereqDone, ownedCount, prereqsDone, progressPct, rowHave, showToast,
  takeSnapshot, useAppState,
} from "../state/store.js";
import { ALL_PREREQS } from "../data/steps.js";
import { ALL_ROWS } from "../lib/resources.js";
import { BRAND_ICON, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion } from "../lib/motion.js";
import BackupCard from "./BackupCard.jsx";

/** REINICIAR · diálogo nativo (foco atrapado y Esc gratis) */
export default function ResetDialog({ ref }) {
  const s = useAppState();
  const dialogRef = useRef(null);
  const ringRef = useRef(null);
  const optsRef = useRef(null);
  const [canConfirm, setCanConfirm] = useState(true);

  const pct = progressPct(s);
  const resetChecks = () => [...optsRef.current.querySelectorAll("input")];
  const syncResetConfirm = () => setCanConfirm(resetChecks().some(c => c.checked));

  useImperativeHandle(ref, () => ({
    open() {
      const ring = ringRef.current;
      ring.style.setProperty("--rd-v", 0);
      dialogRef.current.showModal();
      const target = progressPct(getState());
      requestAnimationFrame(() => ring.style.setProperty("--rd-v", target)); // el anillo se llena al abrir
      syncResetConfirm();
    },
  }));

  function confirmReset() {
    const scope = Object.fromEntries(resetChecks().map(c => [c.name, c.checked]));
    const before = takeSnapshot();
    const after = takeSnapshot();
    // Con los pasos se va su avance objetivo a objetivo (overlay y medallones del diario)
    if (scope.steps) Object.assign(after, { done: {}, questPos: {}, questObj: {} });
    // Prerrequisitos y objetos pueden darse por hechos sin estar marcados (guía completa,
    // pasos hechos). Lo que se conserva se marca de verdad para no perderlo al borrar los pasos.
    const s = getState();
    if (scope.prereqs) after.prereqs = {};
    else after.prereqs = Object.fromEntries(ALL_PREREQS.filter(p => isPrereqDone(s, p.id)).map(p => [p.id, true]));
    if (scope.owned) after.owned = {};
    else after.owned = { ...s.owned, ...Object.fromEntries(ALL_ROWS.filter(r => rowHave(s, r)).map(r => [r.k, true])) };

    ringRef.current.style.setProperty("--rd-v", 0); // el anillo se vacía antes de cerrar
    setTimeout(() => {
      dialogRef.current.close();
      applySnapshot(after);
      showToast("Progreso reiniciado.", "Deshacer", () => applySnapshot(before));
    }, prefersReducedMotion() ? 0 : 650);
  }

  function restoreBackup(data) {
    const before = takeSnapshot();
    dialogRef.current.close();
    applySnapshot(data);
    showToast("Copia restaurada.", "Deshacer", () => applySnapshot(before));
  }

  return (
    <dialog className="reset-dialog" id="resetDialog" aria-labelledby="rdTitle" ref={dialogRef}
      // Clic fuera del diálogo (en el fondo) lo cierra
      onClick={e => { if (e.target === dialogRef.current) dialogRef.current.close(); }}>
      <form method="dialog" className="rd">
        <div className="rd-head">
          <div className="rd-ring" id="rdRing" ref={ringRef}>
            <img id="rdIcon" alt="" src={BRAND_ICON ? imgUrl(BRAND_ICON) : undefined} />
          </div>
          <div>
            <h2 className="rd-title" id="rdTitle">¿Reiniciar tu progreso?</h2>
            <p className="rd-sub" id="rdSub">
              {pct
                ? <>Llevas <b>{pct}%</b> del Dofus Silvestre. Elige qué borrar; lo demás se queda.</>
                : "Todavía no hay pasos completados. Elige qué borrar; lo demás se queda."}
            </p>
          </div>
        </div>
        <fieldset className="rd-opts" ref={optsRef} onChange={syncResetConfirm}>
          <legend className="rd-legend">Qué borrar</legend>
          <label><input type="checkbox" name="steps" defaultChecked /> Pasos completados y su avance en las misiones <span className="n" id="rdNSteps">{doneCount(s)}</span></label>
          <label><input type="checkbox" name="prereqs" defaultChecked /> Prerrequisitos <span className="n" id="rdNPre">{prereqsDone(s)}</span></label>
          <label><input type="checkbox" name="owned" defaultChecked /> Objetos conseguidos <span className="n" id="rdNOwned">{ownedCount(s)}</span></label>
        </fieldset>
        <BackupCard onRestore={restoreBackup} />
        <div className="rd-actions">
          <button type="submit" value="cancel" className="btn-ghost">Cancelar</button>
          <button type="button" className="rd-confirm" id="rdConfirm" disabled={!canConfirm} onClick={confirmReset}>Reiniciar</button>
        </div>
      </form>
    </dialog>
  );
}
