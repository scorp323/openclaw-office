## Context

当前实现把目标智能体和当前会话混为一体：`setTargetAgent()` 直接重置为 `agent:<id>:main`，`loadSessions()` 只拉取列表但不影响当前会话，而 `handleChatEvent()` 会接受任何入站 `chat` 载荷。与此同时，`AppShell` 的默认目标逻辑只排除了 sub-agent，没有排除 placeholder 或未确认对象，因此聊天栏可能绑定到并不稳定的 agent。

## Goals / Non-Goals

**Goals:**

- 让聊天目标只指向稳定且可交互的主智能体。
- 让聊天栏在切换目标时优先恢复最近活跃的真实会话。
- 让流式 `chat` 事件只更新当前会话，杜绝串台。
- 为这些行为补充可回归的测试用例。

**Non-Goals:**

- 不改变消息格式、RPC 方法名或 Gateway 协议。
- 不引入新的聊天 UI 模式，不重做聊天栏外观。
- 不处理 ghost agent 的解析策略；该问题由独立 change 负责。

## Decisions

### 1. 将“目标智能体有效性”显式化

聊天目标 SHALL 仅从 `confirmed && !isPlaceholder && !isSubAgent` 的 agent 中选择。  
原因：聊天是面向稳定主智能体的交互，placeholder、未确认 agent 和 sub-agent 都不适合作为默认聊天入口。

备选方案：

- 继续允许所有非 sub-agent：实现简单，但会把 placeholder 或临时 agent 暴露到聊天流。
- 仅靠 UI 侧规避：状态源仍不一致，不能解决 store 层串台风险。

### 2. 以最近活跃会话为首选，而不是固定 `main`

当用户选择主智能体时，store SHALL 根据 `sessions.list` 中同 agent 前缀的会话集合选择最近活跃的会话；若没有任何匹配会话，再回退到 `agent:<id>:main`。  
原因：真实使用场景里，一个 agent 往往对应多个会话；固定回到 `main` 会丢掉最近上下文。

备选方案：

- 永远创建新会话：会使历史体验割裂。
- 永远回退 `main`：会把用户带回错误上下文。

### 3. 入站 `chat` 事件按当前会话隔离

store SHALL 优先从 payload 或 frame 上读取 `sessionKey`，当其与 `currentSessionKey` 不一致时直接忽略该事件。  
原因：多个会话并行时，流式消息如果不隔离，会污染当前聊天面板和本地缓存。

备选方案：

- 仅依赖 `runId`：不足以表达多会话边界。
- 收到 final 后强制刷新历史：能缓解结果错乱，但流式过程仍会串台。

### 4. 默认目标同步放在“有效 agent 集合”上

`AppShell` 的默认目标同步 SHALL 基于有效主智能体集合进行；当当前目标失效时，优先回退到 `main`，否则选择第一个稳定主智能体。  
原因：这样可以让默认行为稳定，且与侧栏选择逻辑一致。

## Risks / Trade-offs

- [风险] `sessions.list` 的刷新时机不足，导致刚切换时拿不到最新会话。  
  → Mitigation: 在 `loadSessions()` 后对当前目标重新计算偏好会话，并在切换目标时触发历史初始化。

- [风险] 某些 `chat` 事件可能不带 `sessionKey`。  
  → Mitigation: 设计中保留“从 frame 提取 sessionKey”的兼容路径；若仍缺失，则允许在实现阶段评估是否保留受限兼容分支。

- [风险] 目标过滤变严后，连接初期可能短时间没有默认聊天对象。  
  → Mitigation: 明确这是可接受状态，直到至少一个稳定主智能体出现。

## Migration Plan

1. 先在 store 层引入目标过滤和会话选择逻辑。
2. 再调整 `AppShell` 的默认目标同步。
3. 最后补充聊天 store 与 AppShell 的测试，验证不会串台且会恢复最新会话。
4. 若出现回归，可回滚到当前“固定 main 会话”策略，保留其它无关改动不动。

## Open Questions

- 某些 Gateway 部署是否会发送没有 `sessionKey` 的 `chat` 事件；若会，需要定义严格兼容边界。
- 最近活跃会话是否还需要结合“是否含历史消息”进行二次排序。
