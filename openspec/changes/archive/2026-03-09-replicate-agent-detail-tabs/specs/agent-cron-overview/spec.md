## ADDED Requirements

### Requirement: Cron Jobs Tab 展示两栏布局

Cron Jobs Tab 必须（SHALL）以两栏 grid 布局展示，上方两栏为 Agent Context + Scheduler 状态，下方为 Agent Cron Jobs 列表。

#### Scenario: 两栏布局

- **WHEN** 用户切换到 Cron Jobs Tab
- **THEN** 上方左栏显示 Agent Context 卡片（副标题为 "Workspace and scheduling targets."）
- **THEN** 上方右栏显示 Scheduler 状态卡片
- **THEN** 下方全宽显示 Agent Cron Jobs 列表卡片

### Requirement: Scheduler 状态面板

系统必须（SHALL）展示 Gateway 的 Cron Scheduler 全局状态。

#### Scenario: 加载 Scheduler 状态

- **WHEN** 用户切换到 Cron Jobs Tab
- **THEN** 系统调用 `cron.status` RPC 获取调度器状态
- **THEN** 系统调用 `cron.list` RPC（含 `includeDisabled: true`）获取任务列表

#### Scenario: Scheduler 状态展示

- **WHEN** Scheduler 状态加载成功
- **THEN** 卡片标题显示 "Scheduler"，副标题显示 "Gateway cron status."
- **THEN** stat grid 展示三个统计项：
  - Enabled：显示 "Yes" / "No"（scheduler 全局开关状态）
  - Jobs：总任务数
  - Next wake：格式化为 "Weekday, HH:MM:SS (relative time)"
- **THEN** 提供 Refresh 按钮

#### Scenario: Scheduler 状态未加载

- **WHEN** cron.status 返回 null
- **THEN** 统计项显示 "n/a"

### Requirement: Agent Cron Jobs 列表

系统必须（SHALL）展示属于当前 Agent 的定时任务列表。

#### Scenario: 任务列表展示

- **WHEN** 存在属于当前 Agent 的 Cron Job（job.agentId === 当前 agentId）
- **THEN** 以列表形式展示，每个任务显示：
  - 任务名称（list-title）
  - 任务描述（list-sub，如有）
  - Chip 行：调度表达式 chip + enabled/disabled chip + sessionTarget chip
  - 状态信息（mono 字体）：格式为 "status · next NEXT_TIME · last LAST_TIME"
  - Payload 信息（muted 文本）：格式为 "System: text" 或 "Agent: message" + delivery 信息

#### Scenario: 无任务

- **WHEN** 当前 Agent 无 Cron Job
- **THEN** 显示 "No jobs assigned."

### Requirement: Cron 调度表达式格式化

系统必须（SHALL）将 Cron Job 的 schedule 对象格式化为可读文本。

#### Scenario: kind = "at" 格式化

- **WHEN** schedule.kind === "at"
- **THEN** 显示 "At HH:MM:SS" 或 "At {原始 at 字符串}"（如解析失败）

#### Scenario: kind = "every" 格式化

- **WHEN** schedule.kind === "every"
- **THEN** 显示 "Every {human-readable duration}"（如 "Every 30m", "Every 1h 30m"）

#### Scenario: kind = "cron" 格式化

- **WHEN** schedule.kind === "cron"
- **THEN** 显示 "Cron {expr}"，如有时区则追加 "({tz})"

### Requirement: Cron 状态格式化

系统必须（SHALL）将 Cron Job 的 state 对象格式化为可读文本。

#### Scenario: 完整状态展示

- **WHEN** 任务有 state 对象
- **THEN** 格式化为 "{lastStatus} · next {nextRunAtMs formatted} · last {lastRunAtMs formatted}"
- **THEN** 缺失的字段显示 "n/a"

### Requirement: Cron Payload 格式化

系统必须（SHALL）将 Cron Job 的 payload 对象格式化为可读文本。

#### Scenario: systemEvent 类型

- **WHEN** payload.kind === "systemEvent"
- **THEN** 显示 "System: {text}"

#### Scenario: agentTurn 类型

- **WHEN** payload.kind === "agentTurn"
- **THEN** 显示 "Agent: {message}"
- **THEN** 如有 delivery 且 mode 非 "none"，追加 "· {mode}{target details}"

### Requirement: Refresh 操作

系统必须（SHALL）提供 Refresh 按钮刷新 Scheduler 状态和任务列表。

#### Scenario: 刷新

- **WHEN** 用户点击 Scheduler 卡片的 Refresh 按钮
- **THEN** 重新调用 `cron.status` 和 `cron.list` RPC
- **THEN** 按钮显示 "Refreshing…" 并禁用

#### Scenario: 刷新失败

- **WHEN** RPC 返回错误
- **THEN** 显示 danger callout 展示错误信息
