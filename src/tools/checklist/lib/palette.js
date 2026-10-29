// ============================================================================
// LA PALETA DE CADA DOFUS — global.css trae la del Silvestre en variables (:root, :host y
// [data-theme="light"]). Un Dofus con `palette` en su config.js las cambia con un bloque
// de CSS con los mismos selectores, que va después: en su página, en el <head>; embebida,
// dentro de la shadow root, tras global.css. El Silvestre no lleva paleta.
// ============================================================================
import DOFUS from "@dofus/config.js";

const block = vars => Object.entries(vars || {}).map(([k, v]) => `${k}:${v};`).join("");

/** El CSS de la paleta del Dofus ({ dark, light } de variables), o "" sin ella. */
export function paletteCss(palette = DOFUS.palette) {
  if (!palette) return "";
  return `:root, :host{${block(palette.dark)}}\n[data-theme="light"]{${block(palette.light)}}\n`;
}

/** En su página: la paleta en un <style> al final del <head>, detrás de global.css. */
export function applyPagePalette() {
  const css = paletteCss();
  if (!css) return;
  const style = document.createElement("style");
  style.dataset.palette = DOFUS.id;
  style.textContent = css;
  document.head.appendChild(style);
}
