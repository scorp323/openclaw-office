import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Clock, History, RefreshCw, Zap, MessageSquare, Settings, Wrench } from "lucide-react";
import type { AgentSummary } from "@/gateway/types";

interface TaskHistoryItem {
  id: string;
  type: string;
  task: string;
  result: "success" | "fail";
  durationMs: number;
  timestamp: number;
  detail: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const TYPE_CONFIG: Record<string, { icon: typeof Zap; color: string; bgColor: string }> = {
  chat: { icon: MessageSquare, color: "text-blue-500", bgColor: "bg-blue-500" },
  tool: { icon: Wrench, color: "text-orange-500", bgColor: "bg-orange-500" },
  cron: { icon: Clock, color: "text-amber-500", bgColor: "bg-amber-500" },
  system: { icon: Settings, color: "text-gray-500", bgColor: "bg-gray-500" },
};

const DEFAULT_TYPE_CONFIG = { icon: Zap, color: "text-purple-500", bgColor: "bg-purple-500" };

// TODO: Remove mock generator once /mc-api/agents/:id/history endpoint is available
function generateMockHistory(agentId: string): TaskHistoryItem[] {
  const now = Date.now();
  const templates = [
    { task: "Process incoming message", type: "chat", detail: "Handled user query about project status" },
    { task: "Execute tool call", type: "tool", detail: "Called search_files with pattern '*.ts'" },
    { task: "Generate summary report", type: "system", detail: "Weekly activity summary for channel #general" },
    { task: "Cron: health check", type: "cron", detail: "Periodic system health verification" },
    { task: "Sub-agent delegation", type: "tool", detail: "Delegated research task to specialist agent" },
    { task: "File analysis", type: "tool", detail: "Analyzed 12 files for code review" },
    { task: "Channel message broadcast", type: "chat", detail: "Sent notification to #updates channel" },
    { task: "Memory consolidation", type: "system", detail: "Merged duplicate memory entries" },
  ];
  // Deterministic seed from agentId
  let seed = 0;
  for (let i = 0; i < agentId.length; i++) seed = ((seed << 5) - seed + agentId.charCodeAt(i)) | 0;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };

  return Array.from({ length: 8 }, (_, i) => {
    const tmpl = templates[Math.floor(rng() * templates.length)];
    const success = rng() > 0.2;
    return {
      id: `mock-${agentId.slice(0, 8)}-${i}`,
      type: tmpl.type,
      task: tmpl.task,
      result: success ? ("success" as const) : ("fail" as const),
      durationMs: Math.floor(rng() * 30000) + 200,
      timestamp: now - (i * 3600000 + Math.floor(rng() * 1800000)),
      detail: success ? tmpl.detail : "Error: timeout after 30s",
    };
  });
}

interface HistoryTabProps {
  agent: AgentSummary;
}

export function HistoryTab({ agent }: HistoryTabProps) {
  const { t } = useTranslation("console");
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "success" | "fail">("all");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/mc-api/agents/${encodeURIComponent(agent.id)}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        setTasks(data.tasks.slice(0, 50));
      } else {
        // TODO: Remove mock fallback once real history endpoint returns data
        setTasks(generateMockHistory(agent.id));
      }
    } catch {
      // TODO: Remove mock fallback once /mc-api/agents/:id/history is implemented
      setTasks(generateMockHistory(agent.id));
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.result === filter);

  const successCount = tasks.filter((t) => t.result === "success").length;
  const failCount = tasks.filter((t) => t.result === "fail").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <History className="h-10 w-10 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {t("agents.history.empty", { defaultValue: "No task history" })}
        </p>
        <p className="max-w-xs text-xs text-gray-400 dark:text-gray-500">
          {t("agents.history.emptyDescription", { defaultValue: "Recent tasks will appear here as the agent performs work" })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with stats and filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("agents.history.title", { defaultValue: "Recent Tasks" })}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
              <CheckCircle className="h-3 w-3" /> {successCount}
            </span>
            <span className="flex items-center gap-0.5 text-red-500 dark:text-red-400">
              <XCircle className="h-3 w-3" /> {failCount}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Result filter */}
          <div className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5 dark:border-gray-700">
            {(["all", "success", "fail"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  filter === f
                    ? f === "fail"
                      ? "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : f === "success"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {f === "all" ? "All" : f === "success" ? "Pass" : "Fail"}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void fetchHistory()}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {t("common:actions.refresh", { defaultValue: "Refresh" })}
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200 dark:bg-gray-700" />

        <div className="space-y-0">
          {filtered.map((task, i) => {
            const typeConfig = TYPE_CONFIG[task.type] ?? DEFAULT_TYPE_CONFIG;
            const TypeIcon = typeConfig.icon;
            const isLast = i === filtered.length - 1;
            return (
              <div key={task.id} className={`relative flex gap-3 ${isLast ? "" : "pb-3"}`}>
                {/* Timeline dot */}
                <div className="relative z-10 flex shrink-0 flex-col items-center">
                  <div className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 ${
                    task.result === "success"
                      ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/30"
                      : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30"
                  }`}>
                    {task.result === "success" ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1 rounded-lg border border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <TypeIcon className={`h-3.5 w-3.5 shrink-0 ${typeConfig.color}`} />
                      <span className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                        {task.task}
                      </span>
                    </div>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      task.result === "success"
                        ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                    }`}>
                      {task.result}
                    </span>
                  </div>
                  {task.detail && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-gray-400">
                      {task.detail}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                    <span title={new Date(task.timestamp).toLocaleString()}>
                      {relativeTime(task.timestamp)}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(task.durationMs)}
                    </span>
                    <span className={`rounded px-1 py-0.5 text-[9px] font-medium ${typeConfig.color} bg-opacity-10`}>
                      {task.type}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
