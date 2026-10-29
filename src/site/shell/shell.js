// ============================================================================
// LA CABECERA DEL SITIO «DOFUS TOOLS» — la marca, que lleva a la home, una entrada por
// herramienta y el interruptor del tema de todo el sitio (theme.js). Va arriba de cada página
// del sitio, fuera de la app, y no se pega al hacer scroll. Solo el sitio la carga: los embebidos de Torrente Arcano nunca (su contrato lo
// comprueba: ningún bundle lleva .dt-shell). DOM a mano, sin React.
// ============================================================================
import "../../lib/themeSwitch.css";
import "./shell.css";
import { el, text } from "../../lib/dom.js";
import { createThemeSwitch, pageThemeTransition, syncThemeSwitch, toggleThemeSwitch } from "../../lib/themeSwitch.js";
import { onSiteTheme, setSiteTheme, siteTheme } from "./theme.js";

/**
 * Las herramientas del sitio, en el orden del menú y de la home. `path` es relativo a la
 * raíz del sitio; en estrecho el menú muestra solo `short`, el final de `name`.
 */
export const TOOLS = [
  { id: "silvestre", name: "Dofus Silvestre", short: "Silvestre", path: "silvestre/" },
  { id: "hielos", name: "Dofus de los Hielos", short: "Hielos", path: "hielos/" },
  { id: "cosecha", name: "La eterna cosecha", short: "cosecha", path: "cosecha/" },
];

/** Una dirección del sitio: la raíz (__SITE_ROOT__, vite.config.js) más `path`. Vale también desde hielos/. */
export const siteUrl = (path = "") => __SITE_ROOT__ + path;

// Los huevos del interruptor: los del checklist del Silvestre, en todas las páginas
const EGGS = { light: siteUrl("img/items/23011.png"), dark: siteUrl("img/items/23007.png") };
const EGG_NAMES = { light: "Dofus Marfil", dark: "Dofus Ébano" };

/**
 * El interruptor del tema del sitio. Los huevos cambian de sitio y la página entera cambia
 * con la transición en diagonal desde su esquina; cada parte de la página lo sigue
 * (onSiteTheme: la app del checklist, la cosecha en su shadow root).
 */
function themeToggle() {
  const btn = createThemeSwitch({
    icons: EGGS,
    names: EGG_NAMES,
    theme: siteTheme(),
    onToggle: b => toggleThemeSwitch(b, siteTheme() === "dark" ? "light" : "dark", EGG_NAMES, (t, animated) =>
      (animated ? pageThemeTransition(t, () => setSiteTheme(t)) : setSiteTheme(t))),
  });
  // Cambiado desde otra pestaña: el interruptor también
  onSiteTheme(t => syncThemeSwitch(btn, t, EGG_NAMES));
  return btn;
}

/** Un enlace del menú: entero en ancho y solo el final en estrecho; el nombre accesible es siempre el entero. */
function navLink(tool, current) {
  const a = el("a", "dt-link", { href: siteUrl(tool.path), "aria-label": tool.name });
  if (tool.id === current) a.setAttribute("aria-current", "page");
  const label = el("span", "dt-lbl");
  label.append(text("span", "dt-pre", tool.name.slice(0, -tool.short.length)), tool.short);
  a.append(label);
  return a;
}

/**
 * Pone la cabecera al principio de <body>. `current`: el id de la herramienta de la página
 * (TOOLS) o "home"; esa entrada lleva aria-current="page". Una sola vez por página.
 */
export function mountShell(current = "home") {
  if (document.querySelector(".dt-shell")) return;
  const brand = el("a", "dt-brand", { href: siteUrl() });
  brand.append(text("span", "dt-lbl", "Dofus Tools"));
  if (current === "home") brand.setAttribute("aria-current", "page");
  const nav = el("nav", "dt-nav", { "aria-label": "Herramientas" });
  nav.append(...TOOLS.map(t => navLink(t, current)));
  const inner = el("div", "dt-in");
  inner.append(brand, nav, themeToggle());
  const header = el("header", "dt-shell");
  header.append(inner);
  document.body.prepend(header);
}
