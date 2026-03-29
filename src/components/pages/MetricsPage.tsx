import { Gauge, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const RT_KEY = "mc_response_times";
const MAX_SAMPLES = 20;
const POLL_INTERVAL_MS = 5000;

interface SystemResponse {
  cpu?: number;
  ram?: { used: number; total: number };
  disk?: { used: number; total: number };
  network?: { inBytes: number; outBytes: number };
}

interface ResponseSample {
  ts: number;
  duration: number;
}

interface CronTask {
  name: string;
  successCount?: number;
  failCount?: number;
  lastDurationMs?: number;
}

interface CronResponse {
  tasks?: CronTask[];
}

function loadResponseTimes(): ResponseSample[] {
  try {
    const raw = localStorage.getItem(RT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ResponseSample[];
  } catch {
    return [];
  }
}

function saveResponseTimes(samples: ResponseSample[]): void {
  localStorage.setItem(RT_KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
}

// SVG circular gauge
interface GaugeCardProps {
  label: string;
  pct: number; // 0–1
  displayText: string;
  subText?: string;
  strokeColor: string;
  textColor: string;
}

function GaugeCard({ label, pct, displayText, subText, strokeColor, textColor }: GaugeCardProps) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(Math.max(pct, 0), 1));

  return (
    <div className="flex flex-col items-center rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <svg viewBox="0 0 100 100" className="h-24 w-24">
        {/* Background track */}
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Filled arc */}
        <circle
          cx={50}
          cy={50}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className={strokeColor}
          transform="rotate(-90 50 50)"
        />
        {/* Center text */}
        <text
          x={50}
          y={50}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={14}
          fontWeight="bold"
          className={textColor}
          fill="currentColor"
        >
          {displayText}
        </text>
      </svg>
      {subText && (
        <p className="mt-1 text-center text-xs text-gray-400 dark:text-gray-500">{subText}</p>
      )}
    </div>
  );
}

// Inline SVG sparkline for response times
function ResponseSparkline({ samples }: { samples: ResponseSample[] }) {
  const MAX_Y = 2000;
  const W = 400;
  const H = 60;

  if (samples.length < 2) {
    return (
      <div className="flex h-[60px] items-center justify-center text-xs text-gray-400 dark:text-gray-500">
        Collecting data…
      </div>
    );
  }

  const pts = samples.map((s, i) => {
    const x = (i / (samples.length - 1)) * W;
    const y = H - (Math.min(s.duration, MAX_Y) / MAX_Y) * H;
    return `${x},${y}`;
  });

  const lastDuration = samples.at(-1)?.duration ?? 0;
  const avgDuration =
    Math.round(samples.reduce((acc, s) => acc + s.duration, 0) / samples.length);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        preserveAspectRatio="none"
        style={{ height: 60 }}
      >
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="text-blue-500"
        />
        {/* Last point dot */}
        {(() => {
          const last = samples.at(-1);
          if (!last) return null;
          const x = W;
          const y = H - (Math.min(last.duration, MAX_Y) / MAX_Y) * H;
          return <circle cx={x} cy={y} r={3} fill="currentColor" className="text-blue-500" />;
        })()}
      </svg>
      <div className="mt-1 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>{samples.length} samples</span>
        <span>Latest: {lastDuration}ms</span>
        <span>Avg: {avgDuration}ms</span>
      </div>
    </div>
  );
}

export function MetricsPage() {
  const [system, setSystem] = useState<SystemResponse | null>(null);
  const [responseSamples, setResponseSamples] = useState<ResponseSample[]>(loadResponseTimes);
  const [cronTasks, setCronTasks] = useState<CronTask[]>([]);
  const [cronLoading, setCronLoading] = useState(true);

  // Previous network counters for calculating bandwidth
  const [prevNetwork, setPrevNetwork] = useState<{ inBytes: number; outBytes: number; ts: number } | null>(null);
  const [networkMbps, setNetworkMbps] = useState<{ rx: number; tx: number } | null>(null);

  const fetchSystem = useCallback(async () => {
    const t0 = Date.now();
    try {
      const res = await fetch("/mc-api/system");
      const duration = Date.now() - t0;
      const data: SystemResponse = await res.json();

      setSystem(data);

      // Compute network Mbps if we have a previous reading
      if (data.network && prevNetwork) {
        const elapsedSec = (t0 - prevNetwork.ts) / 1000;
        if (elapsedSec > 0) {
          const rxMbps = ((data.network.inBytes - prevNetwork.inBytes) * 8) / elapsedSec / 1_000_000;
          const txMbps = ((data.network.outBytes - prevNetwork.outBytes) * 8) / elapsedSec / 1_000_000;
          setNetworkMbps({ rx: Math.max(0, rxMbps), tx: Math.max(0, txMbps) });
        }
      }
      if (data.network) {
        setPrevNetwork({ inBytes: data.network.inBytes, outBytes: data.network.outBytes, ts: t0 });
      }

      // Store response time sample
      setResponseSamples((prev) => {
        const next = [...prev, { ts: t0, duration }].slice(-MAX_SAMPLES);
        saveResponseTimes(next);
        return next;
      });
    } catch {
      const duration = Date.now() - t0;
      setResponseSamples((prev) => {
        const next = [...prev, { ts: t0, duration }].slice(-MAX_SAMPLES);
        saveResponseTimes(next);
        return next;
      });
    }
  }, [prevNetwork]);

  const fetchCron = useCallback(async () => {
    setCronLoading(true);
    try {
      const res = await fetch("/mc-api/cron");
      const data: CronResponse = await res.json();
      setCronTasks(data.tasks ?? []);
    } catch {
      // silently ignore
    } finally {
      setCronLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSystem();
    void fetchCron();
  }, [fetchSystem, fetchCron]);

  useEffect(() => {
    const id = setInterval(() => {
      void fetchSystem();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchSystem]);

  // CPU gauge
  const cpuPct = (system?.cpu ?? 0) / 100;
  const cpuDisplay = system?.cpu !== undefined ? `${Math.round(system.cpu)}%` : "—";

  // RAM gauge
  const ramPct =
    system?.ram && system.ram.total > 0 ? system.ram.used / system.ram.total : 0;
  const ramDisplay =
    system?.ram !== undefined ? `${Math.round(ramPct * 100)}%` : "—";
  const ramSub =
    system?.ram
      ? `${(system.ram.used / 1024 / 1024 / 1024).toFixed(1)} / ${(system.ram.total / 1024 / 1024 / 1024).toFixed(1)} GB`
      : undefined;

  // Disk gauge
  const diskPct =
    system?.disk && system.disk.total > 0 ? system.disk.used / system.disk.total : 0;
  const diskDisplay =
    system?.disk !== undefined ? `${Math.round(diskPct * 100)}%` : "—";
  const diskSub =
    system?.disk
      ? `${(system.disk.used / 1024 / 1024 / 1024).toFixed(1)} / ${(system.disk.total / 1024 / 1024 / 1024).toFixed(1)} GB`
      : undefined;

  // Network gauge: combined rx+tx Mbps mapped 0–100Mbps → 0–1
  const totalMbps = networkMbps ? networkMbps.rx + networkMbps.tx : 0;
  const networkPct = Math.min(totalMbps / 100, 1);
  const networkDisplay = networkMbps ? `${totalMbps.toFixed(1)}` : "—";
  const networkSub = networkMbps
    ? `↓${networkMbps.rx.toFixed(1)} ↑${networkMbps.tx.toFixed(1)} Mbps`
    : "Mbps";

  // Cron stats
  const totalTasks = cronTasks.length;
  const totalSuccess = cronTasks.reduce((s, t) => s + (t.successCount ?? 0), 0);
  const totalFail = cronTasks.reduce((s, t) => s + (t.failCount ?? 0), 0);
  const totalRuns = totalSuccess + totalFail;
  const successRate = totalRuns > 0 ? (totalSuccess / totalRuns) * 100 : 0;
  const avgDuration =
    cronTasks.length > 0
      ? Math.round(
          cronTasks.reduce((s, t) => s + (t.lastDurationMs ?? 0), 0) / cronTasks.length,
        )
      : 0;

  const tasksWithRuns = cronTasks.filter((t) => (t.successCount ?? 0) + (t.failCount ?? 0) > 0);
  const taskRates = tasksWithRuns.map((t) => {
    const runs = (t.successCount ?? 0) + (t.failCount ?? 0);
    return { name: t.name, rate: runs > 0 ? (t.successCount ?? 0) / runs : 0 };
  });
  taskRates.sort((a, b) => b.rate - a.rate);
  const mostReliable = taskRates.at(0);
  const leastReliable = taskRates.at(-1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Performance Metrics
            </h1>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Live system resource usage — refreshes every 5 seconds.
          </p>
        </div>
      </div>

      {/* Gauge row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <GaugeCard
          label="CPU"
          pct={cpuPct}
          displayText={cpuDisplay}
          strokeColor="text-blue-500"
          textColor="text-blue-500"
        />
        <GaugeCard
          label="RAM"
          pct={ramPct}
          displayText={ramDisplay}
          subText={ramSub}
          strokeColor="text-purple-500"
          textColor="text-purple-500"
        />
        <GaugeCard
          label="Disk"
          pct={diskPct}
          displayText={diskDisplay}
          subText={diskSub}
          strokeColor="text-orange-500"
          textColor="text-orange-500"
        />
        <GaugeCard
          label="Network"
          pct={networkPct}
          displayText={networkDisplay}
          subText={networkSub}
          strokeColor="text-green-500"
          textColor="text-green-500"
        />
      </div>

      {/* Response time chart */}
      <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          API Response Time
        </h2>
        <ResponseSparkline samples={responseSamples} />
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Last {MAX_SAMPLES} samples from /mc-api/system · y-axis 0–2000ms
        </p>
      </div>

      {/* Cron stats */}
      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Cron Stats</h2>
            {cronLoading && <RefreshCw className="h-3.5 w-3.5 animate-spin text-gray-400" />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-0 divide-x divide-y divide-gray-100 dark:divide-gray-700 sm:grid-cols-4 sm:divide-y-0">
          <StatCell label="Total Tasks" value={String(totalTasks)} />
          <StatCell
            label="Success Rate"
            value={totalRuns > 0 ? `${successRate.toFixed(1)}%` : "—"}
            sub={totalRuns > 0 ? `${totalSuccess} / ${totalRuns} runs` : undefined}
          />
          <StatCell
            label="Avg Duration"
            value={cronTasks.length > 0 ? `${avgDuration}ms` : "—"}
          />
          <StatCell
            label="Runs Tracked"
            value={String(totalRuns)}
          />
        </div>
        {tasksWithRuns.length > 0 && (
          <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-700">
            <div className="flex flex-wrap gap-4 text-xs">
              {mostReliable && (
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-green-600 dark:text-green-400">Most reliable:</span>{" "}
                  {mostReliable.name}{" "}
                  <span className="text-gray-400">({(mostReliable.rate * 100).toFixed(0)}%)</span>
                </span>
              )}
              {leastReliable && leastReliable.name !== mostReliable?.name && (
                <span className="text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-red-500 dark:text-red-400">Least reliable:</span>{" "}
                  {leastReliable.name}{" "}
                  <span className="text-gray-400">({(leastReliable.rate * 100).toFixed(0)}%)</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-gray-900 dark:text-gray-100">
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{sub}</p>}
    </div>
  );
}
