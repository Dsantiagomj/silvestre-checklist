// ============================================================================
// EMBEBIDO DEL INICIO — la portada de torrentearcano.com, en una shadow root sobre
// #inicio-root como el hub (src/embeds/hub/embed.js): su CSS no sale a la página ni el de la página
// entra. Se construye con `npm run build:inicio` (vite.config.js) y no carga la app ni sus
// datos. Solo vive en Squarespace: no tiene página propia en GitHub Pages.
// ============================================================================
import css from "./inicio.css?inline";
import { pageFonts } from "../../lib/fonts.js";
import { renderInicio } from "./inicio.js";
import { fillViewportWidth } from "../../lib/pageHeader.js";

const HOST_ID = "inicio-root";

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`Inicio de Torrente Arcano: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
  style.textContent = pageFonts(css, "inicio-fonts");
  const root = document.createElement("div");
  root.className = "inicio";
  shadow.append(style, root);
  // De borde a borde como el hub, pero con su alto natural: es contenido de la página, no una pantalla
  fillViewportWidth(host);
  renderInicio(root);
}

mount();
