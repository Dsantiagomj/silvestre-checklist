import { useEffect, useRef, useState } from "react";
import { takeSnapshot } from "../state/store.js";
import { BACKUP_ICONS, imgUrl } from "../lib/assets.js";

const LAST_BACKUP_KEY = "silvestre:lastBackup";
// Pasado este tiempo sin copia, el aviso cambia de color para invitar a guardar una.
const STALE_DAYS = 14;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

/** "hace un momento", "hace 5 minutos", "ayer", "hace 3 días"… */
function sinceText(iso) {
  const seconds = (Date.now() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return "hace un momento";
  const units = [["minute", 60], ["hour", 3600], ["day", 86400], ["month", 2592000], ["year", 31536000]];
  let unit = units[0];
  for (const u of units) if (seconds >= u[1]) unit = u;
  return rtf.format(-Math.floor(seconds / unit[1]), unit[0]);
}

const isStale = iso => !iso || (Date.now() - new Date(iso).getTime()) / 86400000 > STALE_DAYS;

/** Lee un archivo de copia y devuelve sus datos o el motivo por el que no vale. */
async function parseBackup(file) {
  let payload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    return { error: "Ese archivo no es una copia válida." };
  }
  if (payload?.app !== "silvestre-checklist" || typeof payload.data !== "object" || !payload.data) {
    return { error: "Ese archivo no es una copia de este checklist." };
  }
  return { data: payload.data };
}

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
  return payload.exportedAt;
}

/**
 * COPIA DE SEGURIDAD · tarjeta dentro del diálogo de reinicio.
 * Guardas el progreso en el cofre; el mapa del tesoro te lleva de vuelta a él.
 * También acepta el archivo arrastrado encima.
 */
export default function BackupCard({ onRestore }) {
  const fileRef = useRef(null);
  const cardRef = useRef(null);
  const timer = useRef(null);
  const [last, setLast] = useState(() => localStorage.getItem(LAST_BACKUP_KEY));
  const [state, setState] = useState("idle");            // idle | drag | saved | error
  const [message, setMessage] = useState("");

  // El texto relativo envejece mientras el diálogo sigue abierto
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(t => t + 1), 30_000);
    return () => { clearInterval(id); clearTimeout(timer.current); };
  }, []);

  const flash = (next, ms) => {
    clearTimeout(timer.current);
    setState(next);
    timer.current = setTimeout(() => { setState("idle"); setMessage(""); }, ms);
  };

  function save() {
    const at = downloadBackup();
    localStorage.setItem(LAST_BACKUP_KEY, at);
    setLast(at);
    setMessage("");
    flash("saved", 1600);
  }

  async function restore(file) {
    const result = await parseBackup(file);
    if (result.error) {
      setMessage(result.error);
      flash("error", 4000);
      return;
    }
    setState("idle");
    onRestore(result.data);
  }

  // Arrastrar y soltar: el estado "drag" solo se va al salir de la tarjeta, no al pasar por sus hijos
  const onDragOver = e => {
    if (![...e.dataTransfer.types].includes("Files")) return;
    e.preventDefault();
    if (state !== "drag") { clearTimeout(timer.current); setMessage(""); setState("drag"); }
  };
  const onDragLeave = e => {
    if (!cardRef.current.contains(e.relatedTarget)) setState("idle");
  };
  const onDrop = e => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) restore(file);
    else setState("idle");
  };

  const stale = isStale(last);

  return (
    <div className="rd-bk" id="rdBackupCard" ref={cardRef} data-state={state}
      onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
      <div className="rd-bk-chest" aria-hidden="true">
        {BACKUP_ICONS?.chest && <img src={imgUrl(BACKUP_ICONS.chest)} alt="" />}
        <span className="rd-bk-check">✓</span>
      </div>
      <div className="rd-bk-text">
        <p className="rd-bk-title">Copia de seguridad</p>
        <p className={"rd-bk-when" + (stale ? " stale" : "")} id="rdBackupWhen">
          {state === "drag"
            ? "Suelta el archivo para restaurar tu progreso."
            : last
              ? <>Última copia: <b>{sinceText(last)}</b>{stale ? ". Te conviene guardar otra antes de reiniciar." : "."}</>
              : "Todavía no has guardado ninguna. Hazlo antes de reiniciar."}
        </p>
      </div>
      <div className="rd-bk-actions">
        <button type="button" className="bk-btn primary" id="rdBackup" onClick={save}>
          <span aria-hidden="true">⤓</span> Descargar copia
        </button>
        <button type="button" className="bk-btn" id="rdRestore" onClick={() => fileRef.current.click()}>
          {BACKUP_ICONS?.map && <img src={imgUrl(BACKUP_ICONS.map)} alt="" />} Restaurar
        </button>
        <span className="rd-bk-hint">o arrastra aquí tu archivo .json</span>
      </div>
      <p className="rd-bk-msg" id="rdBackupMsg" role="alert">{message}</p>
      <input type="file" id="rdFile" accept="application/json,.json" hidden ref={fileRef}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) restore(file);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }} />
    </div>
  );
}
