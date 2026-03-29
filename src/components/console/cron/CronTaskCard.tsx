import { Play, Pencil, Trash2, Check, XCircle, Minus, Pause, ScrollText, Loader2, Clock } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CronTask } from "@/gateway/adapter-types";
import { toCronTaskCardVM } from "@/lib/view-models";
import { toastSuccess, toastError } from "@/store/toast-store";

interface CronTaskCardProps {
  task: CronTask;
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (id: string) => void;
  onEdit: (task: CronTask) => void;
  onDelete: (id: string) => void;
  onViewLogs?: (id: string) => void;
}

const STATUS_ICON = {
  ok: <Check className="h-3.5 w-3.5 text-green-500" />,
  error: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  skipped: <Minus className="h-3.5 w-3.5 text-gray-400" />,
};

export function CronTaskCard({ task, onToggle, onRun, onEdit, onDelete, onViewLogs }: CronTaskCardProps) {
  const { t } = useTranslation("console");
  const vm = toCronTaskCardVM(task);
  const [runLoading, setRunLoading] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  const message =
    task.payload.kind === "agentTurn"
      ? task.payload.message
      : task.payload.kind === "systemEvent"
        ? task.payload.text
        : "";
  const lastRun = vm.lastRunAt ? new Date(vm.lastRunAt).toLocaleString() : "—";
  const nextRun = vm.nextRunAt ? new Date(vm.nextRunAt).toLocaleString() : "—";

  const handleQuickRun = async () => {
    setRunLoading(true);
    try {
      const res = await fetch("/mc-api/actions/cron-run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronId: task.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toastSuccess(t("cron.card.runNow", { defaultValue: "Run Now" }), `${task.name} triggered`);
    } catch {
      // Fall back to existing adapter-based run
      onRun(task.id);
    } finally {
      setRunLoading(false);
    }
  };

  const handleQuickToggle = async () => {
    setToggleLoading(true);
    try {
      const res = await fetch("/mc-api/actions/cron-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cronId: task.id }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const newEnabled = !task.enabled;
      toastSuccess(
        newEnabled ? t("cron.toggle.enabled", { defaultValue: "Enabled" }) : t("cron.toggle.disabled", { defaultValue: "Disabled" }),
        `${task.name} ${newEnabled ? "enabled" : "disabled"}`,
      );
    } catch {
      // Fall back to existing toggle handler
      onToggle(task.id, !task.enabled);
    } finally {
      setToggleLoading(false);
    }
  };

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 transition-opacity dark:border-gray-700 dark:bg-gray-800 ${!task.enabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <label className="relative mt-0.5 inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={task.enabled}
              onChange={handleQuickToggle}
              disabled={toggleLoading}
              className="peer sr-only"
            />
            {toggleLoading ? (
              <div className="flex h-5 w-9 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700 dark:peer-checked:bg-blue-500" />
            )}
          </label>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 dark:text-gray-100">{task.name}</span>
              <span className="flex items-center gap-1 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                <Clock className="h-2.5 w-2.5" />
                {vm.scheduleLabel}
              </span>
              {!task.enabled && (
                <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-600 dark:text-gray-400">
                  disabled
                </span>
              )}
            </div>
            {message && (
              <p className="mt-1 line-clamp-1 text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            )}
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                {t("cron.card.lastRun")}: {lastRun}
                {task.state.lastRunStatus && (
                  <span className="ml-1">{STATUS_ICON[task.state.lastRunStatus] ?? null}</span>
                )}
              </span>
              <span>
                {t("cron.card.nextRun")}: {nextRun}
              </span>
            </div>
            {task.state.lastError && (
              <p className="mt-1 text-xs text-red-500">{task.state.lastError}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleQuickRun}
            disabled={runLoading}
            className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 disabled:opacity-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
            title={t("cron.card.runNow")}
          >
            {runLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleQuickToggle}
            disabled={toggleLoading}
            className="rounded p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-50 dark:hover:bg-amber-900/20 dark:hover:text-amber-400 transition-colors"
            title={task.enabled ? t("cron.card.pause") : t("cron.card.resume")}
          >
            {toggleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
          </button>
          {onViewLogs && (
            <button
              type="button"
              onClick={() => onViewLogs(task.id)}
              className="rounded p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
              title={t("cron.card.viewLogs")}
            >
              <ScrollText className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300 transition-colors"
            title={t("common:actions.edit")}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
            title={t("common:actions.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
