import { useEffect, useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { ChatDialog } from "@/components/chat/ChatDialog";
import { ChatDockBar } from "@/components/chat/ChatDockBar";
import { RestartBanner } from "@/components/shared/RestartBanner";
import { ToastContainer } from "@/components/shared/ToastContainer";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { useOfficeStore } from "@/store/office-store";
import { QuickActionsFab } from "./QuickActionsFab";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppShellProps {
  children?: ReactNode;
  isMobile?: boolean;
}

export function AppShell({ children, isMobile = false }: AppShellProps) {
  const { t } = useTranslation("layout");
  const sidebarCollapsed = useOfficeStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useOfficeStore((s) => s.setSidebarCollapsed);
  const currentPage = useOfficeStore((s) => s.currentPage);

  const initEventHistory = useOfficeStore((s) => s.initEventHistory);
  const hideSidebar = currentPage === "chat";
  const shellRef = useRef<HTMLDivElement>(null);
  useSwipeNavigation(shellRef);

  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile, setSidebarCollapsed]);

  // Restore event history from IndexedDB on mount
  useEffect(() => {
    initEventHistory();
  }, [initEventHistory]);

  const content = children ?? <Outlet />;

  return (
    <div ref={shellRef} className="flex h-screen w-screen flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <RestartBanner />
      <TopBar isMobile={isMobile} />
      <ToastContainer />
      <div className="relative flex flex-1 overflow-hidden">
        <main className="relative flex flex-1 flex-col overflow-hidden">
          <div className="relative flex-1 overflow-hidden">{content}</div>
          <ChatDialog />
          {!hideSidebar && <ChatDockBar />}
        </main>
        {!hideSidebar && (isMobile ? (
          <>
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="fixed bottom-0 left-1/2 z-20 flex h-10 w-full max-w-xs -translate-x-1/2 items-center justify-center border-t border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900"
              aria-label={sidebarCollapsed ? t("sidebar.expandSidebar") : t("sidebar.collapseSidebar")}
            >
              <div className="h-1 w-12 rounded-full bg-gray-300 dark:bg-gray-600" />
            </button>
            {!sidebarCollapsed && (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSidebarCollapsed(true)}
                  onKeyDown={(e) => e.key === "Escape" && setSidebarCollapsed(true)}
                  className="fixed inset-0 z-30 bg-black/30"
                  aria-label={t("sidebar.closeSidebar")}
                />
                <aside className="fixed inset-x-0 bottom-10 top-12 z-40 overflow-hidden rounded-t-xl border-t border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
                  <Sidebar />
                </aside>
              </>
            )}
          </>
        ) : (
          <Sidebar />
        ))}
      </div>
      {isMobile && <MobileBottomNav />}
      <QuickActionsFab />
    </div>
  );
}

function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const items = [
    { path: "/", icon: "🏠", label: "Home" },
    { path: "/office", icon: "🏢", label: "Office" },
    { path: "/agents", icon: "🤖", label: "Agents" },
    { path: "/chat", icon: "💬", label: "Chat" },
    { path: "/dashboard", icon: "📊", label: "Stats" },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-gray-200 bg-white dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.95)] md:hidden">
      {items.map((item) => {
        const isActive =
          item.path === "/dashboard"
            ? !["/office", "/chat"].includes(location.pathname)
            : location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-2 ${
              isActive
                ? "text-gray-900 dark:text-[#00ff41]"
                : "text-gray-400 dark:text-[#0a5d0a]"
            }`}
            style={{ minHeight: 48 }}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
