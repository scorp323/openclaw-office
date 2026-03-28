import { useMemo, useState } from "react";
import { useOfficeStore } from "@/store/office-store";
import { MatrixRain } from "@/components/office-2d/MatrixRain";
import { FloorPlan } from "@/components/office-2d/FloorPlan";
import { useLiveData } from "@/hooks/useLiveData";
import type { AgentVisualStatus } from "@/gateway/types";

/* ── Types ─────────────────────────────────────────── */
interface RealAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  zone: string;
  status: "active" | "standby" | "offline";
}

/* ── Helpers ───────────────────────────────────────── */
function timeAgo(ms: number): string {
  if (!ms) return "never";
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function nextIn(ms: number): string {
  if (!ms) return "—";
  const diff = ms - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60_000) return `${Math.round(diff / 1000)}s`;
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m`;
  return `${Math.round(diff / 3_600_000)}h`;
}

function statusDot(status: string | undefined, errors: number): string {
  if (errors > 0) return "🔴";
  if (status === "ok") return "🟢";
  if (status === "error") return "🔴";
  return "⚪";
}

function parseUptime(raw: string): string {
  const m = raw.match(/up\s+(.+?),\s+\d+\s+user/);
  return m ? m[1].trim() : raw.split(",")[0]?.replace(/.*up\s+/, "").trim() || raw;
}

function parseDisk(raw: string): { used: string; avail: string; pct: string } {
  const parts = raw.trim().split(/\s+/);
  return { used: parts[2] || "?", avail: parts[3] || "?", pct: parts[4] || "?" };
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function statusLabel(s: AgentVisualStatus): string {
  const labels: Record<string, string> = {
    idle: "Standing by", thinking: "Thinking...", tool_calling: "Working...",
    speaking: "Speaking", spawning: "Spawning", error: "Error", offline: "Offline",
  };
  return labels[s] || s;
}

/* ── Sparkline SVG ─────────────────────────────────── */
function Sparkline({ data, color = "#00ff41", height = 24, width = 80 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 2) - 1;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 2px ${color}60)` }}
      />
    </svg>
  );
}

/* ── Agent Card (Real Roster) ──────────────────────── */
function AgentCard({ agent, isSelected, onClick }: { agent: RealAgent; isSelected: boolean; onClick: () => void }) {
  const statusColors: Record<string, { bg: string; text: string; glow: boolean }> = {
    active: { bg: "#00ff41", text: "ACTIVE", glow: true },
    standby: { bg: "#fbbf24", text: "STANDBY", glow: false },
    offline: { bg: "#6b7280", text: "OFFLINE", glow: false },
  };
  const cfg = statusColors[agent.status] || statusColors.offline;

  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", gap: 8, padding: "14px 16px",
        background: isSelected ? "rgba(0, 255, 65, 0.08)" : "rgba(0, 255, 65, 0.02)",
        border: `1px solid ${isSelected ? "rgba(0, 255, 65, 0.3)" : "rgba(0, 255, 65, 0.1)"}`,
        borderRadius: 12, cursor: "pointer", width: "100%", textAlign: "left",
        backdropFilter: "blur(8px)",
        transition: "all 0.2s",
        fontFamily: "'JetBrains Mono', monospace",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 20 }}>{agent.emoji}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%", backgroundColor: cfg.bg,
            boxShadow: cfg.glow ? `0 0 6px ${cfg.bg}, 0 0 12px ${cfg.bg}40` : "none",
          }} />
          <span style={{ fontSize: 9, color: cfg.bg, fontWeight: 600, letterSpacing: "0.05em" }}>{cfg.text}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{agent.name}</div>
        <div style={{ fontSize: 10, color: "rgba(0, 255, 65, 0.5)", marginTop: 2 }}>{agent.role}</div>
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{agent.model}</div>
    </button>
  );
}

/* ── Agent Detail Panel ────────────────────────────── */
function AgentDetailPanel({ agent, onClose }: { agent: RealAgent; onClose: () => void }) {
  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 340, maxWidth: "90vw",
      background: "rgba(0, 10, 0, 0.95)", borderLeft: "1px solid rgba(0, 255, 65, 0.2)",
      backdropFilter: "blur(20px)", zIndex: 100, padding: "24px 20px",
      fontFamily: "'JetBrains Mono', monospace", overflowY: "auto",
      animation: "slideIn 0.2s ease-out",
    }}>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 28 }}>{agent.emoji}</span>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 6, color: "#fff", padding: "4px 10px", cursor: "pointer", fontSize: 12,
        }}>✕</button>
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0 }}>{agent.name}</h2>
      <div style={{ fontSize: 11, color: "rgba(0, 255, 65, 0.6)", marginTop: 4, marginBottom: 20 }}>{agent.role}</div>
      {[
        ["Model", agent.model],
        ["Status", agent.status.toUpperCase()],
        ["Zone", agent.zone],
        ["ID", agent.id],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(0, 255, 65, 0.06)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{label}</span>
          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Cron Status Board ─────────────────────────────── */
function CronBoard({ crons }: { crons: any[] }) {
  const sorted = useMemo(() =>
    [...crons].sort((a, b) => {
      if ((a.state?.consecutiveErrors || 0) > 0 && (b.state?.consecutiveErrors || 0) === 0) return -1;
      if ((b.state?.consecutiveErrors || 0) > 0 && (a.state?.consecutiveErrors || 0) === 0) return 1;
      return (a.state?.nextRunAtMs || 0) - (b.state?.nextRunAtMs || 0);
    }),
  [crons]);

  return (
    <div style={{ overflowX: "auto" }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "24px 2fr 1fr 1fr 60px",
        gap: 8, padding: "6px 0", fontSize: 10, fontWeight: 600,
        color: "rgba(0, 255, 65, 0.5)", borderBottom: "1px solid rgba(0, 255, 65, 0.15)",
        fontFamily: "'JetBrains Mono', monospace", minWidth: 500,
      }}>
        <span></span><span>Name</span><span>Last Run</span><span>Next</span><span style={{ textAlign: "center" }}>Err</span>
      </div>
      {/* Rows */}
      <div style={{ maxHeight: 300, overflowY: "auto" }}>
        {sorted.map(cron => (
          <div key={cron.id} style={{
            display: "grid", gridTemplateColumns: "24px 2fr 1fr 1fr 60px",
            gap: 8, padding: "5px 0", fontSize: 11, alignItems: "center",
            borderBottom: "1px solid rgba(0, 255, 65, 0.04)",
            opacity: cron.enabled ? 1 : 0.4, color: "rgba(255,255,255,0.65)",
            fontFamily: "'JetBrains Mono', monospace", minWidth: 500,
          }}>
            <span>{statusDot(cron.state?.lastRunStatus, cron.state?.consecutiveErrors || 0)}</span>
            <span style={{ color: cron.state?.consecutiveErrors > 0 ? "#ff4444" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {cron.name}
            </span>
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{cron.state?.lastRunAtMs ? timeAgo(cron.state.lastRunAtMs) : "—"}</span>
            <span style={{ color: "rgba(0, 255, 65, 0.6)" }}>{cron.state?.nextRunAtMs ? nextIn(cron.state.nextRunAtMs) : "—"}</span>
            <span style={{ textAlign: "center", color: (cron.state?.consecutiveErrors || 0) > 0 ? "#ff4444" : "rgba(255,255,255,0.3)" }}>
              {cron.state?.consecutiveErrors || 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────── */
function KpiCard({ label, value, sub, color = "#00ff41", sparkData }: { label: string; value: string; sub?: string; color?: string; sparkData?: number[] }) {
  return (
    <div style={{
      background: "rgba(0, 255, 65, 0.03)", border: "1px solid rgba(0, 255, 65, 0.15)",
      borderRadius: 12, padding: "12px 16px", backdropFilter: "blur(12px)",
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>{sub}</div>}
        </div>
        {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

/* ── Section Header ────────────────────────────────── */
function SectionHeader({ title, color = "#00ff41" }: { title: string; color?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
      <h2 style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.15em", textTransform: "uppercase", color: `${color}99`, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>{title}</h2>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, ${color}40, transparent)` }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMMAND CENTER
   ══════════════════════════════════════════════════════ */
export function CommandCenter() {
  // Gateway WebSocket data (agent activity from live connection)
  const wsAgents = useOfficeStore((s) => s.agents);
  const metrics = useOfficeStore((s) => s.globalMetrics);
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);

  // MC API data (crons, system, real agent roster)
  const { crons, system, gateway, loading, error, lastRefresh, refresh, agents: realAgents, history } = useLiveData(15000);

  // Agent detail panel
  const [selectedAgent, setSelectedAgent] = useState<RealAgent | null>(null);

  // Computed stats
  const wsAgentList = useMemo(
    () => Array.from(wsAgents.values()).filter((a) => !a.isPlaceholder && !a.isSubAgent),
    [wsAgents],
  );
  const activeWsAgents = wsAgentList.filter((a) => a.status !== "idle" && a.status !== "offline").length;

  const cronStats = useMemo(() => {
    const total = crons.length;
    const healthy = crons.filter(c => c.enabled && c.state?.lastRunStatus === "ok" && c.state.consecutiveErrors === 0).length;
    const errors = crons.filter(c => c.state?.consecutiveErrors > 0).length;
    return { total, healthy, errors };
  }, [crons]);

  const disk = system ? parseDisk(system.disk) : null;
  const activeRealAgents = realAgents.filter(a => a.status === "active").length;

  // History sparkline data
  const cronHealthyHistory = useMemo(() => history.map(h => h.cronHealthy), [history]);
  const sessionHistory = useMemo(() => history.map(h => h.sessionCount), [history]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000", overflow: "hidden" }}>
      {/* Matrix rain background */}
      <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
        <MatrixRain />
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 10, padding: "16px 20px", maxWidth: 1400, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "#e2e8f0", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
              🌀 MORPHEUS <span style={{ color: "#00ff41" }}>COMMAND CENTER</span>
            </h1>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
              {gateway?.os?.label || "macOS"} · v{gateway?.gateway?.self?.version || "?"} · {connectionStatus === "connected" ? "🟢 connected" : "🟡 " + connectionStatus}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {error && <span style={{ color: "#ff4444", fontSize: 10 }}>⚠ {error}</span>}
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>
              {lastRefresh ? timeAgo(lastRefresh) : "loading..."}
            </span>
            <button onClick={refresh} style={{
              background: "rgba(0, 255, 65, 0.1)", border: "1px solid rgba(0, 255, 65, 0.3)",
              borderRadius: 6, color: "#00ff41", padding: "5px 10px", fontSize: 10, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
            }}>⟳</button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 20 }}>
          <KpiCard label="Agents" value={`${activeRealAgents}/${realAgents.length}`} sub={`${activeWsAgents} in gateway`} />
          <KpiCard label="Crons" value={`${cronStats.healthy}/${cronStats.total}`}
            sub={cronStats.errors > 0 ? `${cronStats.errors} errors` : "all healthy"}
            color={cronStats.errors > 0 ? "#ff4444" : "#00ff41"}
            sparkData={cronHealthyHistory} />
          <KpiCard label="Sessions" value={String(gateway?.sessions?.count || 0)} sub="across all agents" sparkData={sessionHistory} />
          <KpiCard label="Uptime" value={system ? parseUptime(system.uptime) : "—"} sub={disk ? `${disk.pct} disk (${disk.avail} free)` : ""} />
          <KpiCard label="Tokens" value={formatTokens(metrics.totalTokens)} sub="session total" color="#a78bfa" />
        </div>

        {/* Two-column layout: Office + Agent Fleet */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(0, 1fr)", gap: 16, marginBottom: 20 }}>
          {/* Left: The Office */}
          <div>
            <SectionHeader title="The Construct — Office View" />
            <div style={{
              background: "rgba(0, 255, 65, 0.02)", border: "1px solid rgba(0, 255, 65, 0.1)",
              borderRadius: 12, overflow: "hidden", height: 320,
            }}>
              <FloorPlan />
            </div>
          </div>

          {/* Right: Agent Fleet */}
          <div>
            <SectionHeader title="Agent Fleet" />
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 8, maxHeight: 320, overflowY: "auto",
            }}>
              {realAgents.map(agent => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  isSelected={selectedAgent?.id === agent.id}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Gateway Agent Activity */}
        {wsAgentList.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <SectionHeader title="Live Gateway Activity" />
            <div style={{
              display: "flex", gap: 12, overflowX: "auto", padding: "4px 0",
            }}>
              {wsAgentList.map(agent => (
                <div key={agent.id} style={{
                  flex: "0 0 auto", padding: "10px 14px", minWidth: 160,
                  background: "rgba(0, 255, 65, 0.03)", border: "1px solid rgba(0, 255, 65, 0.1)",
                  borderRadius: 10, fontFamily: "'JetBrains Mono', monospace",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{agent.name}</span>
                    <div style={{
                      width: 6, height: 6, borderRadius: "50%",
                      backgroundColor: agent.status === "idle" ? "#4ade80" : agent.status === "error" ? "#ef4444" : "#00ff41",
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(0, 255, 65, 0.4)" }}>{statusLabel(agent.status)}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>{agent.toolCallCount} tool calls</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cron Status Board */}
        <div style={{ marginBottom: 20 }}>
          <SectionHeader title={`Cron Jobs (${crons.length})`} />
          <div style={{
            background: "rgba(0, 255, 65, 0.02)", border: "1px solid rgba(0, 255, 65, 0.1)",
            borderRadius: 12, padding: "12px 16px",
          }}>
            {crons.length > 0 ? <CronBoard crons={crons} /> : (
              <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                {loading ? "Loading crons..." : "No cron data available"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Agent Detail Panel (slide-in) */}
      {selectedAgent && (
        <>
          <div onClick={() => setSelectedAgent(null)} style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90,
          }} />
          <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        </>
      )}

      {/* Mobile responsive overrides */}
      <style>{`
        @media (max-width: 768px) {
          div[style*="gridTemplateColumns: minmax(0, 1.2fr)"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
