## Why

当前 Workflow 编辑完全依赖手动操作：用户需要理解 Lobster 命令语法，手动拖拽节点、填写参数、连接边。对于复杂工作流（10+ 步骤），这个过程既低效又容易出错。

通过增加 AI 辅助编辑对话框，用户可以用自然语言描述需求（如 "在第 3 步和第 4 步之间加一个 LLM 摘要步骤"、"把审批步骤改成必须审批"、"整个工作流加上错误处理"），由 Agent 自动修改 Workflow YAML 文件。本质上是创建一个专用 chat session，将当前 Workflow 文件作为上下文固定传入，Agent 修改后存盘，前端立即刷新渲染，形成「自然语言编辑 → 即时可视化反馈」的闭环。

## What Changes

- **AI 编辑对话框组件**：在 Workflow 编辑页增加一个可展开/收起的 AI 对话面板，支持用户输入自然语言编辑指令
- **专用 session 管理**：为每个 Workflow 创建/复用一个专用的 chat session（`agent:main:workflow-edit:{workflowName}`），在 chat.send 时自动附带当前 Workflow YAML 内容作为上下文
- **编辑后自动刷新**：Agent 的编辑结果写入 Workflow 文件后，前端通过轮询或事件监听自动刷新画布，确保用户即时看到变化
- **编辑历史回溯**：对话框展示 AI 编辑的历史记录，每次编辑前自动记录 undo 快照

## Capabilities

### New Capabilities
- `workflow-ai-edit-session`: Workflow AI 编辑的 session 管理、上下文注入、编辑结果检测与画布刷新机制

### Modified Capabilities

## Impact

- **组件层**：新增 `WorkflowAiEditPanel.tsx`；修改 `WorkflowDetailPage.tsx` 集成 AI 面板
- **Store 层**：可能新增 `workflow-ai-store.ts`，或在 `workflows-store.ts` 中扩展
- **Gateway 层**：复用现有 chat.send / chat.history RPC，不需要新的后端接口
- **国际化**：增加 AI 编辑相关的文案
- **依赖**：无需新增外部依赖
