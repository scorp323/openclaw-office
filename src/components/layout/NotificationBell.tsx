import { useEffect, useRef } from "react";
import { useNotificationBellStore } from "@/store/console-stores/notification-bell-store";
import type { NotificationItem } from "@/store/console-stores/notification-bell-store";

const POLL_INTERVAL = 30_000;

function typeIcon(type: NotificationItem["type"]): string {
  switch (type) {
    case "cron_failure":
      return "!";
    case "agent_error":
      return "!";
    case "task_complete":
      return "\u2713";
    default:
      return "i";
  }
}

function typeColor(type: NotificationItem["type"]): string {
  switch (type) {
    case "cron_failure":
    case "agent_error":
      return "bg-red-500";
    case "task_complete":
      return "bg-green-500";
    default:
      return "bg-blue-500";
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function NotificationBell() {
  const items = useNotificationBellStore((s) => s.items);
  const unreadCount = useNotificationBellStore((s) => s.unreadCount);
  const isOpen = useNotificationBellStore((s) => s.isOpen);
  const toggleOpen = useNotificationBellStore((s) => s.toggleOpen);
  const close = useNotificationBellStore((s) => s.close);
  const markAllRead = useNotificationBellStore((s) => s.markAllRead);
  const fetchActivity = useNotificationBellStore((s) => s.fetchActivity);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchActivity();
    const interval = setInterval(fetchActivity, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchActivity]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, close]);

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => {
          toggleOpen();
          if (!isOpen) markAllRead();
        }}
        className="relative flex h-7 w-7 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-200 dark:text-[#0a5d0a] dark:hover:bg-[rgba(0,255,65,0.1)]"
        aria-label="Notifications"
      >
        <BellSvg />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.95)]">
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2 dark:border-[rgba(0,255,65,0.1)]">
            <span className="text-xs font-medium text-gray-600 dark:text-[#00ff41]">
              Notifications
            </span>
            {items.length > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[10px] text-gray-400 hover:text-gray-600 dark:text-[#0a5d0a] dark:hover:text-[#00ff41]"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-64 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-gray-400 dark:text-[#0a5d0a]">
                No notifications
              </div>
            ) : (
              items.slice(0, 20).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-2 border-b border-gray-50 px-3 py-2 dark:border-[rgba(0,255,65,0.05)] ${
                    !item.read ? "bg-blue-50/50 dark:bg-[rgba(0,255,65,0.03)]" : ""
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${typeColor(item.type)}`}
                  >
                    {typeIcon(item.type)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                        {item.title}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-[#0a5d0a]">
                        {timeAgo(item.ts)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {item.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellSvg() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
