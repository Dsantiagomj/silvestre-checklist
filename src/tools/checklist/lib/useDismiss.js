import { useEffect } from "react";
import { eventTarget } from "./root.js";

/**
 * Un desplegable de la barra abierto se cierra con Escape o pulsando fuera de `boxRef`.
 * Escape se escucha en captura y antes que nadie: cierra el desplegable, no el paso abierto.
 */
export function useDismiss(open, close, boxRef) {
  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (!boxRef.current?.contains(eventTarget(e))) close(); };
    const onKey = e => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      close();
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
}
