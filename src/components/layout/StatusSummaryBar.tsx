import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useResponsive } from "@/hooks/useResponsive";
import { useEventStream } from "@/hooks/useEventStream";

interface SummaryData {
  activeAgents: number;
  errorCount: number;
  todayCost: string;
  workMode: string;
  level: "green" | "yellow" | "red";
}

interface SystemPayload {
  agents?: Array<{ status?: string }>;
  cronErrors?: number;
  workMode?: string;
  [key: string]: unknown;
}

interface CostPayload {
  todayTotal?: number;
  today?: number;
  [key: string]: unknown;
}

function formatCost(val: number): string {
  if (val >= 1) return `$${val.toFixed(2)}`;
  return `$${val.toFixed(3)}`;
}

async function fetchSummary(): Promise<SummaryData> {
  const [sysRes, costRes] = await Promise.allSettled([
    fetch("/mc-api/system"),
    fetch("/mc-api/costs/detail"),
  ]);

  let activeAgents = 0;
  let errorCount = 0;
  let workMode = "default";

  if (sysRes.status === "fulfilled" && sysRes.value.ok) {
    const sys = (await sysRes.value.json()) as SystemPayload;
    const agents = sys.agents ?? [];
    activeAgents = agents.filter((a) => a.status === "working" || a.status === "active").length;
    errorCount = sys.cronErrors ?? 0;
    workMode = sys.workMode ?? "default";
  }

  let todayCost = "$0.00";
  if (costRes.status === "fulfilled" && costRes.value.ok) {
    const cost = (await costRes.value.json()) as CostPayload;
    const val = cost.todayTotal ?? cost.today ?? 0;
    todayCost = formatCost(val);
  }

  const level: SummaryData["level"] =
    errorCount > 0 ? "red" : activeAgents === 0 ? "yellow" : "green";

  return { activeAgents, errorCount, todayCost, workMode, level };
}

const LEVEL_DOT = {
  green: "bg-green-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const LEVEL_TEXT = {
  green: "text-green-600 dark:text-green-400",
  yellow: "text-amber-600 dark:text-amber-400",
  red: "text-red-600 dark:text-red-400",
};

const LEVEL_BAR = {
  green: "border-green-200 bg-green-50/80 dark:border-green-900/30 dark:bg-green-900/10",
  yellow: "border-amber-200 bg-amber-50/80 dark:border-amber-900/30 dark:bg-amber-900/10",
  red: "border-red-200 bg-red-50/80 dark:border-red-900/30 dark:bg-red-900/10",
};

function WsIndicator({ connected }: { connected: boolean }) {
  return (
    <span
      className="flex items-center gap-1"
      title={connected ? "Gateway connected" : "Gateway disconnected"}
    >
      <span
        className={`h-2 w-2 rounded-full transition-colors ${
          connected
            ? "bg-green-400 shadow-[0_0_6px_rgba(74,222,128,0.8)]"
            : "bg-gray-400"
        } ${connected ? "animate-pulse" : ""}`}
      />
      <span className={`text-[10px] ${connected ? "text-green-600 dark:text-green-400" : "text-gray-400"}`}>
        WS
      </span>
    </span>
  );
}

export function StatusSummaryBar() {
  const [data, setData] = useState<SummaryData | null>(null);
  const { isMobile } = useResponsive();
  const navigate = useNavigate();
  const { wsConnected } = useEventStream();

  const refresh = useCallback(async () => {
    try {
      const result = await fetchSummary();
      setData(result);
    } catch {
      // silent fail
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(id);
  }, [refresh]);

  if (!data) return null;

  const level = data.level;

  if (isMobile) {
    return (
      <div
        className={`flex items-center justify-center gap-3 border-b px-4 py-1.5 ${LEVEL_BAR[level]}`}
      >
        <WsIndicator connected={wsConnected} />
        <span
          title={`${data.activeAgents} active agents`}
          className={`h-2 w-2 rounded-full ${data.activeAgents > 0 ? "bg-green-500" : "bg-gray-400"}`}
        />
        <span
          title={`${data.errorCount} errors`}
          className={`h-2 w-2 rounded-full ${data.errorCount > 0 ? "bg-red-500" : "bg-green-500"}`}
        />
        <span
          title={`Cost today: ${data.todayCost}`}
          className={`h-2 w-2 rounded-full ${LEVEL_DOT[level]}`}
        />
        <span
          title={`Mode: ${data.workMode}`}
          className="h-2 w-2 rounded-full bg-blue-400"
        />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1 border-b px-6 py-1 text-xs ${LEVEL_BAR[level]}`}
    >
      <WsIndicator connected={wsConnected} />
      <span className="mx-1.5 text-gray-400">•</span>
      <span className={`mr-1 h-2 w-2 rounded-full ${LEVEL_DOT[level]}`} />
      <button
        type="button"
        onClick={() => navigate("/agents")}
        className={`transition-colors hover:underline ${LEVEL_TEXT[level]}`}
      >
        {data.activeAgents} agent{data.activeAgents !== 1 ? "s" : ""} active
      </button>
      <span className="mx-1.5 text-gray-400">•</span>
      <button
        type="button"
        onClick={() => navigate("/logs")}
        className={`transition-colors hover:underline ${data.errorCount > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500 dark:text-gray-400"}`}
      >
        {data.errorCount} error{data.errorCount !== 1 ? "s" : ""}
      </button>
      <span className="mx-1.5 text-gray-400">•</span>
      <button
        type="button"
        onClick={() => navigate("/costs")}
        className="text-gray-500 transition-colors hover:underline dark:text-gray-400"
      >
        {data.todayCost} today
      </button>
      <span className="mx-1.5 text-gray-400">•</span>
      <span className="text-gray-500 dark:text-gray-400">
        Mode:{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">{data.workMode}</span>
      </span>
    </div>
  );
}
