// ============================================================================
// EMBEBIDO DE «LA ETERNA COSECHA» — el checklist de las almas del Dofus Ocre, en una shadow
// root sobre #cosecha-root como el inicio (src/inicio/embed.js): su CSS no sale a la página
// ni el de la página entra. Se construye con `npm run build:cosecha` (vite.config.js), lleva
// dentro sus 337 almas y no carga la app ni sus datos. Su vista previa en GitHub Pages es
// public/cosecha/index.html.
// ============================================================================
import css from "./cosecha.css?inline";
import { pageFonts } from "../lib/fonts.js";
import { renderCosecha } from "./cosecha.js";
import { fillViewportWidth, followPageHeader } from "../lib/pageHeader.js";

const HOST_ID = "cosecha-root";

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`La eterna cosecha: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
  style.textContent = pageFonts(css, "cosecha-fonts");
  const root = document.createElement("div");
  root.className = "cosecha";
  shadow.append(style, root);
  // De borde a borde como el inicio, con su alto natural
  fillViewportWidth(host);
  // --cosecha-top: el carril se pega debajo de la cabecera fija de la página
  followPageHeader(host, "--cosecha-top");
  renderCosecha(root, host);
}

mount();
