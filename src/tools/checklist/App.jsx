import { useEffect, useRef } from "react";
import { STEPS } from "@dofus/steps.js";
import DOFUS from "@dofus/config.js";
import {
  clearSelection, closeSheet, closeSteps, getState, isMobile, loadQuests, pendingCloses, selectStep, toggleStep,
} from "./state/store.js";
import { useMediaQuery } from "./lib/useMediaQuery.js";
import { eventTarget } from "./lib/root.js";
import NotaDialog from "./components/Nota.jsx";
import Hero from "./components/Hero.jsx";
import { useTallScreen } from "./lib/screen.js";
import ClassicNotice from "./components/ClassicNotice.jsx";
import Diary from "./components/Diary.jsx";
import BottomSheet from "./components/BottomSheet.jsx";
import ResetDialog from "./components/ResetDialog.jsx";
import Toast from "./components/Toast.jsx";
import OverlayWindow, { useOverlayWindow } from "./overlay/OverlayWindow.jsx";

// Keyboard nav
function onKeyDown(e) {
  const s = getState();
  const { selectedStep } = s;
  if (selectedStep == null) return;
  const target = eventTarget(e);
  if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
  // Dentro de un diálogo (reinicio, la nota de las pausas) las teclas son suyas
  if (target.closest?.("dialog")) return;
  if (e.key === "ArrowLeft" && selectedStep > 1) selectStep(selectedStep - 1);
  if (e.key === "ArrowRight" && selectedStep < STEPS.length) selectStep(selectedStep + 1);
  if (e.key === " " || e.key === "Enter") {
    // En la barra, sus desplegables y las fichas de notas, Intro y espacio pulsan lo que
    // tiene el foco: no marcan el paso
    if (target.closest?.(".win-bar, .goal-calls")) return;
    e.preventDefault();
    // Como «Hecho»: si el paso cierra otros pendientes, termina lo que les queda
    const closes = pendingCloses(s, selectedStep);
    if (closes.length) closeSteps(selectedStep, closes);
    else toggleStep(selectedStep);
  }
  if (e.key === "Escape") {
    if (isMobile()) closeSheet();
    else clearSelection();
  }
}

export default function App() {
  const mobile = useMediaQuery("(max-width: 900px)");
  // Pantalla alta (lib/screen.js): el hero en la página. En las bajas ni se monta (no
  // carga su mapa). La nota va siempre en su diálogo
  const tall = useTallScreen();
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
      {tall && <Hero />}
      <div className="wrap">
        {/* Sin hero (que lleva el suyo), el título va solo para lectores de pantalla */}
        {!tall && <h1 className="sr-only">{DOFUS.texts.title}</h1>}
        <ClassicNotice />
        <Diary mobile={mobile} tall={tall} onOverlay={openOverlay} onReset={() => resetRef.current.open()} />
        <footer>
          {DOFUS.texts.footerLead} <b>{DOFUS.texts.author}</b> · Rediseño del sistema de progreso · Contenido reproducido textualmente.<br />
          Dofus es una marca de <b>Ankama</b>. Datos e imágenes vía <a href="https://dofusdb.fr" target="_blank" rel="noopener">DofusDB</a>. Herramienta no oficial hecha por y para la comunidad.<br />
          <small>El progreso se guarda en tu navegador. Si cambias de dispositivo o borras la caché, se pierde.</small>
        </footer>
      </div>
      <BottomSheet mobile={mobile} />
      <ResetDialog ref={resetRef} />
      <NotaDialog />
      <Toast />
      <OverlayWindow win={overlayWin} />
    </>
  );
}
