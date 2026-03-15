## Context

OpenClaw Office 已有完整的 chat 基础设施：`WsAdapter` 提供 `chatSend`/`chatHistory`/`chatAbort` RPC，`chat-dock-store` 管理 session 状态和流式消息，`ChatDialog` 组件展示对话。Gateway 的 session 是按 `sessionKey` 自动创建的，首次 `chat.send` 即可创建新 session。

Workflow 编辑页已实现 undo/redo 栈、YAML 序列化/反序列化、和 `workflows-client` 的 save/fetch API。将 AI 编辑与现有基础设施集成的关键在于：如何将 Workflow YAML 作为 session 上下文传入，以及如何检测 Agent 的编辑结果并触发画布刷新。

## Goals / Non-Goals

**Goals:**
- 用户可以通过自然语言指令编辑当前 Workflow
- AI 编辑后画布自动刷新，无需用户手动操作
- 编辑历史可追溯（对话记录 + undo 快照）
- 支持流式展示 Agent 的思考和回复过程

**Non-Goals:**
- 不实现 Workflow 的自动生成（从零创建），仅支持对现有 Workflow 的修改
- 不实现多轮对话上下文管理（Agent 可自然支持，但前端不做特殊处理）
- 不实现实时协作编辑（多人同时编辑同一 Workflow）
- 不替代现有的手动编辑界面，AI 编辑是补充能力

## Decisions

### D1: Session 命名和上下文注入策略

**决定**：每个 Workflow 使用专用 session key 格式 `agent:{agentId}:workflow-edit:{workflowName}`。发送编辑指令时，将当前 Workflow YAML 作为消息前缀注入：

```
[Workflow Context]
```yaml
{当前 workflow YAML}
```

[User Request]
{用户的编辑指令}
```

**备选方案**：
- A) 使用 `deliver` 参数传递 YAML → Gateway 的 `deliver` 语义不适合传递文件上下文
- B) 每次发消息都创建新 session → 丢失对话历史，无法进行多轮编辑讨论

**理由**：直接在消息体中嵌入 YAML 是最简单且可靠的方式，Agent 可以直接看到完整上下文。复用同一 session 保留多轮对话能力。

### D2: 编辑结果检测与刷新

**决定**：采用轮询检测方案——当 AI 回复状态为 `final` 时，前端调用 `workflows-client.get(workflowName)` 重新拉取 Workflow 内容，与当前本地内容做 diff：
1. 若内容不同，说明 Agent 已修改，自动刷新画布（重新解析 YAML → 生成节点/边 → 更新 React Flow 状态）
2. 若内容相同，说明 Agent 只是回复了说明文字（如 "这个工作流看起来已经很好了"），不触发刷新

同时在 AI 回复中检测是否包含 YAML 代码块（```yaml），如有则提示用户 "Agent 建议了修改，正在应用..."。

**备选方案**：
- A) 让 Agent 通过 tool call 调用 save API → 需要 Gateway 暴露 workflow 编辑 tool，目前不支持
- B) WebSocket 事件推送 → Gateway 没有 workflow 文件变更事件
- C) 文件系统 watch → Web 前端无法直接 watch 服务端文件

**理由**：轮询是最可靠的方案，且 Workflow 文件通常很小（几 KB），GET 请求开销可忽略。`final` 事件驱动的单次拉取不会造成服务器压力。

### D3: UI 布局

**决定**：在 Workflow 编辑页右侧（StepDetailPanel 下方或以 Tab 形式切换）增加 AI 编辑面板。面板可通过按钮展开/收起。布局：
- 面板顶部：标题 + 关闭按钮
- 中间：对话消息列表（AI 回复用 Markdown 渲染，支持流式展示）
- 底部：输入框 + 发送按钮 + abort 按钮

**备选方案**：
- A) 弹出 Modal 对话框 → 遮挡画布，无法同时查看 Workflow 和对话
- B) 底部浮动 chat bar（复用现有 ChatDock）→ 与全局 chat 混淆，且布局位置不适合 Workflow 编辑场景

**理由**：侧边面板既不遮挡画布，又能保持上下文可见性。用户可以一边看画布变化，一边与 AI 对话。

### D4: Undo 集成

**决定**：每次 AI 编辑成功刷新画布前，自动将当前状态推入 undo 栈。用户可通过现有的 undo 按钮回退 AI 的修改。

**理由**：复用现有 undo/redo 机制，零额外开发成本，且行为一致。

## Risks / Trade-offs

- **[Agent 可能无法直接编辑 Workflow 文件]** → 这取决于 Gateway 中 Agent 是否有文件编辑 tool。如果 Agent 只能给建议而不能直接存盘，需要前端从 AI 回复中提取 YAML 并代替存盘。设计中增加 "手动应用" 兜底路径。
- **[YAML 上下文超出 token 限制]** → 大型 Workflow（100+ 步骤）的 YAML 可能很长。对超过阈值的 YAML，只传入步骤摘要而非完整内容。
- **[编辑结果覆盖用户未保存的修改]** → AI 拉取的是服务端最新版本，如果用户有未保存的本地修改会被覆盖。在刷新前检查 `dirty` 标记，如有未保存修改则提示用户确认。
- **[对话延迟]** → Agent 响应可能需要几秒到几十秒。流式展示缓解等待焦虑，同时提供 abort 按钮。
