// ============================================================================
// «LA ETERNA COSECHA» EN EL SITIO — la cabecera del sitio y, debajo, el mismo checklist que
// el embebido (src/tools/cosecha/), en una shadow root sobre <main id="cosecha">: su CSS
// está escrito para ella. La cabecera no se pega, así que el carril se pega arriba del todo
// (--cosecha-top se queda en 0). Guarda en cosecha:done, como la vista previa que había aquí.
// ============================================================================
import css from "../../tools/cosecha/cosecha.css?inline";
import { mountShell } from "../shell/shell.js";
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
// En su página el título es el de la página: h1. Sin interruptor propio: el tema es el del sitio
renderCosecha(root, host, { heading: "h1", themeSwitch: false });
