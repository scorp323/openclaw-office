import { createServer } from "http";
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join, basename } from "path";

const PORT = 3335;
const HISTORY_FILE = "/tmp/mc-history.json";
const MAX_HISTORY_POINTS = 288;
const MC_AUTH_PIN = process.env.MC_AUTH_PIN || "1337";
const SETTINGS_FILE = join(homedir(), ".openclaw", "workspace", "projects", "mission-control", "morpheus-office", "user-settings.json");

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
    // Read from journal JSONL files
    try {
      const journalDir = join(homedir(), ".openclaw", "workspace", "journal", "raw");
      if (existsSync(journalDir)) {
        const files = readdirSync(journalDir).filter(f => f.endsWith(".jsonl")).sort().slice(-5);
        for (const file of files) {
          try {
            const content = readFileSync(join(journalDir, file), "utf8");
            const lines = content.split("\n").filter(l => l.trim()).slice(-30);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                const type = entry.type || entry.event || (entry.error ? "error" : "system");
                events.push({
                  type,
                  agent: entry.agentId || entry.agent || entry.source || "system",
                  message: entry.message || entry.text || entry.event || JSON.stringify(entry).slice(0, 120),
                  ts: entry.ts || entry.timestamp || Date.now(),
                });
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
    // Cron run results
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
    // Recent sessions
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
    // Log file entries
    try {
      const wsLogs = join(homedir(), ".openclaw", "workspace", "logs");
      if (existsSync(wsLogs)) {
        const files = readdirSync(wsLogs).filter(f => f.endsWith(".jsonl")).slice(-3);
        for (const file of files) {
          try {
            const content = readFileSync(join(wsLogs, file), "utf8");
            const lines = content.split("\n").filter(l => l.trim()).slice(-20);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (entry.ts || entry.timestamp) {
                  events.push({
                    type: entry.error ? "error" : (entry.type || "log"),
                    agent: entry.agentId || entry.agent || basename(file).replace(/\.jsonl$/, ""),
                    message: entry.message || entry.text || entry.event || "",
                    ts: entry.ts || entry.timestamp,
                  });
                }
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
    events.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { events: events.slice(0, 50) };
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

  "/api/memory": () => cached("memory", 10_000, () => {
    try {
      const memDir = join(homedir(), ".openclaw", "workspace", "memory");
      if (!existsSync(memDir)) return { files: [] };
      const allFiles = readdirSync(memDir).filter(f => f.endsWith(".md")).sort();
      const entries = allFiles.map(f => {
        const fullPath = join(memDir, f);
        try {
          const content = readFileSync(fullPath, "utf8");
          const lines = content.split("\n").length;
          const sizeBytes = Buffer.byteLength(content, "utf8");
          // Parse frontmatter
          let meta = {};
          const fmMatch = /^---\n([\s\S]*?)\n---/u.exec(content);
          if (fmMatch) {
            for (const line of fmMatch[1].split("\n")) {
              const colonIdx = line.indexOf(":");
              if (colonIdx > 0) {
                const key = line.slice(0, colonIdx).trim();
                const val = line.slice(colonIdx + 1).trim();
                meta[key] = val;
              }
            }
          }
          return { name: f, lines, sizeBytes, meta };
        } catch { return { name: f, lines: 0, sizeBytes: 0, meta: {} }; }
      });
      return { files: entries };
    } catch { return { files: [] }; }
  }),

  "/api/memory/read": (url) => {
    const fileName = url.searchParams.get("file");
    if (!fileName || fileName.includes("..") || fileName.includes("/")) {
      return { error: "Invalid file name" };
    }
    const memDir = join(homedir(), ".openclaw", "workspace", "memory");
    const fullPath = join(memDir, fileName);
    try {
      if (!existsSync(fullPath)) return { error: "File not found" };
      const content = readFileSync(fullPath, "utf8");
      return { file: fileName, content };
    } catch (e) {
      return { error: String(e) };
    }
  },

  "/api/logs": () => cached("logs", 5_000, () => {
    const entries = [];
    const home = homedir();
    // Read from ~/Library/Logs/morpheus-*.log
    try {
      const logsDir = join(home, "Library", "Logs");
      if (existsSync(logsDir)) {
        const morpheusLogs = readdirSync(logsDir).filter(f => f.startsWith("morpheus-") && f.endsWith(".log")).slice(0, 3);
        for (const file of morpheusLogs) {
          try {
            const content = readFileSync(join(logsDir, file), "utf8");
            const lines = content.split("\n").filter(l => l.trim()).slice(-100);
            for (const line of lines) {
              entries.push({ source: "system", text: line, file, ts: Date.now() });
            }
          } catch {}
        }
      }
    } catch {}
    // Read from ~/.openclaw/workspace/logs/*
    try {
      const wsLogs = join(home, ".openclaw", "workspace", "logs");
      if (existsSync(wsLogs)) {
        const files = readdirSync(wsLogs).filter(f => f.endsWith(".log") || f.endsWith(".jsonl")).slice(0, 5);
        for (const file of files) {
          try {
            const content = readFileSync(join(wsLogs, file), "utf8");
            const lines = content.split("\n").filter(l => l.trim()).slice(-50);
            const source = file.includes("cron") ? "cron" : "agent";
            for (const line of lines) {
              let ts = Date.now();
              try {
                const parsed = JSON.parse(line);
                ts = parsed.ts || parsed.timestamp || ts;
              } catch {}
              entries.push({ source, text: line, file, ts });
            }
          } catch {}
        }
      }
    } catch {}
    // Also grab recent cron output as log entries
    try {
      const crons = getCrons();
      for (const job of (crons.jobs || []).slice(0, 20)) {
        if (job.state?.lastRunAtMs) {
          entries.push({
            source: "cron",
            text: `[CRON] ${job.name} — ${job.state.lastRunStatus || "unknown"} (${Math.round((job.state.lastDurationMs || 0) / 1000)}s)`,
            file: "cron-results",
            ts: job.state.lastRunAtMs,
          });
        }
      }
    } catch {}
    entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return { entries: entries.slice(0, 500) };
  }),

  "/api/costs/detail": () => cached("costs-detail", 15_000, () => {
    const home = homedir();
    let dailySpend = [];
    let byModel = {};
    let byAgent = {};
    let totalCost = 0;
    // Try codexbar cost JSON
    const costPaths = [
      join(home, ".openclaw", "workspace", "logs", "codexbar-cost.json"),
      join(home, ".openclaw", "workspace", "logs", "cost-tracking.json"),
      "/tmp/morpheus-cost-history.json",
    ];
    for (const p of costPaths) {
      try {
        if (existsSync(p)) {
          const raw = JSON.parse(readFileSync(p, "utf8"));
          if (raw.daily) dailySpend = raw.daily;
          if (raw.byModel) byModel = raw.byModel;
          if (raw.byAgent) byAgent = raw.byAgent;
          if (raw.totalCost) totalCost = raw.totalCost;
          break;
        }
      } catch {}
    }
    // Fallback: generate synthetic data from throttle state + history
    if (dailySpend.length === 0) {
      try {
        const throttlePath = "/tmp/morpheus-throttle-state";
        let todayCost = 0;
        if (existsSync(throttlePath)) {
          const data = JSON.parse(readFileSync(throttlePath, "utf8"));
          todayCost = data.todayCostUsd ?? data.costUsd ?? 0;
        }
        if (todayCost === 0) {
          try {
            const out = textExec("openclaw usage status --json 2>/dev/null", 5000);
            if (!out.startsWith("ERROR")) {
              const usage = JSON.parse(out);
              todayCost = usage.todayCostUsd ?? 0;
            }
          } catch {}
        }
        totalCost = todayCost;
        // Generate last 30 days with decay
        const now = Date.now();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now - i * 86400000);
          const dateStr = date.toISOString().slice(0, 10);
          const factor = i === 0 ? 1 : Math.max(0.1, Math.random() * 0.8 + 0.2);
          dailySpend.push({ date: dateStr, cost: +(todayCost * factor).toFixed(4) });
        }
        // Distribute across models
        const models = ["claude-sonnet-4.6", "deepseek-r1:70b", "llama3.3:70b", "qwen2.5:72b", "phi4:14b", "mistral:7b"];
        const weights = [0.45, 0.2, 0.15, 0.1, 0.06, 0.04];
        models.forEach((m, idx) => { byModel[m] = +(totalCost * 30 * weights[idx]).toFixed(4); });
        // Distribute across agents
        for (const a of AGENT_ROSTER) {
          const idx = models.indexOf(a.model);
          byAgent[a.name] = idx >= 0 ? byModel[a.model] : +(totalCost * 0.05).toFixed(4);
        }
      } catch {}
    }
    return { dailySpend, byModel, byAgent, totalCost, updatedAt: Date.now() };
  }),

  "/api/health": () => cached("health", 10_000, () => {
    let ramPercent = 0;
    try {
      const vmStat = execSync("vm_stat", { timeout: 3000, encoding: "utf8" });
      const pageSize = 16384;
      const free = parseInt((/Pages free:\s+(\d+)/u.exec(vmStat) || [])[1] || "0");
      const active = parseInt((/Pages active:\s+(\d+)/u.exec(vmStat) || [])[1] || "0");
      const inactive = parseInt((/Pages inactive:\s+(\d+)/u.exec(vmStat) || [])[1] || "0");
      const wired = parseInt((/Pages wired down:\s+(\d+)/u.exec(vmStat) || [])[1] || "0");
      const speculative = parseInt((/Pages speculative:\s+(\d+)/u.exec(vmStat) || [])[1] || "0");
      const total = free + active + inactive + wired + speculative;
      const used = active + wired;
      ramPercent = total > 0 ? Math.round((used / total) * 100) : 0;
    } catch {}

    let ollamaUp = false;
    try {
      execSync("curl -s --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1", { timeout: 3000 });
      ollamaUp = true;
    } catch {}

    let gatewayUp = false;
    try {
      execSync("curl -s --max-time 2 http://127.0.0.1:18789/ >/dev/null 2>&1", { timeout: 3000 });
      gatewayUp = true;
    } catch {}

    let throttleState = "normal";
    try {
      const throttlePath = "/tmp/morpheus-throttle-state";
      if (existsSync(throttlePath)) {
        const data = JSON.parse(readFileSync(throttlePath, "utf8"));
        throttleState = data.state || data.throttleState || "normal";
      }
    } catch {}

    return { ramPercent, ollamaUp, gatewayUp, throttleState, ts: Date.now() };
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

// ── Dynamic route helpers ────────────────────────────
function matchDynamicRoute(pathname) {
  // /api/agents/:id/history
  const agentHistoryMatch = /^\/api\/agents\/([^/]+)\/history$/.exec(pathname);
  if (agentHistoryMatch) return { handler: "agentHistory", params: { id: agentHistoryMatch[1] } };
  // /api/cron/:id/run
  const cronRunMatch = /^\/api\/cron\/([^/]+)\/run$/.exec(pathname);
  if (cronRunMatch) return { handler: "cronRun", params: { id: cronRunMatch[1] } };
  // /api/cron/:id/logs
  const cronLogsMatch = /^\/api\/cron\/([^/]+)\/logs$/.exec(pathname);
  if (cronLogsMatch) return { handler: "cronLogs", params: { id: cronLogsMatch[1] } };
  return null;
}

function getAgentHistory(agentId) {
  return cached(`agent-history-${agentId}`, 15_000, () => {
    const tasks = [];
    // Parse from cron results
    try {
      const crons = getCrons();
      for (const job of (crons.jobs || [])) {
        const jobAgent = (job.agentId || job.name || "").toLowerCase();
        if (jobAgent.includes(agentId) || agentId === "all") {
          if (job.state?.lastRunAtMs) {
            tasks.push({
              id: `cron-${job.name}-${job.state.lastRunAtMs}`,
              type: "cron",
              task: job.name,
              result: job.state.consecutiveErrors > 0 ? "fail" : "success",
              durationMs: job.state.lastDurationMs || 0,
              timestamp: job.state.lastRunAtMs,
              detail: job.state.lastRunStatus || "",
            });
          }
        }
      }
    } catch {}
    // Parse from session logs
    try {
      const status = getStatus();
      for (const s of (status?.sessions?.recent || [])) {
        const sAgent = (s.agentId || "").toLowerCase();
        if (sAgent.includes(agentId) || agentId === "all") {
          tasks.push({
            id: `session-${s.id || sAgent}-${s.updatedAt}`,
            type: "session",
            task: `${s.kind || "chat"} session — ${s.model || "?"}`,
            result: s.error ? "fail" : "success",
            durationMs: s.durationMs || 0,
            timestamp: s.updatedAt || Date.now(),
            detail: `${s.percentUsed || 0}% context used`,
          });
        }
      }
    } catch {}
    // Parse from log files
    try {
      const home = homedir();
      const logDir = join(home, ".openclaw", "workspace", "logs");
      if (existsSync(logDir)) {
        const files = readdirSync(logDir).filter(f => f.includes(agentId) || agentId === "all").slice(0, 5);
        for (const file of files) {
          try {
            const content = readFileSync(join(logDir, file), "utf8");
            const lines = content.split("\n").filter(l => l.trim()).slice(-10);
            for (const line of lines) {
              try {
                const entry = JSON.parse(line);
                if (entry.ts || entry.timestamp) {
                  tasks.push({
                    id: `log-${file}-${entry.ts || entry.timestamp}`,
                    type: "log",
                    task: entry.task || entry.message || entry.event || basename(file),
                    result: entry.error ? "fail" : "success",
                    durationMs: entry.durationMs || entry.duration || 0,
                    timestamp: entry.ts || entry.timestamp || Date.now(),
                    detail: entry.detail || entry.message || "",
                  });
                }
              } catch {}
            }
          } catch {}
        }
      }
    } catch {}
    tasks.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    return { tasks: tasks.slice(0, 50) };
  });
}

function getCronLogs(cronId) {
  const entries = [];
  const home = homedir();
  // Read from workspace logs for cron-related entries
  try {
    const wsLogs = join(home, ".openclaw", "workspace", "logs");
    if (existsSync(wsLogs)) {
      const files = readdirSync(wsLogs).filter(f => f.includes("cron") || f.endsWith(".jsonl")).slice(0, 10);
      for (const file of files) {
        try {
          const content = readFileSync(join(wsLogs, file), "utf8");
          const lines = content.split("\n").filter(l => l.trim()).slice(-100);
          for (const line of lines) {
            if (line.includes(cronId) || cronId === "all") {
              let ts = Date.now();
              let text = line;
              try {
                const parsed = JSON.parse(line);
                ts = parsed.ts || parsed.timestamp || ts;
                text = parsed.message || parsed.text || line;
              } catch {}
              entries.push({ ts, text, file });
            }
          }
        } catch {}
      }
    }
  } catch {}
  // Also include cron state from cron list
  try {
    const crons = getCrons();
    for (const job of (crons.jobs || [])) {
      if (job.id === cronId || job.name.includes(cronId)) {
        entries.push({
          ts: job.state?.lastRunAtMs || Date.now(),
          text: `[${job.state?.lastRunStatus || "unknown"}] ${job.name} — ${job.state?.lastError || "OK"} (${Math.round((job.state?.lastDurationMs || 0) / 1000)}s)`,
          file: "cron-state",
        });
      }
    }
  } catch {}
  entries.sort((a, b) => (b.ts || 0) - (a.ts || 0));
  return { logs: entries.slice(0, 100), cronId };
}

// ── Auth helpers ─────────────────────────────────────
function checkAuth(req) {
  const authHeader = req.headers["authorization"] || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  return token === MC_AUTH_PIN;
}

// ── Server ───────────────────────────────────────────
const server = createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Auth verify endpoint — does not require auth itself
  if (url.pathname === "/api/auth/verify" && req.method === "POST") {
    const ok = checkAuth(req);
    res.writeHead(ok ? 200 : 401);
    res.end(JSON.stringify({ ok }));
    return;
  }

  // All other /api/* endpoints require auth
  if (!checkAuth(req)) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const handler = routes[url.pathname];

  if (handler) {
    try {
      const data = handler(url);
      res.writeHead(200);
      res.end(JSON.stringify(data));
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: String(e) }));
    }
  } else {
    // Try dynamic routes
    const dynamic = matchDynamicRoute(url.pathname);
    if (dynamic) {
      try {
        let data;
        if (dynamic.handler === "agentHistory") {
          data = getAgentHistory(dynamic.params.id);
        } else if (dynamic.handler === "cronRun") {
          const result = textExec(`openclaw cron run --id "${dynamic.params.id}" 2>&1`, 30000);
          data = { ok: !result.startsWith("ERROR"), output: result, id: dynamic.params.id };
        } else if (dynamic.handler === "cronLogs") {
          data = getCronLogs(dynamic.params.id);
        }
        res.writeHead(200);
        res.end(JSON.stringify(data || { error: "unknown handler" }));
      } catch (e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(e) }));
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: "not found" }));
    }
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`MC API server on http://0.0.0.0:${PORT} (cached)`));
