import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toastSuccess, toastError } from "@/store/toast-store";

interface KatStatus {
  online: boolean;
  lastSeen?: string;
  model?: string;
  gatewayHealth: "healthy" | "offline" | "unknown" | "error";
}

interface SystemData {
  gateways?: Array<{
    host?: string;
    port?: number;
    online?: boolean;
    model?: string;
    lastSeen?: number;
  }>;
  [key: string]: unknown;
}

function parseKatStatus(data: SystemData): KatStatus {
  const gateways = data.gateways ?? [];
  const kat = gateways.find(
    (g) =>
      (typeof g.host === "string" && g.host.includes("192.168.7.200")) ||
      g.port === 18790,
  );
  if (kat) {
    return {
      online: kat.online ?? false,
      lastSeen: kat.lastSeen
        ? new Date(kat.lastSeen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : undefined,
      model: kat.model,
      gatewayHealth: kat.online ? "healthy" : "offline",
    };
  }
  return { online: false, gatewayHealth: "unknown" };
}

export function KatStatusCard() {
  const [status, setStatus] = useState<KatStatus | null>(null);
  const [restarting, setRestarting] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/mc-api/system");
      if (!res.ok) return;
      const data = (await res.json()) as SystemData;
      setStatus(parseKatStatus(data));
    } catch {
      setStatus({ online: false, gatewayHealth: "error" });
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
    const id = setInterval(() => void fetchStatus(), 15_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handleRestart = useCallback(async () => {
    setRestarting(true);
    try {
      const res = await fetch("/mc-api/actions/gateway-restart", { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toastSuccess("Kat Restart", "Restart command sent to gateway");
      setTimeout(() => void fetchStatus(), 3000);
    } catch (err) {
      toastError("Kat Restart Failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRestarting(false);
    }
  }, [fetchStatus]);

  const isOnline = status?.online ?? false;

  const healthBadge = {
    healthy: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    offline: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    unknown: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
    error: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Kat — Wei Qi AI</h3>
        <button
          type="button"
          onClick={() => void fetchStatus()}
          aria-label="Refresh Kat status"
          className="rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {!isOnline && status !== null && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-red-300 bg-red-50 px-3 py-2 dark:border-red-700/40 dark:bg-red-900/20">
          <span className="text-sm font-semibold text-red-600 dark:text-red-400">Kat Offline</span>
          <button
            type="button"
            onClick={() => void handleRestart()}
            disabled={restarting}
            className="rounded-md bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600 disabled:opacity-50"
          >
            {restarting ? "Restarting..." : "Restart"}
          </button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-pink-400 to-purple-500 text-2xl shadow-md">
            🤖
          </div>
          <span
            className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
              isOnline ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.6)]" : "bg-red-400"
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Kat</span>
            <span
              className={`text-xs font-medium ${isOnline ? "text-green-500" : "text-red-500"}`}
            >
              {status === null ? "Checking..." : isOnline ? "Online" : "Offline"}
            </span>
          </div>
          {status?.model && (
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">{status.model}</p>
          )}
          {status?.lastSeen && (
            <p className="text-xs text-gray-400 dark:text-gray-500">Last seen: {status.lastSeen}</p>
          )}
        </div>

        {status && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              healthBadge[status.gatewayHealth]
            }`}
          >
            {status.gatewayHealth}
          </span>
        )}
      </div>
    </div>
  );
}
