import { bringClassic, classicPending, dismissClassic, useAppState } from "../state/store.js";

/**
 * AVISO DEL CHECKLIST CLÁSICO · el clásico tiene pasos hechos que aquí no. No bloquea:
 * se traen con un clic (solo se añaden) o se cierra, y calla hasta que el clásico cambie.
 */
export default function ClassicNotice() {
  const s = useAppState();
  const n = classicPending(s).length;
  if (!n) return null;
  return (
    <aside className="classic-notice" id="classicNotice" role="status">
      <p className="classic-notice-text">
        Tienes <b>{n}</b> {n === 1 ? "paso" : "pasos"} más en el checklist clásico.
      </p>
      <button type="button" className="bk-btn primary" id="classicBring" onClick={bringClassic}>Traerlos</button>
      <button type="button" className="classic-notice-close" id="classicDismiss" aria-label="Cerrar aviso" onClick={dismissClassic}>×</button>
    </aside>
  );
}
