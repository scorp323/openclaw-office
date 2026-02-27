// Gateway Adapter 统一接口
// 提供 mock 与 gateway（WebSocket）两种实现

import type {
  ChannelInfo,
  ChatMessage,
  ChatSendParams,
  ConfigPatchResult,
  ConfigSchemaResponse,
  ConfigSnapshot,
  CronTask,
  CronTaskInput,
  SessionInfo,
  SessionPreview,
  SkillInfo,
  StatusSummary,
  ToolCatalog,
  UpdateRunResult,
  UsageInfo,
} from "./adapter-types";
import type { AgentsListResponse } from "./types";

export type AdapterEventHandler = (event: string, payload: unknown) => void;

export interface SkillUpdatePatch {
  enabled?: boolean;
  apiKey?: string;
  env?: Record<string, string>;
}

export interface GatewayAdapter {
  connect(): Promise<void>;
  disconnect(): void;
  onEvent(handler: AdapterEventHandler): () => void;

  // Chat
  chatHistory(sessionKey?: string): Promise<ChatMessage[]>;
  chatSend(params: ChatSendParams): Promise<void>;
  chatAbort(sessionKeyOrRunId: string): Promise<void>;

  // Sessions
  sessionsList(): Promise<SessionInfo[]>;
  sessionsPreview(sessionKey: string): Promise<SessionPreview>;

  // Channels
  channelsStatus(): Promise<ChannelInfo[]>;
  channelsLogout(channel: string, accountId?: string): Promise<{ cleared: boolean }>;
  webLoginStart(force?: boolean): Promise<{ qrDataUrl?: string; message: string }>;
  webLoginWait(): Promise<{ connected: boolean; message: string }>;

  // Skills
  skillsStatus(): Promise<SkillInfo[]>;
  skillsInstall(name: string, installId: string): Promise<{ ok: boolean; message: string }>;
  skillsUpdate(skillKey: string, patch: SkillUpdatePatch): Promise<{ ok: boolean }>;

  // Cron
  cronList(): Promise<CronTask[]>;
  cronAdd(input: CronTaskInput): Promise<CronTask>;
  cronUpdate(id: string, patch: Partial<CronTaskInput>): Promise<CronTask>;
  cronRemove(id: string): Promise<void>;
  cronRun(id: string): Promise<void>;

  // Agents & Tools
  agentsList(): Promise<AgentsListResponse>;
  toolsCatalog(): Promise<ToolCatalog>;
  usageStatus(): Promise<UsageInfo>;

  // Config / Status / Update (Phase D)
  configGet(): Promise<ConfigSnapshot>;
  configPatch(raw: string, baseHash?: string): Promise<ConfigPatchResult>;
  configSchema(): Promise<ConfigSchemaResponse>;
  statusSummary(): Promise<StatusSummary>;
  updateRun(params?: { restartDelayMs?: number }): Promise<UpdateRunResult>;
}
