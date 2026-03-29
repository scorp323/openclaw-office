import {
  Bot,
  Home,
  MessageSquare,
  MoreHorizontal,
  Radio,
  Puzzle,
  Clock,
  Settings,
  Terminal,
  DollarSign,
  Brain,
  Zap,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import type { LucideIcon } from "lucide-react";

interface NavItem {
  path: string;
  labelKey: string;
  icon: LucideIcon;
}

const PRIMARY_NAV: NavItem[] = [
  { path: "/dashboard", labelKey: "consoleNav.dashboard", icon: Home },
  { path: "/office", labelKey: "topbar.office", icon: Home },
  { path: "/chat", labelKey: "topbar.chat", icon: MessageSquare },
  { path: "/agents", labelKey: "consoleNav.agents", icon: Bot },
];

const MORE_NAV: NavItem[] = [
  { path: "/channels", labelKey: "consoleNav.channels", icon: Radio },
  { path: "/skills", labelKey: "consoleNav.skills", icon: Puzzle },
  { path: "/cron", labelKey: "consoleNav.cron", icon: Clock },
  { path: "/settings", labelKey: "consoleNav.settings", icon: Settings },
  { path: "/logs", labelKey: "consoleNav.logs", icon: Terminal },
  { path: "/costs", labelKey: "consoleNav.costs", icon: DollarSign },
  { path: "/memory", labelKey: "consoleNav.memory", icon: Brain },
  { path: "/actions", labelKey: "consoleNav.actions", icon: Zap },
];

function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
        role="button"
        tabIndex={-1}
      />
      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-[rgba(0,255,65,0.15)] dark:bg-gray-900"
        style={{ animation: "slideUp 200ms ease-out" }}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">More</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 p-3">
          {MORE_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-xs transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 font-medium text-emerald-500"
                    : "text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export function MobileBottomNav() {
  const { t } = useTranslation("layout");
  const navigate = useNavigate();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  const closeMore = useCallback(() => setMoreOpen(false), []);

  const isMoreActive = MORE_NAV.some((item) => location.pathname === item.path);

  return (
    <>
      <MoreSheet open={moreOpen} onClose={closeMore} />
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-gray-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:border-[rgba(0,255,65,0.15)] dark:bg-gray-900/95 md:hidden"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 4px)" }}
      >
        {PRIMARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
                isActive
                  ? "font-medium text-emerald-500"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""}`} />
              <span>{t(item.labelKey)}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] transition-colors ${
            isMoreActive || moreOpen
              ? "font-medium text-emerald-500"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <MoreHorizontal aria-hidden="true" className={`h-5 w-5 ${isMoreActive ? "drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" : ""}`} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}
