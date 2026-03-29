import { RefreshCw, Plus, Clock, X, List, BarChart3 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CronStatsBar } from "@/components/console/cron/CronStatsBar";
import { CronTaskCard } from "@/components/console/cron/CronTaskCard";
import { CronTaskDialog } from "@/components/console/cron/CronTaskDialog";
import { CronTimeline } from "@/components/console/cron/CronTimeline";
import { ConfirmDialog } from "@/components/console/shared/ConfirmDialog";
import { EmptyState } from "@/components/console/shared/EmptyState";
import { ErrorState } from "@/components/console/shared/ErrorState";
import { CronSkeleton } from "@/components/console/shared/Skeleton";
import { useCronStore } from "@/store/console-stores/cron-store";
import { toastSuccess, toastError } from "@/store/toast-store";

export function CronPage() {
  const { t } = useTranslation("console");
  const {
    tasks,
    isLoading,
    error,
    dialogOpen,
    editingTask,
    fetchTasks,
    addTask,
    updateTask,
    removeTask,
    runTask,
    openDialog,
    closeDialog,
    initEventListeners,
  } = useCronStore();

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [runTarget, setRunTarget] = useState<string | null>(null);
  const [disableTarget, setDisableTarget] = useState<string | null>(null);
  const [logsTarget, setLogsTarget] = useState<string | null>(null);
  const [logsData, setLogsData] = useState<Array<{ ts: number; text: string; file: string }>>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "timeline">("list");

  const handleViewLogs = useCallback(async (id: string) => {
    setLogsTarget(id);
    setLogsLoading(true);
    try {
      const res = await fetch(`/mc-api/cron/${encodeURIComponent(id)}/logs`);
      const data = await res.json();
      setLogsData(data.logs ?? []);
    } catch {
      setLogsData([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
    const unsub = initEventListeners();
    return unsub;
  }, [fetchTasks, initEventListeners]);

  const handleToggle = (id: string, enabled: boolean) => {
    if (!enabled) {
      // Disabling: show confirmation dialog
      setDisableTarget(id);
    } else {
      // Enabling: do it directly with toast
      doToggle(id, true);
    }
  };

  const doToggle = async (id: string, enabled: boolean) => {
    try {
      await updateTask(id, { enabled } as Partial<import("@/gateway/adapter-types").CronTaskInput>);
      toastSuccess(
        enabled ? t("cron.toggle.enabled", { defaultValue: "Task Enabled" }) : t("cron.toggle.disabled", { defaultValue: "Task Disabled" }),
        enabled
          ? t("cron.toggle.enabledMsg", { defaultValue: "Cron task has been enabled" })
          : t("cron.toggle.disabledMsg", { defaultValue: "Cron task has been disabled" }),
      );
    } catch (err) {
      toastError(t("cron.toggle.error", { defaultValue: "Toggle Failed" }), String(err));
    }
  };

  const handleDisableConfirm = async () => {
    if (disableTarget) {
      await doToggle(disableTarget, false);
      setDisableTarget(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTarget) {
      await removeTask(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleRunConfirm = async () => {
    if (runTarget) {
      try {
        await runTask(runTarget);
        toastSuccess(t("cron.run.title"), t("cron.run.started"));
      } catch (err) {
        toastError(t("cron.run.title"), String(err));
      }
      setRunTarget(null);
      await fetchTasks();
    }
  };

  if (isLoading && tasks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("cron.title")}
          description={t("cron.description")}
          onRefresh={fetchTasks}
          onCreate={() => openDialog()}
        />
        <CronSkeleton />
      </div>
    );
  }

  if (error && tasks.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("cron.title")}
          description={t("cron.description")}
          onRefresh={fetchTasks}
          onCreate={() => openDialog()}
        />
        <ErrorState message={error} onRetry={fetchTasks} />
      </div>
    );
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    const aNext = a.state.nextRunAtMs ?? Infinity;
    const bNext = b.state.nextRunAtMs ?? Infinity;
    return aNext - bNext;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("cron.title")}
        description={t("cron.description")}
        onRefresh={fetchTasks}
        loading={isLoading}
        onCreate={() => openDialog()}
      />
      <CronStatsBar tasks={tasks} />

      {tasks.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t("cron.empty.title")}
          action={{ label: t("cron.empty.createFirst"), onClick: () => openDialog() }}
        />
      ) : (
        <>
          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-md border border-gray-200 p-0.5 dark:border-[rgba(0,255,65,0.15)]">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-gray-100 text-gray-800 dark:bg-[rgba(0,255,65,0.12)] dark:text-[#00ff41]"
                  : "text-gray-400 hover:text-gray-600 dark:text-[#0a5d0a] dark:hover:text-[#00ff41]"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              {t("cron.view.list", { defaultValue: "List" })}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("timeline")}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                viewMode === "timeline"
                  ? "bg-gray-100 text-gray-800 dark:bg-[rgba(0,255,65,0.12)] dark:text-[#00ff41]"
                  : "text-gray-400 hover:text-gray-600 dark:text-[#0a5d0a] dark:hover:text-[#00ff41]"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              {t("cron.view.timeline", { defaultValue: "Timeline" })}
            </button>
          </div>

          {viewMode === "timeline" ? (
            <CronTimeline tasks={tasks} />
          ) : (
            <div className="space-y-3">
              {sortedTasks.map((task) => (
                <CronTaskCard
                  key={task.id}
                  task={task}
                  onToggle={handleToggle}
                  onRun={setRunTarget}
                  onEdit={openDialog}
                  onDelete={setDeleteTarget}
                  onViewLogs={handleViewLogs}
                />
              ))}
            </div>
          )}
        </>
      )}

      <CronTaskDialog
        open={dialogOpen}
        editingTask={editingTask}
        onSave={addTask}
        onUpdate={updateTask}
        onClose={closeDialog}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("cron.delete.title")}
        description={t("cron.delete.description")}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        variant="danger"
      />

      <ConfirmDialog
        open={runTarget !== null}
        title={t("cron.run.title")}
        description={t("cron.run.description")}
        onConfirm={handleRunConfirm}
        onCancel={() => setRunTarget(null)}
      />

      <ConfirmDialog
        open={disableTarget !== null}
        title={t("cron.disable.title", { defaultValue: "Disable Task" })}
        description={t("cron.disable.description", { defaultValue: "Are you sure you want to disable this cron task? It will no longer run on schedule." })}
        onConfirm={handleDisableConfirm}
        onCancel={() => setDisableTarget(null)}
        variant="danger"
      />

      {/* Logs dialog */}
      {logsTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 max-h-[70vh] w-full max-w-2xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t("cron.logs.title")} — {logsTarget}
              </h3>
              <button
                type="button"
                onClick={() => setLogsTarget(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[55vh] overflow-auto p-4">
              {logsLoading ? (
                <div className="py-8 text-center text-sm text-gray-400">Loading logs...</div>
              ) : logsData.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">
                  {t("cron.logs.empty")}
                </div>
              ) : (
                <div className="space-y-1">
                  {logsData.map((entry, i) => (
                    <div key={`${entry.ts}-${i}`} className="flex gap-3 rounded px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800">
                      <span className="shrink-0 text-gray-400 dark:text-gray-500">
                        {new Date(entry.ts).toLocaleTimeString()}
                      </span>
                      <span className="min-w-0 break-all text-gray-700 dark:text-gray-300">
                        {entry.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PageHeader({
  title,
  description,
  onRefresh,
  loading,
  onCreate,
}: {
  title: string;
  description: string;
  onRefresh: () => void;
  loading?: boolean;
  onCreate: () => void;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          {t("actions.create")}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {t("actions.refresh")}
        </button>
      </div>
    </div>
  );
}
