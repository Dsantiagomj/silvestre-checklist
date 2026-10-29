import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import DOFUS from "@dofus/config.js";
import { mountShell } from "../shell/shell.js";
import { onSiteTheme, resolveTheme } from "../shell/theme.js";
import "../../tools/checklist/styles/global.css";
import App from "../../tools/checklist/App.jsx";
import { applyTheme } from "../../tools/checklist/state/store.js";
import { applyPagePalette } from "../../tools/checklist/lib/palette.js";

// La paleta del Dofus (si no es la del Silvestre) y el tema, antes del primer render, como
// hacía init() en la versión vanilla. El tema es el del sitio (dofus-tools:theme): el script
// del <head> ya lo puso en <html>; se vuelve a leer porque la primera visita puede traer el
// del checklist clásico (store.js) y, sin tema del sitio, ese se trae como el del sitio.
// La app no lo guarda en su clave: en el sitio lo guarda el sitio
applyPagePalette();
applyTheme(resolveTheme(), { persist: false });

// La cabecera del sitio «Dofus Tools» encima de la app, fuera de su raíz, con este Dofus
// como página actual y el interruptor del tema. Solo en el sitio: el embebido no pasa por aquí
mountShell(DOFUS.id);
// Al cambiarlo, la app lo sigue en el acto (dentro de la View Transition de la cabecera)
onSiteTheme(t => flushSync(() => applyTheme(t, { persist: false })));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
