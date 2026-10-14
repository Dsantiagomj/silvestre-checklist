import { useEffect, useRef } from "react";
import { closeSheet, useAppState } from "../state/store.js";
import Journal from "./Journal.jsx";

/** BOTTOM SHEET (mobile) */
export default function BottomSheet({ mobile }) {
  const s = useAppState();
  const sheetRef = useRef(null);
  const handleRef = useRef(null);
  const n = mobile ? s.selectedStep : null;

  useEffect(() => {
    document.body.style.overflow = s.sheetOpen ? "hidden" : "";
  }, [s.sheetOpen]);

  // Drag-to-close (estilos en línea a mano: React no gestiona el style de la hoja)
  useEffect(() => {
    const sheet = sheetRef.current;
    const handle = handleRef.current;
    let startY = 0;
    let currentY = 0;
    let dragging = false;
    const down = e => {
      dragging = true;
      startY = e.clientY;
      handle.setPointerCapture(e.pointerId);
      sheet.style.transition = "none";
    };
    const move = e => {
      if (!dragging) return;
      currentY = Math.max(0, e.clientY - startY);
      sheet.style.transform = `translateY(${currentY}px)`;
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = "";
      // Se limpia también al cerrar: si se quedara, la hoja reabriría desplazada.
      // Con la transición ya restaurada, baja animada desde donde se soltó.
      if (currentY > 100) closeSheet();
      sheet.style.transform = "";
      currentY = 0;
    };
    const cancel = () => {
      dragging = false;
      sheet.style.transition = "";
      sheet.style.transform = "";
    };
    handle.addEventListener("pointerdown", down);
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", cancel);
    return () => {
      handle.removeEventListener("pointerdown", down);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", cancel);
    };
  }, []);

  return (
    <>
      <div className={"sheet-overlay" + (s.sheetOpen ? " open" : "")} id="sheetOverlay" onClick={closeSheet}></div>
      <div className={"sheet" + (s.sheetOpen ? " open" : "")} id="sheet" role="dialog" aria-modal="true" aria-label="Detalle del paso" ref={sheetRef}>
        <div className="sheet-handle" id="sheetHandle" ref={handleRef}><div className="bar"></div></div>
        <div className="sheet-content" id="sheetContent">
          {n != null && <Journal key={n} n={n} />}
        </div>
      </div>
    </>
  );
}
