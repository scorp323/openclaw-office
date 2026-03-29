import { Terminal, Pause, Play, Filter } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogsSkeleton } from "@/components/console/shared/Skeleton";

interface LogEntry {
  source: string;
  text: string;
  file: string;
  ts: number;
}

const SOURCE_COLORS: Record<string, string> = {
  agent: "#3b82f6",
  cron: "#f59e0b",
  system: "#00ff41",
};

export function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  pausedRef.current = paused;

  const fetchLogs = useCallback(async () => {
    if (pausedRef.current) return;
    try {
      const res = await fetch("/mc-api/logs");
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        setEntries(data.entries);
      }
    } catch {
      // silently retry on next interval
    }
  }, []);

  useEffect(() => {
    void fetchLogs();
    const id = setInterval(() => void fetchLogs(), 3000);
    return () => clearInterval(id);
  }, [fetchLogs]);

  useEffect(() => {
    if (!paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused]);

  const allEntries = entries ?? [];
  const filtered = filter === "all" ? allEntries : allEntries.filter((e) => e.source === filter);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[rgba(0,255,65,0.15)]">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-green-500" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-[#00ff41]">Live Logs</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-[rgba(0,255,65,0.1)] dark:text-[#00ff41]">
            {filtered.length} entries
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-[rgba(0,255,65,0.15)]">
            {["all", "agent", "cron", "system"].map((src) => (
              <button
                key={src}
                onClick={() => setFilter(src)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  filter === src
                    ? "bg-gray-900 text-white dark:bg-[rgba(0,255,65,0.2)] dark:text-[#00ff41]"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-[#00ff41]"
                }`}
              >
                {src}
              </button>
            ))}
          </div>
          <button
            onClick={() => setPaused((p) => !p)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              paused
                ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-gray-100 text-gray-600 dark:bg-[rgba(0,255,65,0.08)] dark:text-gray-300"
            }`}
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Resume" : "Pause"}
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-black p-4 font-mono text-xs leading-5"
      >
        {entries === null ? (
          <LogsSkeleton />
        ) : filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-600">
            <div className="text-center">
              <Terminal className="mx-auto mb-3 h-12 w-12 opacity-30" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-400">No log entries yet</p>
              <p className="mt-1 max-w-xs text-xs text-gray-600">
                Logs will appear here from agent activity, cron jobs, and system events
              </p>
            </div>
          </div>
        ) : (
          filtered.map((entry, i) => (
            <div key={`${entry.ts}-${i}`} className="flex hover:bg-[rgba(0,255,65,0.03)]">
              <span className="mr-3 shrink-0 select-none text-gray-600 tabular-nums">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
              <span
                className="mr-3 w-14 shrink-0 text-right font-semibold uppercase"
                style={{ color: SOURCE_COLORS[entry.source] ?? "#00ff41" }}
              >
                {entry.source}
              </span>
              <span className="min-w-0 break-all text-[#00ff41]">{entry.text}</span>
            </div>
          ))
        )}
        {!paused && (
          <div className="mt-1 inline-block h-4 w-2 animate-pulse bg-[#00ff41]" />
        )}
      </div>
    </div>
  );
}
