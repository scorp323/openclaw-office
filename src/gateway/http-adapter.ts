/**
 * HTTP-based GatewayAdapter implementation.
 * Uses /mc-api/* endpoints (proxied through the static server) instead of WebSocket RPC.
 * This allows the console to work through Cloudflare tunnels where WS is unreachable.
 */

import type { GatewayAdapter, AdapterEventHandler, SkillUpdatePatch } from "./adapter";
import type {
  AgentCreateParams,
  AgentCreateResult,
  AgentDeleteParams,
  AgentDeleteResult,
  AgentFileContent,
  AgentFilesListResult,
  AgentFileSetResult,
  AgentUpdateParams,
  AgentUpdateResult,
  ChannelInfo,
  ChannelType,
  ChatHistoryResult,
  ChatSendParams,
  ConfigPatchResult,
  ConfigSchemaResponse,
  ConfigSnapshot,
  ConfigWriteResult,
  CronTask,
  CronTaskInput,
  ModelCatalogEntry,
  SessionPatchParams,
  SessionInfo,
  SessionPreview,
  SkillInfo,
  SkillInstallResult,
  StatusSummary,
  ToolCatalog,
  UpdateRunResult,
  UsageInfo,
} from "./adapter-types";
import type { AgentsListResponse } from "./types";

const AUTH_TOKEN_KEY = "openclaw-mc-auth-token";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) ?? "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `/mc-api${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { ...getAuthHeaders(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText} (${url})`);
  }
  return res.json() as Promise<T>;
}

// ---- Data transformers ----

interface McApiChannelsResponse {
  chat?: Record<string, string[]>;
  auth?: Array<{ id: string; provider: string; type: string }>;
  usage?: {
    updatedAt: number;
    providers: Array<{
      provider: string;
      displayName: string;
      windows: Array<{ label: string; usedPercent: number; resetAt?: number }>;
      error?: string;
    }>;
  };
}

function transformChannels(data: McApiChannelsResponse): ChannelInfo[] {
  const channels: ChannelInfo[] = [];
  const chat = data.chat ?? {};
  for (const [channelType, accounts] of Object.entries(chat)) {
    for (const accountId of accounts) {
      channels.push({
        id: `${channelType}:${accountId}`,
        type: channelType as ChannelType,
        name: accountId === "default" ? channelType : `${channelType} (${accountId})`,
        status: "connected", // if listed in chat, it's configured
        accountId,
        configured: true,
        running: true,
      });
    }
  }
  return channels;
}

interface McApiSkillEntry {
  name?: string;
  description?: string;
  eligible?: boolean;
  disabled?: boolean;
  blockedByAllowlist?: boolean;
  source?: string;
  bundled?: boolean;
  core?: boolean;
  emoji?: string;
  version?: string;
  author?: string;
  homepage?: string;
  primaryEnv?: string;
  always?: boolean;
  missing?: { bins?: string[]; anyBins?: string[]; env?: string[]; config?: string[]; os?: string[] };
  requirements?: { bins?: string[]; env?: string[] };
  install?: Array<{ id: string; kind: string; label: string }>;
  configChecks?: Array<{ path: string; satisfied: boolean }>;
  config?: Record<string, unknown>;
}

interface McApiSkillsResponse {
  workspaceDir?: string;
  managedSkillsDir?: string;
  skills?: McApiSkillEntry[];
}

function transformSkills(data: McApiSkillsResponse): SkillInfo[] {
  return (data.skills ?? []).map((e) => ({
    id: e.name ?? "",
    slug: e.name ?? "",
    name: e.name ?? "",
    description: e.description ?? "",
    enabled: !e.disabled,
    icon: e.emoji ?? "📦",
    version: e.version ?? "",
    author: e.author,
    isCore: e.core,
    isBundled: e.bundled,
    config: e.config,
    source: e.source,
    homepage: e.homepage,
    primaryEnv: e.primaryEnv,
    always: e.always,
    eligible: e.eligible,
    blockedByAllowlist: e.blockedByAllowlist,
    requirements: e.requirements,
    missing: e.missing ? { bins: e.missing.bins, env: e.missing.env } : undefined,
    installOptions: e.install,
    configChecks: e.configChecks,
  }));
}

interface McApiCostsResponse {
  weeklyPct?: number;
  sessionPct?: number;
  dailyBudgetPct?: number;
  throttleState?: string;
  maxAgents?: number;
  estimatedWeeklyCostUsd?: number;
  estimatedDailyCostUsd?: number;
  extraCostUsd?: number;
  extraBudgetUsd?: number;
  weeklyBudgetUsd?: number;
  updatedAt?: number;
}

function transformCosts(data: McApiCostsResponse): UsageInfo {
  return {
    updatedAt: data.updatedAt ?? Date.now(),
    providers: [
      {
        provider: "anthropic",
        displayName: "Claude",
        plan: data.throttleState ?? "unknown",
        windows: [
          {
            label: "Weekly",
            usedPercent: data.weeklyPct ?? 0,
          },
          {
            label: "Session",
            usedPercent: data.sessionPct ?? 0,
          },
          {
            label: "Daily Budget",
            usedPercent: data.dailyBudgetPct ?? 0,
          },
        ],
      },
    ],
  };
}

interface McApiSessionsResponse {
  count?: number;
  sessions?: Array<{
    key: string;
    agentId?: string;
    label?: string;
    model?: string;
    modelProvider?: string;
    kind?: string;
    totalTokens?: number | null;
    contextTokens?: number;
    lastActiveAt?: number;
    ageMs?: number;
    percentUsed?: number;
  }>;
}

function transformSessions(data: McApiSessionsResponse): SessionInfo[] {
  return (data.sessions ?? []).map((s) => ({
    key: s.key,
    agentId: s.agentId,
    label: s.label,
    kind: s.kind,
    model: s.model,
    modelProvider: s.modelProvider,
    totalTokens: s.totalTokens,
    contextTokens: s.contextTokens,
    lastActiveAt: s.lastActiveAt,
  }));
}

interface McApiCronsResponse {
  jobs?: CronTask[];
}

function transformCrons(data: McApiCronsResponse): CronTask[] {
  return data.jobs ?? [];
}

// ---- The adapter ----

export class HttpAdapter implements GatewayAdapter {
  private handlers = new Set<AdapterEventHandler>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  async connect(): Promise<void> {
    // Verify the MC API is reachable
    const res = await fetch("/mc-api/status", { headers: getAuthHeaders() });
    if (!res.ok) {
      throw new Error(`MC API unreachable: HTTP ${res.status}`);
    }
  }

  disconnect(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.handlers.clear();
  }

  onEvent(handler: AdapterEventHandler): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  // ---- Chat ----

  async chatHistory(sessionKey?: string): Promise<ChatHistoryResult> {
    const path = sessionKey ? `/session/${encodeURIComponent(sessionKey)}/history` : "/session/main/history";
    try {
      const data = await apiFetch<{ messages?: ChatHistoryResult["messages"] }>(path);
      return { messages: Array.isArray(data.messages) ? data.messages : [] };
    } catch {
      return { messages: [] };
    }
  }

  async chatSend(params: ChatSendParams): Promise<void> {
    const sessionKey = params.sessionKey ?? "agent:main:main";
    await apiFetch(`/session/${encodeURIComponent(sessionKey)}/message`, {
      method: "POST",
      body: JSON.stringify({ message: params.text }),
    });
  }

  async chatAbort(_sessionKeyOrRunId: string): Promise<void> {
    // Not supported via HTTP API
  }

  async chatInject(_sessionKey: string, _content: string): Promise<void> {
    // Not supported via HTTP API
  }

  // ---- Sessions ----

  async sessionsList(): Promise<SessionInfo[]> {
    const data = await apiFetch<McApiSessionsResponse>("/sessions");
    return transformSessions(data);
  }

  async sessionsPreview(sessionKey: string): Promise<SessionPreview> {
    try {
      const data = await apiFetch<{ messages?: SessionPreview["messages"] }>(
        `/session/${encodeURIComponent(sessionKey)}/history`,
      );
      return { key: sessionKey, messages: data.messages ?? [] };
    } catch {
      return { key: sessionKey, messages: [] };
    }
  }

  async sessionsDelete(_sessionKey: string, _options?: { deleteTranscript?: boolean }): Promise<void> {
    // Not supported via HTTP API
  }

  async sessionsPatch(_sessionKey: string, _patch: SessionPatchParams): Promise<void> {
    // Not supported via HTTP API
  }

  async sessionsReset(_sessionKey: string): Promise<void> {
    // Not supported via HTTP API
  }

  async sessionsCompact(_sessionKey: string): Promise<void> {
    // Not supported via HTTP API
  }

  // ---- Channels ----

  async channelsStatus(): Promise<ChannelInfo[]> {
    const data = await apiFetch<McApiChannelsResponse>("/channels");
    return transformChannels(data);
  }

  async channelsLogout(_channel: string, _accountId?: string): Promise<{ cleared: boolean }> {
    return { cleared: false };
  }

  async webLoginStart(_force?: boolean): Promise<{ qrDataUrl?: string; message: string }> {
    return { message: "Not available via HTTP adapter" };
  }

  async webLoginWait(): Promise<{ connected: boolean; message: string }> {
    return { connected: false, message: "Not available via HTTP adapter" };
  }

  // ---- Skills ----

  async skillsStatus(_agentId?: string): Promise<SkillInfo[]> {
    const data = await apiFetch<McApiSkillsResponse>("/skills");
    return transformSkills(data);
  }

  async skillsInstall(_name: string, _installId: string): Promise<SkillInstallResult> {
    return { ok: false, message: "Not available via HTTP adapter" };
  }

  async skillsUpdate(_skillKey: string, _patch: SkillUpdatePatch): Promise<{ ok: boolean }> {
    return { ok: false };
  }

  // ---- Cron ----

  async cronList(): Promise<CronTask[]> {
    const data = await apiFetch<McApiCronsResponse>("/crons");
    return transformCrons(data);
  }

  async cronAdd(_input: CronTaskInput): Promise<CronTask> {
    throw new Error("Not available via HTTP adapter");
  }

  async cronUpdate(_id: string, _patch: Partial<CronTaskInput>): Promise<CronTask> {
    throw new Error("Not available via HTTP adapter");
  }

  async cronRemove(_id: string): Promise<void> {
    throw new Error("Not available via HTTP adapter");
  }

  async cronRun(_id: string): Promise<void> {
    throw new Error("Not available via HTTP adapter");
  }

  // ---- Agents ----

  async agentsList(): Promise<AgentsListResponse> {
    const data = await apiFetch<{ agents?: AgentsListResponse["agents"] }>("/agents");
    return { agents: data.agents ?? [] };
  }

  async agentsCreate(_params: AgentCreateParams): Promise<AgentCreateResult> {
    throw new Error("Not available via HTTP adapter");
  }

  async agentsUpdate(_params: AgentUpdateParams): Promise<AgentUpdateResult> {
    throw new Error("Not available via HTTP adapter");
  }

  async agentsDelete(_params: AgentDeleteParams): Promise<AgentDeleteResult> {
    throw new Error("Not available via HTTP adapter");
  }

  async agentsFilesList(_agentId: string): Promise<AgentFilesListResult> {
    throw new Error("Not available via HTTP adapter");
  }

  async agentsFilesGet(_agentId: string, _name: string): Promise<AgentFileContent> {
    throw new Error("Not available via HTTP adapter");
  }

  async agentsFilesSet(_agentId: string, _name: string, _content: string): Promise<AgentFileSetResult> {
    throw new Error("Not available via HTTP adapter");
  }

  async toolsCatalog(_agentId?: string): Promise<ToolCatalog> {
    return { tools: [] };
  }

  async usageStatus(): Promise<UsageInfo> {
    const data = await apiFetch<McApiCostsResponse>("/costs");
    return transformCosts(data);
  }

  async modelsList(): Promise<ModelCatalogEntry[]> {
    return [];
  }

  // ---- Config ----

  async configGet(): Promise<ConfigSnapshot> {
    return { config: {}, valid: true };
  }

  async configSet(_raw: string, _baseHash?: string): Promise<ConfigWriteResult> {
    return { ok: false, config: {}, error: "Not available via HTTP adapter" };
  }

  async configApply(
    _raw: string,
    _baseHash?: string,
    _params?: { sessionKey?: string; note?: string; restartDelayMs?: number },
  ): Promise<ConfigWriteResult> {
    return { ok: false, config: {}, error: "Not available via HTTP adapter" };
  }

  async configPatch(_raw: string, _baseHash?: string): Promise<ConfigPatchResult> {
    return { ok: false, config: {}, error: "Not available via HTTP adapter" };
  }

  async configSchema(): Promise<ConfigSchemaResponse> {
    return { schema: {}, uiHints: {}, version: "" };
  }

  async statusSummary(): Promise<StatusSummary> {
    try {
      const data = await apiFetch<Record<string, unknown>>("/status");
      return {
        version: data.runtimeVersion as string | undefined,
        mode: "http",
      };
    } catch {
      return { mode: "http" };
    }
  }

  async updateRun(_params?: { restartDelayMs?: number }): Promise<UpdateRunResult> {
    throw new Error("Not available via HTTP adapter");
  }
}
