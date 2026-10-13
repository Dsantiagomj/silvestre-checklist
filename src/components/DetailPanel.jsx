import { goToNextPending, nextPending, useAppState } from "../state/store.js";
import StepDetail from "./StepDetail.jsx";

/** PANEL DETALLE (desktop) */
export default function DetailPanel({ mobile }) {
  const s = useAppState();
  // En móvil el detalle vive en la hoja inferior; aquí solo queda el estado vacío.
  const n = mobile ? null : s.selectedStep;
  const next = nextPending(s);
  return (
    <aside className="detail-panel" id="detailPanel" aria-label="Detalle del paso">
      <div className={"detail-empty" + (n == null ? "" : " hidden")} id="detailEmpty">
        <div className="map-ico">◈</div>
        <p>Selecciona un paso del tablero<br />para ver el detalle completo</p>
        <button className="btn-secondary" id="goNextEmpty" disabled={!next} onClick={goToNextPending}>
          {next ? `📍 Siguiente: Paso ${next}` : "🎉 ¡Todo completado!"}
        </button>
      </div>
      <div id="detailContent" className={n == null ? "hidden" : undefined}>
        {/* key: al cambiar de paso los desplegables vuelven a su estado inicial */}
        {n != null && <StepDetail key={n} n={n} />}
      </div>
    </aside>
  );
}
