import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOfficeStore } from "@/store/office-store";
import { MatrixRain } from "@/components/office-2d/MatrixRain";
import { FloorPlan } from "@/components/office-2d/FloorPlan";
import { getCodename } from "@/lib/matrix-codenames";
import type { AgentVisualStatus } from "@/gateway/types";

// ── Agent Gauge Card ──────────────────────────────────────────
function AgentGaugeCard({
  name,
  codename,
  status,
  toolCalls,
  lastActive,
  isSelected,
  onClick,
}: {
  name: string;
  codename: string;
  status: AgentVisualStatus;
  toolCalls: number;
  lastActive: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const statusConfig: Record<string, { color: string; label: string; glow: boolean }> = {
    idle: { color: "#4ade80", label: "Idle", glow: false },
    thinking: { color: "#00ff41", label: "Thinking", glow: true },
    tool_calling: { color: "#fbbf24", label: "Working", glow: true },
    speaking: { color: "#00ff41", label: "Speaking", glow: true },
    spawning: { color: "#a78bfa", label: "Spawning", glow: true },
    error: { color: "#ef4444", label: "Error", glow: true },
    offline: { color: "#6b7280", label: "Offline", glow: false },
  };

  const cfg = statusConfig[status] || statusConfig.idle;
  const ago = timeAgo(lastActive);

  // Arc gauge — percentage based on tool calls (visual only)
  const maxCalls = 100;
  const pct = Math.min(toolCalls / maxCalls, 1);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = pct * circumference * 0.75; // 270° arc

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col items-center gap-3 rounded-2xl border p-5 transition-all duration-200 active:scale-[0.97]
        ${isSelected
          ? "border-[#00ff41]/40 bg-[#001a00]/80 shadow-[0_0_20px_rgba(0,255,65,0.15)]"
          : "border-[#0a3d0a]/50 bg-[#0a0f0a]/60 hover:border-[#00ff41]/25 hover:bg-[#001a00]/50 hover:shadow-[0_0_15px_rgba(0,255,65,0.08)]"
        } backdrop-blur-md`}
    >
      {/* Status dot */}
      <div className="absolute right-3 top-3 flex items-center gap-1.5">
        <div
          className="h-2 w-2 rounded-full"
          style={{
            backgroundColor: cfg.color,
            boxShadow: cfg.glow ? `0 0 8px ${cfg.color}, 0 0 16px ${cfg.color}40` : "none",
            animation: cfg.glow ? "pulse 2s ease-in-out infinite" : "none",
          }}
        />
        <span className="text-[10px] font-medium" style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      </div>

      {/* Arc gauge */}
      <div className="relative mt-2">
        <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-[135deg]">
          {/* Background arc */}
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke="#0a3d0a"
            strokeWidth="4"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
            opacity="0.4"
          />
          {/* Progress arc */}
          <circle
            cx="40" cy="40" r={radius}
            fill="none"
            stroke={cfg.color}
            strokeWidth="4"
            strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
            strokeLinecap="round"
            className="transition-all duration-700"
            style={{
              filter: `drop-shadow(0 0 4px ${cfg.color}60)`,
            }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-[#e2e8f0]">{toolCalls}</span>
          <span className="text-[9px] text-[#4ade80]/60">calls</span>
        </div>
      </div>

      {/* Agent info */}
      <div className="text-center">
        <div className="text-sm font-semibold text-[#e2e8f0] group-hover:text-[#00ff41] transition-colors">
          {codename}
        </div>
        <div className="text-[11px] text-[#4ade80]/50">{name}</div>
      </div>

      {/* Last active */}
      <div className="text-[10px] text-[#4ade80]/30">{ago}</div>
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = "#00ff41" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-[#0a3d0a]/50 bg-[#0a0f0a]/60 p-4 backdrop-blur-md">
      <span className="text-[11px] font-medium uppercase tracking-wider text-[#4ade80]/40">{label}</span>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
      {sub && <span className="text-[10px] text-[#4ade80]/30">{sub}</span>}
    </div>
  );
}

// ── Brain Rain Text (overlay of real thoughts) ────────────────
function BrainRainOverlay() {
  // This shows recent activity as fading text streams
  const agents = useOfficeStore((s) => s.agents);
  const thoughts = useMemo(() => {
    const items: string[] = [];
    for (const a of agents.values()) {
      if (a.isPlaceholder) continue;
      if (a.currentTool) {
        items.push(`${a.name}: ${a.currentTool.name}...`);
      } else if (a.speechBubble) {
        items.push(`${a.name}: ${a.speechBubble.text}`);
      }
    }
    // Add some ambient thoughts if nothing active
    if (items.length === 0) {
      items.push("systems nominal...", "monitoring crons...", "all agents reporting...");
    }
    return items;
  }, [agents]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.06]">
      {thoughts.map((t, i) => (
        <div
          key={`${t}-${i}`}
          className="absolute font-mono text-xs text-[#00ff41] animate-[brain-fall_12s_linear_infinite]"
          style={{
            left: `${10 + (i * 23) % 80}%`,
            animationDelay: `${i * 2.5}s`,
            top: "-20px",
          }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────
function ActivityFeed() {
  const agents = useOfficeStore((s) => s.agents);
  const recentActivity = useMemo(() => {
    const items: { name: string; action: string; time: number; status: AgentVisualStatus }[] = [];
    for (const a of agents.values()) {
      if (a.isPlaceholder) continue;
      items.push({
        name: a.name,
        action: a.currentTool ? `Running ${a.currentTool.name}` : a.speechBubble?.text || statusLabel(a.status),
        time: a.lastActiveAt,
        status: a.status,
      });
    }
    return items.sort((a, b) => b.time - a.time).slice(0, 8);
  }, [agents]);

  if (recentActivity.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-[#4ade80]/30 text-sm">
        Waiting for agent activity...
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-[#0a3d0a]/30">
      {recentActivity.map((item, i) => (
        <div key={`${item.name}-${i}`} className="flex items-center gap-3 px-4 py-3">
          <div
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: statusColor(item.status) }}
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs font-medium text-[#e2e8f0]">{item.name}</span>
            <span className="text-xs text-[#4ade80]/40"> · {item.action}</span>
          </div>
          <span className="text-[10px] text-[#4ade80]/25 shrink-0">{timeAgo(item.time)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Mini Office (The Construct) ───────────────────────────────
function MiniOffice() {
  const navigate = useNavigate();
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[#00ff41]/60">The Construct</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-[#0a3d0a]/60 to-transparent" />
      </div>
      <button
        onClick={() => navigate("/office")}
        className="group w-full cursor-pointer overflow-hidden rounded-2xl border border-[#0a3d0a]/50 bg-[#0a0f0a]/60 backdrop-blur-md transition-all duration-200 hover:border-[#00ff41]/25 hover:shadow-[0_0_20px_rgba(0,255,65,0.1)]"
      >
        <div className="h-[150px] overflow-hidden sm:h-[200px]">
          <div className="pointer-events-none h-full w-full scale-100 opacity-90 transition-transform duration-300 group-hover:scale-[1.02]">
            <FloorPlan />
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-[#0a3d0a]/30 px-4 py-2">
          <span className="text-[11px] font-medium text-[#4ade80]/50" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
            Click to enter The Construct
          </span>
          <span className="text-[11px] text-[#00ff41]/40 transition-colors group-hover:text-[#00ff41]/70">→</span>
        </div>
      </button>
    </div>
  );
}

// ── Main Command Center ───────────────────────────────────────
export function CommandCenter() {
  const agents = useOfficeStore((s) => s.agents);
  const metrics = useOfficeStore((s) => s.globalMetrics);
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);

  const agentList = useMemo(
    () => Array.from(agents.values()).filter((a) => !a.isPlaceholder && !a.isSubAgent),
    [agents],
  );

  const subAgents = useMemo(
    () => Array.from(agents.values()).filter((a) => a.isSubAgent && !a.isPlaceholder),
    [agents],
  );

  const activeCount = agentList.filter((a) => a.status !== "idle" && a.status !== "offline").length;
  const errorCount = agentList.filter((a) => a.status === "error").length;

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-black">
      {/* Matrix rain — z-index 0, behind everything */}
      <div className="absolute inset-0 z-0">
        <MatrixRain />
      </div>

      {/* Brain rain thoughts — z-index 1 */}
      <div className="absolute inset-0 z-[1]">
        <BrainRainOverlay />
      </div>

      {/* Main content — z-index 10 */}
      <div className="relative z-10 flex h-full flex-col">
        {/* Top Bar */}
        <header className="flex shrink-0 items-center justify-between border-b border-[#0a3d0a]/40 bg-black/70 px-4 py-3 backdrop-blur-xl sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold text-[#e2e8f0]">🌀</span>
            <h1 className="text-base font-semibold tracking-tight text-[#e2e8f0] sm:text-lg">
              Morpheus <span className="text-[#00ff41]">Command Center</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: connectionStatus === "connected" ? "#00ff41" : connectionStatus === "error" ? "#ef4444" : "#eab308",
                boxShadow: connectionStatus === "connected" ? "0 0 8px #00ff41, 0 0 16px #00ff4140" : "none",
              }}
            />
            <span className="text-xs text-[#4ade80]/60">
              {connectionStatus === "connected" ? "Online" : connectionStatus}
            </span>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {/* KPI Row */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Active" value={`${activeCount}/${agentList.length}`} sub="agents running" />
            <KpiCard label="Sub-Agents" value={String(subAgents.length)} sub="spawned" color="#a78bfa" />
            <KpiCard label="Tokens" value={formatTokens(metrics.totalTokens)} sub="session total" />
            <KpiCard
              label="Status"
              value={errorCount > 0 ? `${errorCount} Error${errorCount > 1 ? "s" : ""}` : "All Clear"}
              sub={errorCount > 0 ? "needs attention" : "systems nominal"}
              color={errorCount > 0 ? "#ef4444" : "#00ff41"}
            />
          </div>

          {/* Mini Office — The Construct */}
          <MiniOffice />

          {/* Section label */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#00ff41]/60">Agent Fleet</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[#0a3d0a]/60 to-transparent" />
          </div>

          {/* Agent Cards Grid */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {agentList.map((agent) => (
              <AgentGaugeCard
                key={agent.id}
                name={agent.name}
                codename={getCodename(agent.id, agent.name)}
                status={agent.status}
                toolCalls={agent.toolCallCount}
                lastActive={agent.lastActiveAt}
                isSelected={selectedAgentId === agent.id}
                onClick={() => selectAgent(agent.id)}
              />
            ))}
          </div>

          {/* Sub-agents (if any) */}
          {subAgents.length > 0 && (
            <>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#a78bfa]/60">Sub-Agents</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[#a78bfa]/20 to-transparent" />
              </div>
              <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {subAgents.map((agent) => (
                  <AgentGaugeCard
                    key={agent.id}
                    name={agent.name}
                    codename={agent.name}
                    status={agent.status}
                    toolCalls={agent.toolCallCount}
                    lastActive={agent.lastActiveAt}
                    isSelected={selectedAgentId === agent.id}
                    onClick={() => selectAgent(agent.id)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Activity Feed */}
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#00ff41]/60">Live Activity</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-[#0a3d0a]/60 to-transparent" />
          </div>
          <div className="rounded-2xl border border-[#0a3d0a]/50 bg-[#0a0f0a]/60 backdrop-blur-md">
            <ActivityFeed />
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function statusLabel(s: AgentVisualStatus): string {
  const labels: Record<string, string> = {
    idle: "Standing by",
    thinking: "Thinking...",
    tool_calling: "Working...",
    speaking: "Speaking",
    spawning: "Spawning agent",
    error: "Error",
    offline: "Offline",
  };
  return labels[s] || s;
}

function statusColor(s: AgentVisualStatus): string {
  const colors: Record<string, string> = {
    idle: "#4ade80",
    thinking: "#00ff41",
    tool_calling: "#fbbf24",
    speaking: "#00ff41",
    spawning: "#a78bfa",
    error: "#ef4444",
    offline: "#6b7280",
  };
  return colors[s] || "#6b7280";
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diff < 5) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
