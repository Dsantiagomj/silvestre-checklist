// ============================================================================
// EMBEBIDO — la app dentro de otra página (la de Torrente Arcano en Squarespace), sin
// iframe: el overlay de Picture-in-Picture no se abre desde un iframe. Se monta en una
// shadow root sobre #silvestre-root (embed.hostId en config.js del Dofus), así que su CSS
// no sale a la página ni el de la página entra. Se construye con `npm run build:embed`
// (vite.config.js).
// ============================================================================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import css from "../../tools/checklist/styles/global.css?inline";
import App from "../../tools/checklist/App.jsx";
import { applyTheme, getState } from "../../tools/checklist/state/store.js";
import { mountIn } from "../../tools/checklist/lib/root.js";
import { pageFonts } from "../../lib/fonts.js";
import { paletteCss } from "../../tools/checklist/lib/palette.js";
import { fillViewportWidth, followPageHeader } from "../../lib/pageHeader.js";
import DOFUS from "@dofus/config.js";

const { hostId: HOST_ID, topVar, fonts, logName } = DOFUS.embed;

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`${logName}: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica.
  // global.css lee --silvestre-top: si el Dofus usa otro nombre (embed.topVar), se cambia aquí
  // La paleta del Dofus (lib/palette.js) va detrás, en la misma hoja
  style.textContent = pageFonts(topVar === "--silvestre-top" ? css : css.replaceAll("--silvestre-top", topVar), fonts)
    + paletteCss();
  // .app-root hace de <body> y lleva el tema
  const app = document.createElement("div");
  app.className = "app-root is-embed";
  shadow.append(style, app);
  mountIn(shadow, app);
  // De borde a borde aunque el bloque de la página sea una columna estrecha
  fillViewportWidth(host);
  // --silvestre-top (embed.topVar): la cabecera de la app se pega debajo de la fija de la página
  followPageHeader(host, topVar);
  applyTheme(getState().theme);
  createRoot(app).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount();
