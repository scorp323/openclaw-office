## Context

当前 `processAgentEvent()` 在缺少明确身份时，会按 `runId` 兜底创建 agent，并在 5 秒后自动确认其为主 agent。与此同时，普通 session 的解析会优先读取 `sessionKeyMap` 的第一个映射值，这使得“错误映射被后续事件放大”的风险很高。PR #6 识别到了这个问题，但采用了“十六进制或 UUID-like 即 synthetic”的 heuristic，这对真实使用 UUID/hex 作为 agentId 的系统并不安全。

## Goals / Non-Goals

**Goals:**

- 优先把事件解析到已确认的真实 agent，而不是新的临时对象。
- 避免把纯 run/session 标识误升级为持久主 agent。
- 为临时实体设置更安全的回收策略，减少 ghost agent。
- 用测试锁定解析优先级和误判边界。

**Non-Goals:**

- 不引入品牌命名映射或任何本地化文案调整。
- 不改变 FloorPlan 或聊天 UI 外观。
- 不依赖脆弱的正则 heuristic 判定真实 agent 身份。

## Decisions

### 1. 使用“强证据优先”的身份解析顺序

事件解析 SHALL 依次优先考虑：显式 payload 中的 agent 身份、已有的 `runId` 绑定、明确的 sub-agent session 结构、已确认主 agent 的 session 映射、最后才是受限的临时实体创建。  
原因：这能让解析逻辑更可解释，也能降低错误映射在后续事件中被放大的概率。

备选方案：

- 保持当前“先看 map，不行就用 runId”：简单，但 ghost agent 风险持续存在。
- 用宽泛 regex 判 synthetic：短期见效，但会误删真实 agent。

### 2. 不再依赖纯超时自动确认未知主 agent

未知实体只有在获得额外身份证据时才 SHOULD 被升级为主 agent；否则它们应保持临时状态并在 TTL 后回收。  
原因：时间流逝不是身份真伪的证据。

备选方案：

- 保留当前 5 秒确认：实现最简单，但会把噪声变成持久状态。
- 立刻丢弃所有未知实体：过于激进，可能会丢失真实但晚到的 agent。

### 3. 将 session 映射设计为“偏好映射”，而不是简单数组首项

普通 session 的解析 SHOULD 优先选中已确认、非 placeholder、非 sub-agent 的主 agent；若 session 仅关联 sub-agent 或临时实体，则按明确规则回退。  
原因：`sessionAgents[0]` 是插入顺序，不是可信度顺序。

### 4. 为临时实体定义可回收生命周期

临时实体需要 TTL、来源标记和可控清理条件，以便在无后续证据时被安全移除，而不污染主 agent 列表。  
原因：ghost agent 的本质是“临时解析结果被当成长期状态保存”。

### 5. 本轮不在 store 中持久化 resolution source

本 change 不额外把 resolution source 写入 store 字段，而是优先通过更清晰的辅助函数、映射清理逻辑和测试来保证可解释性。  
原因：当前问题的核心是错误确认与错误映射，不是诊断 UI 缺失；新增运行时字段会扩大状态面。

## Risks / Trade-offs

- [风险] 收紧确认规则后，某些真实但延迟到达的 agent 可能出现更晚。  
  → Mitigation: 明确允许短暂“未确认”窗口，并依赖后续 `agents.list`/session 证据完成归并。

- [风险] 解析优先级调整可能影响现有 mock 流程。  
  → Mitigation: 为 mock adapter 与真实 sessionKey 模式分别补测试。

- [风险] 增加来源标记和 TTL 逻辑会提升 store 复杂度。  
  → Mitigation: 将解析决策聚焦到少数纯函数或辅助函数，避免散落到多分支里。

## Migration Plan

1. 先抽出身份解析优先级与偏好选择规则。
2. 再替换“纯超时自动确认”的逻辑，引入临时实体的安全回收。
3. 最后补足 office store 的回归测试，覆盖主 agent、sub-agent、ghost agent 和过期路径。
4. 如出现兼容性问题，可先保留旧映射结构，仅回滚新的确认与回收策略。

## Open Questions

- 现网 Gateway 是否存在“真实主 agent 先发事件、后进 `agents.list`”的稳定模式；如果存在，需要确认最大延迟窗口。
