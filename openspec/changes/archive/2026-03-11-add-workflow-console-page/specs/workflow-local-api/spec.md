## ADDED Requirements

### Requirement: Workflow REST API 端点

OpenClaw Office 后端 SHALL 在 `/__openclaw/workflows` 路径下提供 REST API，支持对 `~/.openclaw/workflows/` 目录中 `.lobster` 文件的 CRUD 操作。

| 方法 | 路径 | 功能 | 请求体 | 响应体 |
|------|------|------|--------|--------|
| `GET` | `/__openclaw/workflows` | 列出所有工作流 | — | `WorkflowSummary[]` JSON |
| `GET` | `/__openclaw/workflows/:name` | 获取单个工作流 | — | `WorkflowDetail` JSON |
| `PUT` | `/__openclaw/workflows/:name` | 创建/更新工作流 | YAML 字符串 (`text/yaml`) | `{ ok: true }` |
| `DELETE` | `/__openclaw/workflows/:name` | 删除工作流 | — | `{ ok: true }` |

`:name` 参数为不含 `.lobster` 扩展名的工作流名称。

#### Scenario: 列出工作流

- **WHEN** 前端发送 `GET /__openclaw/workflows`
- **THEN** 后端扫描 `~/.openclaw/workflows/` 目录
- **THEN** 对每个 `.lobster` 文件解析 YAML 头部，提取 `name`、`description`、步骤数、参数列表
- **THEN** 返回 HTTP 200，响应体为 `WorkflowSummary[]` JSON 数组

#### Scenario: 获取单个工作流

- **WHEN** 前端发送 `GET /__openclaw/workflows/simple-test`
- **THEN** 后端读取 `~/.openclaw/workflows/simple-test.lobster` 文件
- **THEN** 返回 HTTP 200，响应体包含 `rawContent`（原始 YAML）和解析后的完整工作流结构

#### Scenario: 工作流不存在

- **WHEN** 前端发送 `GET /__openclaw/workflows/nonexistent`
- **THEN** 后端返回 HTTP 404，`{ error: "Workflow not found" }`

#### Scenario: 保存工作流

- **WHEN** 前端发送 `PUT /__openclaw/workflows/my-pipeline`，请求体为 YAML 字符串
- **THEN** 后端将内容写入 `~/.openclaw/workflows/my-pipeline.lobster`
- **THEN** 返回 HTTP 200，`{ ok: true }`

#### Scenario: 删除工作流

- **WHEN** 前端发送 `DELETE /__openclaw/workflows/simple-test`
- **THEN** 后端删除 `~/.openclaw/workflows/simple-test.lobster` 文件
- **THEN** 返回 HTTP 200，`{ ok: true }`

### Requirement: 工作流目录自动创建

当 `~/.openclaw/workflows/` 目录不存在时，API SHALL 在首次写入操作时自动创建该目录（`mkdirSync` with `recursive: true`）。列出操作在目录不存在时 SHALL 返回空数组（不报错）。

#### Scenario: 目录不存在时列出

- **WHEN** `~/.openclaw/workflows/` 目录不存在
- **WHEN** 前端发送 `GET /__openclaw/workflows`
- **THEN** 返回 HTTP 200，空数组 `[]`

#### Scenario: 目录不存在时保存

- **WHEN** `~/.openclaw/workflows/` 目录不存在
- **WHEN** 前端发送 `PUT /__openclaw/workflows/my-first`
- **THEN** 后端自动创建目录并写入文件
- **THEN** 返回 HTTP 200，`{ ok: true }`

### Requirement: 文件名安全校验

API SHALL 对 `:name` 参数进行安全校验：
- 仅允许字母、数字、连字符（`-`）和下划线（`_`）
- 禁止路径穿越字符（`..`、`/`、`\`）
- 名称长度 SHALL 在 1~128 字符之间

不合法的名称 SHALL 返回 HTTP 400，`{ error: "Invalid workflow name" }`。

#### Scenario: 路径穿越攻击

- **WHEN** 前端发送 `GET /__openclaw/workflows/../../etc/passwd`
- **THEN** 后端返回 HTTP 400，`{ error: "Invalid workflow name" }`

#### Scenario: 合法名称

- **WHEN** 前端发送 `GET /__openclaw/workflows/logseq-memory-ingest`
- **THEN** 名称校验通过，正常处理请求

### Requirement: 生产模式 API 挂载

`bin/openclaw-office-server.js` 的 HTTP handler SHALL 在处理静态文件之前匹配 `/__openclaw/workflows` 路径前缀，并委托给 `bin/workflows-api.js` 中的路由处理函数。

#### Scenario: 生产模式下访问 API

- **WHEN** OpenClaw Office 以生产模式运行（`node bin/openclaw-office.js`）
- **WHEN** 浏览器发送 `GET /__openclaw/workflows`
- **THEN** 后端返回工作流列表 JSON

### Requirement: 开发模式 API 挂载

`vite.config.ts` 的 `configureServer` 插件 SHALL 添加 middleware 处理 `/__openclaw/workflows` 路径前缀，实现与生产模式相同的 API 行为。

#### Scenario: 开发模式下访问 API

- **WHEN** OpenClaw Office 以开发模式运行（`pnpm dev`）
- **WHEN** 浏览器发送 `GET /__openclaw/workflows`
- **THEN** Vite dev server 通过 middleware 返回工作流列表 JSON

### Requirement: 前端 HTTP 客户端

系统 SHALL 提供 `src/gateway/workflows-client.ts` 模块，封装对 `/__openclaw/workflows` API 的 HTTP 调用。该客户端 SHALL 独立于 `GatewayAdapter` 接口（不走 WebSocket RPC 通道）。

接口定义：
```typescript
export const workflowsApi = {
  list(): Promise<WorkflowSummary[]>;
  get(name: string): Promise<WorkflowDetail>;
  save(name: string, content: string): Promise<void>;
  remove(name: string): Promise<void>;
};
```

#### Scenario: 前端调用列表 API

- **WHEN** Zustand store 调用 `workflowsApi.list()`
- **THEN** 客户端发送 `GET /__openclaw/workflows` 请求
- **THEN** 解析 JSON 响应为 `WorkflowSummary[]` 返回

#### Scenario: 前端保存工作流

- **WHEN** 编辑器调用 `workflowsApi.save("my-pipeline", yamlContent)`
- **THEN** 客户端发送 `PUT /__openclaw/workflows/my-pipeline`，Content-Type 为 `text/yaml`，请求体为 YAML 字符串

### Requirement: WorkflowSummary 和 WorkflowDetail 数据类型

`WorkflowSummary` SHALL 包含：
- `name: string` — 工作流名称（文件名去掉 `.lobster`）
- `displayName: string | null` — YAML 中的 `name` 字段（可能为 null）
- `description: string | null` — YAML 中的 `description` 字段
- `stepsCount: number` — 步骤数量
- `args: string[]` — 参数名称列表
- `fileName: string` — 完整文件名（如 `simple-test.lobster`）

`WorkflowDetail` SHALL 在 `WorkflowSummary` 基础上新增：
- `rawContent: string` — 原始 YAML 文本
- `steps: LobsterStep[]` — 完整的步骤列表
- `env: Record<string, string> | null` — 工作流级环境变量
- `cwd: string | null` — 工作流级工作目录

#### Scenario: 列表响应数据结构

- **WHEN** `~/.openclaw/workflows/` 下有 `simple-test.lobster` 文件，内容为 `name: simple-test\ndescription: A test\nsteps:\n  - id: s1\n    command: echo hi\n  - id: s2\n    command: date`
- **THEN** 列表 API 响应中包含 `{ name: "simple-test", displayName: "simple-test", description: "A test", stepsCount: 2, args: [], fileName: "simple-test.lobster" }`
