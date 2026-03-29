import { useEffect, useState } from "react";
import { Activity, Cpu, HardDrive, Server } from "lucide-react";

interface RamInfo {
  usedMb?: number;
  totalMb?: number;
  percent?: number;
}

interface SystemData {
  ram?: RamInfo;
  ollamaModels?: number | Array<{ name: string }>;
  uptime?: number; // seconds
  [key: string]: unknown;
}

interface CronCounts {
  active: number;
  error: number;
}

function ProgressBar({ percent, className }: { percent: number; className?: string }) {
  const color =
    percent >= 85
      ? "bg-red-500"
      : percent >= 70
        ? "bg-yellow-500"
        : "bg-green-500";
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700 ${className ?? ""}`}>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function formatUptime(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function SystemHealthWidget() {
  const [sys, setSys] = useState<SystemData | null>(null);
  const [cronCounts, setCronCounts] = useState<CronCounts>({ active: 0, error: 0 });

  useEffect(() => {
    let cancelled = false;
    void fetch("/mc-api/system")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSys(d as SystemData); })
      .catch(() => {});
    void fetch("/mc-api/cron")
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const tasks = (d as { tasks?: Array<{ enabled: boolean; state?: { lastRunStatus?: string } }> }).tasks ?? [];
        const active = tasks.filter((t) => t.enabled).length;
        const error = tasks.filter((t) => t.state?.lastRunStatus === "error").length;
        setCronCounts({ active, error });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const ramPercent = sys?.ram?.percent ?? (
    sys?.ram?.usedMb && sys.ram.totalMb
      ? Math.round((sys.ram.usedMb / sys.ram.totalMb) * 100)
      : null
  );
  const ollamaCount =
    typeof sys?.ollamaModels === "number"
      ? sys.ollamaModels
      : Array.isArray(sys?.ollamaModels)
        ? sys.ollamaModels.length
        : null;

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Activity className="h-4 w-4 text-green-500" />
        System Health
      </h3>
      <div className="space-y-3">
        {/* RAM */}
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
              <HardDrive className="h-3 w-3" />
              RAM
            </span>
            <span className="tabular-nums text-gray-600 dark:text-gray-300">
              {ramPercent !== null
                ? `${ramPercent}%`
                : sys?.ram?.usedMb
                  ? `${sys.ram.usedMb}MB`
                  : "—"}
            </span>
          </div>
          <ProgressBar percent={ramPercent ?? 0} />
        </div>

        {/* Ollama models */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Cpu className="h-3 w-3" />
            Ollama models
          </span>
          <span className="tabular-nums text-gray-600 dark:text-gray-300">
            {ollamaCount !== null ? ollamaCount : "—"}
          </span>
        </div>

        {/* Cron counts */}
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <Server className="h-3 w-3" />
            Cron jobs
          </span>
          <div className="flex items-center gap-2">
            <span className="text-green-600 dark:text-green-400">{cronCounts.active} active</span>
            {cronCounts.error > 0 && (
              <span className="text-red-500">{cronCounts.error} error</span>
            )}
          </div>
        </div>

        {/* Uptime */}
        {sys?.uptime !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">Uptime</span>
            <span className="tabular-nums text-gray-600 dark:text-gray-300">
              {formatUptime(sys.uptime as number)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
