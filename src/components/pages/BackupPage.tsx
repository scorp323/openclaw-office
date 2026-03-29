import { Archive, Download, RefreshCw, FileText, Settings, Clock, Database } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { exportCsv } from "@/lib/export-utils";

const LS_KEY = "mc_last_backup";

interface MemoryFileEntry {
  name: string;
  size?: number;
}

interface MemoryListResponse {
  files: MemoryFileEntry[];
}

interface CostRow extends Record<string, string | number> {
  date: string;
  model: string;
  agent: string;
  cost: number;
}

interface CostDetailResponse {
  dailySpend?: Array<{ date: string; cost: number }>;
  byModel?: Record<string, number>;
  byAgent?: Record<string, number>;
  totalCost?: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function touchBackupTs(): void {
  localStorage.setItem(LS_KEY, new Date().toISOString());
}

function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface ExportCardProps {
  icon: typeof Archive;
  title: string;
  description: string;
  color: string;
  loading: boolean;
  onExport: () => void;
}

function ExportCard({ icon: Icon, title, description, color, loading, onExport }: ExportCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">{description}</p>
      <button
        type="button"
        onClick={onExport}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
      >
        {loading ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
        {loading ? "Exporting…" : "Export"}
      </button>
    </div>
  );
}

export function BackupPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingCrons, setLoadingCrons] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(false);

  const [memoryFiles, setMemoryFiles] = useState<MemoryFileEntry[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setLastBackup(stored);
  }, []);

  const fetchMemoryFiles = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const res = await fetch("/mc-api/memory");
      const data: MemoryListResponse = await res.json();
      setMemoryFiles(data.files ?? []);
    } catch {
      // silently ignore
    } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchMemoryFiles();
  }, [fetchMemoryFiles]);

  const handleExportConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const res = await fetch("/mc-api/config/export");
      const data: unknown = await res.json();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `config-export-${date}.json`);
      touchBackupTs();
      setLastBackup(new Date().toISOString());
    } catch {
      // silently ignore
    } finally {
      setLoadingConfig(false);
    }
  }, []);

  const handleExportCrons = useCallback(async () => {
    setLoadingCrons(true);
    try {
      const res = await fetch("/mc-api/cron");
      const data: unknown = await res.json();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(data, `crons-export-${date}.json`);
      touchBackupTs();
      setLastBackup(new Date().toISOString());
    } catch {
      // silently ignore
    } finally {
      setLoadingCrons(false);
    }
  }, []);

  const handleExportCosts = useCallback(async () => {
    setLoadingCosts(true);
    try {
      const res = await fetch("/mc-api/costs/detail");
      const data: CostDetailResponse = await res.json();
      const rows: CostRow[] = [];
      for (const d of data.dailySpend ?? []) {
        rows.push({ date: d.date, model: "-", agent: "-", cost: d.cost });
      }
      for (const [model, cost] of Object.entries(data.byModel ?? {})) {
        rows.push({ date: "-", model, agent: "-", cost });
      }
      for (const [agent, cost] of Object.entries(data.byAgent ?? {})) {
        rows.push({ date: "-", model: "-", agent, cost });
      }
      const date = new Date().toISOString().slice(0, 10);
      exportCsv(rows, `costs-export-${date}.csv`);
      touchBackupTs();
      setLastBackup(new Date().toISOString());
    } catch {
      // silently ignore
    } finally {
      setLoadingCosts(false);
    }
  }, []);

  const handleDownloadMemoryFile = useCallback(async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const res = await fetch(`/mc-api/memory/${encodeURIComponent(filename)}`);
      const text = await res.text();
      downloadText(text, filename);
      touchBackupTs();
      setLastBackup(new Date().toISOString());
    } catch {
      // silently ignore
    } finally {
      setDownloadingFile(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Backup &amp; Export</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Download snapshots of your configuration, schedules, and memory files.
          </p>
        </div>
        {lastBackup && (
          <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Last backup: {new Date(lastBackup).toLocaleString()}
          </div>
        )}
      </div>

      {/* Export cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Data Exports</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ExportCard
            icon={Settings}
            title="Configuration"
            description="Export all system configuration as a JSON file. Includes provider settings, gateway config, and preferences."
            color="text-blue-500"
            loading={loadingConfig}
            onExport={handleExportConfig}
          />
          <ExportCard
            icon={Clock}
            title="Cron Tasks"
            description="Export all scheduled cron task definitions as a JSON file. Includes schedules, prompts, and agent assignments."
            color="text-amber-500"
            loading={loadingCrons}
            onExport={handleExportCrons}
          />
          <ExportCard
            icon={Database}
            title="Cost History"
            description="Export cost breakdown data as a CSV file. Includes daily spend, per-model and per-agent cost breakdown."
            color="text-green-500"
            loading={loadingCosts}
            onExport={handleExportCosts}
          />
        </div>
      </div>

      {/* Memory files section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Memory Files
            {memoryFiles.length > 0 && (
              <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                ({memoryFiles.length} files)
              </span>
            )}
          </h2>
          <button
            type="button"
            onClick={fetchMemoryFiles}
            disabled={memoryLoading}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${memoryLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          {memoryLoading && memoryFiles.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-sm text-gray-400 dark:text-gray-500">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading memory files…
            </div>
          ) : memoryFiles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <FileText className="h-8 w-8 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              <p className="text-sm text-gray-400 dark:text-gray-500">No memory files found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {memoryFiles.map((file) => (
                <li
                  key={file.name}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-gray-400 dark:text-gray-500" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                        {file.name}
                      </p>
                      {file.size !== undefined && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatBytes(file.size)}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadMemoryFile(file.name)}
                    disabled={downloadingFile === file.name}
                    className="ml-4 flex shrink-0 items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
                  >
                    {downloadingFile === file.name ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    Download
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
