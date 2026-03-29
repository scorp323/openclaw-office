import { RefreshCw, Upload, Trash2, Loader2, Cpu } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { apiPost } from "@/lib/api-actions";
import { authFetch } from "@/lib/auth";
import { toastSuccess, toastError } from "@/store/toast-store";

interface OllamaModel {
  name: string;
  size?: number; // bytes
  sizeVram?: number;
}

interface OllamaData {
  loaded: OllamaModel[];
  available: OllamaModel[];
}

function formatBytes(bytes: number | undefined): string {
  if (bytes == null) return "—";
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function OllamaSection() {
  const [data, setData] = useState<OllamaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Record<string, boolean>>({});

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/mc-api/ollama");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json() as OllamaData;
      setData(json);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchModels();
  }, [fetchModels]);

  const handleLoad = async (model: string) => {
    setBusy((b) => ({ ...b, [model]: true }));
    try {
      await apiPost("/mc-api/ollama/load", { model });
      toastSuccess("Model loaded", `${model} is now loaded`);
      await fetchModels();
    } catch (e) {
      toastError("Load failed", String(e));
    } finally {
      setBusy((b) => ({ ...b, [model]: false }));
    }
  };

  const handleUnload = async (model: string) => {
    setBusy((b) => ({ ...b, [model]: true }));
    try {
      await apiPost("/mc-api/ollama/unload", { model });
      toastSuccess("Model unloaded", `${model} has been unloaded`);
      await fetchModels();
    } catch (e) {
      toastError("Unload failed", String(e));
    } finally {
      setBusy((b) => ({ ...b, [model]: false }));
    }
  };

  const loadedNames = new Set((data?.loaded ?? []).map((m) => m.name));
  const unloadedAvailable = (data?.available ?? []).filter((m) => !loadedNames.has(m.name));

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Ollama Models
          </h3>
          {data && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {data.loaded.length} loaded
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={fetchModels}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center gap-2 py-8 text-sm text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading models...
        </div>
      ) : !data ? null : (
        <div className="space-y-4">
          {/* Loaded models */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              Loaded in memory
            </p>
            {data.loaded.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">No models currently loaded</p>
            ) : (
              <div className="space-y-1.5">
                {data.loaded.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between rounded-md border border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-700/40"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                        {model.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {model.sizeVram != null
                          ? `VRAM: ${formatBytes(model.sizeVram)}`
                          : model.size != null
                            ? `Size: ${formatBytes(model.size)}`
                            : "RAM usage unknown"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleUnload(model.name)}
                      disabled={busy[model.name]}
                      className="ml-3 flex shrink-0 items-center gap-1.5 rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {busy[model.name] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                      Unload
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available (not loaded) models */}
          {unloadedAvailable.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Available
              </p>
              <div className="space-y-1.5">
                {unloadedAvailable.map((model) => (
                  <div
                    key={model.name}
                    className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2 dark:border-gray-700"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                        {model.name}
                      </p>
                      {model.size != null && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          Size: {formatBytes(model.size)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLoad(model.name)}
                      disabled={busy[model.name]}
                      className="ml-3 flex shrink-0 items-center gap-1.5 rounded-md border border-blue-300 px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/20 transition-colors"
                    >
                      {busy[model.name] ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
