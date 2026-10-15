// ============================================================================
// OVERLAY · ventana siempre encima del juego (Document Picture-in-Picture)
// ============================================================================
// Chrome y Edge abren una ventana PiP que se queda por encima de cualquier
// aplicación, incluido el cliente de Dofus. El resto de navegadores recibe un
// popup normal, que no flota pero muestra lo mismo. La UI se pinta con un
// portal de React en el documento de esa ventana, así que comparte el estado.
// Dos modos: mini, una tira con el objetivo actual, y completo, el paso en pestañas.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  getState, loadQuests, moveObjective, overlayGo, overlayStep, toggleStep, useAppState,
} from "../state/store.js";
import { StepGo } from "../components/Journal.jsx";
import OverlayView from "./OverlayView.jsx";

const MODE_KEY = "silvestre:overlayMode";
// El contenido de la ventana en cada modo
const SIZES = { mini: { width: 340, height: 230 }, full: { width: 400, height: 680 } };
const readMode = () => (localStorage.getItem(MODE_KEY) === "full" ? "full" : "mini");

/**
 * Ajusta la ventana al modo. resizeTo mide por fuera: se suma el marco. La PiP solo se
 * deja con un gesto del usuario (el clic que cambia de modo); si no se puede, el
 * contenido se adapta a la ventana tal como esté.
 */
function fitWindow(win, mode) {
  const { width, height } = SIZES[mode];
  try {
    win.resizeTo(width + win.outerWidth - win.innerWidth, height + win.outerHeight - win.innerHeight);
  } catch (err) {
    console.warn("El overlay no pudo cambiar de tamaño:", err);
  }
}

/** Copia todas las hojas de estilo (en dev son <style>, en build <link>). */
function copyStyles(doc) {
  document.querySelectorAll("style, link[rel=stylesheet]").forEach(node => {
    const clone = node.cloneNode(true);
    // La ventana nueva no comparte la URL base de esta página.
    if (clone.tagName === "LINK") clone.href = node.href;
    doc.head.appendChild(clone);
  });
  const meta = doc.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width, initial-scale=1";
  doc.head.appendChild(meta);
}

function overlayKeys(e) {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const n = overlayStep(getState());
  if (e.key === "ArrowLeft") overlayGo(n - 1);
  if (e.key === "ArrowRight") overlayGo(n + 1);
  if (e.key === "ArrowUp") moveObjective(-1);
  if (e.key === "ArrowDown") moveObjective(1);
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggleStep(n);
  }
}

/** Ventana del overlay y la función que la abre (o la enfoca si ya existe). */
export function useOverlayWindow() {
  const [win, setWin] = useState(null);
  const winRef = useRef(null);

  const open = useCallback(async () => {
    const current = winRef.current;
    if (current && !current.closed) {
      current.focus();
      return;
    }
    const size = SIZES[readMode()];
    let w = null;
    if ("documentPictureInPicture" in window) {
      try {
        w = await window.documentPictureInPicture.requestWindow(size);
      } catch (err) {
        console.warn("PiP no disponible, uso popup:", err);
      }
    }
    if (!w) {
      w = window.open("", "silvestre-overlay", `popup,width=${size.width},height=${size.height}`);
      if (!w) {
        alert("El navegador bloqueó la ventana del overlay. Permite popups para este sitio.");
        return;
      }
      w.document.title = "Silvestre · Overlay";
      w.document.head.replaceChildren();
      w.document.body.replaceChildren();
    }
    copyStyles(w.document);
    w.document.body.className = "ov-body";
    w.document.addEventListener("keydown", overlayKeys);
    w.addEventListener("pagehide", () => {
      if (winRef.current === w) {
        winRef.current = null;
        setWin(null);
      }
    });
    winRef.current = w;
    setWin(w);
  }, []);

  return [win, open];
}

/** Pinta el overlay dentro de la ventana abierta y la mantiene sincronizada. */
export default function OverlayWindow({ win }) {
  const s = useAppState();
  const n = overlayStep(s);
  const [mode, setModeState] = useState(readMode);
  const setMode = useCallback(m => {
    localStorage.setItem(MODE_KEY, m);
    setModeState(m);
    if (win && !win.closed) fitWindow(win, m);
  }, [win]);

  useEffect(() => {
    if (win) loadQuests();
  }, [win]);

  // El overlay sigue el tema de la página (en el mismo commit, dentro de la View Transition)
  useLayoutEffect(() => {
    if (win && !win.closed) win.document.documentElement.setAttribute("data-theme", s.theme);
  }, [win, s.theme]);

  if (!win || win.closed) return null;
  // key: al cambiar de paso los desplegables vuelven a su estado inicial. Los incisos y
  // los botones de paso cambian el paso del overlay, no el de la página (StepGo)
  return createPortal(
    <StepGo.Provider value={overlayGo}>
      <OverlayView key={n} mode={mode} setMode={setMode} />
    </StepGo.Provider>,
    win.document.body,
  );
}
