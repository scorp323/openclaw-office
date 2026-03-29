import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CostCounter } from "@/components/layout/CostCounter";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import type { ConnectionStatus, ThemeMode, PageId } from "@/gateway/types";
import { useOfficeStore } from "@/store/office-store";
import { useSoundState } from "@/hooks/useNotificationSounds";

const APP_VERSION = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

function getStatusConfig(
  t: (key: string) => string,
): Record<ConnectionStatus, { color: string; pulse: boolean; label: string }> {
  return {
    connecting: { color: "#eab308", pulse: true, label: t("common:status.connecting") },
    connected: { color: "#22c55e", pulse: false, label: t("common:status.connected") },
    reconnecting: { color: "#f97316", pulse: true, label: t("common:status.reconnecting") },
    disconnected: { color: "#6b7280", pulse: false, label: t("common:status.disconnected") },
    error: { color: "#ef4444", pulse: false, label: t("common:status.error") },
  };
}

interface TopBarProps {
  isMobile?: boolean;
}

export function TopBar({ isMobile = false }: TopBarProps) {
  const { t } = useTranslation("layout");
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const connectionError = useOfficeStore((s) => s.connectionError);
  const metrics = useOfficeStore((s) => s.globalMetrics);
  const theme = useOfficeStore((s) => s.theme);
  const setTheme = useOfficeStore((s) => s.setTheme);
  const currentPage = useOfficeStore((s) => s.currentPage);

  const statusCfg = getStatusConfig(t)[connectionStatus];
  const isOfficePage = currentPage === "office";

  return (
    <header className="grid h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-gray-200/80 bg-white px-3 sm:gap-4 sm:px-5 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.85)] dark:shadow-[0_0_15px_rgba(0,255,65,0.08)] dark:backdrop-blur-xl">
      <div className="min-w-0">
        <BrandSection metrics={metrics} isOfficePage={isOfficePage} isMobile={isMobile} />
      </div>
      <TopNav currentPage={currentPage} />
      <div className="ml-auto flex items-center gap-1.5 justify-self-end sm:gap-3">
        <span className="hidden sm:inline-flex"><CostCounter /></span>
        <NotificationBell />
        <span className="hidden sm:inline-flex"><MuteToggle /></span>
        <ThemeToggle theme={theme} setTheme={setTheme} />
        <span className="hidden sm:inline-flex"><LanguageSwitcher /></span>
        <ConnectionIndicator
          statusCfg={statusCfg}
          connectionError={connectionError}
          connectionStatus={connectionStatus}
        />
      </div>
    </header>
  );
}

function BrandSection({
  metrics,
  isOfficePage,
  isMobile,
}: {
  metrics: { activeAgents: number; totalAgents: number; totalTokens: number };
  isOfficePage: boolean;
  isMobile?: boolean;
}) {
  const { t } = useTranslation("layout");

  return (
    <div className="flex min-w-0 items-center gap-3">
      <h1 className="glow-green truncate text-xs font-semibold tracking-tight text-gray-800 sm:text-sm dark:text-[#00ff41]">
        <span className="sm:hidden">MC</span>
        <span className="hidden sm:inline">Morpheus Command Center</span>
      </h1>
      <span className="hidden rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] tabular-nums text-gray-400 sm:inline dark:bg-[rgba(0,255,65,0.1)] dark:text-[#00ff41]">
        v{APP_VERSION}
      </span>
      {isOfficePage && !isMobile && (
        <div className="ml-2 hidden items-center gap-5 text-xs text-gray-400 dark:text-[#0a5d0a] xl:flex">
          <span>
            {t("topbar.activeCountText")}{" "}
            <strong className="text-gray-700 dark:text-[#00ff41]">
              {metrics.activeAgents}/{metrics.totalAgents}
            </strong>
          </span>
          <span>
            {t("topbar.tokensLabel")}{" "}
            <strong className="text-gray-700 dark:text-[#00ff41]">
              {formatTokens(metrics.totalTokens)}
            </strong>
          </span>
        </div>
      )}
    </div>
  );
}

function TopNav({ currentPage }: { currentPage: PageId }) {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const isOfficePage = currentPage === "office";
  const isChatPage = currentPage === "chat";
  const isConsolePage = !isOfficePage && !isChatPage;

  const items: { active: boolean; label: string; onClick: () => void }[] = [
    { active: isOfficePage, label: t("topbar.office"), onClick: () => navigate("/office") },
    { active: isChatPage, label: t("topbar.chat"), onClick: () => navigate("/chat") },
    { active: isConsolePage, label: t("topbar.console"), onClick: () => navigate("/dashboard") },
  ];

  return (
    <nav aria-label={t("topbar.navigation")} className="flex items-center gap-1">
      {items.map((item) => (
        <button
          key={item.label}
          onClick={item.onClick}
          className={`relative rounded-md px-4 py-1 text-sm font-medium transition-all ${
            item.active
              ? "text-gray-900 dark:text-[#00ff41] dark:shadow-[0_0_8px_rgba(0,255,65,0.15)]"
              : "text-gray-400 hover:text-gray-700 dark:text-[#0a5d0a] dark:hover:text-[#00ff41]"
          }`}
        >
          {item.label}
          {item.active && (
            <span className="absolute inset-x-1 -bottom-[9px] h-0.5 rounded-full bg-gray-900 dark:bg-[#00ff41] dark:shadow-[0_0_6px_#00ff41]" />
          )}
        </button>
      ))}
    </nav>
  );
}

function ConnectionIndicator({
  statusCfg,
  connectionError,
  connectionStatus,
}: {
  statusCfg: { color: string; pulse: boolean; label: string };
  connectionError: string | null;
  connectionStatus: ConnectionStatus;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-2.5 w-2.5 rounded-full"
        style={{
          backgroundColor: statusCfg.color,
          animation: statusCfg.pulse ? "pulse 1.5s ease-in-out infinite" : "none",
          boxShadow:
            connectionStatus === "connected"
              ? "0 0 6px #00ff41, 0 0 12px rgba(0,255,65,0.3)"
              : "none",
        }}
      />
      <span className="hidden text-sm text-gray-500 sm:inline dark:text-[#0a5d0a]">
        {connectionError && connectionStatus === "error" ? connectionError : statusCfg.label}
      </span>
    </div>
  );
}

function MuteToggle() {
  const { t } = useTranslation("layout");
  const { muted, toggleMute } = useSoundState();

  return (
    <button
      onClick={toggleMute}
      aria-label={muted ? t("topbar.sound.unmute", { defaultValue: "Unmute sounds" }) : t("topbar.sound.mute", { defaultValue: "Mute sounds" })}
      className="flex h-7 w-7 items-center justify-center rounded-md text-sm transition-colors hover:bg-gray-200 dark:hover:bg-[rgba(0,255,65,0.1)]"
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-[#0a5d0a]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500 dark:text-[#00ff41]">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}

function ThemeToggle({ theme, setTheme }: { theme: ThemeMode; setTheme: (t: ThemeMode) => void }) {
  const { t } = useTranslation("layout");

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label={theme === "light" ? t("topbar.theme.switchToDark") : t("topbar.theme.switchToLight")}
      className="ml-2 flex h-7 w-7 items-center justify-center rounded-md text-base transition-colors hover:bg-gray-200 dark:hover:bg-[rgba(0,255,65,0.1)]"
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1)}M`;
  }
  if (n >= 1_000) {
    return `${(n / 1_000).toFixed(1)}k`;
  }
  return String(n);
}
