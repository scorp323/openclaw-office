import { Home, Bot, Radio, Puzzle, Clock, Settings, WifiOff, Terminal, DollarSign, Brain } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { RestartBanner } from "@/components/shared/RestartBanner";
import { useIsStale } from "@/hooks/useLiveData";
import { useResponsive } from "@/hooks/useResponsive";
import { MobileBottomNav } from "./MobileBottomNav";
import { TopBar } from "./TopBar";

function PageTransition({ locationKey }: { locationKey: string }) {
  const [visible, setVisible] = useState(true);
  const prevKey = useRef(locationKey);

  useEffect(() => {
    if (prevKey.current !== locationKey) {
      setVisible(false);
      const id = requestAnimationFrame(() => {
        prevKey.current = locationKey;
        setVisible(true);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [locationKey]);

  return (
    <div
      className="transition-[opacity,transform] duration-200 ease-out"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
      }}
    >
      <Outlet />
    </div>
  );
}

export function ConsoleLayout() {
  const { t } = useTranslation(["layout", "console"]);
  const location = useLocation();
  const navigate = useNavigate();
  const isChatRoute = location.pathname === "/chat";
  const isStale = useIsStale();
  const { isMobile } = useResponsive();

  const sidebarNavItems = [
    { path: "/dashboard", labelKey: "consoleNav.dashboard", icon: Home },
    { path: "/agents", labelKey: "consoleNav.agents", icon: Bot },
    { path: "/channels", labelKey: "consoleNav.channels", icon: Radio },
    { path: "/skills", labelKey: "consoleNav.skills", icon: Puzzle },
    { path: "/cron", labelKey: "consoleNav.cron", icon: Clock },
    { path: "/settings", labelKey: "consoleNav.settings", icon: Settings },
    { path: "/logs", labelKey: "consoleNav.logs", icon: Terminal },
    { path: "/costs", labelKey: "consoleNav.costs", icon: DollarSign },
    { path: "/memory", labelKey: "consoleNav.memory", icon: Brain },
  ] as const;

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <RestartBanner />
      {isStale && (
        <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
          <WifiOff className="h-4 w-4 flex-shrink-0" />
          <span>{t("console:dashboard.offline.banner")}</span>
        </div>
      )}
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        {!isChatRoute && !isMobile && (
          <nav aria-label="Console navigation" className="flex w-52 shrink-0 flex-col border-r border-gray-200 bg-white py-3 dark:border-gray-700 dark:bg-gray-900">
            {sidebarNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  onMouseEnter={() => {
                    // Prefetch page on hover
                    const pageMap: Record<string, () => Promise<unknown>> = {
                      "/dashboard": () => import("@/components/pages/DashboardPage"),
                      "/agents": () => import("@/components/pages/AgentsPage"),
                      "/channels": () => import("@/components/pages/ChannelsPage"),
                      "/skills": () => import("@/components/pages/SkillsPage"),
                      "/cron": () => import("@/components/pages/CronPage"),
                      "/settings": () => import("@/components/pages/SettingsPage"),
                      "/logs": () => import("@/components/pages/LogsPage"),
                      "/costs": () => import("@/components/pages/CostsPage"),
                      "/memory": () => import("@/components/pages/MemoryPage"),
                    };
                    pageMap[item.path]?.();
                  }}
                  className={`mx-2 flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? "bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </nav>
        )}
        <main id="main-content" className="flex-1 overflow-auto">
          <div className={`${isChatRoute ? "h-full p-6" : "mx-auto max-w-6xl p-6"} ${isMobile ? "pb-20" : ""}`}>
            <PageTransition locationKey={location.key} />
          </div>
        </main>
      </div>
      {isMobile && <MobileBottomNav />}
    </div>
  );
}
