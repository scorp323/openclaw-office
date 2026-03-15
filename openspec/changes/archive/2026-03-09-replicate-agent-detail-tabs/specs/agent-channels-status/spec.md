## ADDED Requirements

### Requirement: Channels Tab 展示两栏布局

Channels Tab 必须（SHALL）以两栏 grid 布局展示，左侧为 Agent Context 卡片，右侧为 Channels 状态卡片。

#### Scenario: 两栏布局

- **WHEN** 用户切换到 Channels Tab
- **THEN** 左栏显示 Agent Context 卡片
- **THEN** 右栏显示 Channels 状态卡片
- **THEN** 两栏在宽屏下并排展示，窄屏下堆叠

### Requirement: Agent Context 卡片

系统必须（SHALL）在 Channels Tab 和 Cron Jobs Tab 中共享展示 Agent Context 信息卡片。

#### Scenario: Agent Context 卡片内容

- **WHEN** 渲染 Agent Context 卡片
- **THEN** 标题显示 "Agent Context"
- **THEN** 副标题显示 "Workspace, identity, and model configuration."
- **THEN** 以 key-value grid 展示以下字段：
  - Workspace：优先取 agentFilesList.workspace → config.entry.workspace → config.defaults.workspace → "default"
  - Primary Model：从 config.entry.model 或 defaults.model 解析（支持 string 和 { primary, fallbacks } 格式，有 fallback 时显示 "+N fallback"）
  - Identity Name：从 agentIdentity.name → agent.identity.name → agent.name → config.entry.name → agent.id 链式解析
  - Identity Emoji：从 emoji/avatar 字段解析（通过 isLikelyEmoji 判断，排除 ASCII-only 和 URL）
  - Skills Filter：无 allowlist 时显示 "all skills"，有 allowlist 时显示 "N selected"
  - Default：如果是默认 Agent 显示 "yes"，否则 "no"

### Requirement: Channels 状态卡片

系统必须（SHALL）展示 Gateway 级别的频道状态快照。

#### Scenario: 初始加载

- **WHEN** 用户切换到 Channels Tab
- **THEN** 系统调用 `channels.status` RPC 获取频道快照

#### Scenario: 频道列表展示

- **WHEN** 频道快照加载成功
- **THEN** 卡片标题显示 "Channels"，副标题显示 "Gateway-wide channel status snapshot."
- **THEN** 显示 "Last refresh: xxx" 时间戳
- **THEN** 按 channelOrder 顺序展示频道列表
- **THEN** 每个频道项显示：
  - 频道标签（label）
  - 频道 ID（mono 字体）
  - 账号汇总：connected/total connected、configured 数量、enabled 数量
  - 配置额外字段：groupPolicy / streamMode / dmPolicy（如在 config 中存在）

#### Scenario: 频道账号连接状态汇总

- **WHEN** 汇总某频道的账号状态
- **THEN** connected 计数规则：account.connected === true 或 account.running === true 或 probe.ok === true
- **THEN** 显示格式为 "X/Y connected"（X 为已连接数，Y 为总账号数）
- **THEN** 无账号时显示 "no accounts"

#### Scenario: 无频道

- **WHEN** 频道列表为空
- **THEN** 显示 "No channels found."

#### Scenario: 频道未加载

- **WHEN** 频道快照为 null
- **THEN** 显示 "Load channels to see live status." 的 info callout

### Requirement: Refresh 操作

系统必须（SHALL）提供 Refresh 按钮刷新频道状态。

#### Scenario: 刷新频道

- **WHEN** 用户点击 Refresh 按钮
- **THEN** 重新调用 `channels.status` RPC
- **THEN** 按钮显示 "Refreshing…" 并禁用

#### Scenario: 刷新失败

- **WHEN** `channels.status` RPC 返回错误
- **THEN** 显示 danger callout 展示错误信息
