import { Bell, Home, Newspaper, Settings, Building2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useNotificationBadge } from "@/hooks/useNotificationBadge";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/office", label: "Office", icon: Building2 },
  { path: "/briefing", label: "Briefing", icon: Newspaper },
  { path: "/notifications", label: "Alerts", icon: Bell },
  { path: "/settings", label: "Settings", icon: Settings },
];

export function MobileBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const notifBadge = useNotificationBadge();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md dark:border-[rgba(0,255,65,0.15)] dark:bg-gray-900/95 md:hidden"
      style={{ height: "56px", paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="flex h-full items-center justify-around px-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isNotif = item.path === "/notifications";

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-[10px] transition-colors ${
                isActive
                  ? "font-semibold text-emerald-500"
                  : "text-gray-400 dark:text-gray-500"
              }`}
              style={{ minHeight: 44 }}
            >
              <span className="relative">
                <Icon
                  className={`h-[22px] w-[22px] ${
                    isActive ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.6)]" : ""
                  }`}
                />
                {isNotif && notifBadge > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {notifBadge > 99 ? "99+" : notifBadge}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
