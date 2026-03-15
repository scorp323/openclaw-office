## Context

OpenClaw Office 是 OpenClaw 多智能体系统的可视化管理前端。项目有两层服务端：
1. **开发模式**：Vite dev server + 自定义 middleware 插件（`vite.config.ts` 中的 `openclaw-dev-connection`）
2. **生产模式**：`bin/openclaw-office-server.js` 独立 Node HTTP 服务器

两层都已有 `/__openclaw/connection` REST API 端点的先例。Workflow 文件读写 API 将沿用这一模式。

OpenClaw 通过 `extensions/lobster` 插件支持 Lobster Workflow 执行。Lobster 工作流文件（`.lobster`）为 YAML 格式，定义顺序执行的步骤链，每个步骤可执行 shell 命令或调用 OpenClaw 工具（`openclaw.invoke`），步骤间通过 `$step_id.stdout`/`$step_id.json` 传递数据，通过 `condition`/`when` 和 `approval` 进行条件门控。

Gateway 没有也无需 Workflow 文件管理的 RPC 方法——本方案完全在 Office 层面解决文件读写。

## Goals / Non-Goals

**Goals:**
- 在 Office 后端新增 REST API，直接读写 `~/.openclaw/workflows/` 目录下的 `.lobster` 文件
- 在 Console 中新增完整的 Workflow 管理页面，与现有模块风格一致
- 实现工作流列表展示，包含元信息（名称、描述、步骤数、参数）
- 实现基于 `@xyflow/react` 的流程图可视化，准确展示步骤顺序、数据流依赖和条件门控
- 实现可视化编辑器，支持拖拽添加/移动步骤、编辑步骤属性、管理数据流连线
- 实现编辑后的图结构到 `.lobster` YAML 的双向序列化/反序列化
- 通过 REST API 实现真实的文件保存，不依赖 mock 数据
- 支持中英文国际化

**Non-Goals:**
- 不实现 Lobster Workflow 的执行/运行功能（仅展示和编排）
- 不实现 Workflow 运行历史/日志查看
- 不修改 OpenClaw Gateway 代码
- 不支持 Lobster 内联管道 DSL 的编辑（仅支持 YAML 工作流文件格式）
- 不实现工作流模板市场或分享功能

## Decisions

### 1. 数据获取策略：本地 Node REST API（非 Gateway RPC）

**选择理由：**
- Gateway 当前无 Workflow RPC，且不希望修改 Gateway 代码
- Office 已有 Node 后端服务（生产 + 开发两套），已有 `/__openclaw/*` API 端点先例
- 工作流文件就在本地 `~/.openclaw/workflows/`，Node.js `fs` 直接读写最简单可靠
- 当 Office 部署在与 Gateway 同一台机器上时（localhost 连接模式），可直接访问文件系统

**API 设计：**

| 方法 | 路径 | 功能 |
|------|------|------|
| `GET` | `/__openclaw/workflows` | 列出所有 `.lobster` 文件（含解析后的元信息） |
| `GET` | `/__openclaw/workflows/:name` | 获取单个工作流详情（完整 YAML 内容 + 解析结构） |
| `PUT` | `/__openclaw/workflows/:name` | 保存/创建工作流（请求体为 YAML 字符串） |
| `DELETE` | `/__openclaw/workflows/:name` | 删除工作流文件 |

**工作流目录**：`~/.openclaw/workflows/`（与 OpenClaw CLI 一致），目录不存在时自动创建。

**两层实现：**
- 生产模式：`bin/workflows-api.js` 模块导出路由处理函数，在 `openclaw-office-server.js` 的 HTTP handler 中挂载
- 开发模式：`vite.config.ts` 的 `configureServer` 中添加 middleware，复用同一逻辑（开发时用 TypeScript/ESM 直接导入或内联实现）

**替代方案：**
- 通过 Gateway 转发文件操作：需修改 Gateway，违反约束
- 前端直接调用 File System Access API：仅 Chromium 支持，兼容性差
- 通过 WebSocket 发送文件操作命令：过度设计，REST 更适合 CRUD

### 2. 前端数据层：独立 HTTP 客户端（不走 GatewayAdapter）

**选择理由：**
- Workflow API 是 Office 自身的文件操作 API，与 Gateway WebSocket RPC 通道无关
- 不应污染 `GatewayAdapter` 接口——该接口专注于 Gateway 协议
- 使用独立的 `src/gateway/workflows-client.ts` HTTP 客户端，基于 `fetch` API

**客户端接口：**
```typescript
export const workflowsApi = {
  list(): Promise<WorkflowSummary[]>;
  get(name: string): Promise<WorkflowDetail>;
  save(name: string, content: string): Promise<void>;
  remove(name: string): Promise<void>;
};
```

### 3. 可视化库选型：`@xyflow/react`（React Flow v12）

**选择理由：**
- 3.6M 周下载量，React 生态最成熟的节点-边图库
- 原生支持自定义节点/边类型、拖拽、缩放、小地图、暗色模式
- 与 React 19 和 Tailwind CSS 兼容
- MIT 许可，无商业限制

**替代方案：**
- `elkjs` + 自绘 SVG：控制力强但开发量大，无现成交互能力
- `dagre` + D3：适合只读 DAG 但缺乏编辑交互
- `jointjs`/`mxgraph`：功能重但体积大、API 风格与 React 不匹配

### 4. Lobster 步骤到 React Flow 节点的映射策略

每个 Lobster `step` 映射为一个 React Flow 节点，节点类型根据步骤特征区分：

| 步骤特征 | 节点类型 | 视觉标识 |
|---------|---------|---------|
| 普通 `command`（shell） | `shell-step` | 终端图标 + 命令预览 |
| `openclaw.invoke` 调用 | `tool-step` | 工具图标 + 工具名称 |
| `approval: required` | `approval-step` | 盾牌图标 + 审批标记 |

边的映射：
- **顺序执行边**：相邻步骤之间的默认连线（实线箭头）
- **数据流边**：当 step B 的 `stdin` 引用 `$stepA.stdout`/`$stepA.json` 时，从 A 到 B 添加数据流边（蓝色虚线）
- **条件边**：当 step B 的 `condition` 引用 `$stepA.approved`/`$stepA.skipped` 时，从 A 到 B 添加条件边（橙色虚线 + 条件标签）

### 5. 自动布局算法

使用 `dagre`（轻量 DAG 布局库）对步骤进行自上而下的自动布局：
- 新打开工作流时自动计算初始布局
- 用户拖拽后位置保留（不自动重排）
- 提供"重新布局"按钮手动触发

### 6. 编辑器状态管理

- 使用 Zustand store（`workflows-store.ts`）管理：列表数据、选中工作流、加载状态、错误状态
- React Flow 的节点/边状态由组件内部 `useNodesState` / `useEdgesState` 管理（符合 React Flow 最佳实践）
- 步骤属性编辑面板作为右侧抽屉，选中节点时展开

### 7. YAML 解析与序列化

- 使用 `yaml` npm 包进行 `.lobster` 文件的解析和序列化
- 封装为 `src/lib/lobster-parser.ts`，提供：
  - `parseLobsterYaml(content: string): LobsterWorkflow` — 解析 YAML 为结构化对象
  - `lobsterToFlow(workflow: LobsterWorkflow): { nodes, edges }` — 转换为 React Flow 图数据
  - `flowToLobster(nodes, edges): LobsterWorkflow` — 从 React Flow 图数据反序列化为结构
  - `serializeLobsterYaml(workflow: LobsterWorkflow): string` — 序列化为 YAML 字符串

### 8. 页面结构

```
/workflows                    → WorkflowsPage（列表视图）
/workflows/:workflowName      → WorkflowDetailPage（流程图 + 编辑器）
```

列表视图使用卡片布局，每个卡片显示：工作流名称、描述、步骤数量、参数列表摘要。
点击卡片进入详情页，展示全屏流程图编辑器。

## Risks / Trade-offs

- **[文件系统直读写安全性]** → API 路径硬编码为 `~/.openclaw/workflows/`，文件名需做合法性校验（仅允许 `.lobster` 扩展名，禁止路径穿越如 `../`）。生产模式下此 API 仅在 localhost 可达（Office server 默认绑定 `0.0.0.0`，但 workflows 目录在部署机器本地）。
- **[开发/生产两套 API 实现]** → 核心逻辑抽取为共享模块 `bin/workflows-api.js`，开发模式下 Vite middleware 直接调用相同逻辑，避免代码重复。注意 Vite config 用 TypeScript 但 bin/ 用 JS（ESM），可通过动态 import 共享。
- **[`@xyflow/react` 包体积]** → React Flow v12 约 80KB gzipped，相对可控。首次加载流程图页面时懒加载（`React.lazy`）减少初始包大小。
- **[YAML 格式兼容性]** → `.lobster` 文件格式可能随 Lobster CLI 版本演进。解析器需做好容错处理，对未知字段保留（passthrough）而非丢弃。
- **[编辑冲突]** → 用户可能同时在 CLI 和 UI 编辑同一文件。暂不加锁机制，保存时以最后写入为准。

## Open Questions

- `~/.openclaw/workflows/` 目录下是否可能有子目录结构？当前方案仅扫描根目录下的 `.lobster` 文件。
- 是否需要支持 `.lobster` 文件中的 JSON 格式（当前仅处理 YAML）？
