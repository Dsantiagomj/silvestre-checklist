import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import App from "./App.jsx";
import { applyTheme, getState } from "./state/store.js";

// El tema se aplica antes del primer render, como hacía init() en la versión vanilla.
applyTheme(getState().theme);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
