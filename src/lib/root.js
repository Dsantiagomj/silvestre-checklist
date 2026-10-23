// ============================================================================
// DÓNDE VIVE LA APP — en su página, el documento entero; embebida en otra página
// (src/embed.jsx), una shadow root. Lo que busca elementos de la app los busca aquí,
// no en `document`, que embebida es la página de otro.
// ============================================================================
let root = document;
let themeEl = null;

/** Embebida: la shadow root y el elemento que lleva el tema (data-theme). */
export function mountIn(shadow, themeHolder) {
  root = shadow;
  themeEl = themeHolder;
}

/** Donde buscar los elementos de la app: getElementById, querySelector… */
export const appRoot = () => root;
export const isEmbedded = () => root !== document;
/**
 * Dónde pone AnimatePresence (mode="popLayout") la regla que saca del flujo lo que se va:
 * embebida, en la shadow root; en el <head> de la página no le llega, y lo que se va
 * empuja a lo que llega (el hero crecía al cambiar de paso y el mapa saltaba al entrar).
 */
export const popRoot = () => (isEmbedded() ? root : undefined);
/** El elemento con data-theme: <html> en su página, el contenedor de la app embebida. */
export const themeTarget = () => themeEl || document.documentElement;

/**
 * El elemento donde empezó un evento escuchado en `document`. Desde dentro de una shadow
 * root, `e.target` es el anfitrión, no el campo o el botón que se tocó.
 */
export const eventTarget = e => e.composedPath?.()[0] ?? e.target;

/** El elemento enfocado dentro de la app (embebida, `document.activeElement` es el anfitrión). */
export const activeElement = () => root.activeElement ?? document.activeElement;

/** Lo que tapa arriba la cabecera fija de la página que aloja la app (--silvestre-top). */
const pageTop = () => parseFloat(getComputedStyle(root.host).getPropertyValue("--silvestre-top")) || 0;

/**
 * Lo que se ha bajado desde el principio de la app: en su página, el scroll de la
 * ventana; embebida, lo que la app ha subido por debajo de la cabecera de la página.
 */
export function scrolledInApp() {
  if (!isEmbedded()) return window.scrollY;
  return Math.max(0, pageTop() - root.host.getBoundingClientRect().top);
}

/** La posición de la página que deja el principio de la app a la vista (0 en su página). */
export const appTopY = () => (isEmbedded() ? Math.max(0, root.host.getBoundingClientRect().top + window.scrollY - pageTop()) : 0);
