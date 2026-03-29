import { createServer } from "http";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";

const PORT = 3335;
const HISTORY_FILE = "/tmp/mc-history.json";
const MAX_HISTORY_POINTS = 288;

// ── Cache layer ──────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 15_000; // 15s default

function cached(key, ttlMs, fn) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  const data = fn();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

// ── Exec helpers ─────────────────────────────────────
function jsonExec(cmd, timeoutMs = 15000) {
  try {
    const out = execSync(cmd, { timeout: timeoutMs, encoding: "utf8" });
    return JSON.parse(out);
  } catch (e) {
    return { error: e.message };
  }
}

function textExec(cmd, timeoutMs = 10000) {
  try {
    return execSync(cmd, { timeout: timeoutMs, encoding: "utf8" }).trim();
  } catch (e) {
    return `ERROR: ${e.message}`;
  }
}

// ── Agent roster ─────────────────────────────────────
const AGENT_ROSTER = [
  { id: "morpheus", name: "Morpheus", role: "CEO", model: "claude-sonnet-4.6", emoji: "🌀", zone: "ceo-desk" },
  { id: "chief-analyst", name: "Chief Analyst", role: "Trading/Reasoning", model: "deepseek-r1:70b", emoji: "📊", zone: "analyst-desk" },
  { id: "research-director", name: "Research Director", role: "Intelligence", model: "llama3.3:70b", emoji: "🔍", zone: "research-desk" },
  { id: "technical-director", name: "Technical Director", role: "Engineering", model: "qwen2.5:72b", emoji: "⚙️", zone: "tech-desk" },
  { id: "content-director", name: "Content Director", role: "Content", model: "phi4:14b", emoji: "✍️", zone: "content-desk" },
  { id: "ops-manager", name: "Ops Manager", role: "Operations", model: "mistral:7b", emoji: "📋", zone: "ops-desk" },
  { id: "visual-intel", name: "Visual Intel", role: "Visual Analysis", model: "llava:13b", emoji: "👁️", zone: "visual-desk" },
];

function getOllamaModels() {
  return cached("ollama-ps", 10_000, () => {
    try {
      const out = execSync("ollama ps 2>/dev/null", { timeout: 5000, encoding: "utf8" });
      const lines = out.split("\n").slice(1).filter(l => l.trim());
      return lines.map(line => {
        const parts = line.split(/\s+/);
        return { name: parts[0] || "?", size: parts[2] ? `${parts[2]} ${parts[3] || ""}`.trim() : "?" };
      });
    } catch { return []; }
  });
}

function getAgentStatuses() {
  const loadedModels = getOllamaModels().map(m => m.name.split(":")[0]);
  return AGENT_ROSTER.map(agent => {
    const modelBase = agent.model.split(":")[0];
    let status = "offline";
    if (agent.id === "morpheus") status = "active";
    else if (loadedModels.some(m => m === modelBase || agent.model.includes(m))) status = "active";
    else status = "standby";
    return { ...agent, status };
  });
}

function getCrons() {
  return cached("crons", 30_000, () => jsonExec("openclaw cron list --json 2>/dev/null", 20000));
}

function getStatus() {
  return cached("status", 30_000, () => jsonExec("openclaw status --json 2>/dev/null", 15000));
}

// ── History ──────────────────────────────────────────
function loadHistory() {
  try {
    if (existsSync(HISTORY_FILE)) return JSON.parse(readFileSync(HISTORY_FILE, "utf8"));
  } catch {}
  return [];
}

function appendHistory(point) {
  const history = loadHistory();
  history.push(point);
  while (history.length > MAX_HISTORY_POINTS) history.shift();
  writeFileSync(HISTORY_FILE, JSON.stringify(history));
  return history;
}

// ── Routes ───────────────────────────────────────────
const routes = {
  "/api/status": () => getStatus(),

  "/api/crons": () => getCrons(),

  "/api/sessions": () => cached("sessions", 15_000, () => {
    const text = textExec("openclaw session list 2>/dev/null | head -50");
    return { raw: text };
  }),

  "/api/system": () => cached("system", 15_000, () => {
    const uptime = textExec("uptime");
    const ollama = textExec("ollama ps 2>/dev/null");
    const disk = textExec("df -h / | tail -1");
    const mem = textExec("vm_stat | head -10");
    return { uptime, ollama, disk, mem };
  }),

  "/api/gateway": () => cached("gateway", 15_000, () => {
    try {
      const out = execSync("curl -s http://127.0.0.1:18789/ 2>/dev/null | head -5", { timeout: 5000, encoding: "utf8" });
      return { status: "up", response: out.slice(0, 200) };
    } catch { return { status: "down" }; }
  }),

  "/api/agents": () => ({ agents: getAgentStatuses() }),

  "/api/activity": () => cached("activity", 15_000, () => {
    const events = [];
    try {
      const crons = getCrons();
      for (const job of (crons.jobs || []).slice(0, 50)) {
        if (job.state?.lastRunAtMs) {
          events.push({
            type: job.state.consecutiveErrors > 0 ? "error" : "cron",
            agent: job.name.split(" ")[0] || "system",
            message: `${job.name} — ${job.state.lastRunStatus || "unknown"}` +
              (job.state.lastDurationMs ? ` (${Math.round(job.state.lastDurationMs / 1000)}s)` : ""),
            ts: job.state.lastRunAtMs,
          });
        }
      }
    } catch {}
    try {
      const status = getStatus();
      for (const s of (status?.sessions?.recent || []).slice(0, 10)) {
        events.push({
          type: "session",
          agent: s.agentId || "unknown",
          message: `Session ${s.kind} — ${s.model || "?"} (${s.percentUsed || 0}% ctx)`,
          ts: s.updatedAt,
        });
      }
    } catch {}
    events.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { events: events.slice(0, 30) };
  }),

  "/api/ollama": () => cached("ollama", 10_000, () => {
    const models = getOllamaModels();
    let available = [];
    try {
      const out = execSync("ollama list 2>/dev/null", { timeout: 5000, encoding: "utf8" });
      const lines = out.split("\n").slice(1).filter(l => l.trim());
      available = lines.map(line => {
        const parts = line.split(/\s+/);
        return { name: parts[0] || "?", size: parts[2] ? `${parts[2]} ${parts[3] || ""}`.trim() : "?" };
      });
    } catch {}
    return { loaded: models, available };
  }),

  "/api/channels": () => cached("channels", 30_000, () => {
    try {
      const status = getStatus();
      return { channels: status?.channelSummary || [] };
    } catch { return { channels: [] }; }
  }),

  "/api/costs": () => cached("costs", 10_000, () => {
    let todayCost = 0;
    let todayTokens = 0;
    try {
      const throttlePath = "/tmp/morpheus-throttle-state";
      if (existsSync(throttlePath)) {
        const raw = readFileSync(throttlePath, "utf8");
        const data = JSON.parse(raw);
        todayCost = data.todayCostUsd ?? data.costUsd ?? 0;
        todayTokens = data.todayTokens ?? data.totalTokens ?? 0;
      }
    } catch {}
    // Fallback: try codexbar cost data
    if (todayCost === 0) {
      try {
        const out = textExec("openclaw usage status --json 2>/dev/null", 5000);
        if (!out.startsWith("ERROR")) {
          const usage = JSON.parse(out);
          todayCost = usage.todayCostUsd ?? 0;
          todayTokens = usage.todayTokens ?? 0;
        }
      } catch {}
    }
    return { todayCostUsd: todayCost, todayTokens, updatedAt: Date.now() };
  }),

  "/api/memory": () => cached("memory", 30_000, () => {
    try {
      const out = textExec("ls -t /Users/morpheusqilee/.openclaw/workspace/memory/*.md 2>/dev/null | head -5");
      const files = out.split("\n").filter(f => f.trim());
      const entries = files.map(f => {
        const name = f.split("/").pop();
        const lines = textExec(`wc -l < "${f}"`).trim();
        return { name, lines: parseInt(lines) || 0 };
      });
      return { files: entries };
    } catch { return { files: [] }; }
  }),

  "/api/history": () => {
    const crons = getCrons();
    const cronErrors = (crons.jobs || []).filter(c => c.state?.consecutiveErrors > 0).length;
    const cronTotal = (crons.jobs || []).length;
    const cronHealthy = cronTotal - cronErrors;
    const ollamaModels = getOllamaModels();
    const sessions = getStatus();
    const sessionCount = sessions?.sessions?.count || 0;

    const point = { ts: Date.now(), cronHealthy, cronErrors, cronTotal, ollamaCount: ollamaModels.length, sessionCount };
    const history = appendHistory(point);
    return { history, latest: point };
  },
};

// ── Server ───────────────────────────────────────────
const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const handler = routes[url.pathname];

  if (handler) {
    try {
      const data = handler();
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "not found" }));
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`MC API server on http://0.0.0.0:${PORT} (cached)`));
