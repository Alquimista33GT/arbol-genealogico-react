import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 🔴 Captura errores globales (muy útil en producción)
window.addEventListener("error", (e) => {
  console.error("Error global:", e.error || e.message);
});

window.addEventListener("unhandledrejection", (e) => {
  console.error("Promise no manejada:", e.reason);
});

// ✅ Montaje seguro de React
const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("No se encontró el div #root");
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
