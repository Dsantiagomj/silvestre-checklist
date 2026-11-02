// ============================================================================
// EMBEBIDO DE LAS GUÍAS DE LOS DOFUS — la página torrentearcano.com/guias-dofus, en una
// shadow root sobre #guias-root como el inicio (src/embeds/inicio/embed.js): su CSS no sale a
// la página ni el de la página entra. Se construye con `npm run build:guias` (vite.config.js)
// y no carga la app ni sus datos. En GitHub Pages tiene su vista previa en /guias-dofus/
// (public/guias-dofus/index.html), fuera del menú del sitio.
// Lleva el h1 de la página, como el inicio: la página de Torre no tiene otro.
// ============================================================================
import css from "./guias.css?inline";
import { pageFonts } from "../../lib/fonts.js";
import { renderGuias } from "./guias.js";
import { fillViewportWidth, followPageHeader } from "../../lib/pageHeader.js";

const HOST_ID = "guias-root";

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`Guías de Dofus: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
  style.textContent = pageFonts(css, "guias-fonts");
  const root = document.createElement("div");
  root.className = "guias";
  shadow.append(style, root);
  // De borde a borde como la cosecha, con su alto natural
  fillViewportWidth(host);
  // --guias-top: la barra de filtros se pega debajo de la cabecera fija de la página
  followPageHeader(host, "--guias-top");
  renderGuias(root);
}

mount();
