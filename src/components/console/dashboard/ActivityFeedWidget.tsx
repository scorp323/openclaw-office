import { useCallback, useEffect, useRef, useState } from "react";

interface LogEntry {
  source: string;
  text: string;
  file: string;
  ts: number;
}

type LogLevel = "error" | "warn" | "info";

function detectLevel(text: string): LogLevel {
  const upper = text.slice(0, 80).toUpperCase();
  if (upper.includes("ERROR") || upper.includes("ERR ") || upper.includes("[ERROR]")) return "error";
  if (upper.includes("WARN") || upper.includes("[WARN]")) return "warn";
  return "info";
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

const LEVEL_DOT: Record<LogLevel, string> = {
  error: "bg-red-500",
  warn: "bg-yellow-400",
  info: "bg-emerald-400",
};

export function ActivityFeedWidget() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [hovering, setHovering] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hoveringRef = useRef(false);

  hoveringRef.current = hovering;

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch("/mc-api/logs?limit=20");
      if (!res.ok) return;
      const data = (await res.json()) as { entries?: LogEntry[] };
      const all = (data.entries ?? []).slice(-20).reverse();
      setEntries(all);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    const id = setInterval(() => void fetchLogs(), 5_000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  // Auto-scroll to top (newest first) unless hovering
  useEffect(() => {
    if (!hoveringRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [entries]);

  const toggleExpand = useCallback((index: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }, []);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Live Activity</h3>
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          <span className="text-[10px] text-gray-400 dark:text-gray-500">live</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          No activity yet
        </p>
      ) : (
        <div
          ref={scrollRef}
          className="max-h-[300px] space-y-0.5 overflow-y-auto pr-1"
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
        >
          {entries.map((entry, i) => {
            const level = detectLevel(entry.text);
            const isExpanded = expanded.has(i);
            return (
              <button
                key={`${entry.ts}-${i}`}
                type="button"
                onClick={() => toggleExpand(i)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
              >
                <div className="mt-1.5 shrink-0">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${LEVEL_DOT[level]}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {entry.source}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                      {relativeTime(entry.ts)}
                    </span>
                  </div>
                  <p
                    className={`mt-0.5 text-xs text-gray-600 dark:text-gray-400 ${
                      isExpanded ? "whitespace-pre-wrap break-words" : "truncate"
                    }`}
                  >
                    {entry.text}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
