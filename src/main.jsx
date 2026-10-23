import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.jsx";
import { applyTheme, getState } from "./state/store.js";
import { applyPagePalette } from "./lib/palette.js";

// La paleta del Dofus (si no es la del Silvestre) y el tema, antes del primer render, como
// hacía init() en la versión vanilla.
applyPagePalette();
applyTheme(getState().theme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
