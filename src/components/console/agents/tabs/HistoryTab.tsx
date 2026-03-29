import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle, XCircle, Clock, History, RefreshCw } from "lucide-react";
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

interface HistoryTabProps {
  agent: AgentSummary;
}

export function HistoryTab({ agent }: HistoryTabProps) {
  const { t } = useTranslation("console");
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/mc-api/agents/${encodeURIComponent(agent.id)}/history`);
      const data = await res.json();
      if (Array.isArray(data.tasks)) setTasks(data.tasks.slice(0, 10));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [agent.id]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

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
    <div className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("agents.history.title", { defaultValue: "Recent Tasks" })}
        </h3>
        <button
          type="button"
          onClick={() => void fetchHistory()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {t("common:actions.refresh", { defaultValue: "Refresh" })}
        </button>
      </div>
      <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-800">
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5 shrink-0">
              {task.result === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                {task.task}
              </p>
              {task.detail && (
                <p className="mt-0.5 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
                  {task.detail}
                </p>
              )}
              <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                <span>{new Date(task.timestamp).toLocaleString()}</span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-3 w-3" />
                  {formatDuration(task.durationMs)}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                  task.result === "success"
                    ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {task.result}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
