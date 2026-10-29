// ============================================================================
// «LA ETERNA COSECHA» EN EL SITIO — la cabecera del sitio y, debajo, el mismo checklist que
// el embebido (src/tools/cosecha/), en una shadow root sobre <main id="cosecha">: su CSS
// está escrito para ella. La cabecera no se pega, así que el carril se pega arriba del todo
// (--cosecha-top se queda en 0). Guarda en cosecha:done, como la vista previa que había aquí.
// El tema es el del sitio, el de la cabecera (no cosecha:theme, que es del embebido).
// ============================================================================
import css from "../../tools/cosecha/cosecha.css?inline";
import { mountShell } from "../shell/shell.js";
import { onSiteTheme, siteTheme } from "../shell/theme.js";
import { pageFonts } from "../../lib/fonts.js";
import { renderCosecha } from "../../tools/cosecha/cosecha.js";

// La cabecera al ancho de la cosecha (1176px con 32px a cada lado, cosecha.css), para que
// la marca y el huevo empiecen en la misma línea
document.documentElement.style.setProperty("--dt-max", "1176px");
document.documentElement.style.setProperty("--dt-side", "64px");
mountShell("cosecha");

const host = document.getElementById("cosecha");
const shadow = host.attachShadow({ mode: "open" });
const style = document.createElement("style");
// Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
style.textContent = pageFonts(css, "cosecha-fonts");
const root = document.createElement("div");
root.className = "cosecha";
shadow.append(style, root);
// En su página el título es el de la página: h1. Sin interruptor propio: el tema es el del
// sitio (el script del <head> ya lo puso en <html>) y lo sigue al cambiarlo en la cabecera
const cosecha = renderCosecha(root, host, { heading: "h1", themeSwitch: false, theme: siteTheme() });
onSiteTheme(t => cosecha.setTheme(t));
