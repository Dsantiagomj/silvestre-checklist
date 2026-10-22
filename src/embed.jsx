// ============================================================================
// EMBEBIDO — la app dentro de otra página (la de Torrente Arcano en Squarespace), sin
// iframe: el overlay de Picture-in-Picture no se abre desde un iframe. Se monta en una
// shadow root sobre #silvestre-root, así que su CSS no sale a la página ni el de la
// página entra. Se construye con `npm run build:embed` (vite.config.js).
// ============================================================================
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import css from "./styles/global.css?inline";
import App from "./App.jsx";
import { applyTheme, getState } from "./state/store.js";
import { mountIn } from "./lib/root.js";
import { pageFonts } from "./lib/fonts.js";
import { followPageHeader } from "./lib/pageHeader.js";

const HOST_ID = "silvestre-root";

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`Checklist Silvestre: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  // Las fuentes van en la página: dentro de una shadow root @font-face no se aplica
  style.textContent = pageFonts(css, "silvestre-fonts");
  // .app-root hace de <body> y lleva el tema
  const app = document.createElement("div");
  app.className = "app-root is-embed";
  shadow.append(style, app);
  mountIn(shadow, app);
  // --silvestre-top: la cabecera de la app se pega debajo de la fija de la página
  followPageHeader(host, "--silvestre-top");
  applyTheme(getState().theme);
  createRoot(app).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount();
