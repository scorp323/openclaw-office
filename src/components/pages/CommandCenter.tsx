import { useMemo, useState, useEffect, useRef } from "react";
import { useOfficeStore } from "@/store/office-store";
import { useLiveData } from "@/hooks/useLiveData";
import { useRealAgentSync } from "@/hooks/useRealAgentSync";
// AgentVisualStatus used indirectly via store

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

/* ── Matrix Codenames ──────────────────────────────── */
const CODENAMES: Record<string, { codename: string; title: string }> = {
  morpheus: { codename: "Morpheus", title: "The One Who Leads" },
  "chief analyst": { codename: "Neo", title: "Sees the Market" },
  "research director": { codename: "Trinity", title: "Intelligence Operative" },
  "technical director": { codename: "Tank", title: "The Operator" },
  "content director": { codename: "The Oracle", title: "Shapes the Narrative" },
  "ops manager": { codename: "Link", title: "Ship's Operator" },
  "visual intel": { codename: "Niobe", title: "Sees Everything" },
};

function getCodename(name: string): { codename: string; title: string } {
  return CODENAMES[name.toLowerCase()] || { codename: name, title: "" };
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

/* ── Brain Rain Canvas ─────────────────────────────── */
function BrainRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thoughts = useRef([
    "analyzing market data...", "scanning cron health...", "processing emails...",
    "monitoring agents...", "checking system status...", "reviewing content...",
    "parsing intelligence...", "calculating risk...", "syncing data...",
    "running diagnostics...", "evaluating trends...", "optimizing routes...",
    "scanning news feeds...", "cross-referencing...", "building report...",
    "auditing security...", "deploying updates...", "measuring KPIs...",
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    interface Drop {
      x: number; y: number; speed: number; text: string; opacity: number; fontSize: number;
    }

    const drops: Drop[] = [];
    for (let i = 0; i < 25; i++) {
      drops.push({
        x: Math.random() * w,
        y: Math.random() * h - h,
        speed: 0.3 + Math.random() * 0.5,
        text: thoughts.current[Math.floor(Math.random() * thoughts.current.length)],
        opacity: 0.03 + Math.random() * 0.04,
        fontSize: 10 + Math.random() * 3,
      });
    }

    let animId: number;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const drop of drops) {
        ctx!.save();
        ctx!.globalAlpha = drop.opacity;
        ctx!.font = `${drop.fontSize}px 'JetBrains Mono', monospace`;
        ctx!.fillStyle = "#00ff41";
        ctx!.fillText(drop.text, drop.x, drop.y);
        ctx!.restore();
        drop.y += drop.speed;
        if (drop.y > h + 20) {
          drop.y = -30;
          drop.x = Math.random() * w;
          drop.text = thoughts.current[Math.floor(Math.random() * thoughts.current.length)];
        }
      }
      animId = requestAnimationFrame(draw);
    }
    draw();

    const handleResize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
    window.addEventListener("resize", handleResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", handleResize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />;
}

/* ── Glass Card Wrapper ────────────────────────────── */
const glassStyle = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(0, 20, 0, 0.6)",
  border: "1px solid rgba(0, 255, 65, 0.12)",
  borderRadius: 16,
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  ...extra,
});

/* ── Sparkline SVG ─────────────────────────────────── */
function Sparkline({ data, color = "#00ff41", height = 28, width = 90 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block", opacity: 0.8 }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#sg-${color.replace("#", "")})`} />
    </svg>
  );
}

/* ── Arc Gauge ─────────────────────────────────────── */
function ArcGauge({ value, max, size = 56, color = "#00ff41", label }: { value: number; max: number; size?: number; color?: string; label?: string }) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = Math.PI * r; // half-circle
  const pct = Math.min(value / (max || 1), 1);
  const dashLen = pct * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size / 2 + 12 }}>
      <svg width={size} height={size / 2 + 4} style={{ transform: "rotate(0deg)" }}>
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="rgba(0,255,65,0.08)" strokeWidth="4" strokeLinecap="round" />
        <path d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${dashLen} ${circumference}`}
          style={{ filter: `drop-shadow(0 0 4px ${color}60)`, transition: "stroke-dasharray 0.5s ease" }} />
      </svg>
      {label && <div style={{ position: "absolute", bottom: 0, width: "100%", textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.4)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>}
    </div>
  );
}

/* ── JARVIS Agent Card ─────────────────────────────── */
function JarvisAgentCard({ agent, onClick, isSelected }: { agent: RealAgent; onClick: () => void; isSelected: boolean }) {
  const { codename, title } = getCodename(agent.name);
  const isActive = agent.status === "active";
  const accentColor = isActive ? "#00ff41" : agent.status === "standby" ? "#fbbf24" : "#6b7280";

  return (
    <button onClick={onClick} style={{
      ...glassStyle({
        padding: "16px",
        cursor: "pointer",
        width: "100%",
        textAlign: "left",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        borderColor: isSelected ? "rgba(0, 255, 65, 0.35)" : "rgba(0, 255, 65, 0.12)",
        boxShadow: isActive ? "0 0 20px rgba(0, 255, 65, 0.05), inset 0 1px 0 rgba(0, 255, 65, 0.06)" : "none",
      }),
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      {/* Glow accent line */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, transparent, ${accentColor}60, transparent)` }} />

      {/* Top row: emoji + status */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <span style={{ fontSize: 28, filter: isActive ? "none" : "grayscale(0.5)" }}>{agent.emoji}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%", backgroundColor: accentColor,
            boxShadow: isActive ? `0 0 8px ${accentColor}, 0 0 16px ${accentColor}30` : "none",
            animation: isActive ? "pulse 2s infinite" : "none",
          }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: accentColor, textTransform: "uppercase" }}>
            {agent.status}
          </span>
        </div>
      </div>

      {/* Name + codename */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.2 }}>{codename}</div>
        <div style={{ fontSize: 10, color: "rgba(0, 255, 65, 0.45)", marginTop: 3 }}>{title}</div>
      </div>

      {/* Role + model */}
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
        {agent.role}
      </div>
      <div style={{ fontSize: 9, color: "rgba(0, 255, 65, 0.25)", marginTop: 4 }}>
        {agent.model}
      </div>

      {/* Arc gauge */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
        <ArcGauge value={isActive ? 80 : 10} max={100} color={accentColor} label={isActive ? "load" : "idle"} />
      </div>
    </button>
  );
}

/* ── Human Operator Card ───────────────────────────── */
function OperatorCard({ name, role, status, emoji }: { name: string; role: string; status: string; emoji: string }) {
  return (
    <div style={{
      ...glassStyle({ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }),
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <span style={{ fontSize: 24 }}>{emoji}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{name}</div>
        <div style={{ fontSize: 10, color: "rgba(0, 255, 65, 0.4)" }}>{role}</div>
      </div>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        backgroundColor: status === "online" ? "#00ff41" : "#6b7280",
        boxShadow: status === "online" ? "0 0 8px #00ff41, 0 0 16px rgba(0,255,65,0.3)" : "none",
      }} />
    </div>
  );
}

/* ── KPI Card ──────────────────────────────────────── */
function KpiCard({ label, value, sub, color = "#00ff41", sparkData }: { label: string; value: string; sub?: string; color?: string; sparkData?: number[] }) {
  return (
    <div style={{
      ...glassStyle({ padding: "14px 18px" }),
      fontFamily: "'JetBrains Mono', monospace",
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.45)", marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1, textShadow: `0 0 20px ${color}30` }}>{value}</div>
          {sub && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>{sub}</div>}
        </div>
        {sparkData && sparkData.length > 1 && <Sparkline data={sparkData} color={color} />}
      </div>
    </div>
  );
}

/* ── Cron Row ──────────────────────────────────────── */
function CronBoard({ crons }: { crons: any[] }) {
  const sorted = useMemo(() =>
    [...crons].sort((a, b) => {
      if ((a.state?.consecutiveErrors || 0) > 0 && (b.state?.consecutiveErrors || 0) === 0) return -1;
      if ((b.state?.consecutiveErrors || 0) > 0 && (a.state?.consecutiveErrors || 0) === 0) return 1;
      return (a.state?.nextRunAtMs || 0) - (b.state?.nextRunAtMs || 0);
    }),
  [crons]);

  return (
    <div style={{ maxHeight: 280, overflowY: "auto", overflowX: "auto" }}>
      <div style={{
        display: "grid", gridTemplateColumns: "22px 2fr 1fr 1fr 50px",
        gap: 8, padding: "6px 0", fontSize: 9, fontWeight: 700,
        color: "rgba(0, 255, 65, 0.4)", borderBottom: "1px solid rgba(0, 255, 65, 0.1)",
        fontFamily: "'JetBrains Mono', monospace", minWidth: 440, letterSpacing: "0.08em",
      }}>
        <span></span><span>NAME</span><span>LAST</span><span>NEXT</span><span style={{ textAlign: "center" }}>ERR</span>
      </div>
      {sorted.map(cron => (
        <div key={cron.id} style={{
          display: "grid", gridTemplateColumns: "22px 2fr 1fr 1fr 50px",
          gap: 8, padding: "5px 0", fontSize: 11, alignItems: "center",
          borderBottom: "1px solid rgba(0, 255, 65, 0.03)",
          opacity: cron.enabled ? 1 : 0.35, color: "rgba(255,255,255,0.6)",
          fontFamily: "'JetBrains Mono', monospace", minWidth: 440,
        }}>
          <span>{statusDot(cron.state?.lastRunStatus, cron.state?.consecutiveErrors || 0)}</span>
          <span style={{ color: cron.state?.consecutiveErrors > 0 ? "#ff4444" : "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {cron.name}
          </span>
          <span style={{ color: "rgba(255,255,255,0.3)" }}>{cron.state?.lastRunAtMs ? timeAgo(cron.state.lastRunAtMs) : "—"}</span>
          <span style={{ color: "rgba(0, 255, 65, 0.5)" }}>{cron.state?.nextRunAtMs ? nextIn(cron.state.nextRunAtMs) : "—"}</span>
          <span style={{ textAlign: "center", color: (cron.state?.consecutiveErrors || 0) > 0 ? "#ff4444" : "rgba(255,255,255,0.2)" }}>
            {cron.state?.consecutiveErrors || 0}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Demo Control Buttons ──────────────────────────── */
function DemoControls() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const buttons = [
    { label: "All Working", icon: "⚡" },
    { label: "Gather", icon: "🤝" },
    { label: "Run Meeting", icon: "📋" },
    { label: "Watercooler", icon: "☕" },
  ];

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {buttons.map(btn => (
        <button
          key={btn.label}
          onClick={() => setActiveDemo(activeDemo === btn.label ? null : btn.label)}
          style={{
            ...glassStyle({
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              color: activeDemo === btn.label ? "#00ff41" : "rgba(255,255,255,0.5)",
              borderColor: activeDemo === btn.label ? "rgba(0, 255, 65, 0.4)" : "rgba(0, 255, 65, 0.12)",
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s",
            }),
            fontFamily: "'JetBrains Mono', monospace",
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.96)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <span>{btn.icon}</span>
          <span>{btn.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Agent Detail Slide-in ─────────────────────────── */
function AgentDetailPanel({ agent, onClose }: { agent: RealAgent; onClose: () => void }) {
  const { codename, title } = getCodename(agent.name);

  return (
    <div style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 360, maxWidth: "92vw",
      ...glassStyle({ borderRadius: 0, borderLeft: "1px solid rgba(0, 255, 65, 0.2)" }),
      background: "rgba(0, 10, 0, 0.95)",
      zIndex: 100, padding: "28px 22px", overflowY: "auto",
      fontFamily: "'JetBrains Mono', monospace",
      animation: "slideIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
    }}>
      <style>{`
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <span style={{ fontSize: 36 }}>{agent.emoji}</span>
        <button onClick={onClose} style={{
          ...glassStyle({ padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "rgba(255,255,255,0.5)" }),
        }}>✕</button>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0", margin: 0 }}>{codename}</h2>
      <div style={{ fontSize: 12, color: "rgba(0, 255, 65, 0.5)", marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, marginBottom: 24 }}>{agent.role}</div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
        <div style={glassStyle({ padding: "12px", textAlign: "center" })}>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#00ff41" }}>{agent.status === "active" ? "ON" : "OFF"}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>STATUS</div>
        </div>
        <div style={glassStyle({ padding: "12px", textAlign: "center" })}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#e2e8f0", wordBreak: "break-all" }}>{agent.model}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>MODEL</div>
        </div>
      </div>

      {[
        ["Zone", agent.zone],
        ["Agent ID", agent.id],
        ["Name", agent.name],
      ].map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid rgba(0, 255, 65, 0.06)" }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{label}</span>
          <span style={{ fontSize: 11, color: "#e2e8f0" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Section Header ────────────────────────────────── */
function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <h2 style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase",
        color: "rgba(0, 255, 65, 0.5)", fontFamily: "'JetBrains Mono', monospace", margin: 0,
      }}>
        {title}
        {count !== undefined && <span style={{ color: "rgba(0, 255, 65, 0.3)", marginLeft: 6 }}>({count})</span>}
      </h2>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, rgba(0, 255, 65, 0.15), transparent)" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MORPHEUS COMMAND CENTER — GLASSMORPHISM DASHBOARD
   ══════════════════════════════════════════════════════ */
export function CommandCenter() {
  const metrics = useOfficeStore((s) => s.globalMetrics);
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const { crons, system, gateway, loading, error, lastRefresh, refresh, agents: realAgents, history, activity } = useLiveData(15000);

  useRealAgentSync(realAgents);

  const [selectedAgent, setSelectedAgent] = useState<RealAgent | null>(null);
  const [now, setNow] = useState(Date.now());

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cronStats = useMemo(() => {
    const total = crons.length;
    const healthy = crons.filter(c => c.enabled && c.state?.lastRunStatus === "ok" && c.state.consecutiveErrors === 0).length;
    const errors = crons.filter(c => c.state?.consecutiveErrors > 0).length;
    return { total, healthy, errors };
  }, [crons]);

  const disk = system ? parseDisk(system.disk) : null;
  const activeRealAgents = realAgents.filter(a => a.status === "active").length;
  const cronHealthyHistory = useMemo(() => history.map(h => h.cronHealthy), [history]);
  const sessionHistory = useMemo(() => history.map(h => h.sessionCount), [history]);
  const timeStr = new Date(now).toLocaleTimeString("en-US", { hour12: false, timeZone: "Asia/Shanghai" });

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000", overflow: "hidden" }}>
      {/* Brain rain background */}
      <BrainRain />

      {/* Subtle grid overlay */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none",
        backgroundImage: "radial-gradient(rgba(0,255,65,0.03) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }} />

      {/* Main content */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", minHeight: "100vh" }}>

        {/* ── Left Sidebar: JARVIS Roster ───────────── */}
        <aside style={{
          width: 240, minWidth: 240, padding: "20px 14px",
          borderRight: "1px solid rgba(0, 255, 65, 0.08)",
          background: "rgba(0, 5, 0, 0.4)",
          display: "flex", flexDirection: "column", gap: 16,
          overflowY: "auto",
        }}>
          {/* Logo + clock */}
          <div style={{ textAlign: "center", marginBottom: 8 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>🌀</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>
              MORPHEUS
            </div>
            <div style={{ fontSize: 9, color: "rgba(0, 255, 65, 0.3)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              {timeStr} CST
            </div>
          </div>

          {/* Human Operators */}
          <div>
            <SectionHeader title="Operators" />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <OperatorCard name="Nathan Lee" role="Advisor & Product" status="online" emoji="👤" />
              <OperatorCard name="Wei Qi" role="Celebrity Partner" status="offline" emoji="👩" />
            </div>
          </div>

          {/* Demo Controls */}
          <div>
            <SectionHeader title="Controls" />
            <DemoControls />
          </div>

          {/* Navigation */}
          <div>
            <SectionHeader title="Navigate" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: "🏠", label: "Dashboard", href: "/" },
                { icon: "🏢", label: "Office", href: "/office" },
                { icon: "🤖", label: "Agents", href: "/agents" },
                { icon: "⏰", label: "Crons", href: "/cron" },
                { icon: "📡", label: "Channels", href: "/channels" },
                { icon: "💬", label: "Chat", href: "/chat" },
                { icon: "⚙️", label: "Settings", href: "/settings" },
              ].map(nav => (
                <a key={nav.href} href={nav.href} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8, fontSize: 11,
                  color: "rgba(255,255,255,0.45)", textDecoration: "none",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.15s",
                  background: window.location.pathname === nav.href ? "rgba(0,255,65,0.08)" : "transparent",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#00ff41"; e.currentTarget.style.background = "rgba(0,255,65,0.06)"; }}
                onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = window.location.pathname === nav.href ? "rgba(0,255,65,0.08)" : "transparent"; }}
                >
                  <span>{nav.icon}</span>
                  <span>{nav.label}</span>
                </a>
              ))}
            </div>
          </div>

          {/* System info */}
          <div style={{ marginTop: "auto", padding: "10px 0" }}>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6 }}>
              <div>{gateway?.os?.label || "macOS"}</div>
              <div>v{gateway?.gateway?.self?.version || "?"}</div>
              <div>{connectionStatus === "connected" ? "🟢 Gateway" : "🟡 " + connectionStatus}</div>
              {disk && <div>💾 {disk.pct} ({disk.avail} free)</div>}
            </div>
          </div>
        </aside>

        {/* ── Main Content Area ─────────────────────── */}
        <main style={{ flex: 1, padding: "20px 24px", overflowY: "auto" }}>
          {/* Header bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 8 }}>
            <h1 style={{
              fontSize: 16, fontWeight: 800, color: "#e2e8f0", margin: 0,
              fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em",
            }}>
              COMMAND <span style={{ color: "#00ff41" }}>CENTER</span>
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {error && <span style={{ color: "#ff4444", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</span>}
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                {lastRefresh ? timeAgo(lastRefresh) : "loading..."}
              </span>
              <button onClick={refresh} style={{
                ...glassStyle({ padding: "5px 12px", cursor: "pointer", fontSize: 10, color: "#00ff41" }),
                fontFamily: "'JetBrains Mono', monospace",
              }}>⟳ Refresh</button>
            </div>
          </div>

          {/* KPI Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
            <KpiCard label="Agents" value={`${activeRealAgents}/${realAgents.length}`} sub="fleet capacity" />
            <KpiCard label="Crons" value={`${cronStats.healthy}/${cronStats.total}`}
              sub={cronStats.errors > 0 ? `${cronStats.errors} failing` : "all green"}
              color={cronStats.errors > 0 ? "#ff4444" : "#00ff41"} sparkData={cronHealthyHistory} />
            <KpiCard label="Sessions" value={String(gateway?.sessions?.count || 0)} sub="active" sparkData={sessionHistory} />
            <KpiCard label="Uptime" value={system ? parseUptime(system.uptime) : "—"} />
            <KpiCard label="Tokens" value={formatTokens(metrics.totalTokens)} sub="this session" color="#a78bfa" />
          </div>

          {/* Agent Fleet Grid */}
          <SectionHeader title="Agent Fleet" count={realAgents.length} />
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 12, marginBottom: 24,
          }}>
            {realAgents.map(agent => (
              <JarvisAgentCard
                key={agent.id}
                agent={agent}
                isSelected={selectedAgent?.id === agent.id}
                onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
              />
            ))}
          </div>

          {/* Activity Feed + Crons side by side */}
          <div className="mc-bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            {/* Activity Feed */}
            <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                LIVE ACTIVITY
              </div>
              <div style={{ maxHeight: 320, overflowY: "auto" }}>
                {activity.length > 0 ? activity.map((evt, i) => (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "6px 0",
                    borderBottom: "1px solid rgba(0, 255, 65, 0.04)",
                    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", alignItems: "flex-start",
                  }}>
                    <span style={{ flexShrink: 0 }}>
                      {evt.type === "error" ? "🔴" : evt.type === "cron" ? "⚡" : "💬"}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: evt.type === "error" ? "#ff4444" : "#e2e8f0",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}>
                        {evt.message}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, marginTop: 2 }}>
                        {evt.agent} · {evt.ts ? timeAgo(evt.ts) : "—"}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ color: "rgba(255,255,255,0.2)", padding: 16, textAlign: "center" }}>
                    {loading ? "Loading..." : "No recent activity"}
                  </div>
                )}
              </div>
            </div>

            {/* Cron Status Board */}
            <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                CRON JOBS ({crons.length})
              </div>
              {crons.length > 0 ? <CronBoard crons={crons} /> : (
                <div style={{ textAlign: "center", padding: 20, color: "rgba(255,255,255,0.25)", fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>
                  {loading ? "Loading crons..." : "No cron data"}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <>
          <div onClick={() => setSelectedAgent(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }} />
          <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        </>
      )}

      {/* Animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 1024px) {
          .mc-bottom-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          aside { display: none !important; }
        }
      `}</style>
    </div>
  );
}
