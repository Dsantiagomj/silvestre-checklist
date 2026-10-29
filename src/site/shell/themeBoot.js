// ============================================================================
// EL TEMA DEL SITIO AL ARRANCAR — sin nada del navegador al cargar el módulo: vite.config.js
// lo importa en Node para meter THEME_BOOT en el <head> de cada página del sitio. El resto
// del tema (cambiarlo, seguirlo) está en theme.js.
// ============================================================================
export const THEME_KEY = "dofus-tools:theme";

/**
 * El tema guardado. Sin él, se trae una vez el que se eligió en un checklist antes de que
 * hubiera tema del sitio (silvestre:theme y después hielos:theme) y se guarda como el del
 * sitio. Va entero en una función sin nada de fuera: vite.config.js la mete tal cual en un
 * <script> del <head> de cada página (siteThemeBoot), que pone data-theme antes de pintar.
 */
export function resolveTheme() {
  var key = "dofus-tools:theme";
  var ok = function (t) { return t === "light" || t === "dark"; };
  try {
    var t = localStorage.getItem(key);
    if (ok(t)) return t;
    var old = ["silvestre:theme", "hielos:theme"];
    for (var i = 0; i < old.length; i++) {
      t = localStorage.getItem(old[i]);
      if (ok(t)) {
        localStorage.setItem(key, t);
        return t;
      }
    }
  } catch (e) { /* sin localStorage (modo privado estricto): el oscuro */ }
  return "dark";
}

/** El script del <head>: data-theme en <html> antes del primer pintado, sin destello. */
export const THEME_BOOT = `document.documentElement.setAttribute("data-theme",(${resolveTheme})());`;
