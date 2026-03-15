## Why

当前聊天栏把“目标智能体”和“活跃会话”绑定得过于粗糙：默认总是回到 `agent:<id>:main`，且入站 `chat` 事件没有严格按 `sessionKey` 隔离。这会导致历史会话打开不准确、切换智能体后上下文错位，以及多会话并行时消息串台。

## What Changes

- 收紧聊天目标选择规则，只允许稳定的主智能体成为聊天目标。
- 为已选智能体恢复最近活跃会话，而不是固定回退到 `main` 会话。
- 对入站 `chat` 事件增加会话级隔离，避免不同会话的流式消息相互污染。
- 调整连接建立和侧栏选择后的默认目标同步逻辑，确保聊天栏跟随有效目标而不是临时对象。
- 为会话选择与事件隔离补充单元测试和交互测试。

## Capabilities

### New Capabilities

- `chat-session-routing`: 定义聊天目标选择、会话恢复与流式事件隔离的行为契约。

### Modified Capabilities

- None.

## Impact

- 影响 `src/store/console-stores/chat-dock-store.ts` 的会话选择、历史初始化与事件处理逻辑。
- 影响 `src/components/layout/AppShell.tsx` 的默认目标同步逻辑。
- 影响聊天栏、侧栏与会话历史相关测试。
- 不涉及品牌、语言、部署方式或 Office 视觉风格变更。
