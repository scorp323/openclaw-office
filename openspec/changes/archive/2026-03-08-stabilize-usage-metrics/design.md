## Context

`useUsagePoller()` 当前仅识别 `status.total` 与 `status.byAgent` 两个字段。如果 Gateway 返回的是嵌套结构，例如 `tokens.total` 或 `usage.totalTokens`，前端就无法正确提取 token 数据。与此同时，`pushTokenSnapshot()` 只追加历史，不更新 `globalMetrics`，使依赖 `totalTokens` 与 `tokenRate` 的 UI 与轮询数据脱节。

## Goals / Non-Goals

**Goals:**

- 让前端能够兼容已知的 `usage.status` schema 变体。
- 让 token snapshot 成为更新全局指标的唯一可信入口。
- 在轮询失败或响应结构缺失时保持平稳退化，不制造错误归零。
- 用测试锁定解析逻辑和指标同步逻辑。

**Non-Goals:**

- 不更改 Gateway RPC 名称和请求频率。
- 不重新设计图表样式或仪表盘布局。
- 不尝试估算精确计费，仅保证 token 指标链路稳定。

## Decisions

### 1. 先归一化响应，再更新 UI 状态

轮询器 SHALL 先把 `usage.status` 解析成统一的 `{ total, byAgent }` 形状，再将其写入 store。  
原因：把 schema 差异隔离在一个归一化函数中，能让上层逻辑稳定且易测。

备选方案：

- 在每个消费点分别兼容多 schema：重复且容易遗漏。
- 要求后端统一 schema 后再修：周期不可控，且前端仍缺乏容错。

### 2. `pushTokenSnapshot()` 同步维护全局 token 指标

store SHALL 在写入 snapshot 时同时维护 `globalMetrics.totalTokens` 与 `tokenRate`。  
原因：token 历史和顶部指标本质上来自同一数据源，拆开维护会产生漂移。

### 3. 失败时退化，不能归零

当轮询失败或响应无法解析时，系统 SHOULD 使用最近可信数据维持 UI；在满足约束时，可退化到基于 event history 的估算快照，但 MUST NOT 因空响应而主动把 token 指标清零。  
原因：错误的 0 值比短暂的旧值更具误导性。

## Risks / Trade-offs

- [风险] 兼容过多 schema 可能掩盖后端协议漂移。  
  → Mitigation: 仅支持已知字段形状，并为未知结构保留显式 fallback。

- [风险] 基于 event history 的估算与真实 token 有偏差。  
  → Mitigation: 仅作为失败退化路径，且不覆盖正常轮询得到的可信数据。

- [风险] tokenRate 的计算窗口变化可能让数值波动更明显。  
  → Mitigation: 以相邻快照差值为准，并在设计中接受短时波动。

## Migration Plan

1. 先增加 `usage.status` 归一化函数。
2. 再让 `pushTokenSnapshot()` 同步更新 `globalMetrics`。
3. 最后补测试并验证 topbar 与指标面板显示一致。
4. 如发现兼容性问题，可先保留旧 schema 路径并禁用 fallback 估算。

## Open Questions

- 现网 Gateway 是否还存在其它 `usage.status` 结构变体；如果有，需要在实现前补充样本。
- 是否需要在 UI 上区分“真实轮询值”和“失败退化估算值”。
