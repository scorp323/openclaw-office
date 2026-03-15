## ADDED Requirements

### Requirement: Tools Tab 展示工具访问配置

Tools Tab 必须（SHALL）展示当前 Agent 的工具访问配置，包含以下区域：

1. **头部行**：左侧显示标题 "Tool Access" 和副标题 "Profile + per-tool overrides for this agent. X/Y enabled."（X 为已启用数，Y 为总数）；右侧显示 "Enable All"、"Disable All"、"Reload Config"、"Save" 四个按钮
2. **元信息区**：显示 Profile（当前生效的 profile 名称）、Source（agent override / global default / default）、Status（当有未保存修改时显示 "unsaved"）
3. **Quick Presets 区**：显示 "Quick Presets" 标签和 profile 快捷按钮（Minimal / Coding / Messaging / Full / Inherit）
4. **工具列表区**：按 section 分组显示所有工具，每个 section 有标题和可选的 "plugin" badge
5. **Callout 提示区**：根据状态显示 catalog error / config 未加载 / allowlist / global allow 等提示

#### Scenario: 初始加载

- **WHEN** 用户切换到 Tools Tab
- **THEN** 系统调用 `tools.catalog` RPC（参数 `{ agentId, includePlugins: true }`）和 `config.get` RPC 加载工具目录和配置
- **THEN** 显示按 section 分组的工具列表，每个工具显示名称、source 标签（core / plugin:xxx）、描述和开关状态

#### Scenario: Catalog 加载失败

- **WHEN** `tools.catalog` RPC 调用失败
- **THEN** 显示 "Could not load runtime tool catalog. Showing fallback list." 的 warn callout
- **THEN** 使用内置的 TOOL_SECTIONS 备用列表展示

#### Scenario: Config 未加载

- **WHEN** configForm 为 null
- **THEN** 显示 "Load the gateway config to adjust tool profiles." 的 info callout
- **THEN** 所有编辑操作（开关、按钮）处于禁用状态

### Requirement: Per-tool 开关切换

系统必须（SHALL）为每个工具提供独立的 toggle 开关，用户可以逐个启用或禁用工具。

#### Scenario: 启用一个默认被 profile 禁用的工具

- **WHEN** 用户打开一个当前被 profile deny 的工具的开关
- **THEN** 系统将该工具的 normalized 名称加入 `alsoAllow` 列表
- **THEN** configDirty 变为 true，Save 按钮启用

#### Scenario: 禁用一个默认被 profile 允许的工具

- **WHEN** 用户关闭一个当前被 profile 允许的工具的开关
- **THEN** 系统将该工具的 normalized 名称加入 `deny` 列表，并从 `alsoAllow` 中移除（如存在）
- **THEN** configDirty 变为 true，Save 按钮启用

#### Scenario: Agent 使用了显式 allow 列表

- **WHEN** Agent 配置中存在 `tools.allow` 字段
- **THEN** 显示 "This agent is using an explicit allowlist in config." 的 info callout
- **THEN** per-tool 开关和批量操作均禁用

### Requirement: Quick Presets 快捷切换

系统必须（SHALL）提供 Quick Presets 按钮行，允许用户一键切换 profile。

#### Scenario: 选择 Full profile

- **WHEN** 用户点击 "Full" 按钮
- **THEN** 系统将 agent 的 `tools.profile` 设为 "full"，清除 allow 列表
- **THEN** 工具列表根据 full profile 策略更新开关状态
- **THEN** 当前选中的 profile 按钮高亮显示

#### Scenario: 选择 Inherit

- **WHEN** 用户点击 "Inherit" 按钮
- **THEN** 系统清除 agent 的 `tools.profile`（使用全局默认）
- **THEN** Source 显示为 "global default" 或 "default"

### Requirement: Enable All / Disable All 批量操作

系统必须（SHALL）提供 Enable All 和 Disable All 按钮，允许批量切换所有工具的开关状态。

#### Scenario: Enable All

- **WHEN** 用户点击 "Enable All"
- **THEN** 系统遍历所有工具，将 profile 未允许的加入 alsoAllow，清空 deny
- **THEN** 所有工具的开关显示为开启状态

#### Scenario: Disable All

- **WHEN** 用户点击 "Disable All"
- **THEN** 系统遍历所有工具，将 profile 已允许的加入 deny，清空 alsoAllow
- **THEN** 所有工具的开关显示为关闭状态

### Requirement: Save / Reload Config

系统必须（SHALL）提供 Save 和 Reload Config 按钮用于持久化配置变更。

#### Scenario: 保存成功

- **WHEN** 用户点击 "Save" 按钮
- **THEN** 系统通过 `config.set` RPC 提交当前 configForm 和 baseHash
- **THEN** Save 按钮显示 "Saving…" 并禁用
- **THEN** 保存成功后 configDirty 重置为 false

#### Scenario: 保存冲突

- **WHEN** `config.set` RPC 返回 hash 冲突错误
- **THEN** 显示错误提示，建议用户 Reload Config 后重试

#### Scenario: Reload Config

- **WHEN** 用户点击 "Reload Config"
- **THEN** 系统重新调用 `config.get` RPC 刷新 configForm
- **THEN** 丢弃所有未保存的修改，configDirty 重置为 false

### Requirement: 工具列表按 section 分组显示

系统必须（SHALL）将工具按 `group`（section）分组展示，每个 section 有标题卡片。

#### Scenario: 多 section 展示

- **WHEN** 工具目录包含 Files、Runtime、Web 等多个 section
- **THEN** 每个 section 以独立卡片展示，标题行显示 section label
- **THEN** 如果 section 来自 plugin，标题后显示 "plugin" badge

#### Scenario: 工具行展示

- **WHEN** 渲染单个工具行
- **THEN** 显示工具标题（mono 字体）、source 标签（"core" 或 "plugin:xxx"）、可选 "optional" badge
- **THEN** 显示工具描述文本
- **THEN** 右侧显示 toggle 开关
