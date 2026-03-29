import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Trash2,
  VolumeX,
} from "lucide-react";
import { NotificationsSkeleton } from "@/components/console/shared/Skeleton";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useOfficeStore } from "@/store/office-store";

interface LogEntry {
  source: string;
  text: string;
  file: string;
  ts: number;
}

type NotifLevel = "error" | "warn";
type FilterTab = "all" | "errors" | "warnings" | "unread";

interface MutedSource {
  source: string;
  mutedUntil: number;
}

const READ_KEY = "mc_read_notifications";
const MUTED_KEY = "mc_muted_sources";

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

function getMutedSources(): MutedSource[] {
  try {
    const raw = localStorage.getItem(MUTED_KEY);
    if (raw) {
      const all = JSON.parse(raw) as MutedSource[];
      const now = Date.now();
      return all.filter((m) => m.mutedUntil > now);
    }
  } catch {
    // ignore
  }
  return [];
}

function saveMutedSources(muted: MutedSource[]) {
  localStorage.setItem(MUTED_KEY, JSON.stringify(muted));
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

// ─── Sound helper ─────────────────────────────────────────────────────────────

function playErrorBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => void ctx.close();
  } catch {
    // Audio not available
  }
}

// ─── Swipe-to-dismiss hook ────────────────────────────────────────────────────

function useSwipeDismiss(onDismiss: () => void) {
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const delta = touchCurrentX.current - touchStartX.current;
    if (delta > 0) setSwipeOffset(Math.min(delta, 200));
    else setSwipeOffset(Math.max(delta, -200));
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchCurrentX.current - touchStartX.current;
    if (Math.abs(delta) > 80) {
      setDismissed(true);
      setTimeout(onDismiss, 200);
    } else {
      setSwipeOffset(0);
    }
  }, [onDismiss]);

  return {
    swipeOffset,
    dismissed,
    handlers: { onTouchStart: handleTouchStart, onTouchMove: handleTouchMove, onTouchEnd: handleTouchEnd },
  };
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

function NotificationItem({
  entry,
  isRead,
  onRead,
  onDismiss,
}: {
  entry: LogEntry;
  isRead: boolean;
  onRead: () => void;
  onDismiss: () => void;
}) {
  const id = makeNotifId(entry);
  const level = detectLevel(entry.text)!;
  const { swipeOffset, dismissed, handlers } = useSwipeDismiss(onDismiss);

  return (
    <div
      key={id}
      {...handlers}
      style={{
        transform: `translateX(${swipeOffset}px)`,
        opacity: dismissed ? 0 : swipeOffset !== 0 ? Math.max(0.4, 1 - Math.abs(swipeOffset) / 150) : 1,
        transition: swipeOffset === 0 && !dismissed ? "transform 0.2s ease, opacity 0.2s ease" : undefined,
      }}
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
            isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-200"
          }`}
        >
          {entry.text}
        </p>
      </div>
      {!isRead && (
        <button
          type="button"
          onClick={onRead}
          className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          title="Mark as read"
        >
          <Check className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ─── NotificationGroup ────────────────────────────────────────────────────────

function NotificationGroup({
  source,
  entries,
  readIds,
  onRead,
  onDismissEntry,
  onDismissAll,
  onMute,
  isMuted,
}: {
  source: string;
  entries: LogEntry[];
  readIds: Set<string>;
  onRead: (id: string) => void;
  onDismissEntry: (id: string) => void;
  onDismissAll: (source: string) => void;
  onMute: (source: string) => void;
  isMuted: boolean;
}) {
  const [expanded, setExpanded] = useState(entries.length <= 2);
  const unread = entries.filter((e) => !readIds.has(makeNotifId(e))).length;
  const hasErrors = entries.some((e) => detectLevel(e.text) === "error");

  if (entries.length === 1) {
    const entry = entries[0];
    return (
      <NotificationItem
        entry={entry}
        isRead={readIds.has(makeNotifId(entry))}
        onRead={() => onRead(makeNotifId(entry))}
        onDismiss={() => onDismissEntry(makeNotifId(entry))}
      />
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {/* Group header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
          )}
          {hasErrors ? (
            <AlertOctagon className="h-4 w-4 shrink-0 text-red-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />
          )}
          <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{source}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {entries.length}
          </span>
          {unread > 0 && (
            <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
              {unread} unread
            </span>
          )}
          {isMuted && (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              <VolumeX className="h-3 w-3" />
              muted
            </span>
          )}
        </button>
        {/* Batch actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMute(source)}
            title={isMuted ? "Unmute source" : "Mute for 1 hour"}
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <VolumeX className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDismissAll(source)}
            title="Dismiss all from this source"
            className="rounded p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-500 dark:hover:bg-gray-700 dark:hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-1 border-t border-gray-100 px-3 pb-3 pt-2 dark:border-gray-700">
          {entries.map((entry) => (
            <NotificationItem
              key={makeNotifId(entry)}
              entry={entry}
              isRead={readIds.has(makeNotifId(entry))}
              onRead={() => onRead(makeNotifId(entry))}
              onDismiss={() => onDismissEntry(makeNotifId(entry))}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function NotificationsPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(getReadIds);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [mutedSources, setMutedSources] = useState<MutedSource[]>(getMutedSources);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const prevErrorIds = useRef<Set<string>>(new Set());
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/mc-api/logs");
      const data = (await res.json()) as { entries?: LogEntry[] };
      const all = data.entries ?? [];
      const filtered = all.filter((e) => detectLevel(e.text) !== null).reverse();
      setEntries(filtered);

      // Sound alert for new errors
      if (soundEnabled) {
        const newErrorIds = new Set(
          filtered.filter((e) => detectLevel(e.text) === "error").map(makeNotifId),
        );
        const hasNew = [...newErrorIds].some((id) => !prevErrorIds.current.has(id));
        if (hasNew && prevErrorIds.current.size > 0) {
          playErrorBeep();
        }
        prevErrorIds.current = newErrorIds;
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  useEffect(() => {
    void fetchLogs();
  }, [fetchLogs]);

  // Auto-unmute expired sources
  useEffect(() => {
    const id = setInterval(() => {
      setMutedSources((prev) => {
        const next = prev.filter((m) => m.mutedUntil > Date.now());
        if (next.length !== prev.length) saveMutedSources(next);
        return next;
      });
    }, 30_000);
    return () => clearInterval(id);
  }, []);

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

  const dismissEntry = useCallback((id: string) => {
    setDismissed((prev) => new Set([...prev, id]));
    markRead(id);
  }, [markRead]);

  const dismissAllFromSource = useCallback((source: string) => {
    const ids = entries.filter((e) => e.source === source).map(makeNotifId);
    setDismissed((prev) => new Set([...prev, ...ids]));
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      saveReadIds(next);
      return next;
    });
  }, [entries]);

  const toggleMuteSource = useCallback((source: string) => {
    setMutedSources((prev) => {
      const existing = prev.find((m) => m.source === source);
      let next: MutedSource[];
      if (existing) {
        next = prev.filter((m) => m.source !== source);
      } else {
        next = [...prev, { source, mutedUntil: Date.now() + 60 * 60 * 1000 }];
      }
      saveMutedSources(next);
      return next;
    });
  }, []);

  const isSourceMuted = useCallback(
    (source: string) => mutedSources.some((m) => m.source === source && m.mutedUntil > Date.now()),
    [mutedSources],
  );

  const unreadCount = useMemo(
    () => entries.filter((e) => !readIds.has(makeNotifId(e)) && !dismissed.has(makeNotifId(e))).length,
    [entries, readIds, dismissed],
  );

  // Filter + sort by priority (errors first) + remove dismissed
  const filteredEntries = useMemo(() => {
    return entries
      .filter((e) => {
        const id = makeNotifId(e);
        if (dismissed.has(id)) return false;
        const level = detectLevel(e.text);
        if (filter === "errors") return level === "error";
        if (filter === "warnings") return level === "warn";
        if (filter === "unread") return !readIds.has(id);
        return true;
      })
      .sort((a, b) => {
        const la = detectLevel(a.text);
        const lb = detectLevel(b.text);
        if (la === "error" && lb !== "error") return -1;
        if (lb === "error" && la !== "error") return 1;
        return b.ts - a.ts;
      });
  }, [entries, filter, readIds, dismissed]);

  // Group by source
  const groups = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    for (const entry of filteredEntries) {
      const list = map.get(entry.source) ?? [];
      list.push(entry);
      map.set(entry.source, list);
    }
    // Sort groups: error groups first
    return [...map.entries()].sort(([, a], [, b]) => {
      const aErr = a.some((e) => detectLevel(e.text) === "error");
      const bErr = b.some((e) => detectLevel(e.text) === "error");
      if (aErr && !bErr) return -1;
      if (bErr && !aErr) return 1;
      return 0;
    });
  }, [filteredEntries]);

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
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-40 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
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

      {/* Muted sources info */}
      {mutedSources.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {mutedSources
            .filter((m) => m.mutedUntil > Date.now())
            .map((m) => (
              <button
                key={m.source}
                type="button"
                onClick={() => toggleMuteSource(m.source)}
                className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
              >
                <VolumeX className="h-3 w-3" />
                {m.source} muted · {Math.ceil((m.mutedUntil - Date.now()) / 60_000)}m left
              </button>
            ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <NotificationsSkeleton />
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BellOff className="h-12 w-12 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No notifications</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {filter === "unread" ? "All caught up!" : "No errors or warnings found in logs"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map(([source, groupEntries]) => (
            <NotificationGroup
              key={source}
              source={source}
              entries={groupEntries}
              readIds={readIds}
              onRead={markRead}
              onDismissEntry={dismissEntry}
              onDismissAll={dismissAllFromSource}
              onMute={toggleMuteSource}
              isMuted={isSourceMuted(source)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
