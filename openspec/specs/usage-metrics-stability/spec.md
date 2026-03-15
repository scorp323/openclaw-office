# usage-metrics-stability Specification

## Purpose

TBD - created by archiving change stabilize-usage-metrics. Update Purpose after archive.

## Requirements

### Requirement: Usage polling SHALL normalize supported status schemas

前端轮询器 MUST 将已支持的 `usage.status` 响应结构归一化为统一的 token 快照形状，再交给 store 处理。

#### Scenario: Flat usage status response

- **WHEN** `usage.status` 返回顶层 `total` 与 `byAgent`
- **THEN** 轮询器生成等价的统一 token 快照

#### Scenario: Nested usage status response

- **WHEN** `usage.status` 返回嵌套结构，例如 `tokens.total` 或 `usage.totalTokens`
- **THEN** 轮询器仍能提取统一的 `total` 与 `byAgent` 快照

### Requirement: Token snapshot ingestion SHALL keep global metrics synchronized

store 在接收 token snapshot 时 MUST 同步更新 `globalMetrics.totalTokens` 与 `globalMetrics.tokenRate`。

#### Scenario: New snapshot is appended

- **WHEN** store 接收一条新的 token snapshot
- **THEN** token 历史更新，且全局 token 总量与 token 速率同时更新

#### Scenario: Snapshot history is trimmed

- **WHEN** token 历史达到上限并发生裁剪
- **THEN** 当前全局 token 指标仍与最新快照保持一致

### Requirement: Usage metrics SHALL degrade gracefully on missing or failed polling data

当轮询失败或响应不完整时，系统 MUST 保持指标稳定，不得因为空值或未知结构主动将 token 指标重置为 0。

#### Scenario: Polling temporarily fails

- **WHEN** `usage.status` 请求临时失败
- **THEN** UI 保留最近可信的 token 指标，并在允许时使用退化估算补足趋势数据

#### Scenario: Response contains no usable token fields

- **WHEN** `usage.status` 响应缺少所有已知 token 字段
- **THEN** 系统不将全局 token 指标清零，而是保持最近可信值
