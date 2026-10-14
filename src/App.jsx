import { useEffect, useRef } from "react";
import { STEPS } from "./data/steps.js";
import {
  clearSelection, closeSheet, getState, isMobile, loadQuests, selectStep, toggleStep,
} from "./state/store.js";
import { useMediaQuery } from "./lib/useMediaQuery.js";
import Header from "./components/Header.jsx";
import Hero from "./components/Hero.jsx";
import Nota from "./components/Nota.jsx";
import Diary from "./components/Diary.jsx";
import Needs from "./components/Needs.jsx";
import BottomSheet from "./components/BottomSheet.jsx";
import ResetDialog from "./components/ResetDialog.jsx";
import Toast from "./components/Toast.jsx";
import OverlayWindow, { useOverlayWindow } from "./overlay/OverlayWindow.jsx";

// Keyboard nav
function onKeyDown(e) {
  const { selectedStep } = getState();
  if (selectedStep == null) return;
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "ArrowLeft" && selectedStep > 1) selectStep(selectedStep - 1);
  if (e.key === "ArrowRight" && selectedStep < STEPS.length) selectStep(selectedStep + 1);
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    toggleStep(selectedStep);
  }
  if (e.key === "Escape") {
    if (isMobile()) closeSheet();
    else clearSelection();
  }
}

export default function App() {
  const mobile = useMediaQuery("(max-width: 900px)");
  const resetRef = useRef(null);
  const [overlayWin, openOverlay] = useOverlayWindow();

  useEffect(() => {
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Plazo máximo: con la CPU ocupada, requestIdleCallback sin timeout puede no llegar nunca
  useEffect(() => {
    if (window.requestIdleCallback) {
      const id = requestIdleCallback(loadQuests, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(loadQuests, 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <Header onOverlay={openOverlay} onReset={() => resetRef.current.open()} />
      <Hero />
      <div className="wrap">
        <Needs />
        <Nota />
        <Diary mobile={mobile} />
        <footer>
          Guía original de los 100 pasos por <b>Sandglass</b> · Rediseño del sistema de progreso · Contenido reproducido textualmente.<br />
          Dofus es una marca de <b>Ankama</b>. Datos e imágenes vía <a href="https://dofusdb.fr" target="_blank" rel="noopener">DofusDB</a>. Herramienta no oficial hecha por y para la comunidad.<br />
          <small>El progreso se guarda en tu navegador. Si cambias de dispositivo o borras la caché, se pierde.</small>
        </footer>
      </div>
      <BottomSheet mobile={mobile} />
      <ResetDialog ref={resetRef} />
      <Toast />
      <OverlayWindow win={overlayWin} />
    </>
  );
}
