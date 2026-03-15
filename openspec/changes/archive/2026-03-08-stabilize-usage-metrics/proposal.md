## Why

当前 token 指标链路存在两个稳定性缺口：前端只兼容单一 `usage.status` schema，且写入 token snapshot 时没有把 `globalMetrics.totalTokens` 和 `tokenRate` 同步更新。这会导致 topbar、指标面板与后端真实数据不一致，甚至在 schema 变化时直接显示空白或错误值。

## What Changes

- 为 `usage.status` 增加多 schema 兼容与统一归一化逻辑。
- 在写入 token snapshot 时同步更新 `globalMetrics.totalTokens` 与 `tokenRate`。
- 定义数据缺失或请求失败时的平稳退化路径，避免将指标意外归零。
- 为轮询、归一化和全局指标更新补充测试。

## Capabilities

### New Capabilities

- `usage-metrics-stability`: 定义使用量轮询、token 快照归一化与全局指标同步行为。

### Modified Capabilities

- None.

## Impact

- 影响 `src/hooks/useUsagePoller.ts` 的轮询与解析逻辑。
- 影响 `src/store/office-store.ts` 的 token snapshot 入库与全局指标同步。
- 影响 topbar、指标面板和相关测试。
- 不引入后端接口变化，也不改变图表组件结构。
