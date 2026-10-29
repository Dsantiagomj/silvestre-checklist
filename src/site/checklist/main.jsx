import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DOFUS from "@dofus/config.js";
import { mountShell } from "../shell/shell.js";
import "../../tools/checklist/styles/global.css";
import App from "../../tools/checklist/App.jsx";
import { applyTheme, getState } from "../../tools/checklist/state/store.js";
import { applyPagePalette } from "../../tools/checklist/lib/palette.js";

// La paleta del Dofus (si no es la del Silvestre) y el tema, antes del primer render, como
// hacía init() en la versión vanilla.
applyPagePalette();
applyTheme(getState().theme);

// La cabecera del sitio «Dofus Tools» encima de la app, fuera de su raíz, con este Dofus
// como página actual. Solo en el sitio: el embebido no pasa por aquí
mountShell(DOFUS.id);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
