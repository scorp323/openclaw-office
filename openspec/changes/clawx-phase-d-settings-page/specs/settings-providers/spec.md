# Settings Providers — 基于 config.get/config.patch 的 AI Provider 管理

> 本 spec 定义 AI Provider 管理的完整交互流程：从 `config.get` 读取 Provider 列表，通过 `config.patch` 执行 CRUD。

## 设计原则

1. **底层直接复用 Gateway config RPC** — 不发明 Provider 专用 RPC
2. **Store 层实现 Provider CRUD 逻辑** — 从 ConfigSnapshot 中提取 Provider 数据，构造 Merge Patch 写入
3. **脱敏 API Key 安全处理** — Gateway 返回的 apiKey 为 `__OPENCLAW_REDACTED__`，前端展示"已配置"状态
4. **baseHash 乐观并发控制** — 每次写入前用最新 hash，冲突时提示重新加载

## 要求

### R1: Provider 列表展示

从 `configGet()` 返回的 `config.models.providers` 构建 Provider 列表。

**数据映射**（从 OpenClaw `ModelProviderConfig` 到 UI 展示）：

| OpenClaw 配置字段 | UI 展示 |
|---|---|
| Provider ID（Record key） | Provider 标识名（如 `anthropic`、`openai`、`my-ollama`） |
| `baseUrl` | 基础 URL |
| `apiKey` | "已配置" / "未配置"（`__OPENCLAW_REDACTED__` = 已配置） |
| `api` | API 类型（`openai-completions` / `anthropic-messages` / ...） |
| `auth` | 认证模式（`api-key` / `aws-sdk` / `oauth` / `token`） |
| `models[]` | 已配置模型数量 |

**类型推断**：从 Provider ID 和 `api` / `baseUrl` 推断 Provider 类型，匹配 `PROVIDER_TYPE_INFO` 中的元数据用于 UI 展示（图标、名称等）。

#### 场景

**S1.1 列表展示已配置的 Provider**
- 假设 `config.models.providers` 为 `{ "anthropic": { baseUrl: "https://api.anthropic.com", apiKey: "__OPENCLAW_REDACTED__", api: "anthropic-messages", models: [...] }, "openai": { ... } }`
- UI 展示两张 ProviderCard，分别显示 Anthropic 和 OpenAI 的信息
- apiKey 列显示"已配置"（绿色）

**S1.2 无 Provider 时的空状态**
- `config.models.providers` 为 `undefined` 或 `{}`
- 展示 EmptyState 提示"尚未配置 AI Provider"，带"添加"按钮

**S1.3 config.get 失败时的错误状态**
- Adapter 调用失败
- 展示 ErrorState 提示"无法读取配置"，带"重试"按钮

### R2: 新增 Provider

两步弹窗流程：

**Step 1: 选择 Provider 类型**
- 展示 `PROVIDER_TYPE_INFO` 列表（Anthropic / OpenAI / Google / Ollama / Bedrock / GitHub Copilot / 自定义...）
- 每个选项展示图标和名称
- 选择后进入 Step 2

**Step 2: 填写配置**
- Provider ID（默认从类型推断，如 `anthropic`；可自定义编辑，用于配置文件的 key）
- Base URL（根据类型自动填充默认值）
- API Key（密码类型输入框，可选）
- API 类型（根据类型自动选择，可切换）
- 提交后调用 `configPatch` 写入 `{ models: { providers: { "<id>": { baseUrl, apiKey, api, models: [] } } } }`

#### 场景

**S2.1 新增 Anthropic Provider**
- Step 1 选择 Anthropic
- Step 2 自动填充 `baseUrl: "https://api.anthropic.com"`、`api: "anthropic-messages"`、Provider ID: `anthropic`
- 用户输入 API Key → 提交
- 调用 `configPatch` 写入 `{ models: { providers: { "anthropic": { baseUrl: "https://api.anthropic.com", apiKey: "sk-ant-xxx", api: "anthropic-messages", models: [] } } } }`

**S2.2 新增自定义 OpenAI 兼容 Provider**
- Step 1 选择"自定义"
- Step 2 用户输入自定义 Provider ID（如 `my-vllm`）、Base URL、API Key
- 提交后写入对应配置

**S2.3 Provider ID 冲突检测**
- 如果输入的 Provider ID 已存在于当前配置中，显示错误提示"该 Provider ID 已存在"
- 不允许覆盖已有 Provider（需先删除或使用编辑功能）

**S2.4 baseHash 冲突处理**
- 如果在弹窗打开期间其他客户端修改了配置，`configPatch` 返回错误
- 前端展示提示"配置已被其他客户端修改，请重新加载"
- 自动触发 `configGet` 刷新数据

### R3: 编辑 Provider

- 点击 ProviderCard 的编辑按钮
- 弹出编辑弹窗，预填当前配置（apiKey 显示为密文 placeholder）
- API Key 输入框为空表示"保持不变"（不发送 apiKey 字段），填入新值表示替换
- 保存后调用 `configPatch` 写入修改的字段

#### 场景

**S3.1 修改 Base URL**
- 编辑 Anthropic Provider 的 baseUrl
- 不修改 apiKey（输入框留空）
- `configPatch` 发送 `{ models: { providers: { "anthropic": { baseUrl: "https://new-url.com" } } } }`
- Gateway merge patch 只更新 baseUrl，保留其他字段

**S3.2 替换 API Key**
- 在 API Key 输入框中填入新值
- `configPatch` 发送包含新 apiKey 的 patch
- Gateway 写入新值，重启后生效

### R4: 删除 Provider

- 点击 ProviderCard 的删除按钮
- 弹出 ConfirmDialog 确认
- 确认后调用 `configPatch` 写入 `{ models: { providers: { "<id>": null } } }`（JSON Merge Patch 中 null 表示删除）

#### 场景

**S4.1 删除 Provider 后列表更新**
- 确认删除 → 调用 configPatch → 成功
- 前端从返回的 `config.models.providers` 中移除该 Provider
- 如果删除后 providers 为空，展示 EmptyState

### R5: Provider 类型元数据 — PROVIDER_TYPE_INFO

新建 `src/lib/provider-types.ts`，定义 UI 展示用的 Provider 类型元数据：

```typescript
interface ProviderTypeMeta {
  id: string;
  name: string;
  icon: string;
  defaultBaseUrl: string;
  defaultApi: ModelApi;
  requiresApiKey: boolean;
  placeholder?: string;
}

const PROVIDER_TYPE_INFO: ProviderTypeMeta[] = [
  { id: "anthropic", name: "Anthropic", icon: "🤖", defaultBaseUrl: "https://api.anthropic.com", defaultApi: "anthropic-messages", requiresApiKey: true },
  { id: "openai", name: "OpenAI", icon: "🧠", defaultBaseUrl: "https://api.openai.com/v1", defaultApi: "openai-responses", requiresApiKey: true },
  { id: "google", name: "Google AI", icon: "🔮", defaultBaseUrl: "https://generativelanguage.googleapis.com", defaultApi: "google-generative-ai", requiresApiKey: true },
  { id: "ollama", name: "Ollama", icon: "🦙", defaultBaseUrl: "http://localhost:11434", defaultApi: "openai-completions", requiresApiKey: false },
  { id: "bedrock", name: "AWS Bedrock", icon: "☁️", defaultBaseUrl: "", defaultApi: "bedrock-converse-stream", requiresApiKey: false },
  { id: "github-copilot", name: "GitHub Copilot", icon: "🐙", defaultBaseUrl: "", defaultApi: "github-copilot", requiresApiKey: false },
  { id: "custom", name: "自定义", icon: "⚙️", defaultBaseUrl: "", defaultApi: "openai-completions", requiresApiKey: true },
];
```

**类型推断逻辑**：
1. 先按 Provider ID 精确匹配（如 `anthropic` → Anthropic）
2. 再按 `api` 字段匹配（如 `anthropic-messages` → Anthropic）
3. 再按 `baseUrl` 包含关键词匹配（如 URL 含 `anthropic.com` → Anthropic）
4. 兜底为"自定义"

### R6: Config Store — 配置读写状态管理

新建 `src/store/console-stores/config-store.ts`：

```typescript
interface ConfigStoreState {
  config: Record<string, unknown> | null;
  hash: string | null;
  loading: boolean;
  error: string | null;
  schemaHints: Record<string, ConfigUiHint> | null;
  
  fetchConfig: () => Promise<void>;
  patchConfig: (patch: Record<string, unknown>) => Promise<ConfigPatchResult>;
  fetchSchema: () => Promise<void>;
}
```

- `fetchConfig()` 调用 `adapter.configGet()`，存储 `config` + `hash`
- `patchConfig(patch)` 将 patch 序列化为 `JSON.stringify(patch)`，调用 `adapter.configPatch(raw, hash)`，成功后自动刷新 config + hash
- baseHash 冲突时设置 error 并自动重新 fetchConfig

#### 场景

**S6.1 Provider 增删改的 store 流程**
- 新增：`patchConfig({ models: { providers: { newId: { baseUrl, apiKey, api, models: [] } } } })`
- 编辑：`patchConfig({ models: { providers: { existingId: { baseUrl: newUrl } } } })`
- 删除：`patchConfig({ models: { providers: { existingId: null } } })`

**S6.2 configPatch 后自动刷新**
- `patchConfig` 成功后，从返回结果的 `config` 字段更新本地 config + 重新计算 hash
- 无需额外调用 `fetchConfig()`

## 验收标准

- [ ] Provider 列表从 `config.models.providers` 正确渲染
- [ ] 新增 Provider 通过 `config.patch` 写入配置文件
- [ ] 编辑 Provider 只发送修改的字段（不覆盖未修改字段）
- [ ] 删除 Provider 发送 `null` 值（JSON Merge Patch 删除语义）
- [ ] API Key 脱敏值正确展示为"已配置"
- [ ] baseHash 冲突时提示用户重新加载
- [ ] config.patch 成功后前端能感知到 Gateway 即将重启
- [ ] PROVIDER_TYPE_INFO 涵盖主要 Provider 类型
- [ ] Config Store 正确管理配置读写生命周期
