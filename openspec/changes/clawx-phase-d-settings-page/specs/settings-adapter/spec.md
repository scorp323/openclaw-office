# Settings Adapter — Gateway RPC 薄封装

> 本 spec 定义 GatewayAdapter 接口扩展：新增 5 个通用方法，对 Gateway 已有 RPC 做一对一薄封装。

## 设计原则

1. **Adapter 不含业务逻辑** — 只做 RPC 请求/响应的类型映射，Provider CRUD 逻辑在 store 层
2. **RPC 方法一对一映射** — `configGet` ↔ `config.get`，`configPatch` ↔ `config.patch`，等
3. **Mock 实现自包含** — MockAdapter 维护内存中的 config 状态，支持独立开发

## 要求

### R1: GatewayAdapter 接口扩展

在 `src/gateway/adapter.ts` 中新增 5 个方法签名：

```typescript
configGet(): Promise<ConfigSnapshot>;
configPatch(raw: string, baseHash?: string): Promise<ConfigPatchResult>;
configSchema(): Promise<ConfigSchemaResponse>;
statusSummary(): Promise<StatusSummary>;
updateRun(params?: { restartDelayMs?: number }): Promise<UpdateRunResult>;
```

#### 场景

**S1.1 configGet 返回完整配置快照**
- 调用 Gateway `config.get` RPC
- 返回值包含 `config`（完整 OpenClawConfig，敏感字段已脱敏）、`hash`（用于 baseHash）、`raw`（原始 JSON5 文本，已脱敏）、`valid`（配置是否有效）
- 前端从 `config.models.providers` 提取 Provider 列表

**S1.2 configPatch 部分更新配置**
- 调用 Gateway `config.patch` RPC，传入 `{ raw, baseHash }`
- Gateway 执行 JSON Merge Patch，写入配置文件，触发 SIGUSR1 重启
- 返回值包含 `ok`、`config`（更新后完整配置，已脱敏）、`restart`（重启信息）
- 如果 baseHash 不匹配，Gateway 返回错误 `config changed since last load`

**S1.3 configSchema 返回配置 schema + uiHints**
- 调用 Gateway `config.schema` RPC
- 返回值包含 `schema`（JSON Schema）、`uiHints`（路径 → hint 映射）、`version`
- `uiHints[path]` 包含 `{ label?, help?, sensitive?, placeholder?, group?, order?, advanced? }`

**S1.4 statusSummary 返回 Gateway 运行状态**
- 调用 Gateway `status` RPC
- 返回值包含版本号、端口、运行时间、连接数等关键信息

**S1.5 updateRun 触发 Gateway 更新**
- 调用 Gateway `update.run` RPC，传入 `{ restartDelayMs? }`
- Gateway 执行 git pull + pnpm install，成功后自动重启
- 返回值包含更新结果（status / mode / before version / after version / steps）

### R2: adapter-types.ts 新增类型定义

```typescript
interface ConfigSnapshot {
  config: Record<string, unknown>;
  hash?: string;
  raw?: string | null;
  valid: boolean;
  path?: string;
  issues?: Array<{ path: string; message: string }>;
}

interface ConfigPatchResult {
  ok: boolean;
  config: Record<string, unknown>;
  restart?: {
    scheduled: boolean;
    delayMs: number;
    coalesced?: boolean;
  };
  error?: string;
}

interface ConfigSchemaResponse {
  schema: unknown;
  uiHints: Record<string, ConfigUiHint>;
  version: string;
}

interface ConfigUiHint {
  label?: string;
  help?: string;
  sensitive?: boolean;
  placeholder?: string;
  group?: string;
  order?: number;
  advanced?: boolean;
  tags?: string[];
}

interface StatusSummary {
  version?: string;
  port?: number;
  uptime?: number;
  mode?: string;
  pid?: number;
  nodeVersion?: string;
  platform?: string;
  [key: string]: unknown;
}

interface UpdateRunResult {
  ok: boolean;
  result: {
    status: "ok" | "error" | "noop";
    mode: string;
    before?: string | null;
    after?: string | null;
    reason?: string | null;
    steps: Array<{
      name: string;
      command: string;
      durationMs: number;
    }>;
    durationMs: number;
  };
  restart?: {
    scheduled: boolean;
    delayMs: number;
  } | null;
}
```

#### 场景

**S2.1 ConfigSnapshot 反映 Gateway config.get 响应结构**
- `config` 字段为 `Record<string, unknown>` 以保持灵活性（Gateway 配置结构会随版本演进）
- `hash` 用于后续 configPatch 的 baseHash 参数
- `valid` = false 时表示配置文件存在语法或结构错误

**S2.2 ConfigPatchResult 反映 Gateway config.patch 响应结构**
- `restart.scheduled` = true 表示 Gateway 将在 `delayMs` 后重启
- `restart.coalesced` = true 表示本次重启与其他待重启合并

### R3: WsAdapter 实现

```typescript
async configGet(): Promise<ConfigSnapshot> {
  return this.rpcClient.request<ConfigSnapshot>("config.get");
}

async configPatch(raw: string, baseHash?: string): Promise<ConfigPatchResult> {
  return this.rpcClient.request<ConfigPatchResult>(
    "config.patch",
    { raw, ...(baseHash ? { baseHash } : {}) }
  );
}

async configSchema(): Promise<ConfigSchemaResponse> {
  return this.rpcClient.request<ConfigSchemaResponse>("config.schema");
}

async statusSummary(): Promise<StatusSummary> {
  return this.rpcClient.request<StatusSummary>("status");
}

async updateRun(params?: { restartDelayMs?: number }): Promise<UpdateRunResult> {
  return this.rpcClient.request<UpdateRunResult>("update.run", params ?? {});
}
```

#### 场景

**S3.1 WsAdapter configGet 直接透传 config.get RPC**
- 无额外映射逻辑，Gateway 返回什么就传给 store 什么

**S3.2 WsAdapter configPatch 传递 raw + baseHash**
- baseHash 可选，如果不传 Gateway 在配置文件存在时会拒绝（需先 config.get 获取 hash）

### R4: MockAdapter 实现

- 维护内存中的 `mockConfig: Record<string, unknown>` 和 `mockHash: string`
- `configGet()` 返回内存配置 + hash
- `configPatch(raw)` 解析 raw 并 merge 到内存配置，更新 hash
- `configSchema()` 返回预设的 schema stub
- `statusSummary()` 返回预设的 mock 状态（版本号、端口等）
- `updateRun()` 延迟后返回成功/noop 结果

#### 场景

**S4.1 MockAdapter configPatch 模拟 merge patch 行为**
- 解析 raw JSON 字符串
- 深合并到 mockConfig 中
- null 值表示删除对应 key
- 更新 mockHash（`Date.now().toString(36)` 即可）

**S4.2 MockAdapter 预填示例 Provider 数据**
- 默认 mockConfig 包含 `models.providers.anthropic` 和 `models.providers.openai` 两个示例 Provider
- apiKey 字段设为 `__OPENCLAW_REDACTED__`（模拟 Gateway 脱敏行为）

## 验收标准

- [ ] `GatewayAdapter` 接口包含 5 个新方法
- [ ] `adapter-types.ts` 包含所有新增类型定义
- [ ] WsAdapter 正确映射到 Gateway RPC
- [ ] MockAdapter 支持 config 的读/写/merge-patch/删除
- [ ] 新增方法有 adapter-phase-d 单元测试覆盖
