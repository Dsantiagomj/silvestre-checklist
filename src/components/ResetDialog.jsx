import { useImperativeHandle, useRef, useState } from "react";
import {
  applySnapshot, doneCount, getState, prereqsDone, progressPct, showToast, takeSnapshot, useAppState,
} from "../state/store.js";
import { BRAND_ICON, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion } from "../lib/motion.js";

function downloadBackup() {
  const payload = {
    app: "silvestre-checklist",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: takeSnapshot(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `silvestre-progreso-${payload.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("Copia descargada.", "", null, 3000);
}

/** REINICIAR · diálogo nativo (foco atrapado y Esc gratis) */
export default function ResetDialog({ ref }) {
  const s = useAppState();
  const dialogRef = useRef(null);
  const ringRef = useRef(null);
  const optsRef = useRef(null);
  const fileRef = useRef(null);
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

    ringRef.current.style.setProperty("--rd-v", 0); // el anillo se vacía antes de cerrar
    setTimeout(() => {
      dialogRef.current.close();
      applySnapshot(after);
      showToast("Progreso reiniciado.", "Deshacer", () => applySnapshot(before));
    }, prefersReducedMotion() ? 0 : 650);
  }

  async function restoreBackup(file) {
    let payload;
    try {
      payload = JSON.parse(await file.text());
    } catch {
      return showToast("Ese archivo no es una copia válida.", "", null, 4000);
    }
    if (payload?.app !== "silvestre-checklist" || typeof payload.data !== "object") {
      return showToast("Ese archivo no es una copia de este checklist.", "", null, 4000);
    }
    const before = takeSnapshot();
    dialogRef.current.close();
    applySnapshot(payload.data);
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
        <div className="rd-backup">
          Copia de seguridad:{" "}
          <button type="button" className="rd-link" id="rdBackup" onClick={downloadBackup}>descargar</button> ·{" "}
          <button type="button" className="rd-link" id="rdRestore" onClick={() => fileRef.current.click()}>restaurar</button>
          <input type="file" id="rdFile" accept="application/json,.json" hidden ref={fileRef}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) restoreBackup(file);
              e.target.value = ""; // permite volver a elegir el mismo archivo
            }} />
        </div>
        <div className="rd-actions">
          <button type="submit" value="cancel" className="btn-ghost">Cancelar</button>
          <button type="button" className="rd-confirm" id="rdConfirm" disabled={!canConfirm} onClick={confirmReset}>Reiniciar</button>
        </div>
      </form>
    </dialog>
  );
}
