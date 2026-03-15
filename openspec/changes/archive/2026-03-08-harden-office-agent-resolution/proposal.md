## Why

当前 Office 运行时对未知 agent 的解析与确认过于激进：事件可能先按 `runId` 生成临时 agent，随后在缺乏足够身份证据时被自动确认成主 agent。这会制造 ghost agent、错误的 session 映射，以及后续聊天和指标归属错位。

## What Changes

- 重构主 agent / sub-agent / 临时运行实体的解析优先级，优先归并到已确认对象。
- 收紧未知 agent 的确认条件，避免纯超时升级为持久主 agent。
- 为 `sessionKey` 与 `runId` 的映射引入更清晰的“强证据优先”规则。
- 为临时实体定义可回收的生命周期，减少 ghost agent 残留。
- 增加 office store 单元测试，覆盖误判、归并和过期清理路径。

## Capabilities

### New Capabilities

- `office-agent-resolution`: 定义 Office 运行时如何解析、确认、归并与回收 agent 身份。

### Modified Capabilities

- None.

## Impact

- 影响 `src/store/office-store.ts` 的事件解析、确认、映射与回收逻辑。
- 影响 `runIdMap`、`sessionKeyMap` 和子 agent 生命周期处理。
- 影响 office store 相关单元测试与回归测试。
- 不涉及任何品牌、语言、部署和演示模式变更。
