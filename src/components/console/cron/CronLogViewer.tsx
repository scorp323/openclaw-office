import { X, Copy, Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useFetchWithRetry } from "@/hooks/useFetchWithRetry";

interface LogEntry {
  ts: number;
  text: string;
  file: string;
}

type LogLevel = "ERROR" | "WARN" | "INFO" | "DEBUG";

function detectLevel(text: string): LogLevel {
  const upper = text.toUpperCase();
  if (upper.includes("[ERROR]") || upper.startsWith("ERROR")) return "ERROR";
  if (upper.includes("[WARN]") || upper.startsWith("WARN")) return "WARN";
  if (upper.includes("[DEBUG]") || upper.startsWith("DEBUG")) return "DEBUG";
  return "INFO";
}

const LEVEL_BADGE: Record<LogLevel, string> = {
  ERROR: "bg-red-900/60 text-red-400 border border-red-700/50",
  WARN: "bg-yellow-900/60 text-yellow-400 border border-yellow-700/50",
  INFO: "bg-green-900/30 text-green-400 border border-green-800/50",
  DEBUG: "bg-gray-800 text-gray-500 border border-gray-700",
};

interface CronLogViewerProps {
  cronId: string;
  cronName?: string;
  onClose: () => void;
}

export function CronLogViewer({ cronId, cronName, onClose }: CronLogViewerProps) {
  const url = `/mc-api/cron/${encodeURIComponent(cronId)}/logs`;
  const { data, isLoading } = useFetchWithRetry<{ logs: LogEntry[] }>(url);
  const logs = data?.logs ?? [];

  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  // Auto-scroll to bottom when logs load
  useEffect(() => {
    if (logs.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs.length]);

  const handleCopyAll = useCallback(() => {
    const text = logs
      .map((e) => `[${new Date(e.ts).toISOString()}] [${detectLevel(e.text)}] ${e.text}`)
      .join("\n");
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [logs]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="mx-4 flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-gray-700 bg-gray-950 shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]" />
            <h3 className="font-mono text-sm font-semibold text-green-400">
              {cronName ? `${cronName} — logs` : `cron/${cronId} — logs`}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                type="button"
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 rounded-md border border-gray-700 px-2.5 py-1 font-mono text-xs text-gray-400 transition-colors hover:border-green-700 hover:text-green-400"
                title="Copy all logs"
              >
                {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copied!" : "Copy All"}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Log body */}
        <div className="min-h-0 flex-1 overflow-auto bg-gray-950 p-4 font-mono text-xs">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-green-600">
              <span className="animate-pulse">Loading logs…</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-gray-600">
              No logs found for this cron task
            </div>
          ) : (
            <div className="space-y-0.5">
              {logs.map((entry, i) => {
                const level = detectLevel(entry.text);
                return (
                  <div
                    key={`${entry.ts}-${i}`}
                    className="flex items-start gap-2 rounded px-1 py-0.5 hover:bg-gray-900/80"
                  >
                    <span className="shrink-0 tabular-nums text-gray-600">
                      {new Date(entry.ts).toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className={`shrink-0 rounded px-1 py-0.5 text-[10px] font-bold leading-none ${LEVEL_BADGE[level]}`}>
                      {level}
                    </span>
                    <span
                      className={`min-w-0 break-all leading-relaxed ${
                        level === "ERROR"
                          ? "text-red-400"
                          : level === "WARN"
                            ? "text-yellow-400"
                            : "text-green-300"
                      }`}
                    >
                      {entry.text}
                    </span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-gray-800 px-4 py-2">
          <span className="font-mono text-[10px] text-gray-600">
            {logs.length} {logs.length === 1 ? "entry" : "entries"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-700 px-3 py-1 font-mono text-xs text-gray-500 transition-colors hover:border-gray-600 hover:text-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
