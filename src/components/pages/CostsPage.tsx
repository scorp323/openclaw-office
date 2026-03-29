import { DollarSign, RefreshCw, Download, TrendingUp, Calendar, Clock } from "lucide-react";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { CostsSkeleton } from "@/components/console/shared/Skeleton";
import { exportCsv } from "@/lib/export-utils";

// Lazy-load recharts — it's ~420KB and only needed on this page
const CostsCharts = lazy(() => import("@/components/console/costs/CostsCharts"));

interface CronRunEntry {
  name: string;
  model: string;
  cost: number;
  timestamp: number;
}

interface CostDetail {
  dailySpend: Array<{ date: string; cost: number }>;
  byModel: Record<string, number>;
  byAgent: Record<string, number>;
  totalCost: number;
  updatedAt: number;
  dailyBudget?: number;
  topCronRuns?: CronRunEntry[];
}

function StatCard({
  icon: Icon,
  title,
  value,
  sub,
  color,
}: {
  icon: typeof DollarSign;
  title: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{title}</span>
      </div>
      <p className="text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-500">{sub}</p>}
    </div>
  );
}

function BudgetBar({ spent, budget }: { spent: number; budget: number }) {
  const pct = Math.min((spent / budget) * 100, 100);
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700 dark:text-gray-300">Daily Budget</span>
        <span className="tabular-nums text-gray-500 dark:text-gray-400">
          ${spent.toFixed(4)} / ${budget.toFixed(2)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-gray-500 dark:text-gray-500">
        {pct.toFixed(1)}% used
      </p>
    </div>
  );
}

function CronRunsTable({ runs }: { runs: CronRunEntry[] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Top 10 Most Expensive Cron Runs
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Name</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Model</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Cost</th>
              <th className="px-4 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Time</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <tr
                key={i}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-gray-700/50 dark:hover:bg-gray-700/30"
              >
                <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-200">{run.name}</td>
                <td className="px-4 py-2 text-gray-500 dark:text-gray-400">{run.model || "—"}</td>
                <td className="px-4 py-2 text-right tabular-nums text-gray-800 dark:text-gray-200">
                  ${run.cost.toFixed(4)}
                </td>
                <td className="px-4 py-2 text-right text-gray-400 dark:text-gray-500">
                  {new Date(run.timestamp).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CostsPage() {
  const [data, setData] = useState<CostDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/mc-api/costs/detail");
      const json = await res.json();
      setData(json);
    } catch {
      // retry on next refresh
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleExportCsv = useCallback(() => {
    if (!data) return;
    const rows: Record<string, string | number>[] = [];
    for (const d of data.dailySpend) {
      rows.push({ date: d.date, type: "daily", name: "-", cost: d.cost });
    }
    for (const [name, value] of Object.entries(data.byModel)) {
      rows.push({ date: "-", type: "model", name, cost: value });
    }
    for (const [name, value] of Object.entries(data.byAgent)) {
      rows.push({ date: "-", type: "agent", name, cost: value });
    }
    exportCsv(rows, `costs-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [data]);

  // Compute derived stats
  const todaySpend = data?.dailySpend?.at(-1)?.cost ?? 0;
  const sevenDaySpend = data?.dailySpend?.slice(-7).reduce((s, d) => s + d.cost, 0) ?? 0;
  const thirtyDaySpend = data?.totalCost ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cost Breakdown</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            API spend analysis — last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            disabled={!data}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            title="Export as CSV"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={Clock}
            title="Today"
            value={`$${todaySpend.toFixed(4)}`}
            sub={data.dailySpend.at(-1)?.date ?? ""}
            color="text-green-500"
          />
          <StatCard
            icon={Calendar}
            title="Last 7 Days"
            value={`$${sevenDaySpend.toFixed(4)}`}
            sub="Rolling 7-day window"
            color="text-blue-500"
          />
          <StatCard
            icon={TrendingUp}
            title="Last 30 Days"
            value={`$${thirtyDaySpend.toFixed(4)}`}
            sub="Total tracked spend"
            color="text-purple-500"
          />
        </div>
      )}

      {/* Budget progress bar */}
      {data?.dailyBudget !== undefined && data.dailyBudget > 0 && (
        <BudgetBar spent={todaySpend} budget={data.dailyBudget} />
      )}

      {loading && !data && <CostsSkeleton />}

      {data && (
        <Suspense fallback={<CostsSkeleton />}>
          <CostsCharts data={data} />
        </Suspense>
      )}

      {/* Top cron runs table */}
      {data?.topCronRuns && data.topCronRuns.length > 0 && (
        <CronRunsTable runs={data.topCronRuns.slice(0, 10)} />
      )}
    </div>
  );
}
