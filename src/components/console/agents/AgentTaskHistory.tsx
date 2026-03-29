import { useCallback, useEffect, useState } from "react";
import { CheckCircle, XCircle, Minus, Clock, Calendar, RefreshCw } from "lucide-react";
import type { CronTask } from "@/gateway/adapter-types";
import { cronScheduleToExpr } from "@/lib/cron-presets";

interface AgentTaskHistoryProps {
  agentId: string;
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AgentTaskHistory({ agentId }: AgentTaskHistoryProps) {
  const [tasks, setTasks] = useState<CronTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/mc-api/cron");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const allTasks: CronTask[] = data.tasks ?? [];
      // Filter to this agent's tasks that have run at least once, most recent first
      const agentTasks = allTasks
        .filter((t) => t.agentId === agentId && t.state.lastRunAtMs != null)
        .sort((a, b) => (b.state.lastRunAtMs ?? 0) - (a.state.lastRunAtMs ?? 0));
      setTasks(agentTasks);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <Calendar className="h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-xs text-red-500">Failed to load history</p>
        <button
          type="button"
          onClick={() => void fetchHistory()}
          className="mt-1 text-xs text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <Calendar className="h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-xs text-gray-400 dark:text-gray-500">No recent activity</p>
        <p className="max-w-[180px] text-[10px] text-gray-300 dark:text-gray-600">
          Cron runs will appear here once tasks are scheduled for this agent
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto">
      {tasks.map((task, i) => {
        const status = task.state.lastRunStatus;
        const lastRunMs = task.state.lastRunAtMs ?? 0;
        const scheduleLabel = cronScheduleToExpr(task.schedule);
        return (
          <div key={task.id} className="relative flex gap-2 pl-3">
            {/* Timeline connector */}
            {i < tasks.length - 1 && (
              <div className="absolute bottom-0 left-[6px] top-4 w-px bg-gray-200 dark:bg-gray-700" />
            )}
            {/* Status dot */}
            <div
              className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
                status === "ok"
                  ? "border-green-400 bg-green-100 dark:border-green-500 dark:bg-green-900/30"
                  : status === "error"
                    ? "border-red-400 bg-red-100 dark:border-red-500 dark:bg-red-900/30"
                    : "border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800"
              }`}
            />
            {/* Content */}
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {task.name}
                </span>
                {status === "ok" ? (
                  <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                ) : status === "error" ? (
                  <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                ) : (
                  <Minus className="h-3 w-3 shrink-0 text-gray-400" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400 dark:text-gray-500">
                <span title={new Date(lastRunMs).toLocaleString()}>
                  {relativeTime(lastRunMs)}
                </span>
                {scheduleLabel && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    {scheduleLabel}
                  </span>
                )}
                {!task.enabled && (
                  <span className="rounded bg-gray-200 px-1 text-[9px] dark:bg-gray-700 dark:text-gray-500">
                    disabled
                  </span>
                )}
              </div>
              {task.state.lastError && (
                <p className="mt-0.5 truncate text-[10px] text-red-500 dark:text-red-400">
                  {task.state.lastError}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
