import { useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { applyTheme, getState, useAppState } from "../state/store.js";
import { THEME_ICONS, imgUrl } from "../lib/assets.js";
import { isEmbedded } from "../lib/root.js";
import { SPARKS, pageThemeTransition, syncThemeSwitch, toggleThemeSwitch } from "../../../lib/themeSwitch.js";
import DOFUS from "@dofus/config.js";

/** El DOM debe quedar actualizado dentro del callback de startViewTransition. */
const commitTheme = t => flushSync(() => applyTheme(t));

function runThemeTransition(next) {
  // Embebida, la transición cubriría toda la página de otro y sus estilos (::view-transition
  // de <html>) no llegan desde la shadow root: el tema cambia sin ella
  if (isEmbedded()) return commitTheme(next);
  pageThemeTransition(next, () => commitTheme(next));
}

/**
 * Interruptor de tema del checklist (el de src/lib/themeSwitch.js, con React). Lo que es
 * cada huevo sale de themeNames en config.js: en el Silvestre, el Dofus Ébano y el Marfil.
 * Sus clases (is-dark, pop) y las de los huevos (arc-up, hatch) se manejan a mano: el
 * interruptor va por delante del tema y React no debe pisar las clases de animación al
 * volver a pintar. En el sitio no se pinta: el tema es de la cabecera (WinBar).
 */
export default function ThemeSwitch() {
  const { theme } = useAppState();
  const btnRef = useRef(null);

  useLayoutEffect(() => {
    syncThemeSwitch(btnRef.current, theme, DOFUS.themeNames);
  }, [theme]);

  /**
   * Cambio de tema: los huevos intercambian sitio y el que llega aparece con un rebote, y a la
   * vez la noche entra (o se retira) en diagonal desde la esquina del interruptor.
   * Sin View Transitions o con movimiento reducido, el tema cambia sin más.
   */
  function toggleTheme() {
    const next = getState().theme === "dark" ? "light" : "dark";
    toggleThemeSwitch(btnRef.current, next, DOFUS.themeNames, (t, animated) => (animated ? runThemeTransition(t) : applyTheme(t)));
  }

  return (
    <button className="theme-switch" id="themeBtn" role="switch" ref={btnRef} onClick={toggleTheme}>
      <span className="ts-track" aria-hidden="true"></span>
      <img className="ts-egg ts-light" id="tsLight" alt="" aria-hidden="true"
        src={THEME_ICONS ? imgUrl(THEME_ICONS.light) : undefined} />
      <img className="ts-egg ts-dark" id="tsDark" alt="" aria-hidden="true"
        src={THEME_ICONS ? imgUrl(THEME_ICONS.dark) : undefined} />
      {SPARKS.map(([dx, dy], i) => (
        <span key={i} className="ts-spark" style={{ "--dx": `${dx}px`, "--dy": `${dy}px` }} aria-hidden="true"></span>
      ))}
    </button>
  );
}
