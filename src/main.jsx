import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./estilo.css";

// Assume a versão nova assim que ela estiver em cache; o app volta a funcionar offline.
registerSW({ immediate: true });

createRoot(document.getElementById("raiz")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
