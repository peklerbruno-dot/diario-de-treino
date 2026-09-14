import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";
import "./estilo.css";

// Assume a versão nova assim que ela estiver em cache; o app volta a funcionar offline.
// A página aberta não é recarregada de propósito: um treino em preenchimento não pode
// se perder no meio. A versão nova entra na abertura seguinte.
registerSW({
  immediate: true,
  onRegisteredSW(_url, registro) {
    // Ao voltar para o app, procura versão nova em segundo plano.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) registro?.update().catch(() => {});
    });
  },
});

createRoot(document.getElementById("raiz")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
