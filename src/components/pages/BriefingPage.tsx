import {
  AlertCircle,
  Bot,
  CheckCircle,
  Clock,
  DollarSign,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// --- Types ---

interface SystemStatus {
  level: "green" | "yellow" | "red";
  agentCount: number;
  cronErrorCount: number;
  connectionStatus: string;
}

interface AlertEntry {
  ts: number;
  source: string;
  text: string;
  level: "error" | "warn" | "info";
}

interface EmailSummary {
  content: string;
  error?: string;
}

interface CostReport {
  todaySpend: number;
  weekSpend: number;
  budget: number;
  currency: string;
}

interface CronPerf {
  totalRan: number;
  errored: number;
  worstOffender?: string;
}

interface ActiveAgent {
  id: string;
  name: string;
  status: string;
  currentTask?: string;
}

interface BriefingData {
  system: SystemStatus;
  alerts: AlertEntry[];
  email: EmailSummary;
  costs: CostReport;
  cron: CronPerf;
  agents: ActiveAgent[];
  fetchedAt: Date;
}

// --- Fetch helpers ---

interface SystemPayload {
  agents?: Array<{ id?: string; name?: string; status?: string; task?: string }>;
  cronErrors?: number;
  connectionStatus?: string;
  [key: string]: unknown;
}

interface LogPayload {
  entries?: Array<{ ts: number; source: string; text: string }>;
}

interface MemoryPayload {
  content?: string;
  error?: string;
  [key: string]: unknown;
}

interface CostDetailPayload {
  todayTotal?: number;
  today?: number;
  weekTotal?: number;
  week?: number;
  budget?: number;
  currency?: string;
  [key: string]: unknown;
}

interface CronPayload {
  jobs?: Array<{ status?: string; name?: string; errorCount?: number }>;
  [key: string]: unknown;
}

async function loadBriefing(): Promise<BriefingData> {
  const [sysRes, logsRes, emailRes, costsRes, cronRes] = await Promise.allSettled([
    fetch("/mc-api/system"),
    fetch("/mc-api/logs?limit=100"),
    fetch("/mc-api/memory/read?file=email-triage-latest.md"),
    fetch("/mc-api/costs/detail"),
    fetch("/mc-api/cron"),
  ]);

  // System Status
  let system: SystemStatus = { level: "red", agentCount: 0, cronErrorCount: 0, connectionStatus: "unknown" };
  let activeAgents: ActiveAgent[] = [];
  if (sysRes.status === "fulfilled" && sysRes.value.ok) {
    const sys = (await sysRes.value.json()) as SystemPayload;
    const agents = sys.agents ?? [];
    const active = agents.filter((a) => a.status === "working" || a.status === "active");
    const cronErr = sys.cronErrors ?? 0;
    system = {
      level: cronErr > 0 ? "yellow" : "green",
      agentCount: agents.length,
      cronErrorCount: cronErr,
      connectionStatus: sys.connectionStatus ?? "connected",
    };
    activeAgents = active.map((a) => ({
      id: a.id ?? "",
      name: a.name ?? a.id ?? "Agent",
      status: a.status ?? "working",
      currentTask: a.task,
    }));
  }

  // Overnight Alerts (past 12h)
  let alerts: AlertEntry[] = [];
  if (logsRes.status === "fulfilled" && logsRes.value.ok) {
    const logs = (await logsRes.value.json()) as LogPayload;
    const cutoff = Date.now() - 12 * 60 * 60 * 1000;
    alerts = (logs.entries ?? [])
      .filter((e) => {
        const ts = e.ts > 1e12 ? e.ts : e.ts * 1000;
        return ts > cutoff;
      })
      .filter((e) => {
        const upper = e.text.slice(0, 80).toUpperCase();
        return upper.includes("ERROR") || upper.includes("WARN") || upper.includes("[ERROR]") || upper.includes("[WARN]");
      })
      .map((e) => ({
        ts: e.ts > 1e12 ? e.ts : e.ts * 1000,
        source: e.source,
        text: e.text,
        level: (e.text.toUpperCase().includes("ERROR") ? "error" : "warn") as AlertEntry["level"],
      }))
      .slice(0, 20);
  }

  // Email Summary
  let email: EmailSummary = { content: "No email summary available." };
  if (emailRes.status === "fulfilled" && emailRes.value.ok) {
    const mem = (await emailRes.value.json()) as MemoryPayload;
    email = { content: mem.content ?? "No email summary available.", error: mem.error };
  } else {
    email = { content: "Email summary unavailable.", error: "Could not load email triage" };
  }

  // Cost Report
  let costs: CostReport = { todaySpend: 0, weekSpend: 0, budget: 0, currency: "USD" };
  if (costsRes.status === "fulfilled" && costsRes.value.ok) {
    const c = (await costsRes.value.json()) as CostDetailPayload;
    costs = {
      todaySpend: c.todayTotal ?? c.today ?? 0,
      weekSpend: c.weekTotal ?? c.week ?? 0,
      budget: c.budget ?? 0,
      currency: c.currency ?? "USD",
    };
  }

  // Cron Performance
  let cron: CronPerf = { totalRan: 0, errored: 0 };
  if (cronRes.status === "fulfilled" && cronRes.value.ok) {
    const cr = (await cronRes.value.json()) as CronPayload;
    const jobs = cr.jobs ?? [];
    const ran = jobs.filter((j) => j.status === "completed" || j.status === "running" || j.status === "error");
    const errored = jobs.filter((j) => j.status === "error");
    const worst = errored.reduce<{ name?: string; errorCount?: number } | null>(
      (acc, j) => (!acc || (j.errorCount ?? 0) > (acc.errorCount ?? 0) ? j : acc),
      null,
    );
    cron = {
      totalRan: ran.length,
      errored: errored.length,
      worstOffender: worst?.name,
    };
  }

  return { system, alerts, email, costs, cron, agents: activeAgents, fetchedAt: new Date() };
}

// --- Sub-components ---

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-900/60">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusDot({ level }: { level: "green" | "yellow" | "red" }) {
  const color =
    level === "green"
      ? "bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.5)]"
      : level === "yellow"
        ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
        : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]";
  return <span className={`inline-block h-3 w-3 rounded-full ${color}`} />;
}

function SystemStatusSection({ data }: { data: SystemStatus }) {
  const label = data.level === "green" ? "All Systems Healthy" : data.level === "yellow" ? "Warnings Detected" : "Issues Detected";
  const textColor =
    data.level === "green"
      ? "text-green-600 dark:text-green-400"
      : data.level === "yellow"
        ? "text-amber-600 dark:text-amber-400"
        : "text-red-600 dark:text-red-400";

  return (
    <SectionCard title="System Status" icon={<CheckCircle className="h-5 w-5" />}>
      <div className="flex items-center gap-3">
        <StatusDot level={data.level} />
        <span className={`text-lg font-bold ${textColor}`}>{label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Total Agents" value={String(data.agentCount)} />
        <Stat label="Cron Errors" value={String(data.cronErrorCount)} alert={data.cronErrorCount > 0} />
        <Stat label="Gateway" value={data.connectionStatus} />
      </div>
    </SectionCard>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${alert ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-gray-100"}`}>
        {value}
      </p>
    </div>
  );
}

function AlertsSection({ alerts }: { alerts: AlertEntry[] }) {
  if (alerts.length === 0) {
    return (
      <SectionCard title="Overnight Alerts" icon={<AlertCircle className="h-5 w-5 text-green-500" />}>
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">No alerts in the past 12 hours</span>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title={`Overnight Alerts (${alerts.length})`} icon={<AlertCircle className="h-5 w-5 text-red-500" />}>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div
            key={i}
            className={`flex gap-2 rounded-lg px-3 py-2 text-xs ${
              alert.level === "error"
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300"
            }`}
          >
            {alert.level === "error" ? <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
            <div className="min-w-0">
              <span className="font-medium">{alert.source}</span>
              <span className="mx-1 opacity-60">·</span>
              <span className="opacity-80">{new Date(alert.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              <p className="mt-0.5 truncate opacity-90">{alert.text.slice(0, 120)}</p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function EmailSection({ email }: { email: EmailSummary }) {
  return (
    <SectionCard title="Email Summary" icon={<span className="text-base">📧</span>}>
      {email.error ? (
        <p className="text-sm text-amber-600 dark:text-amber-400">{email.error}</p>
      ) : (
        <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap text-xs text-gray-700 dark:text-gray-300">
          {email.content}
        </pre>
      )}
    </SectionCard>
  );
}

function CostSection({ costs }: { costs: CostReport }) {
  const remaining = costs.budget > 0 ? costs.budget - costs.weekSpend : null;
  const symbol = costs.currency === "USD" ? "$" : costs.currency;

  function fmt(n: number) {
    return n >= 1 ? `${symbol}${n.toFixed(2)}` : `${symbol}${n.toFixed(3)}`;
  }

  return (
    <SectionCard title="Cost Report" icon={<DollarSign className="h-5 w-5" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Today" value={fmt(costs.todaySpend)} />
        <Stat label="This Week" value={fmt(costs.weekSpend)} />
        {remaining !== null && (
          <Stat label="Budget Remaining" value={fmt(remaining)} alert={remaining < 0} />
        )}
      </div>
      {costs.weekSpend > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          {costs.weekSpend > costs.todaySpend * 7 ? (
            <TrendingDown className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <TrendingUp className="h-3.5 w-3.5 text-amber-500" />
          )}
          <span>
            Daily average: {fmt(costs.weekSpend / 7)} &nbsp;·&nbsp; Today vs avg:{" "}
            {costs.weekSpend > 0
              ? `${((costs.todaySpend / (costs.weekSpend / 7)) * 100).toFixed(0)}%`
              : "—"}
          </span>
        </div>
      )}
    </SectionCard>
  );
}

function CronSection({ cron }: { cron: CronPerf }) {
  const successRate = cron.totalRan > 0 ? (((cron.totalRan - cron.errored) / cron.totalRan) * 100).toFixed(0) : "—";

  return (
    <SectionCard title="Cron Performance" icon={<Clock className="h-5 w-5" />}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Jobs Ran" value={String(cron.totalRan)} />
        <Stat label="Errored" value={String(cron.errored)} alert={cron.errored > 0} />
        <Stat label="Success Rate" value={successRate === "—" ? "—" : `${successRate}%`} />
      </div>
      {cron.worstOffender && (
        <p className="mt-3 text-xs text-red-600 dark:text-red-400">
          Worst offender: <span className="font-medium">{cron.worstOffender}</span>
        </p>
      )}
    </SectionCard>
  );
}

function AgentsSection({ agents }: { agents: ActiveAgent[] }) {
  return (
    <SectionCard title="Active Agents" icon={<Bot className="h-5 w-5" />}>
      {agents.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No agents currently active</p>
      ) : (
        <div className="space-y-2">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800/60"
            >
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(74,222,128,0.5)]" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{agent.name}</span>
                {agent.currentTask && (
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400">{agent.currentTask}</p>
                )}
              </div>
              <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                {agent.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// --- Main Page ---

export function BriefingPage() {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await loadBriefing();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load briefing");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pull-to-refresh (touch)
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const delta = e.changedTouches[0].clientY - touchStartY.current;
      if (delta > 80 && window.scrollY === 0) {
        void refresh();
      }
    }
    touchStartY.current = null;
  };

  useEffect(() => {
    void refresh();
    intervalRef.current = setInterval(() => void refresh(), 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh]);

  return (
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Morning Briefing</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {data
              ? `Last updated: ${data.fetchedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Loading your daily overview..."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {error && !data && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-600 dark:border-red-700/40 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {data && (
        <>
          <SystemStatusSection data={data.system} />
          <AlertsSection alerts={data.alerts} />
          <EmailSection email={data.email} />
          <CostSection costs={data.costs} />
          <CronSection cron={data.cron} />
          <AgentsSection agents={data.agents} />
        </>
      )}
    </div>
  );
}
