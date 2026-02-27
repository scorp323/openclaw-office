## Context

Phase C 已完成 Dashboard / Channels / Skills / Cron 四个管控页面，建立了成熟的开发模式：GatewayAdapter 接口 → Mock/WS 双实现 → Zustand Store → 页面组件 → i18n 全文本。Settings 页面是最后一个占位页面，需要升级为完整功能。

**关键调研发现：Gateway 已具备 Settings 所需的全部底层 RPC 能力。**

通过对父级 OpenClaw 仓库 (`src/gateway/server-methods/config.ts`、`src/gateway/method-scopes.ts`、`src/config/types.openclaw.ts`、`src/config/types.models.ts`) 的详细调研，确认以下事实：

1. **`config.get`** (`operator.read`) — 返回完整 `OpenClawConfig`（含 `models.providers`、`channels`、`skills`、`cron`、`update` 等所有子配置），敏感字段自动脱敏为 `__OPENCLAW_REDACTED__` sentinel
2. **`config.patch`** (`operator.admin`) — JSON Merge Patch 部分更新配置，写入 `~/.openclaw/openclaw.json`，写入时自动恢复脱敏字段原始值（round-trip 安全），写入后**自动触发 Gateway SIGUSR1 重启**
3. **`config.schema`** (`operator.admin`) — 返回 JSON Schema + `uiHints`（`label`/`help`/`sensitive`/`placeholder`/`group`/`order`/`advanced`），可用于动态渲染配置表单
4. **`models.list`** (`operator.read`) — 返回已配置的模型目录
5. **`status`** (`operator.read`) — 完整状态摘要（含 Gateway 版本号、运行时间、端口等）
6. **`update.run`** (`operator.admin`) — 触发真实更新（git pull + pnpm install），成功后自动重启
7. **`health`** (`operator.read`) — 健康快照

这意味着：
- **Provider 管理不需要自定义 RPC** — 读取 `config.get` 中的 `models.providers`，通过 `config.patch` 写入修改
- **Gateway 状态直接从 `status` RPC 获取**，无需模拟
- **更新操作直接复用 `update.run` RPC**，真实触发 git/npm 更新
- **OpenClaw Office 可以作为 OpenClaw 内置 Control UI 的升级版**，底层能力完全复用 Gateway RPC

### Provider 配置结构（来自 `src/config/types.models.ts`）

```typescript
type ModelsConfig = {
  mode?: "merge" | "replace";
  providers?: Record<string, ModelProviderConfig>;
  bedrockDiscovery?: BedrockDiscoveryConfig;
};

type ModelProviderConfig = {
  baseUrl: string;
  apiKey?: SecretInput;   // 敏感字段，config.get 中会被脱敏
  auth?: "api-key" | "aws-sdk" | "oauth" | "token";
  api?: ModelApi;
  headers?: Record<string, string>;
  authHeader?: boolean;
  models: ModelDefinitionConfig[];
};
```

### 与 ClawX 方案的根本区别

ClawX 是 Electron 桌面应用，通过 `window.electron.ipcRenderer.invoke('provider:list')` 等 IPC 调用访问一套**独立的 Provider 注册系统**（`electron/utils/provider-registry.ts`），该系统独立于 OpenClaw 配置文件管理 Provider 和 API Key。

OpenClaw Office 作为纯 Web 应用，**直接通过 Gateway RPC 读写 `openclaw.json` 配置文件**：
- Provider 列表 = `config.get` → 提取 `models.providers`
- Provider 修改 = `config.patch` → 写入 `models.providers.<id>` 字段
- API Key 管理 = 写入 `models.providers.<id>.apiKey`，Gateway 自动处理脱敏/恢复
- Gateway 重启 = `config.patch` 写入后自动触发，无需额外 RPC

## Goals / Non-Goals

**Goals:**
- Settings 页面直接复用 Gateway 已有 RPC 能力（`config.get`/`config.patch`/`config.schema`/`status`/`update.run`/`models.list`），**不发明新的 Adapter 方法**
- Provider 管理直接读写 `openclaw.json` 中的 `models.providers` 配置节，实现真实的配置文件修改
- Gateway 状态从 `status` RPC 获取真实运行信息（版本号、端口、运行时间）
- 更新操作直接调用 `update.run` 触发真实的 git/npm 更新流程
- 利用 `config.schema` 返回的 `uiHints` 辅助表单渲染（sensitive 字段自动密文处理）
- Appearance 设置与现有 `office-store.theme` 和 i18n `changeLanguage()` 双向同步
- 所有用户可见文本走 i18n（中英双语同步）
- 代码单文件不超过 500 行

**Non-Goals:**
- 不发明 Gateway 不存在的 RPC 方法（如 `provider.list`、`provider.validateKey` 等）
- 不实现 ClawX 的独立 Provider Registry（Electron 专属，与 OpenClaw 配置系统不同）
- 不实现 OAuth Device Flow（`config.patch` 可直接写入 `apiKey`）
- 不实现 Electron dialog / CLI 安装命令 / Provider SVG 图标
- 不重复实现 Gateway 已有的脱敏/恢复机制（`__OPENCLAW_REDACTED__` sentinel 由 Gateway 自动处理）

## Decisions

### D1: Provider 管理策略——基于 config.get + config.patch（核心决策变更）

**决策**: 不再创建独立的 `providers-store` 和 Adapter Provider 方法。改为：

1. **读取**: 调用 `config.get` → 提取 `response.config.models.providers` 构造 Provider 列表
2. **写入**: 调用 `config.patch` → 发送 `{ raw: JSON.stringify({ models: { providers: { "<id>": { ... } } } }) }` + `baseHash`（乐观并发控制）
3. **删除**: 调用 `config.patch` → 发送 `{ raw: JSON.stringify({ models: { providers: { "<id>": null } } }) }`（JSON Merge Patch 中 null 表示删除）
4. **API Key**: 直接写入 `models.providers.<id>.apiKey`，Gateway 写入时自动处理敏感值恢复
5. **脱敏**: `config.get` 返回的 API Key 已被替换为 `__OPENCLAW_REDACTED__`，前端直接展示"已配置"状态即可

**理由**: Gateway 的 `config.get`/`config.patch` 是 OpenClaw 配置管理的**正统通道**。所有 CLI 命令（`openclaw config set`）、内置 Control UI、桌面端设置都走同一条路径。Office 作为 Gateway 的升级版 UI，理应直接复用此通道，而非发明平行的 Provider Registry。

**优势**:
- Provider 配置修改**立即生效**（config.patch 自动触发 Gateway 重启）
- 与 CLI `openclaw config set models.providers.xxx.apiKey=xxx` 完全等价
- 无需维护独立的 Provider 持久化逻辑
- 支持所有 OpenClaw 已有的 Provider 类型（包括 Bedrock、GitHub Copilot 等）

**替代方案**: 发明 `provider.list`/`provider.add` 等自定义 RPC。问题：Gateway 不存在这些方法，需要修改父仓库，增加耦合。

### D2: Gateway 状态——基于 status RPC

**决策**: 调用 `status` RPC 获取 Gateway 运行信息，解析返回值中的版本号、端口、运行时间等字段。

`status` 返回值（`operator.admin` scope 下包含敏感信息）包含 Gateway 完整运行状态，可直接用于 Settings 页面展示。

**理由**: 复用已有 RPC，无需模拟 Gateway 状态。

### D3: 版本更新——基于 update.run RPC

**决策**: 
- 版本号从 `status` RPC 获取
- 更新操作调用 `update.run` RPC，传入 `{ restartDelayMs, sessionKey, note }`
- Gateway 会执行真实的 git pull + pnpm install，成功后自动重启
- 前端在调用前展示确认弹窗（更新后 Gateway 会重启，WS 连接会中断）

**理由**: 这是 OpenClaw 官方的更新通道，CLI `openclaw update` 命令和 Control UI 都使用同一机制。

**与 ClawX 的区别**: ClawX 使用 Electron 的 autoUpdater（Sparkle/electron-updater），独立于 Gateway。Office 直接通过 Gateway RPC 触发更新，更接近 CLI 行为。

### D4: config.patch 的 baseHash 乐观并发控制

**决策**: 每次修改配置前，先调用 `config.get` 获取当前配置快照和 `hash`，然后在 `config.patch` 中传入 `baseHash`。如果在此期间配置被其他客户端修改，Gateway 会返回 `config changed since last load` 错误，前端提示用户重新加载。

**理由**: Gateway 强制要求 `baseHash` 参数防止并发冲突。这是 OpenClaw 的安全设计，保护配置文件不被意外覆盖。

### D5: Settings Store 统一策略——扩展现有 store + config store

**决策**: 
- **本地偏好**（theme / language / devModeUnlocked）：扩展现有 `settings-store.ts`，保留 localStorage 持久化
- **Gateway 配置**（models.providers / update / gateway 设置）：新建 `config-store.ts`，通过 `config.get`/`config.patch` 读写远程配置

分离理由：本地偏好是浏览器级别的用户偏好（不影响 Gateway），Gateway 配置是系统级别的（影响所有连接的客户端）。

### D6: 组件拆分策略

**决策**: 
- `SettingsPage.tsx` — 主容器，垂直堆叠 Card 布局
- `AppearanceSection.tsx` — 主题 + 语言切换（本地偏好）
- `ProvidersSection.tsx` — 从 config 读取 `models.providers`，展示列表 + 新增/编辑/删除
- `ProviderCard.tsx` — 单个 Provider 展示/编辑
- `AddProviderDialog.tsx` — 新增 Provider 弹窗
- `GatewaySection.tsx` — 从 `status` RPC 读取 Gateway 状态
- `UpdateSection.tsx` — 从 `status` 获取版本号 + `update.run` 触发更新
- `AdvancedSection.tsx` — 开发者模式开关（本地偏好）
- `DeveloperSection.tsx` — Dev Console + Token + CLI
- `AboutSection.tsx` — 关于信息

### D7: Adapter 层策略——新增通用 config 方法而非 Provider 专用方法

**决策**: 在 `GatewayAdapter` 接口中新增 3 个通用 config 方法：

```typescript
configGet(): Promise<ConfigSnapshot>;
configPatch(raw: string, baseHash?: string): Promise<ConfigPatchResult>;
configSchema(): Promise<ConfigSchemaResponse>;
```

以及 2 个状态/更新方法：

```typescript
statusSummary(): Promise<StatusSummary>;
updateRun(params?: { restartDelayMs?: number }): Promise<UpdateRunResult>;
```

这些方法是对 Gateway 已有 RPC 的**薄封装**，不添加业务逻辑。Provider CRUD 逻辑在 store 层实现（从 `configGet()` 结果中提取、通过 `configPatch()` 写入）。

**理由**: 保持 Adapter 层作为 Gateway RPC 的一对一映射，业务逻辑放在 store 层。

### D8: Provider 类型元数据——保留 ClawX 数据但对齐 OpenClaw 配置结构

**决策**: 保留 `PROVIDER_TYPE_INFO` 数组用于 UI 展示（图标、名称、placeholder），但实际配置结构对齐 `ModelProviderConfig`（`baseUrl`、`apiKey`、`api`、`models[]`）而非 ClawX 的 `ProviderConfig`。

OpenClaw 的 Provider 配置比 ClawX 更丰富（支持 `api` 类型选择、多模型定义、headers、auth 模式等），但 UI 上可以先实现核心字段（baseUrl + apiKey），高级字段后续迭代。

## Risks / Trade-offs

**[风险] config.patch 后 Gateway 自动重启，WS 连接中断** → 前端在执行配置写入前需展示确认提示："保存配置后 Gateway 将自动重启，连接将短暂中断"。重启后前端需自动重连。现有 WS 客户端已有重连机制。

**[风险] OpenClaw 配置结构与 ClawX Provider Registry 不完全对齐** → OpenClaw 的 `ModelProviderConfig` 没有 `name` 字段（Provider ID 作为 key），没有 `enabled` 字段（存在即启用），没有独立的 `type` 字段（通过 `api` / `baseUrl` 推断）。UI 上需要从 provider ID 和 baseUrl 推断类型展示。

**[风险] config.get 返回的 API Key 已脱敏，无法展示前缀/后缀** → 只能展示"已配置"/"未配置"两种状态，无法像 ClawX 那样展示 `sk-ant...xxxx` 格式。这是 Gateway 安全设计，不应绕过。

**[风险] baseHash 乐观并发控制可能导致写入频繁失败** → 在单用户场景下（Settings 页面通常只有一个操作者）冲突概率极低。遇到冲突时自动重新加载最新配置即可。

**[风险] 大量 i18n key 新增** → 采用 `console.json` 的 `settings` 子树组织，按模块分组。中英文同步新增。
