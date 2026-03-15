## Why

OpenClaw 已支持基于 Lobster 的 Workflow 自动化执行（`extensions/lobster`），用户可在 `~/.openclaw/workflows/` 存放 `.lobster` 工作流文件。但目前 OpenClaw Office 没有任何 Workflow 管理界面——用户只能通过 CLI 或让 Agent 调用 lobster 工具来使用工作流，缺乏直观的可视化展示和编排能力。

在 Console 中增加 Workflow 管理页面，可以让用户：
1. 一目了然地查看已有的工作流列表及基本信息（名称、描述、步骤数量等）
2. 点击任意工作流展开为可视化的流程图，清晰展示各步骤之间的数据流和条件依赖
3. 通过拖拽式编辑器对工作流进行编排——添加/删除/重排步骤、编辑步骤属性、修改数据流向——然后保存回 `.lobster` 文件

## What Changes

- **新增 Console 侧边栏菜单项**：在现有菜单（Dashboard/Agents/Channels/Skills/Cron/Settings）中增加 "Workflows" 入口
- **新增 `/workflows` 路由和页面**：遵循现有 Console 页面模式（PageHeader + LoadingState/ErrorState/EmptyState）
- **新增 Workflow 列表视图**：卡片形式展示所有 `.lobster` 工作流文件，显示名称、描述、步骤数、参数等元信息
- **新增 Workflow 流程图可视化**：使用 `@xyflow/react`（React Flow v12）将 Lobster 步骤渲染为节点-边图，展示数据流（`stdin`）和条件分支（`condition`/`when`）
- **新增 Workflow 可视化编辑器**：支持拖拽添加/移动节点、编辑步骤属性（command/stdin/approval/condition 等）、连接/断开数据流边、保存回 YAML
- **新增本地 Node API 服务**：在项目后端（`bin/openclaw-office-server.js` + Vite dev middleware）新增 `/__openclaw/workflows/*` REST API，直接读写 `~/.openclaw/workflows/` 目录下的 `.lobster` 文件，**不修改 OpenClaw Gateway**
- **新增 `@xyflow/react` 依赖**
- **新增 i18n 翻译键**：`console.workflows.*`（中英文）和 `layout.consoleNav.workflows`

## Capabilities

### New Capabilities

- `workflow-local-api`: Workflow 本地文件 API——在 OpenClaw Office 后端 Node 服务和 Vite 开发服务器中新增 REST API（`/__openclaw/workflows/`），直接读写 `~/.openclaw/workflows/*.lobster` 文件，提供列表、详情获取、保存、删除功能。仅在 localhost 连接模式下启用。
- `workflow-list-view`: Workflow 列表展示——通过本地 API 加载 `.lobster` 文件列表，解析为结构化数据，以卡片形式展示工作流元信息（名称、描述、步骤数、参数列表）
- `workflow-flow-visualization`: Workflow 流程图可视化——将 Lobster 步骤映射为 React Flow 节点和边，展示顺序执行链、数据流依赖（`$step.stdout`/`$step.json`）、条件门控（`condition`/`approval`），支持缩放、平移、自动布局
- `workflow-flow-editor`: Workflow 可视化编辑器——基于 React Flow 的交互式编辑能力，支持拖拽添加新步骤、编辑步骤属性面板、连接/删除数据流边、调整步骤顺序，以及将编辑后的图形结构序列化回 `.lobster` YAML 格式并通过本地 API 保存

### Modified Capabilities

（无需修改现有 Spec）

## Impact

- **新增文件**：
  - 后端：`bin/workflows-api.js`（Workflow REST API 路由处理）
  - 前端：`src/components/pages/WorkflowsPage.tsx`、`src/components/console/workflows/` 目录下多个组件、`src/store/console-stores/workflows-store.ts`、`src/lib/lobster-parser.ts`（解析/序列化）、`src/gateway/workflows-client.ts`（HTTP API 客户端）
- **修改文件**：
  - 后端：`bin/openclaw-office-server.js`（挂载 workflows API 路由）、`vite.config.ts`（dev middleware 注入 workflows API）
  - 前端：`src/App.tsx`（路由）、`src/components/layout/ConsoleLayout.tsx`（侧边栏）、i18n JSON 文件
- **新增依赖**：`@xyflow/react`（流程图渲染与交互）、`yaml`（YAML 解析/序列化）
- **不修改的部分**：OpenClaw Gateway 代码、`GatewayAdapter` 接口（Workflow 数据通过独立的 HTTP API 客户端获取，不走 WebSocket RPC 通道）
