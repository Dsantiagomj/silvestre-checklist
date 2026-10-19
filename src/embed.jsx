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

const HOST_ID = "silvestre-root";

// Las fuentes van en la página: dentro de una shadow root @font-face no se aplica. Es la
// misma hoja que importa global.css, que dentro se quita para no pedirla dos veces
// (el build la deja como `@import "…";` y en desarrollo va como `@import url('…');`)
const FONTS = css.match(/@import\s+(?:url\(\s*)?(['"])(.+?)\1\s*\)?[^;]*;/);

function addFonts() {
  if (!FONTS || document.querySelector("link[data-silvestre-fonts]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = FONTS[2];
  link.dataset.silvestreFonts = "";
  document.head.appendChild(link);
}

/**
 * Lo que tapa arriba la cabecera fija de la página (la de Squarespace, #header), en
 * --silvestre-top: la cabecera de la app se pega debajo y la ventana de pasos cabe en lo
 * que queda. Si la página ya lo pone en el anfitrión, manda el suyo.
 */
function followPageHeader(host) {
  if (host.style.getPropertyValue("--silvestre-top")) return;
  const header = document.getElementById("header") || document.querySelector("body > header");
  if (!header) return;
  let frame = 0;
  const sync = () => {
    frame = 0;
    const pos = getComputedStyle(header).position;
    const top = pos === "fixed" || pos === "sticky" ? Math.max(0, Math.round(header.getBoundingClientRect().bottom)) : 0;
    host.style.setProperty("--silvestre-top", `${top}px`);
  };
  const later = () => { if (!frame) frame = requestAnimationFrame(sync); };
  sync();
  new ResizeObserver(later).observe(header);
  window.addEventListener("resize", later, { passive: true });
  window.addEventListener("scroll", later, { passive: true });
}

function mount() {
  const host = document.getElementById(HOST_ID);
  if (!host) {
    console.error(`Checklist Silvestre: falta <div id="${HOST_ID}"></div> en la página.`);
    return;
  }
  if (host.shadowRoot) return; // el script se pegó dos veces
  addFonts();
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = FONTS ? css.replace(FONTS[0], "") : css;
  // .app-root hace de <body> y lleva el tema
  const app = document.createElement("div");
  app.className = "app-root is-embed";
  shadow.append(style, app);
  mountIn(shadow, app);
  followPageHeader(host);
  applyTheme(getState().theme);
  createRoot(app).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

mount();
