// ============================================================================
// EMBEBIDO DEL HUB — las franjas de los checklists en la página de Torrente Arcano
// (Squarespace), en una shadow root sobre #checklists-root como el del Silvestre
// (src/embed.jsx): su CSS no sale a la página ni el de la página entra. Se construye con
// `npm run build:hub` (vite.config.js) y no carga la app ni sus datos.
// ============================================================================
import css from "./hub.css?inline";
import { pageFonts } from "../lib/fonts.js";
import { renderHub } from "./hub.js";
import { fillViewportWidth, followPageHeader } from "../lib/pageHeader.js";

const HOST_ID = "checklists-root";

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`Checklists de Torrente Arcano: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
  style.textContent = pageFonts(css, "checklists-fonts");
  const root = document.createElement("div");
  root.className = "hub";
  shadow.append(style, root);
  // A pantalla completa: de borde a borde y del alto que deja la cabecera fija (--checklists-top)
  fillViewportWidth(host);
  followPageHeader(host, "--checklists-top");
  renderHub(root);
}

mount();
