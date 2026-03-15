## 1. 基础设施：依赖安装与类型定义

- [x] 1.1 安装 `@xyflow/react` 和 `yaml` npm 依赖（`@xyflow/react` 到 dependencies，`yaml` 到 dependencies）
- [x] 1.2 定义 Lobster 工作流 TypeScript 类型（`LobsterWorkflow`、`LobsterStep`、`WorkflowSummary`、`WorkflowDetail`）到 `src/lib/lobster-types.ts`
- [x] 1.3 在 `src/gateway/types.ts` 中为 `PageId` 联合类型添加 `"workflows"` 成员

## 2. 后端：Workflow 本地文件 REST API

- [x] 2.1 创建 `bin/workflows-api.js`：实现工作流文件 CRUD 路由处理函数（list/get/save/delete），包含 YAML 解析提取元信息、文件名安全校验、目录自动创建
- [x] 2.2 在 `bin/openclaw-office-server.js` 的 HTTP handler 中挂载 `/__openclaw/workflows` 路由（在静态文件处理之前）
- [x] 2.3 在 `vite.config.ts` 中添加独立的 `openclaw-workflows-api` Vite 插件，实现 `/__openclaw/workflows` middleware（开发模式），通过动态 import 复用 `bin/workflows-api.js`。同时删除了冗余的 `vite.config.js`（Vite 原生支持 .ts 配置）
- [x] 2.4 为后端 API 编写手动验证测试：使用 curl 测试 list/get/save/delete 各端点，全部通过

## 3. 前端：Workflow HTTP 客户端

- [x] 3.1 创建 `src/gateway/workflows-client.ts`：封装 `fetch` 调用，提供 `workflowsApi.list()`、`.get(name)`、`.save(name, content)`、`.remove(name)` 方法
- [x] 3.2 处理错误情况：HTTP 404 → 工作流不存在、HTTP 400 → 名称非法、网络错误 → 抛出友好错误信息

## 4. Lobster 解析器：`src/lib/lobster-parser.ts`

- [x] 4.1 实现 `parseLobsterYaml(content: string): LobsterWorkflow` — YAML 解析，未知字段 passthrough
- [x] 4.2 实现 `lobsterToFlow(workflow: LobsterWorkflow): { nodes: Node[], edges: Edge[] }` — 步骤→节点映射（shell-step/tool-step/approval-step）、顺序边 + 数据流边 + 条件边生成
- [x] 4.3 实现 `flowToLobster(nodes, edges, metadata): LobsterWorkflow` — 按 y 坐标排序节点→步骤数组，边→stdin/condition 反序列化
- [x] 4.4 实现 `serializeLobsterYaml(workflow: LobsterWorkflow): string` — 工作流对象序列化为 YAML
- [x] 4.5 为解析器编写单元测试（16 个测试用例全部通过，覆盖解析/转换/序列化往返）

## 5. 路由与导航

- [x] 5.1 在 `ConsoleLayout.tsx` 的 `sidebarNavItems` 中添加 Workflows 菜单项（Lucide `Workflow` 图标，路径 `/workflows`）
- [x] 5.2 在 `App.tsx` 中注册 `/workflows` 和 `/workflows/:workflowName` 路由（使用 `React.lazy` 懒加载）
- [x] 5.3 在 `PAGE_MAP` 中添加 `"/workflows": "workflows"` 映射

## 6. i18n 国际化

- [x] 6.1 在 `locales/en/layout.json` 和 `locales/zh/layout.json` 中添加 `consoleNav.workflows` 翻译键（已存在）
- [x] 6.2 在 `locales/en/console.json` 和 `locales/zh/console.json` 中添加 `workflows.*` 翻译键（标题、描述、按钮文案、空状态、错误状态、步骤类型名称、保存提示等）

## 7. Zustand Store：`src/store/console-stores/workflows-store.ts`

- [x] 7.1 创建 workflows-store，包含状态：`workflows`（列表）、`selectedWorkflow`（详情）、`isLoading`、`error`
- [x] 7.2 实现 `fetchWorkflows()` 动作 — 调用 `workflowsApi.list()`
- [x] 7.3 实现 `fetchWorkflowDetail(name)` 动作 — 调用 `workflowsApi.get(name)`
- [x] 7.4 实现 `saveWorkflow(name, content)` 动作 — 调用 `workflowsApi.save(name, content)`
- [x] 7.5 实现 `deleteWorkflow(name)` 动作 — 调用 `workflowsApi.remove(name)`

## 8. 列表页面：`WorkflowsPage`

- [x] 8.1 创建 `src/components/pages/WorkflowsPage.tsx`，遵循现有 Console 页面模式（PageHeader + Loading/Error/Empty 状态）
- [x] 8.2 创建 `src/components/console/workflows/WorkflowCard.tsx` — 卡片组件展示工作流名称、描述、步骤数、参数标签
- [x] 8.3 实现点击卡片导航至 `/workflows/:workflowName`
- [x] 8.4 实现"新建工作流"按钮，点击后导航至 `/workflows/_new`
- [x] 8.5 实现 PageHeader 刷新按钮功能

## 9. 流程图可视化组件

- [x] 9.1 创建 `src/components/console/workflows/WorkflowDetailPage.tsx` — 详情页面容器，加载工作流数据并传递给画布
- [x] 9.2 创建自定义节点组件（`ShellStepNode`、`ToolStepNode`、`ApprovalStepNode`），统一在 `flow-nodes.tsx` 中，包含图标、ID、命令预览
- [x] 9.3 自定义边通过 React Flow 内置的 animated 和 style 属性实现（蓝色数据流边 + 橙色条件边），无需独立边组件
- [x] 9.4 创建 `WorkflowFlowCanvas.tsx` — React Flow 画布容器，集成 MiniMap、Controls、Background、ReactFlowProvider
- [x] 9.5 实现 dagre 自动布局逻辑（`src/lib/workflow-layout.ts`），提供 `applyDagreLayout(nodes, edges)` 函数
- [x] 9.6 实现"重新布局"按钮功能

## 10. 步骤属性面板

- [x] 10.1 创建 `src/components/console/workflows/StepDetailPanel.tsx` — 只读模式的步骤详情展示
- [x] 10.2 扩展为可编辑模式：command 多行编辑器、stdin 输入、approval 开关、condition 输入、env 键值对展示、cwd 展示
- [x] 10.3 实现步骤 ID 修改后自动更新所有引用的 stdin/condition 表达式及相关边

## 11. 拖拽编辑功能

- [x] 11.1 创建 `src/components/console/workflows/StepPalette.tsx` — 步骤工具栏（shell/tool/approval 模板）
- [x] 11.2 实现拖拽到画布创建新节点（React Flow `onDrop` + `onDragOver`），自动生成唯一步骤 ID
- [x] 11.3 实现从节点锚点拖拽创建数据流边（通过 React Flow `onConnect` 回调）
- [x] 11.4 实现 Delete/Backspace 键删除选中节点/边，联动清理关联边

## 12. 保存与序列化

- [x] 12.1 实现保存按钮，调用 `flowToLobster` + `serializeLobsterYaml` + `workflowsApi.save()`
- [x] 12.2 实现 Ctrl/Cmd+S 快捷键保存
- [x] 12.3 实现未保存变更检测（dirty 标记）和离开页面确认对话框（beforeunload）
- [x] 12.4 实现保存成功/失败的 toast 提示

## 13. 工作流元信息编辑

- [x] 13.1 在详情页顶部创建工作流元信息编辑区域（name、description 输入框）
- [x] 13.2 实现新建工作流模式（`/workflows/_new`），空编辑器 + 首次保存生成文件名

## 14. 集成测试与收尾

- [x] 14.1 为 lobster-parser 编写完整单元测试（16 个测试用例全部通过）
- [x] 14.2 TypeScript 类型检查通过（`tsc --noEmit` 零错误）
- [x] 14.3 端到端手动验证：dev 模式下 API 全端点验证通过（list/get/save/delete），确认文件真实写入 `~/.openclaw/workflows/`
- [x] 14.4 暗色模式：所有组件使用 `dark:` Tailwind 前缀，确保暗色模式样式覆盖
- [x] 14.5 中英文翻译键已在 `en/console.json` 和 `zh/console.json` 中完整添加
