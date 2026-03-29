import {
  Archive,
  ChevronDown,
  ChevronUp,
  Clock,
  Database,
  Download,
  Eye,
  FileText,
  Package,
  RefreshCw,
  Settings,
  ToggleLeft,
  ToggleRight,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { exportCsv } from "@/lib/export-utils";
import { toastSuccess, toastError } from "@/store/toast-store";

const LS_KEY = "mc_last_backup";
const LS_AUTO_KEY = "mc_auto_backup_enabled";
const LS_AUTO_DATE_KEY = "mc_auto_backup_last_date";
const LS_HISTORY_KEY = "mc_export_history";

type ExportFormat = "json" | "csv" | "markdown";
type DataType = "config" | "crons" | "costs";

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
interface ExportHistoryEntry {
  ts: number;
  type: string;
  format: string;
  sizeBytes: number;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function touchBackupTs(): void {
  localStorage.setItem(LS_KEY, new Date().toISOString());
}

function getHistory(): ExportHistoryEntry[] {
  try {
    const raw = localStorage.getItem(LS_HISTORY_KEY);
    if (raw) return JSON.parse(raw) as ExportHistoryEntry[];
  } catch { /* ignore */ }
  return [];
}

function addHistory(entry: ExportHistoryEntry) {
  const hist = getHistory();
  hist.unshift(entry);
  localStorage.setItem(LS_HISTORY_KEY, JSON.stringify(hist.slice(0, 10)));
}

function downloadJson(data: unknown, filename: string): number {
  const str = JSON.stringify(data, null, 2);
  const blob = new Blob([str], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  return blob.size;
}

function downloadText(content: string, filename: string): number {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
  return blob.size;
}

function toMarkdown(data: unknown, title: string): string {
  const lines: string[] = [`# ${title}`, ``, `_Exported: ${new Date().toLocaleString()}_`, ``];
  if (Array.isArray(data)) {
    if (data.length > 0 && typeof data[0] === "object") {
      const keys = Object.keys(data[0] as object);
      lines.push(`| ${keys.join(" | ")} |`);
      lines.push(`| ${keys.map(() => "---").join(" | ")} |`);
      for (const row of data) {
        lines.push(`| ${keys.map((k) => String((row as Record<string, unknown>)[k] ?? "")).join(" | ")} |`);
      }
    }
  } else {
    lines.push("```json");
    lines.push(JSON.stringify(data, null, 2));
    lines.push("```");
  }
  return lines.join("\n");
}

// --- Preview Modal ---

function PreviewModal({
  title,
  data,
  onClose,
}: {
  title: string;
  data: unknown;
  onClose: () => void;
}) {
  const preview = Array.isArray(data) ? data.slice(0, 10) : data;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Preview — {title}
            {Array.isArray(data) && data.length > 10 && (
              <span className="ml-2 text-xs font-normal text-gray-400">
                (showing first 10 of {data.length})
              </span>
            )}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-5">
          <pre className="whitespace-pre-wrap break-words font-mono text-xs text-gray-700 dark:text-gray-300">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

// --- ExportCard ---

interface ExportCardProps {
  icon: typeof Archive;
  title: string;
  description: string;
  color: string;
  dataType: DataType;
  format: ExportFormat;
  onFormatChange: (f: ExportFormat) => void;
  loading: boolean;
  estimatedSize?: number;
  onExport: () => void;
  onPreview: () => void;
}

function ExportCard({
  icon: Icon, title, description, color, format, onFormatChange,
  loading, estimatedSize, onExport, onPreview,
}: ExportCardProps) {
  const formats: ExportFormat[] = ["json", "csv", "markdown"];
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${color}`} />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
      </div>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{description}</p>

      {/* Format selector */}
      <div className="mb-4 flex gap-1">
        {formats.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => onFormatChange(f)}
            className={`rounded px-2 py-0.5 text-xs font-medium uppercase transition-colors ${
              format === f
                ? "bg-blue-500 text-white dark:bg-blue-600"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {estimatedSize !== undefined && (
        <p className="mb-3 text-xs text-gray-400 dark:text-gray-500">
          ~{formatBytes(estimatedSize)} estimated
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPreview}
          disabled={loading}
          aria-label={`Preview ${title}`}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={onExport}
          disabled={loading}
          aria-label={`Export ${title}`}
          className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          {loading ? "Exporting…" : "Export"}
        </button>
      </div>
    </div>
  );
}

// --- Main Page ---

export function BackupPage() {
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [autoBackup, setAutoBackup] = useState(() => localStorage.getItem(LS_AUTO_KEY) === "true");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingCrons, setLoadingCrons] = useState(false);
  const [loadingCosts, setLoadingCosts] = useState(false);
  const [loadingBundle, setLoadingBundle] = useState(false);
  const [memoryFiles, setMemoryFiles] = useState<MemoryFileEntry[]>([]);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [configFormat, setConfigFormat] = useState<ExportFormat>("json");
  const [cronsFormat, setCronsFormat] = useState<ExportFormat>("json");
  const [costsFormat, setCostsFormat] = useState<ExportFormat>("csv");
  const [history, setHistory] = useState<ExportHistoryEntry[]>(getHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [preview, setPreview] = useState<{ title: string; data: unknown } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) setLastBackup(stored);
  }, []);

  // Auto-backup: trigger if new day and enabled
  useEffect(() => {
    if (!autoBackup) return;
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem(LS_AUTO_DATE_KEY);
    if (lastDate !== today) {
      localStorage.setItem(LS_AUTO_DATE_KEY, today);
      void handleExportBundle(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBackup]);

  const toggleAutoBackup = useCallback(() => {
    setAutoBackup((prev) => {
      const next = !prev;
      localStorage.setItem(LS_AUTO_KEY, next ? "true" : "false");
      if (next) {
        toastSuccess("Auto-backup enabled", "Daily backup will run at midnight");
      } else {
        toastSuccess("Auto-backup disabled");
      }
      return next;
    });
  }, []);

  const fetchMemoryFiles = useCallback(async () => {
    setMemoryLoading(true);
    try {
      const res = await fetch("/mc-api/memory");
      const data: MemoryListResponse = await res.json();
      setMemoryFiles(data.files ?? []);
    } catch { /* ignore */ } finally {
      setMemoryLoading(false);
    }
  }, []);

  useEffect(() => { void fetchMemoryFiles(); }, [fetchMemoryFiles]);

  const recordExport = useCallback((type: string, format: string, sizeBytes: number) => {
    touchBackupTs();
    setLastBackup(new Date().toISOString());
    const entry: ExportHistoryEntry = { ts: Date.now(), type, format, sizeBytes };
    addHistory(entry);
    setHistory(getHistory());
  }, []);

  const fetchConfigData = useCallback(async (): Promise<unknown> => {
    const res = await fetch("/mc-api/config/export");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const fetchCronsData = useCallback(async (): Promise<unknown> => {
    const res = await fetch("/mc-api/cron");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }, []);

  const fetchCostsData = useCallback(async (): Promise<CostRow[]> => {
    const res = await fetch("/mc-api/costs/detail");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
    return rows;
  }, []);

  const handleExportConfig = useCallback(async () => {
    setLoadingConfig(true);
    try {
      const data = await fetchConfigData();
      const date = new Date().toISOString().slice(0, 10);
      let size = 0;
      if (configFormat === "json") {
        size = downloadJson(data, `config-export-${date}.json`);
      } else if (configFormat === "markdown") {
        size = downloadText(toMarkdown(data, "Configuration Export"), `config-export-${date}.md`);
      } else {
        const rows = Array.isArray(data) ? data as CostRow[] : [data as CostRow];
        exportCsv(rows as Record<string, string | number>[], `config-export-${date}.csv`);
        size = JSON.stringify(rows).length;
      }
      recordExport("Configuration", configFormat, size);
      toastSuccess("Config exported", `Downloaded as ${configFormat.toUpperCase()}`);
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingConfig(false);
    }
  }, [configFormat, fetchConfigData, recordExport]);

  const handleExportCrons = useCallback(async () => {
    setLoadingCrons(true);
    try {
      const data = await fetchCronsData();
      const date = new Date().toISOString().slice(0, 10);
      let size = 0;
      if (cronsFormat === "json") {
        size = downloadJson(data, `crons-export-${date}.json`);
      } else if (cronsFormat === "markdown") {
        size = downloadText(toMarkdown(data, "Cron Tasks Export"), `crons-export-${date}.md`);
      } else {
        const rows = Array.isArray(data) ? data as Record<string, string | number>[] : [];
        exportCsv(rows, `crons-export-${date}.csv`);
        size = JSON.stringify(rows).length;
      }
      recordExport("Cron Tasks", cronsFormat, size);
      toastSuccess("Crons exported", `Downloaded as ${cronsFormat.toUpperCase()}`);
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingCrons(false);
    }
  }, [cronsFormat, fetchCronsData, recordExport]);

  const handleExportCosts = useCallback(async () => {
    setLoadingCosts(true);
    try {
      const rows = await fetchCostsData();
      const date = new Date().toISOString().slice(0, 10);
      let size = 0;
      if (costsFormat === "json") {
        size = downloadJson(rows, `costs-export-${date}.json`);
      } else if (costsFormat === "markdown") {
        size = downloadText(toMarkdown(rows, "Cost History Export"), `costs-export-${date}.md`);
      } else {
        exportCsv(rows, `costs-export-${date}.csv`);
        size = JSON.stringify(rows).length;
      }
      recordExport("Cost History", costsFormat, size);
      toastSuccess("Costs exported", `Downloaded as ${costsFormat.toUpperCase()}`);
    } catch (err) {
      toastError("Export failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoadingCosts(false);
    }
  }, [costsFormat, fetchCostsData, recordExport]);

  const handleExportBundle = useCallback(async (silent = false) => {
    if (!silent) setLoadingBundle(true);
    try {
      const [configData, cronsData, costsData] = await Promise.allSettled([
        fetchConfigData(),
        fetchCronsData(),
        fetchCostsData(),
      ]);
      const bundle = {
        exportedAt: new Date().toISOString(),
        config: configData.status === "fulfilled" ? configData.value : null,
        crons: cronsData.status === "fulfilled" ? cronsData.value : null,
        costs: costsData.status === "fulfilled" ? costsData.value : null,
      };
      const date = new Date().toISOString().slice(0, 10);
      const size = downloadJson(bundle, `morpheus-bundle-${date}.json`);
      recordExport("Bundle", "json", size);
      if (!silent) toastSuccess("Bundle exported", `All data in one file · ${formatBytes(size)}`);
    } catch (err) {
      if (!silent) toastError("Bundle export failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      if (!silent) setLoadingBundle(false);
    }
  }, [fetchConfigData, fetchCronsData, fetchCostsData, recordExport]);

  const handlePreview = useCallback(async (type: DataType) => {
    try {
      let data: unknown;
      let title: string;
      if (type === "config") { data = await fetchConfigData(); title = "Configuration"; }
      else if (type === "crons") { data = await fetchCronsData(); title = "Cron Tasks"; }
      else { data = await fetchCostsData(); title = "Cost History"; }
      setPreview({ title, data });
    } catch (err) {
      toastError("Preview failed", err instanceof Error ? err.message : "Unknown error");
    }
  }, [fetchConfigData, fetchCronsData, fetchCostsData]);

  const handleDownloadMemoryFile = useCallback(async (filename: string) => {
    setDownloadingFile(filename);
    try {
      const res = await fetch(`/mc-api/memory/${encodeURIComponent(filename)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const size = downloadText(text, filename);
      recordExport(`Memory: ${filename}`, "txt", size);
      toastSuccess("Downloaded", filename);
    } catch (err) {
      toastError("Download failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setDownloadingFile(null);
    }
  }, [recordExport]);

  return (
    <div className="space-y-6">
      {preview && (
        <PreviewModal title={preview.title} data={preview.data} onClose={() => setPreview(null)} />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Archive className="h-6 w-6 text-indigo-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Backup &amp; Export</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Download snapshots of your configuration, schedules, and memory files.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastBackup && (
            <div className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              Last: {new Date(lastBackup).toLocaleString()}
            </div>
          )}
          {/* Auto-backup toggle */}
          <button
            type="button"
            onClick={toggleAutoBackup}
            aria-pressed={autoBackup}
            aria-label={`Auto-backup ${autoBackup ? "enabled" : "disabled"}`}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              autoBackup
                ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-400"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {autoBackup ? (
              <ToggleRight className="h-3.5 w-3.5" />
            ) : (
              <ToggleLeft className="h-3.5 w-3.5" />
            )}
            Daily auto-backup
          </button>
          {/* Bundle export */}
          <button
            type="button"
            onClick={() => void handleExportBundle()}
            disabled={loadingBundle}
            aria-label="Export everything as bundle"
            className="flex items-center gap-1.5 rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600 disabled:opacity-50"
          >
            {loadingBundle ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Package className="h-3.5 w-3.5" />
            )}
            Export Everything
          </button>
        </div>
      </div>

      {/* Export cards */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Data Exports</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ExportCard
            icon={Settings}
            title="Configuration"
            description="System config, provider settings, and gateway preferences."
            color="text-blue-500"
            dataType="config"
            format={configFormat}
            onFormatChange={setConfigFormat}
            loading={loadingConfig}
            onExport={() => void handleExportConfig()}
            onPreview={() => void handlePreview("config")}
          />
          <ExportCard
            icon={Clock}
            title="Cron Tasks"
            description="Scheduled task definitions, schedules, prompts, and agent assignments."
            color="text-amber-500"
            dataType="crons"
            format={cronsFormat}
            onFormatChange={setCronsFormat}
            loading={loadingCrons}
            onExport={() => void handleExportCrons()}
            onPreview={() => void handlePreview("crons")}
          />
          <ExportCard
            icon={Database}
            title="Cost History"
            description="Daily spend, per-model and per-agent cost breakdown."
            color="text-green-500"
            dataType="costs"
            format={costsFormat}
            onFormatChange={setCostsFormat}
            loading={loadingCosts}
            onExport={() => void handleExportCosts()}
            onPreview={() => void handlePreview("costs")}
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
            aria-label="Refresh memory files"
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
                        <p className="text-xs text-gray-400 dark:text-gray-500">{formatBytes(file.size)}</p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDownloadMemoryFile(file.name)}
                    disabled={downloadingFile === file.name}
                    aria-label={`Download ${file.name}`}
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

      {/* Export history */}
      <div>
        <button
          type="button"
          onClick={() => setHistoryOpen((o) => !o)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left dark:border-gray-700 dark:bg-gray-800"
          aria-expanded={historyOpen}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Export History
              {history.length > 0 && (
                <span className="ml-2 font-normal text-gray-400 dark:text-gray-500">
                  ({history.length} exports)
                </span>
              )}
            </span>
          </div>
          {historyOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
        {historyOpen && (
          <div className="mt-1 rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            {history.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">No exports yet</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700/60">
                {history.map((h, i) => (
                  <li key={i} className="flex items-center justify-between px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{h.type}</span>
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs uppercase text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                        {h.format}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatBytes(h.sizeBytes)}</span>
                      <span>{new Date(h.ts).toLocaleString()}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
