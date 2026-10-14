import { useImperativeHandle, useRef, useState } from "react";
import {
  applySnapshot, doneCount, getState, isPrereqDone, prereqsDone, progressPct, showToast, takeSnapshot, useAppState,
} from "../state/store.js";
import { ALL_PREREQS } from "../data/steps.js";
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
    if (scope.steps) after.done = {};
    if (scope.prereqs) after.prereqs = {};
    // Con la guía completa los prerrequisitos se dan por hechos sin estar marcados.
    // Si se conservan, se marcan de verdad para que no se pierdan al borrar los pasos.
    else after.prereqs = Object.fromEntries(ALL_PREREQS.filter(p => isPrereqDone(getState(), p.id)).map(p => [p.id, true]));

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
          <label><input type="checkbox" name="steps" defaultChecked /> Pasos completados <span className="n" id="rdNSteps">{doneCount(s)}</span></label>
          <label><input type="checkbox" name="prereqs" defaultChecked /> Prerrequisitos <span className="n" id="rdNPre">{prereqsDone(s)}</span></label>
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
