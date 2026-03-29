import { Terminal, Pause, Play, ArrowDownToLine, Search, X, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogsSkeleton } from "@/components/console/shared/Skeleton";

interface LogEntry {
  source: string;
  text: string;
  file: string;
  ts: number;
}

type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

const SOURCE_COLORS: Record<string, string> = {
  agent: "#3b82f6",
  cron: "#f59e0b",
  system: "#00ff41",
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: "text-red-400",
  WARN: "text-yellow-400",
  INFO: "text-[#00ff41]",
  DEBUG: "text-gray-500",
};

const LEVEL_BG: Record<LogLevel, string> = {
  ERROR: "bg-red-950/30 hover:bg-red-950/50",
  WARN: "bg-yellow-950/20 hover:bg-yellow-950/30",
  INFO: "hover:bg-[rgba(0,255,65,0.03)]",
  DEBUG: "hover:bg-gray-900/50",
};

const LEVEL_BADGE: Record<LogLevel, string> = {
  ERROR: "bg-red-900/60 text-red-300",
  WARN: "bg-yellow-900/60 text-yellow-300",
  INFO: "bg-gray-900 text-white dark:bg-[rgba(0,255,65,0.2)] dark:text-[#00ff41]",
  DEBUG: "bg-gray-800 text-gray-400",
};

function detectLevel(text: string): LogLevel {
  const upper = text.slice(0, 80).toUpperCase();
  if (upper.includes("ERROR") || upper.includes("ERR ") || upper.includes("[ERROR]")) return "ERROR";
  if (upper.includes("WARN") || upper.includes("[WARN]")) return "WARN";
  if (upper.includes("DEBUG") || upper.includes("[DEBUG]") || upper.includes("TRACE")) return "DEBUG";
  return "INFO";
}

const LEVEL_FILTERS: Array<{ value: LogLevel | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "ERROR", label: "ERROR" },
  { value: "WARN", label: "WARN" },
  { value: "INFO", label: "INFO" },
  { value: "DEBUG", label: "DEBUG" },
];

export function LogsPage() {
  const [entries, setEntries] = useState<LogEntry[] | null>(null);
  const [paused, setPaused] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "ALL">("ALL");
  const [tailMode, setTailMode] = useState(true);
  const [textSearch, setTextSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);
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
    if (tailMode && !paused && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, paused, tailMode]);

  // Keyboard shortcut: Ctrl+F to toggle search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShowSearch((s) => !s);
      }
      if (e.key === "Escape" && showSearch) {
        setShowSearch(false);
        setTextSearch("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [showSearch]);

  const allEntries = entries ?? [];

  const filtered = useMemo(() => {
    const q = textSearch.toLowerCase();
    return allEntries.filter((e) => {
      if (sourceFilter !== "all" && e.source !== sourceFilter) return false;
      if (levelFilter !== "ALL" && detectLevel(e.text) !== levelFilter) return false;
      if (q && !e.text.toLowerCase().includes(q) && !e.source.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allEntries, sourceFilter, levelFilter, textSearch]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
    for (const e of allEntries) {
      counts[detectLevel(e.text)]++;
    }
    return counts;
  }, [allEntries]);

  const handleClear = useCallback(() => {
    setEntries([]);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-[rgba(0,255,65,0.15)]">
        <div className="flex items-center gap-2">
          <Terminal className="h-5 w-5 text-green-500" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-[#00ff41]">Live Logs</h1>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-[rgba(0,255,65,0.1)] dark:text-[#00ff41]">
            {filtered.length} entries
          </span>
          {paused && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
              PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Source filter */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-[rgba(0,255,65,0.15)]">
            {["all", "agent", "cron", "system"].map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSourceFilter(src)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  sourceFilter === src
                    ? "bg-gray-900 text-white dark:bg-[rgba(0,255,65,0.2)] dark:text-[#00ff41]"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-[#00ff41]"
                }`}
              >
                {src}
              </button>
            ))}
          </div>
          {/* Level filter */}
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-0.5 dark:border-[rgba(0,255,65,0.15)]">
            {LEVEL_FILTERS.map((lf) => (
              <button
                key={lf.value}
                type="button"
                onClick={() => setLevelFilter(lf.value)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  levelFilter === lf.value
                    ? LEVEL_BADGE[lf.value as LogLevel] ?? "bg-gray-900 text-white dark:bg-[rgba(0,255,65,0.2)] dark:text-[#00ff41]"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-[#00ff41]"
                }`}
              >
                {lf.label}
                {lf.value !== "ALL" && levelCounts[lf.value] > 0 && (
                  <span className="ml-1 text-[9px] opacity-70">({levelCounts[lf.value]})</span>
                )}
              </button>
            ))}
          </div>
          {/* Search toggle */}
          <button
            type="button"
            onClick={() => {
              setShowSearch((s) => !s);
              if (showSearch) setTextSearch("");
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              showSearch
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-600 dark:bg-[rgba(0,255,65,0.08)] dark:text-gray-300"
            }`}
            title="Search logs (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          {/* Tail mode toggle */}
          <button
            type="button"
            onClick={() => setTailMode((t) => !t)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              tailMode
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-gray-100 text-gray-600 dark:bg-[rgba(0,255,65,0.08)] dark:text-gray-300"
            }`}
            title={tailMode ? "Auto-scroll on" : "Auto-scroll off"}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            Tail
          </button>
          {/* Pause/Resume */}
          <button
            type="button"
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
          {/* Clear */}
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200 dark:bg-[rgba(0,255,65,0.08)] dark:text-gray-300 dark:hover:bg-[rgba(0,255,65,0.15)]"
            title="Clear logs"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Search bar (collapsible) */}
      {showSearch && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 dark:border-[rgba(0,255,65,0.1)] dark:bg-gray-900/50">
          <Search className="h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Filter log text..."
            value={textSearch}
            onChange={(e) => setTextSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-600"
            autoFocus
          />
          {textSearch && (
            <span className="text-[10px] text-gray-400">{filtered.length} matches</span>
          )}
          <button
            type="button"
            onClick={() => {
              setTextSearch("");
              setShowSearch(false);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
              <p className="text-sm font-medium text-gray-400">
                {textSearch ? "No matching log entries" : "No log entries yet"}
              </p>
              <p className="mt-1 max-w-xs text-xs text-gray-600">
                {textSearch
                  ? "Try a different search term or adjust filters"
                  : "Logs will appear here from agent activity, cron jobs, and system events"}
              </p>
            </div>
          </div>
        ) : (
          filtered.map((entry, i) => {
            const level = detectLevel(entry.text);
            const levelColor = LEVEL_COLORS[level];
            const rowBg = LEVEL_BG[level];
            return (
              <div key={`${entry.ts}-${i}`} className={`flex ${rowBg}`}>
                <span className="mr-3 shrink-0 select-none text-gray-600 tabular-nums">
                  {new Date(entry.ts).toLocaleTimeString()}
                </span>
                <span
                  className="mr-2 w-12 shrink-0 text-right text-[10px] font-bold uppercase"
                  style={{ color: SOURCE_COLORS[entry.source] ?? "#00ff41" }}
                >
                  {entry.source}
                </span>
                <span className={`mr-2 w-12 shrink-0 rounded px-1 text-center text-[10px] font-semibold ${
                  level === "ERROR" ? "bg-red-900/40 text-red-400"
                    : level === "WARN" ? "bg-yellow-900/40 text-yellow-400"
                    : level === "DEBUG" ? "bg-gray-800/60 text-gray-500"
                    : "text-gray-600"
                }`}>
                  {level}
                </span>
                <span className={`min-w-0 break-all ${levelColor}`}>
                  {textSearch ? highlightSearch(entry.text, textSearch) : entry.text}
                </span>
              </div>
            );
          })
        )}
        {!paused && (
          <div className="mt-1 inline-block h-4 w-2 animate-pulse bg-[#00ff41]" />
        )}
      </div>
    </div>
  );
}

function highlightSearch(text: string, search: string): React.ReactNode {
  if (!search) return text;
  const idx = text.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-500/40 text-inherit">{text.slice(idx, idx + search.length)}</mark>
      {text.slice(idx + search.length)}
    </>
  );
}
