import { DollarSign, RefreshCw, Download } from "lucide-react";
import { useCallback, useEffect, useState, lazy, Suspense } from "react";
import { CostsSkeleton } from "@/components/console/shared/Skeleton";
import { exportCsv } from "@/lib/export-utils";

// Lazy-load recharts — it's ~420KB and only needed on this page
const CostsCharts = lazy(() => import("@/components/console/costs/CostsCharts"));

interface CostDetail {
  dailySpend: Array<{ date: string; cost: number }>;
  byModel: Record<string, number>;
  byAgent: Record<string, number>;
  totalCost: number;
  updatedAt: number;
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
    // Daily spend rows
    for (const d of data.dailySpend) {
      rows.push({ date: d.date, type: "daily", name: "-", cost: d.cost });
    }
    // By model
    for (const [name, value] of Object.entries(data.byModel)) {
      rows.push({ date: "-", type: "model", name, cost: value });
    }
    // By agent
    for (const [name, value] of Object.entries(data.byAgent)) {
      rows.push({ date: "-", type: "agent", name, cost: value });
    }
    exportCsv(rows, `costs-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [data]);

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

      {loading && !data && <CostsSkeleton />}

      {data && (
        <Suspense fallback={<CostsSkeleton />}>
          <CostsCharts data={data} />
        </Suspense>
      )}
    </div>
  );
}
