// ============================================================================
// OVERLAY · ventana siempre encima del juego (Document Picture-in-Picture)
// ============================================================================
// Chrome y Edge abren una ventana PiP que se queda por encima de cualquier
// aplicación, incluido el cliente de Dofus. El resto de navegadores recibe un
// popup normal, que no flota pero muestra lo mismo. La UI se pinta con un
// portal de React en el documento de esa ventana, así que comparte el estado.
// Un solo modo: el paso entero en pestañas, en una ventana de un solo tamaño.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  LS, getState, loadQuests, moveObjective, overlayGo, overlayStep, toggleStep, useAppState,
} from "../state/store.js";
import { StepGo } from "../components/Journal.jsx";
import OverlayView from "./OverlayView.jsx";
import { appRoot, isEmbedded } from "../lib/root.js";
import DOFUS from "@dofus/config.js";

// El tamaño con el que se abre la ventana. Después no se redimensiona: el contenido se
// adapta a la ventana tal como la dejes
const SIZE = { width: 400, height: 680 };
// Lo guardaban las versiones con modo mini; ya no se usa
const OLD_MODE_KEY = LS.overlayMode;

/**
 * Copia todas las hojas de estilo de la app (en dev son <style>, en build <link>).
 * Embebida, las de la shadow root y la de las fuentes, no las de la página que la aloja.
 */
function copyStyles(doc) {
  const sheets = isEmbedded()
    ? [...document.querySelectorAll(`link[data-${DOFUS.embed.fonts}]`), ...appRoot().querySelectorAll("style, link[rel=stylesheet]")]
    : document.querySelectorAll("style, link[rel=stylesheet]");
  sheets.forEach(node => {
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
  // Con la lista de pasos o el desplegable de misiones abiertos, las teclas son suyas (Escape los cierra)
  if (e.currentTarget.querySelector(".ov-picker, .ov-qlist")) return;
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
    localStorage.removeItem(OLD_MODE_KEY);
    const size = SIZE;
    let w = null;
    if ("documentPictureInPicture" in window) {
      try {
        w = await window.documentPictureInPicture.requestWindow(size);
      } catch (err) {
        console.warn("PiP no disponible, uso popup:", err);
      }
    }
    if (!w) {
      w = window.open("", DOFUS.overlayWindow, `popup,width=${size.width},height=${size.height}`);
      if (!w) {
        alert("El navegador bloqueó la ventana del overlay. Permite popups para este sitio.");
        return;
      }
      w.document.title = DOFUS.texts.overlayTitle;
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
      <OverlayView key={n} />
    </StepGo.Provider>,
    win.document.body,
  );
}
