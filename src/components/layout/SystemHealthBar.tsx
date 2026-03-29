import { ChevronUp, Cpu, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface HealthData {
  ramPercent: number;
  ollamaUp: boolean;
  gatewayUp: boolean;
  throttleState: string;
  ts: number;
}

function StatusDot({ up, label }: { up: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          up ? "bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.5)]"
        }`}
      />
      <span className="text-[11px]">{label}</span>
    </div>
  );
}

export function SystemHealthBar() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [expanded, setExpanded] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/mc-api/health");
      const data = await res.json();
      setHealth(data);
    } catch {
      // will retry
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const id = setInterval(() => void fetchHealth(), 30_000);
    return () => clearInterval(id);
  }, [fetchHealth]);

  if (!health) return null;

  const ramColor =
    health.ramPercent > 90 ? "text-red-400" : health.ramPercent > 70 ? "text-amber-400" : "text-green-400";
  const isThrottled = health.throttleState !== "normal";

  return (
    <div className="fixed inset-x-0 bottom-0 z-50">
      {expanded && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 shadow-lg dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,5,0,0.95)]">
          <div className="mx-auto flex max-w-4xl flex-wrap gap-6 text-xs text-gray-600 dark:text-gray-300">
            <div>
              <div className="mb-1 font-medium text-gray-500 dark:text-gray-400">Memory</div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={`h-full rounded-full transition-all ${
                      health.ramPercent > 90
                        ? "bg-red-500"
                        : health.ramPercent > 70
                          ? "bg-amber-500"
                          : "bg-green-500"
                    }`}
                    style={{ width: `${health.ramPercent}%` }}
                  />
                </div>
                <span className={ramColor}>{health.ramPercent}%</span>
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium text-gray-500 dark:text-gray-400">Services</div>
              <div className="flex gap-4">
                <StatusDot up={health.ollamaUp} label="Ollama" />
                <StatusDot up={health.gatewayUp} label="Gateway" />
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium text-gray-500 dark:text-gray-400">Throttle</div>
              <span className={isThrottled ? "text-amber-400" : "text-green-400"}>
                {health.throttleState}
              </span>
            </div>
            <div>
              <div className="mb-1 font-medium text-gray-500 dark:text-gray-400">Updated</div>
              <span>{new Date(health.ts).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((p) => !p)}
        className="flex h-6 w-full items-center justify-center gap-3 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500 transition-colors hover:bg-gray-100 dark:border-[rgba(0,255,65,0.1)] dark:bg-[rgba(0,5,0,0.9)] dark:text-gray-400 dark:hover:bg-[rgba(0,255,65,0.05)]"
      >
        <div className="flex items-center gap-1">
          <Cpu className="h-3 w-3" />
          <span className={ramColor}>{health.ramPercent}%</span>
        </div>
        <StatusDot up={health.ollamaUp} label="Ollama" />
        <StatusDot up={health.gatewayUp} label="GW" />
        {isThrottled && (
          <div className="flex items-center gap-1 text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Throttled</span>
          </div>
        )}
        <ChevronUp
          className={`h-3 w-3 transition-transform ${expanded ? "" : "rotate-180"}`}
        />
      </button>
    </div>
  );
}
