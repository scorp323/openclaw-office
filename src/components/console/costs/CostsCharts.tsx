/**
 * Lazy-loaded chart components for the Costs page.
 * Recharts is ~420KB — isolating it here enables code-splitting so it only
 * loads when the user navigates to /costs.
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";

const CHART_COLORS = ["#00ff41", "#3b82f6", "#f59e0b", "#ef4444", "#a855f7", "#06b6d4", "#ec4899"];

interface CostDetail {
  dailySpend: Array<{ date: string; cost: number }>;
  byModel: Record<string, number>;
  byAgent: Record<string, number>;
  totalCost: number;
  updatedAt: number;
}

interface CostsChartsProps {
  data: CostDetail;
}

export default function CostsCharts({ data }: CostsChartsProps) {
  const modelData = Object.entries(data.byModel).map(([name, value]) => ({
    name: name.split(":")[0],
    value,
  }));

  const agentData = Object.entries(data.byAgent)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const cumulativeData = data.dailySpend.reduce<
    Array<{ date: string; cost: number; cumulative: number }>
  >((acc, item) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0;
    acc.push({ date: item.date, cost: item.cost, cumulative: +(prev + item.cost).toFixed(4) });
    return acc;
  }, []);

  return (
    <>
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Daily Spend (Last 30 Days)</h2>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data.dailySpend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,65,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="#666" />
            <YAxis tick={{ fontSize: 10 }} stroke="#666" tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
            <Tooltip
              contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(0,255,65,0.3)", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#00ff41" }}
              formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
            />
            <Bar dataKey="cost" fill="#00ff41" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {modelData.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">By Model</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={modelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {modelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(0,255,65,0.3)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {agentData.length > 0 && (
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
            <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">By Agent</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={agentData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,65,0.1)" />
                <XAxis type="number" tick={{ fontSize: 10 }} stroke="#666" tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} stroke="#666" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(0,255,65,0.3)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`$${value.toFixed(4)}`, "Cost"]}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 2, 2, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {cumulativeData.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]">
          <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Cumulative Spend</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cumulativeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,65,0.1)" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} stroke="#666" />
              <YAxis tick={{ fontSize: 10 }} stroke="#666" tickFormatter={(v: number) => `$${v.toFixed(2)}`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#000", border: "1px solid rgba(0,255,65,0.3)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [`$${value.toFixed(4)}`]}
              />
              <Legend />
              <Line type="monotone" dataKey="cumulative" stroke="#00ff41" strokeWidth={2} dot={false} name="Cumulative" />
              <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={1} dot={false} name="Daily" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </>
  );
}
