import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./i18n";
import { App } from "./App";
import "./styles/globals.css";

document.documentElement.classList.add("dark");

// ── Console warnings for common misconfigurations ──
if (typeof window !== "undefined") {
  const isDev = import.meta.env.DEV;
  const token = import.meta.env.VITE_GATEWAY_TOKEN;
  const injected = (window as unknown as Record<string, unknown>).__OPENCLAW_CONFIG__ as
    | { gatewayToken?: string } | undefined;

  if (!token && !injected?.gatewayToken) {
    console.warn(
      "[OpenClaw Office] No gateway token configured. Set VITE_GATEWAY_TOKEN in .env.local or inject __OPENCLAW_CONFIG__.gatewayToken. Gateway connection will fail.",
    );
  }

  if (isDev && window.location.protocol === "https:") {
    console.warn(
      "[OpenClaw Office] Running dev server over HTTPS. Ensure your Gateway WebSocket URL uses wss:// to avoid mixed-content errors.",
    );
  }

  if (!isDev && !navigator.serviceWorker) {
    console.warn(
      "[OpenClaw Office] Service workers are not supported in this browser. Offline features and caching will be unavailable.",
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
