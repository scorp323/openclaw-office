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

// OllamaModel and ChannelInfo types used inline via useLiveData

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

/* ── Brain Rain Canvas ─────────────────────────────── */
function BrainRain({ liveThoughts }: { liveThoughts?: string[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const thoughts = useRef([
    "analyzing market data...", "scanning cron health...", "processing emails...",
    "monitoring agents...", "checking system status...", "reviewing content...",
  ]);

  // Update thoughts with real activity messages
  useEffect(() => {
    if (liveThoughts && liveThoughts.length > 0) {
      thoughts.current = liveThoughts.slice(0, 30);
    }
  }, [liveThoughts]);

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
function JarvisAgentCard({ agent, onClick, isSelected, recentCronCount }: { agent: RealAgent; onClick: () => void; isSelected: boolean; recentCronCount?: number }) {
  const { codename, title } = getCodename(agent.name);
  const isActive = agent.status === "active";
  const accentColor = isActive ? "#00ff41" : agent.status === "standby" ? "#fbbf24" : "#6b7280";
  // Load = proportion of recent cron activity attributed to this agent type
  const loadPct = isActive ? Math.min((recentCronCount || 0) * 15 + 20, 95) : agent.status === "standby" ? 10 : 0;

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
        <ArcGauge value={loadPct} max={100} color={accentColor} label={`${loadPct}%`} />
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
function DemoControls({ onAction }: { onAction?: (action: string) => void }) {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const buttons = [
    { label: "All Working", icon: "⚡", desc: "Show all agents active" },
    { label: "Gather", icon: "🤝", desc: "Team standup mode" },
    { label: "Meeting", icon: "📋", desc: "Run team meeting" },
    { label: "Refresh", icon: "🔄", desc: "Force refresh all" },
  ];

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {buttons.map(btn => (
        <button
          key={btn.label}
          onClick={() => {
            const next = activeDemo === btn.label ? null : btn.label;
            setActiveDemo(next);
            onAction?.(next || "reset");
          }}
          title={btn.desc}
          style={{
            ...glassStyle({
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 10,
              fontWeight: 600,
              color: activeDemo === btn.label ? "#00ff41" : "rgba(255,255,255,0.5)",
              borderColor: activeDemo === btn.label ? "rgba(0, 255, 65, 0.4)" : "rgba(0, 255, 65, 0.12)",
              display: "flex",
              alignItems: "center",
              gap: 4,
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

/* ── Ollama Panel ──────────────────────────────────── */
function OllamaPanel({ loaded, available }: { loaded: Array<{ name: string; size: string }>; available: Array<{ name: string; size: string }> }) {
  return (
    <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        OLLAMA MODELS
      </div>

      {/* Loaded models */}
      {loaded.length > 0 ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 9, color: "rgba(0,255,65,0.4)", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>LOADED IN RAM</div>
          {loaded.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0", borderBottom: "1px solid rgba(0,255,65,0.04)", fontFamily: "'JetBrains Mono', monospace" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00ff41", boxShadow: "0 0 6px #00ff41" }} />
                <span style={{ fontSize: 11, color: "#e2e8f0" }}>{m.name}</span>
              </div>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{m.size}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", padding: "8px 0", fontFamily: "'JetBrains Mono', monospace" }}>No models loaded</div>
      )}

      {/* Available models (collapsed) */}
      {available.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "rgba(0,255,65,0.3)", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.08em" }}>
            AVAILABLE ({available.length})
          </div>
          <div style={{ maxHeight: 120, overflowY: "auto" }}>
            {available.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", flexShrink: 0 }}>{m.size}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Channels Panel ────────────────────────────────── */
function ChannelsPanel({ channels }: { channels: string[] }) {
  const channelIcons: Record<string, string> = {
    telegram: "📱", discord: "💬", whatsapp: "📲", signal: "🔒", irc: "💻", web: "🌐",
  };

  return (
    <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        CHANNELS ({channels.length})
      </div>
      {channels.length > 0 ? channels.map((ch, i) => {
        const lower = ch.toLowerCase();
        const icon = Object.entries(channelIcons).find(([k]) => lower.includes(k))?.[1] || "📡";
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 0",
            borderBottom: "1px solid rgba(0,255,65,0.04)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span>{icon}</span>
            <span style={{ fontSize: 11, color: "#e2e8f0" }}>{ch}</span>
            <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#00ff41", boxShadow: "0 0 6px #00ff41" }} />
          </div>
        );
      }) : (
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", padding: 8, fontFamily: "'JetBrains Mono', monospace" }}>No channels</div>
      )}
    </div>
  );
}

/* ── System Vitals Panel ───────────────────────────── */
function SystemVitals({ system, disk }: { system: any; disk: { used: string; avail: string; pct: string } | null }) {
  if (!system) return null;
  const load = system.uptime.match(/load averages?:\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);

  return (
    <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
        SYSTEM VITALS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {load && (
          <>
            <div style={glassStyle({ padding: 10, textAlign: "center" })}>
              <div style={{ fontSize: 18, fontWeight: 700, color: parseFloat(load[1]) > 5 ? "#ff4444" : "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>{load[1]}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>LOAD 1m</div>
            </div>
            <div style={glassStyle({ padding: 10, textAlign: "center" })}>
              <div style={{ fontSize: 18, fontWeight: 700, color: parseFloat(load[2]) > 5 ? "#fbbf24" : "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>{load[2]}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>LOAD 5m</div>
            </div>
          </>
        )}
        {disk && (
          <>
            <div style={glassStyle({ padding: 10, textAlign: "center" })}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#00ff41", fontFamily: "'JetBrains Mono', monospace" }}>{disk.pct}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>DISK USED</div>
            </div>
            <div style={glassStyle({ padding: 10, textAlign: "center" })}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace" }}>{disk.avail}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>FREE</div>
            </div>
          </>
        )}
      </div>
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
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const { crons, system, gateway, loading, error, lastRefresh, refresh, agents: realAgents, history, activity, ollama, channels, memoryFiles } = useLiveData(15000);

  useRealAgentSync(realAgents);

  const [selectedAgent, setSelectedAgent] = useState<RealAgent | null>(null);
  const [now, setNow] = useState(Date.now());
  const [activeView, setActiveView] = useState<string>("dashboard");

  // Build live thoughts for brain rain from activity
  const liveThoughts = useMemo(() =>
    activity.map(evt => evt.message).filter(Boolean).slice(0, 25),
  [activity]);

  // Count recent cron runs per agent keyword for load estimation
  const agentCronCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const oneHourAgo = Date.now() - 3_600_000;
    for (const evt of activity) {
      if (evt.ts && evt.ts > oneHourAgo) {
        const key = evt.agent?.toLowerCase() || "";
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [activity]);

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
      {/* Brain rain background — fed by real activity (hidden on mobile for perf) */}
      {typeof window !== "undefined" && window.innerWidth > 768 && <BrainRain liveThoughts={liveThoughts} />}

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
            <DemoControls onAction={(action) => { if (action === "Refresh") refresh(); }} />
          </div>

          {/* Navigation */}
          <div>
            <SectionHeader title="Navigate" />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { icon: "🏠", label: "Dashboard", view: "dashboard" },
                { icon: "🤖", label: "Agents", view: "agents" },
                { icon: "⏰", label: "Crons", view: "crons" },
                { icon: "📡", label: "Channels", view: "channels" },
                { icon: "🧠", label: "Ollama", view: "ollama" },
                { icon: "📊", label: "System", view: "system" },
              ].map(nav => (
                <button key={nav.view} onClick={() => setActiveView(nav.view)} style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "7px 10px", borderRadius: 8, fontSize: 11,
                  color: activeView === nav.view ? "#00ff41" : "rgba(255,255,255,0.45)",
                  textDecoration: "none", border: "none", cursor: "pointer",
                  fontFamily: "'JetBrains Mono', monospace",
                  transition: "all 0.15s",
                  background: activeView === nav.view ? "rgba(0,255,65,0.08)" : "transparent",
                  textAlign: "left", width: "100%",
                }}
                onMouseEnter={e => { e.currentTarget.style.color = "#00ff41"; e.currentTarget.style.background = "rgba(0,255,65,0.06)"; }}
                onMouseLeave={e => { if (activeView !== nav.view) { e.currentTarget.style.color = "rgba(255,255,255,0.45)"; e.currentTarget.style.background = "transparent"; } }}
                >
                  <span>{nav.icon}</span>
                  <span>{nav.label}</span>
                </button>
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
              {activeView === "dashboard" ? <>COMMAND <span style={{ color: "#00ff41" }}>CENTER</span></> :
               activeView === "agents" ? <>AGENT <span style={{ color: "#00ff41" }}>FLEET</span></> :
               activeView === "crons" ? <>CRON <span style={{ color: "#00ff41" }}>JOBS</span></> :
               activeView === "channels" ? <>COMM <span style={{ color: "#00ff41" }}>CHANNELS</span></> :
               activeView === "ollama" ? <>OLLAMA <span style={{ color: "#00ff41" }}>ENGINE</span></> :
               activeView === "system" ? <>SYSTEM <span style={{ color: "#00ff41" }}>VITALS</span></> :
               <>COMMAND <span style={{ color: "#00ff41" }}>CENTER</span></>}
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {error && <span style={{ color: "#ff4444", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>⚠ {error}</span>}
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "'JetBrains Mono', monospace" }}>
                {lastRefresh ? timeAgo(lastRefresh) : "loading..."}
              </span>
              <button onClick={refresh} style={{
                ...glassStyle({ padding: "5px 12px", cursor: "pointer", fontSize: 10, color: "#00ff41" }),
                fontFamily: "'JetBrains Mono', monospace",
              }}>⟳</button>
            </div>
          </div>

          {/* ── Dashboard View ───────────────────────── */}
          {activeView === "dashboard" && (
            <>
              {/* KPI Row */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12, marginBottom: 24 }}>
                <KpiCard label="Agents" value={`${activeRealAgents}/${realAgents.length}`} sub="fleet capacity" />
                <KpiCard label="Crons" value={`${cronStats.healthy}/${cronStats.total}`}
                  sub={cronStats.errors > 0 ? `${cronStats.errors} failing` : "all green"}
                  color={cronStats.errors > 0 ? "#ff4444" : "#00ff41"} sparkData={cronHealthyHistory} />
                <KpiCard label="Sessions" value={String(gateway?.sessions?.count || 0)} sub="active" sparkData={sessionHistory} />
                <KpiCard label="Uptime" value={system ? parseUptime(system.uptime) : "—"} />
                <KpiCard label="Ollama" value={String(ollama?.loaded?.length || 0)} sub={`of ${ollama?.available?.length || 0} models`} color="#a78bfa" />
                <KpiCard label="Channels" value={String(channels.length)} sub="connected" color="#60a5fa" />
              </div>

              {/* Agent Fleet Grid */}
              <SectionHeader title="Agent Fleet" count={realAgents.length} />
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(175px, 1fr))",
                gap: 12, marginBottom: 24,
              }}>
                {realAgents.map(agent => (
                  <JarvisAgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                    recentCronCount={agentCronCounts[agent.name.toLowerCase().split(" ")[0]] || 0}
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
                          {evt.type === "error" ? "🔴" : evt.type === "cron" ? "⚡" : evt.type === "session" ? "💬" : "📌"}
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

                {/* System + Ollama compact */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <SystemVitals system={system} disk={disk} />
                  {ollama && <OllamaPanel loaded={ollama.loaded} available={ollama.available} />}
                </div>
              </div>
            </>
          )}

          {/* ── Agents View (full detail) ────────────── */}
          {activeView === "agents" && (
            <>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14, marginBottom: 24,
              }}>
                {realAgents.map(agent => (
                  <JarvisAgentCard
                    key={agent.id}
                    agent={agent}
                    isSelected={selectedAgent?.id === agent.id}
                    onClick={() => setSelectedAgent(selectedAgent?.id === agent.id ? null : agent)}
                    recentCronCount={agentCronCounts[agent.name.toLowerCase().split(" ")[0]] || 0}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Crons View (full board) ──────────────── */}
          {activeView === "crons" && (
            <div style={{ ...glassStyle({ padding: "18px 22px" }) }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", fontFamily: "'JetBrains Mono', monospace" }}>
                  ALL CRONS ({cronStats.total})
                </div>
                <div style={{ display: "flex", gap: 12, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
                  <span style={{ color: "#00ff41" }}>✓ {cronStats.healthy} healthy</span>
                  {cronStats.errors > 0 && <span style={{ color: "#ff4444" }}>✗ {cronStats.errors} errors</span>}
                </div>
              </div>
              <CronBoard crons={crons} />
            </div>
          )}

          {/* ── Channels View ────────────────────────── */}
          {activeView === "channels" && (
            <ChannelsPanel channels={channels} />
          )}

          {/* ── Ollama View (full detail) ────────────── */}
          {activeView === "ollama" && ollama && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <OllamaPanel loaded={ollama.loaded} available={ollama.available} />
              <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  OLLAMA STATUS
                </div>
                <pre style={{ fontSize: 10, color: "#e2e8f0", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.5, margin: 0 }}>
                  {system?.ollama || "No data"}
                </pre>
              </div>
            </div>
          )}

          {/* ── System View ──────────────────────────── */}
          {activeView === "system" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <SystemVitals system={system} disk={disk} />
              <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  GATEWAY INFO
                </div>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.6)", lineHeight: 2 }}>
                  <div>OS: <span style={{ color: "#e2e8f0" }}>{gateway?.os?.label || "—"}</span></div>
                  <div>Version: <span style={{ color: "#e2e8f0" }}>v{gateway?.gateway?.self?.version || "?"}</span></div>
                  <div>Mode: <span style={{ color: "#e2e8f0" }}>{gateway?.gateway?.mode || "—"}</span></div>
                  <div>Sessions: <span style={{ color: "#00ff41" }}>{gateway?.sessions?.count || 0}</span></div>
                  <div>Agents: <span style={{ color: "#00ff41" }}>{gateway?.agents?.agents?.length || 0}</span></div>
                </div>
              </div>
              <div style={{ ...glassStyle({ padding: "14px 18px" }) }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(0, 255, 65, 0.5)", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                  MEMORY FILES
                </div>
                <div style={{ maxHeight: 200, overflowY: "auto" }}>
                  {memoryFiles.map((f, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(0,255,65,0.04)", fontFamily: "'JetBrains Mono', monospace" }}>
                      <span style={{ fontSize: 10, color: "#e2e8f0" }}>{f.name}</span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)" }}>{f.lines} lines</span>
                    </div>
                  ))}
                </div>
              </div>
              <ChannelsPanel channels={channels} />
            </div>
          )}
        </main>
      </div>

      {/* Agent Detail Panel */}
      {selectedAgent && (
        <>
          <div onClick={() => setSelectedAgent(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 90 }} />
          <AgentDetailPanel agent={selectedAgent} onClose={() => setSelectedAgent(null)} />
        </>
      )}

      {/* Mobile Bottom Nav — visible only on small screens where sidebar is hidden */}
      <MobileNav activeView={activeView} onNavigate={setActiveView} />

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
          main { padding-bottom: 60px !important; }
        }
      `}</style>
    </div>
  );
}

/* ── Mobile Bottom Navigation ──────────────────────── */
function MobileNav({ activeView, onNavigate }: { activeView: string; onNavigate: (view: string) => void }) {
  const items = [
    { view: "dashboard", icon: "🏠", label: "Home" },
    { view: "office", icon: "🏢", label: "Office" },
    { view: "agents", icon: "🤖", label: "Agents" },
    { view: "crons", icon: "⏰", label: "Crons" },
    { view: "system", icon: "📊", label: "System" },
  ];

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
      display: "none", /* shown via media query below */
      borderTop: "1px solid rgba(0, 255, 65, 0.15)",
      background: "rgba(0, 5, 0, 0.95)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
      fontFamily: "'JetBrains Mono', monospace",
    }} className="mc-mobile-nav">
      {items.map(item => (
        <button
          key={item.view}
          onClick={() => {
            if (item.view === "office") {
              window.location.href = "/office";
            } else {
              onNavigate(item.view);
            }
          }}
          style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", gap: 2, padding: "8px 0", minHeight: 52,
            border: "none", cursor: "pointer",
            background: "transparent",
            color: activeView === item.view ? "#00ff41" : "rgba(255,255,255,0.35)",
            transition: "color 0.15s",
          }}
        >
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "0.05em" }}>{item.label}</span>
        </button>
      ))}
      <style>{`
        @media (max-width: 768px) {
          .mc-mobile-nav { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
