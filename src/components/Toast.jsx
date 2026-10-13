import { useLayoutEffect, useRef } from "react";
import { runToastAction, useAppState } from "../state/store.js";

/**
 * Aviso inferior con acción (deshacer). La clase "show" se maneja a mano para
 * poder quitarla y ponerla en el mismo frame: así la cuenta atrás se reinicia.
 */
export default function Toast() {
  const { toast } = useAppState();
  const ref = useRef(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!toast.visible) {
      el.classList.remove("show");
      return;
    }
    el.style.setProperty("--toast-ms", `${toast.ms}ms`);
    el.classList.remove("show");
    void el.offsetWidth; // reinicia la cuenta atrás
    el.classList.add("show");
  }, [toast.seq, toast.visible, toast.ms]);

  return (
    <div className="toast" id="toast" role="status" aria-live="polite" ref={ref}>
      <span id="toastTxt">{toast.text}</span>
      <button className="toast-action" id="toastAction" onClick={runToastAction}>{toast.actionLabel}</button>
      <span className="toast-bar" aria-hidden="true"></span>
    </div>
  );
}
