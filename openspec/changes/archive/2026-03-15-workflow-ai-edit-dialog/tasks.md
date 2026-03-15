## 1. AI 编辑 Store 和 Session 管理

- [ ] 1.1 创建 `src/store/console-stores/workflow-ai-store.ts`：管理 AI 编辑面板状态（开关、当前 session key、消息列表、流式状态、activeRunId）
- [ ] 1.2 实现 session key 生成逻辑：`agent:{agentId}:workflow-edit:{workflowName}`
- [ ] 1.3 实现 `loadHistory()` — 面板打开时加载指定 session 的历史消息
- [ ] 1.4 实现 `sendEditRequest(userText, workflowYaml)` — 构造上下文注入消息并调用 `adapter.chatSend`
- [ ] 1.5 实现 `handleChatEvent(payload)` — 处理 chat 事件（delta/final/error/aborted），过滤 sessionKey 匹配
- [ ] 1.6 实现 `abortEdit()` — 调用 `adapter.chatAbort`

## 2. Workflow 变更检测与刷新

- [ ] 2.1 实现 `detectAndRefresh(workflowName, localYaml)` — Agent 回复 `final` 后拉取最新 YAML，与本地对比
- [ ] 2.2 实现 dirty 状态冲突处理：当有未保存修改时弹出确认对话框
- [ ] 2.3 实现刷新前的 undo 快照推入：复用 `WorkflowDetailPage` 的 undo 栈
- [ ] 2.4 实现画布刷新：用新 YAML 重新执行 `parseLobsterYaml` → `lobsterToFlow` → `applyDagreLayout` → 更新 React Flow 状态

## 3. 手动应用兜底

- [ ] 3.1 实现 YAML 代码块提取：从 Agent 回复的 Markdown 中识别最后一个 ` ```yaml ` 代码块
- [ ] 3.2 实现 "应用此修改" 按钮逻辑：将提取的 YAML 通过 `workflows-client.save` 写入并触发画布刷新
- [ ] 3.3 大型 Workflow 上下文截断处理：超过 10000 字符时生成步骤摘要

## 4. AI 编辑面板 UI 组件

- [ ] 4.1 创建 `src/components/console/workflows/WorkflowAiEditPanel.tsx` — 面板主组件：消息列表 + 流式展示 + 输入框
- [ ] 4.2 实现消息列表渲染：用户消息（右对齐）+ AI 回复（左对齐，Markdown 渲染）
- [ ] 4.3 实现流式回复展示：delta 事件实时更新 + 流式指示动画
- [ ] 4.4 实现输入框 + 发送按钮 + abort 按钮
- [ ] 4.5 实现 "应用此修改" 内联按钮（AI 回复中包含 YAML 代码块时显示）

## 5. 集成到 WorkflowDetailPage

- [ ] 5.1 在 `WorkflowDetailPage` 顶部工具栏增加 "AI 编辑" 按钮（Sparkles 图标）
- [ ] 5.2 实现右侧面板的 tab 切换：步骤详情 / AI 编辑
- [ ] 5.3 注册 AI 编辑面板的 chat 事件监听器（组件挂载时绑定、卸载时解绑）
- [ ] 5.4 实现 Workflow 切换时的 session 重置和历史加载
- [ ] 5.5 集成 undo 快照到 AI 刷新流程

## 6. 国际化 + 收尾

- [ ] 6.1 更新 `src/i18n/locales/en/console.json` 和 `src/i18n/locales/zh/console.json`：增加 AI 编辑相关文案（按钮、提示、确认对话框等）
- [ ] 6.2 测试完整流程：打开面板 → 发送编辑指令 → 流式展示 → 检测变更 → 画布刷新 → undo 回退
