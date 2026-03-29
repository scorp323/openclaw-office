import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  RefreshCw,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface LogEntry {
  source: string;
  text: string;
  file: string;
  ts: number;
}

type NotifLevel = "error" | "warn";
type FilterTab = "all" | "errors" | "warnings" | "unread";

const READ_KEY = "mc_read_notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore
  }
  return new Set();
}

function saveReadIds(ids: Set<string>) {
  localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

function detectLevel(text: string): NotifLevel | null {
  const upper = text.slice(0, 80).toUpperCase();
  if (upper.includes("ERROR") || upper.includes("ERR ") || upper.includes("[ERROR]"))
    return "error";
  if (upper.includes("WARN") || upper.includes("[WARN]")) return "warn";
  return null;
}

export function makeNotifId(entry: LogEntry): string {
  return `${entry.ts}-${entry.source}-${entry.text.slice(0, 20)}`;
}

export function getUnreadNotifCount(entries: LogEntry[]): number {
  const readIds = getReadIds();
  return entries.filter((e) => detectLevel(e.text) !== null && !readIds.has(makeNotifId(e)))
    .length;
}

export function NotificationsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [filter, setFilter] = useState<FilterTab>("all");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/mc-api/logs");
      const data = (await res.json()) as { entries?: LogEntry[] };
      const all = data.entries ?? [];
      setEntries(all.filter((e) => detectLevel(e.text) !== null).reverse());
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const allIds = new Set(entries.map(makeNotifId));
    saveReadIds(allIds);
    setReadIds(allIds);
  }, [entries]);

  const unreadCount = useMemo(
    () => entries.filter((e) => !readIds.has(makeNotifId(e))).length,
    [entries, readIds],
  );

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const id = makeNotifId(e);
      const level = detectLevel(e.text);
      if (filter === "errors") return level === "error";
      if (filter === "warnings") return level === "warn";
      if (filter === "unread") return !readIds.has(id);
      return true;
    });
  }, [entries, filter, readIds]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Notifications
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Errors and warnings from system logs
            {unreadCount > 0 && (
              <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-400">
                {unreadCount} unread
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Clear All
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-900">
        {(["all", "errors", "warnings", "unread"] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              filter === tab
                ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab}
            {tab === "unread" && unreadCount > 0 && (
              <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-sm text-gray-400">
          <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
          Loading...
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BellOff
            className="h-12 w-12 text-gray-300 dark:text-gray-600"
            strokeWidth={1.5}
          />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No notifications
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filter === "unread"
              ? "All caught up!"
              : "No errors or warnings found in logs"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const id = makeNotifId(entry);
            const level = detectLevel(entry.text)!;
            const isRead = readIds.has(id);
            return (
              <div
                key={id}
                className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${
                  isRead
                    ? "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
                    : level === "error"
                      ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10"
                      : "border-yellow-200 bg-yellow-50 dark:border-yellow-800/50 dark:bg-yellow-900/10"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {level === "error" ? (
                    <AlertOctagon className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        level === "error"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                          : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400"
                      }`}
                    >
                      {level}
                    </span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {entry.source}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(entry.ts).toLocaleString()}
                    </span>
                  </div>
                  <p
                    className={`text-sm ${
                      isRead
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {entry.text}
                  </p>
                </div>
                {!isRead && (
                  <button
                    type="button"
                    onClick={() => markRead(id)}
                    className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
