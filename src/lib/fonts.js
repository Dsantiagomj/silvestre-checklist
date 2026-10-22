// ============================================================================
// FUENTES DE UN EMBEBIDO — dentro de una shadow root @font-face no se aplica, así que la
// hoja de Google Fonts que importa el CSS del embebido va en la página. Dentro se quita
// para no pedirla dos veces (el build la deja como `@import "…";` y en desarrollo va como
// `@import url('…');`).
// ============================================================================
const IMPORT = /@import\s+(?:url\(\s*)?(['"])(.+?)\1\s*\)?[^;]*;/;

/**
 * Pone en <head> la hoja de fuentes que importa `css` (una sola vez por `key`, el
 * data-* que la marca) y devuelve el CSS sin ese @import, para la shadow root.
 */
export function pageFonts(css, key) {
  const found = css.match(IMPORT);
  if (!found) return css;
  if (!document.querySelector(`link[data-${key}]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = found[2];
    link.setAttribute(`data-${key}`, "");
    document.head.appendChild(link);
  }
  return css.replace(found[0], "");
}
