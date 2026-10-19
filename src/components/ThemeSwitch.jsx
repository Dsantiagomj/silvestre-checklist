import { useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { applyTheme, getState, useAppState } from "../state/store.js";
import { THEME_ICONS, imgUrl } from "../lib/assets.js";
import { prefersReducedMotion, restartClass } from "../lib/motion.js";
import { isEmbedded } from "../lib/root.js";

const SPARKS = [
  [0, -14], [12, -8], [13, 7], [0, 14], [-12, 8], [-13, -7],
];

/** Posición del huevo y textos accesibles. El huevo puede ir por delante del tema. */
function syncThemeSwitch(btn, t) {
  btn.classList.toggle("is-dark", t === "dark");
  btn.setAttribute("aria-checked", String(t === "dark"));
  const label = t === "dark" ? "Modo oscuro · Dofus Ébano" : "Modo claro · Dofus Marfil";
  btn.setAttribute("aria-label", label);
  btn.title = `${label}. Pulsa para cambiar`;
}

/** El DOM debe quedar actualizado dentro del callback de startViewTransition. */
const commitTheme = t => flushSync(() => applyTheme(t));

function runThemeTransition(next) {
  // Embebida, la transición cubriría toda la página de otro y sus estilos (::view-transition
  // de <html>) no llegan desde la shadow root: el tema cambia sin ella
  if (!document.startViewTransition || isEmbedded()) return commitTheme(next);
  const root = document.documentElement;
  const cls = next === "dark" ? "vt-to-dark" : "vt-to-light";
  root.classList.add(cls);
  const vt = document.startViewTransition(() => commitTheme(next));
  vt.finished.finally(() => root.classList.remove(cls));
}

/**
 * Interruptor de tema. Sus clases (is-dark, pop) y las de los huevos (arc-up,
 * hatch) se manejan a mano: el interruptor va por delante del tema y React no
 * debe pisar las clases de animación al volver a pintar.
 */
export default function ThemeSwitch() {
  const { theme } = useAppState();
  const btnRef = useRef(null);
  const lightRef = useRef(null);
  const darkRef = useRef(null);
  const busy = useRef(false);

  useLayoutEffect(() => {
    syncThemeSwitch(btnRef.current, theme);
  }, [theme]);

  /**
   * Cambio de tema: los huevos intercambian sitio y el que llega aparece con un rebote, y a la
   * vez la noche entra (o se retira) en diagonal desde la esquina del interruptor.
   * Sin View Transitions o con movimiento reducido, el tema cambia sin más.
   */
  function toggleTheme() {
    const btn = btnRef.current;
    if (busy.current) return; // un clic a mitad de la animación no debe reaplicar el mismo tema
    const next = getState().theme === "dark" ? "light" : "dark";
    if (prefersReducedMotion()) return applyTheme(next);
    busy.current = true;
    setTimeout(() => { busy.current = false; }, 1200);

    syncThemeSwitch(btn, next);
    const [leaving, arriving] = next === "dark" ? [lightRef.current, darkRef.current] : [darkRef.current, lightRef.current];
    arriving.classList.remove("arc-up");
    leaving.classList.remove("hatch");
    restartClass(leaving, "arc-up");
    restartClass(arriving, "hatch");
    restartClass(btn, "pop");

    setTimeout(() => runThemeTransition(next), 140);
  }

  return (
    <button className="theme-switch" id="themeBtn" role="switch" ref={btnRef} onClick={toggleTheme}>
      <span className="ts-track" aria-hidden="true"></span>
      <img className="ts-egg ts-light" id="tsLight" alt="" aria-hidden="true" ref={lightRef}
        src={THEME_ICONS ? imgUrl(THEME_ICONS.light) : undefined} />
      <img className="ts-egg ts-dark" id="tsDark" alt="" aria-hidden="true" ref={darkRef}
        src={THEME_ICONS ? imgUrl(THEME_ICONS.dark) : undefined} />
      {SPARKS.map(([dx, dy], i) => (
        <span key={i} className="ts-spark" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` }} aria-hidden="true"></span>
      ))}
    </button>
  );
}
