import { useLayoutEffect, useRef } from "react";
import { imgUrl } from "../lib/assets.js";
import { runToastAction, useAppState } from "../state/store.js";

/**
 * Aviso inferior con acción (deshacer). La clase "show" se maneja a mano para
 * poder quitarla y ponerla en el mismo frame: así la cuenta atrás se reinicia. Las de su
 * tipo ("toast-dofus") y la de sin acción ("plain", el texto centrado), también: si React
 * escribiera la clase, se llevaría "show" por delante.
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
    el.classList.remove("show", "toast-dofus");
    if (toast.kind) el.classList.add(`toast-${toast.kind}`);
    el.classList.toggle("plain", !toast.actionLabel);
    void el.offsetWidth; // reinicia la cuenta atrás
    el.classList.add("show");
  }, [toast.seq, toast.visible, toast.ms, toast.kind, toast.actionLabel]);

  return (
    <div className="toast" id="toast" role="status" aria-live="polite" ref={ref}>
      {toast.icons.length > 0 && (
        <span className="toast-icons" aria-hidden="true">
          {toast.icons.map(src => <img key={src} src={imgUrl(src)} alt="" />)}
        </span>
      )}
      <span id="toastTxt">{toast.text}</span>
      <button className="toast-action" id="toastAction" onClick={runToastAction}>{toast.actionLabel}</button>
      <span className="toast-bar" aria-hidden="true"></span>
    </div>
  );
}
