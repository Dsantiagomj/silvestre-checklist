// ============================================================================
// EL TEMA DEL SITIO «DOFUS TOOLS» — uno solo para todas sus páginas (la home, los dos
// checklists, la cosecha), guardado en dofus-tools:theme ("light" o "dark"; oscuro por
// defecto). Lo cambia el interruptor de la cabecera (shell.js) y cada página lo sigue con
// onSiteTheme. Solo el sitio: los embebidos guardan el suyo (silvestre:theme, hielos:theme,
// cosecha:theme) en la página de Torrente Arcano, que es otro dominio.
// ============================================================================
import { THEME_KEY } from "./themeBoot.js";

export { THEME_KEY, THEME_BOOT, resolveTheme } from "./themeBoot.js";
const EVENT = "dofus-tools:theme";

/** El tema de ahora: el que puso el script del <head> en <html>. */
export const siteTheme = () => (document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark");

/**
 * Cambia el tema de toda la página: data-theme en <html>, la clave (salvo `save: false`, cuando
 * ya viene guardado de otra pestaña) y el aviso a quien lo sigue (onSiteTheme), en el acto.
 */
export function setSiteTheme(theme, { save = true } = {}) {
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", t);
  if (save) {
    try { localStorage.setItem(THEME_KEY, t); } catch { /* se cambia igual, sin guardar */ }
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: t }));
}

/** Llama a `fn(theme)` cada vez que cambia el tema del sitio, aquí o en otra pestaña. */
export function onSiteTheme(fn) {
  window.addEventListener(EVENT, e => fn(e.detail));
}

// Otra pestaña del sitio que cambia el tema: esta lo sigue
window.addEventListener("storage", e => {
  if (e.key === THEME_KEY && (e.newValue === "light" || e.newValue === "dark") && e.newValue !== siteTheme()) {
    setSiteTheme(e.newValue, { save: false });
  }
});
