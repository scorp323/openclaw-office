import { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ConsoleLayout } from "@/components/layout/ConsoleLayout";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { SearchSpotlight } from "@/components/layout/SearchSpotlight";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { SystemHealthBar } from "@/components/layout/SystemHealthBar";
import { CommandCenter } from "@/components/pages/CommandCenter";
import { ChatWorkspaceBootstrap } from "@/components/chat/ChatWorkspaceBootstrap";

// Lazy-load heavy pages — keeps initial bundle small
const FloorPlan = lazy(() => import("@/components/office-2d/FloorPlan").then(m => ({ default: m.FloorPlan })));
const AgentsPage = lazy(() => import("@/components/pages/AgentsPage").then(m => ({ default: m.AgentsPage })));
const ChannelsPage = lazy(() => import("@/components/pages/ChannelsPage").then(m => ({ default: m.ChannelsPage })));
const CronPage = lazy(() => import("@/components/pages/CronPage").then(m => ({ default: m.CronPage })));
const DashboardPage = lazy(() => import("@/components/pages/DashboardPage").then(m => ({ default: m.DashboardPage })));
const ChatPage = lazy(() => import("@/components/pages/ChatPage").then(m => ({ default: m.ChatPage })));
const SettingsPage = lazy(() => import("@/components/pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const SkillsPage = lazy(() => import("@/components/pages/SkillsPage").then(m => ({ default: m.SkillsPage })));
const LogsPage = lazy(() => import("@/components/pages/LogsPage").then(m => ({ default: m.LogsPage })));
const CostsPage = lazy(() => import("@/components/pages/CostsPage").then(m => ({ default: m.CostsPage })));
const MemoryPage = lazy(() => import("@/components/pages/MemoryPage").then(m => ({ default: m.MemoryPage })));
import type { PageId } from "@/gateway/types";
import { useGatewayConnection } from "@/hooks/useGatewayConnection";
import { useNotifications } from "@/hooks/useNotifications";
import { useResponsive } from "@/hooks/useResponsive";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useOfficeStore } from "@/store/office-store";

function LoadingScreen() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      height: "100vh", width: "100vw",
      background: "#000", color: "#00ff41",
      fontFamily: "'JetBrains Mono', monospace",
      flexDirection: "column", gap: 12,
    }}>
      <div style={{ fontSize: 40, animation: "pulse 1.5s ease-in-out infinite" }}>🌀</div>
      <div style={{ fontSize: 14, opacity: 0.7 }}>Loading Morpheus...</div>
    </div>
  );
}

function ThemeSync() {
  const theme = useOfficeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  return null;
}

const PAGE_MAP: Record<string, PageId> = {
  "/": "dashboard",
  "/office": "office",
  "/chat": "chat",
  "/dashboard": "dashboard",
  "/agents": "agents",
  "/channels": "channels",
  "/skills": "skills",
  "/cron": "cron",
  "/settings": "settings",
  "/logs": "logs",
  "/costs": "costs",
  "/memory": "memory",
};

function resolveGatewayWsUrl(pathOrUrl: string, fallbackUrl: string): string {
  const value = (pathOrUrl || "").trim();
  if (value.startsWith("ws://") || value.startsWith("wss://")) {
    return value;
  }
  if (value.startsWith("http://") || value.startsWith("https://")) {
    const url = new URL(value);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return url.toString();
  }
  if (value.startsWith("/")) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${value}`;
  }
  return fallbackUrl;
}

function PageTracker() {
  const location = useLocation();
  const setCurrentPage = useOfficeStore((s) => s.setCurrentPage);

  useEffect(() => {
    const page = PAGE_MAP[location.pathname] ?? "office";
    setCurrentPage(page);
  }, [location.pathname, setCurrentPage]);

  return null;
}

export function App() {
  const injected = (window as unknown as Record<string, unknown>).__OPENCLAW_CONFIG__ as
    | { gatewayUrl?: string; gatewayToken?: string; gatewayWsPath?: string }
    | undefined;
  const configuredGatewayUrl = injected?.gatewayUrl || import.meta.env.VITE_GATEWAY_URL || "ws://localhost:18789";
  const gatewayUrl = resolveGatewayWsUrl(
    injected?.gatewayWsPath || import.meta.env.VITE_GATEWAY_WS_PATH || "/gateway-ws",
    configuredGatewayUrl,
  );
  const gatewayToken = injected?.gatewayToken || import.meta.env.VITE_GATEWAY_TOKEN || "";
  const { isMobile } = useResponsive();
  const { wsClient } = useGatewayConnection({ url: gatewayUrl, token: gatewayToken });
  useNotifications();
  const { helpOpen, closeHelp } = useKeyboardShortcuts();

  return (
    <>
      <ThemeSync />
      <PageTracker />
      <ChatWorkspaceBootstrap wsClient={wsClient} />
      <SearchSpotlight />
      <SystemHealthBar />
      <KeyboardShortcutsModal open={helpOpen} onClose={closeHelp} />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/" element={<ErrorBoundary><CommandCenter /></ErrorBoundary>} />
            <Route path="/office" element={<ErrorBoundary><AppShell isMobile={isMobile}><FloorPlan /></AppShell></ErrorBoundary>} />
            <Route element={<ConsoleLayout />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/agents" element={<AgentsPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/skills" element={<SkillsPage />} />
              <Route path="/cron" element={<CronPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/logs" element={<LogsPage />} />
              <Route path="/costs" element={<CostsPage />} />
              <Route path="/memory" element={<MemoryPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  );
}
