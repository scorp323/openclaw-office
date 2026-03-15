## ADDED Requirements

### Requirement: Skills Tab 展示技能管理界面

Skills Tab 必须（SHALL）展示当前 Agent 的技能管理界面，包含以下区域：

1. **头部行**：左侧显示标题 "Skills" 和副标题 "Per-agent skill allowlist and workspace skills. X/Y"（X 为已启用数，Y 为总数）；右侧显示 "Use All"、"Disable All"、"Reload Config"、"Refresh"、"Save" 五个按钮
2. **Callout 提示区**：根据状态显示 config 未加载 / allowlist 模式 / 全部启用 / error 等提示
3. **搜索过滤区**：显示 Filter 输入框和 "X shown" 计数
4. **技能分组列表**：按 source 分组的可折叠技能列表

#### Scenario: 初始加载

- **WHEN** 用户切换到 Skills Tab
- **THEN** 系统调用 `skills.status` RPC（参数 `{ agentId }`）和 `config.get` RPC
- **THEN** 显示按 source 分组的技能列表

#### Scenario: 全部启用模式

- **WHEN** Agent 配置中无 skills allowlist（skills 字段不存在或为 undefined）
- **THEN** 显示 "All skills are enabled. Disabling any skill will create a per-agent allowlist." 的 info callout
- **THEN** 所有技能开关显示为开启状态

#### Scenario: Allowlist 模式

- **WHEN** Agent 配置中存在 skills allowlist（skills 为字符串数组）
- **THEN** 显示 "This agent uses a custom skill allowlist." 的 info callout
- **THEN** 仅 allowlist 中包含的技能开关为开启状态

### Requirement: 技能按 source 分组展示

系统必须（SHALL）将技能按 source 分组为可折叠的 details 组件。

#### Scenario: 分组规则

- **WHEN** 渲染技能列表
- **THEN** 按以下规则分组：
  - Workspace Skills：source = "openclaw-workspace"
  - Built-in Skills：source = "openclaw-bundled" 或 bundled = true
  - Installed Skills：source = "openclaw-managed"
  - Extra Skills：source = "openclaw-extra"
  - Other Skills：不属于以上任何分组的技能

#### Scenario: 默认折叠状态

- **WHEN** 渲染分组
- **THEN** Workspace Skills 和 Built-in Skills 组默认折叠
- **THEN** 其他组默认展开

#### Scenario: 分组头部展示

- **WHEN** 渲染分组头部
- **THEN** 显示分组名称和技能数量
- **THEN** 点击头部可展开/折叠该组

### Requirement: 技能搜索过滤

系统必须（SHALL）提供搜索过滤功能，允许用户通过关键词筛选技能。

#### Scenario: 关键词过滤

- **WHEN** 用户在 Filter 输入框中输入文本
- **THEN** 系统按 name + description + source 联合匹配（大小写不敏感）
- **THEN** 仅显示匹配的技能，"X shown" 更新为过滤后的数量

#### Scenario: 空结果

- **WHEN** 过滤后无匹配技能
- **THEN** 显示 "No skills found."

### Requirement: Per-skill 开关切换

系统必须（SHALL）为每个技能提供 toggle 开关，用户可以单独启用或禁用技能。

#### Scenario: 首次禁用某技能（从全部启用模式）

- **WHEN** 用户在全部启用模式下关闭某技能的开关
- **THEN** 系统创建 allowlist，包含除该技能外的所有技能名称
- **THEN** 切换到 allowlist 模式

#### Scenario: 在 allowlist 模式下启用/禁用技能

- **WHEN** 用户在 allowlist 模式下切换某技能的开关
- **THEN** 系统将该技能名称从 allowlist 中添加或移除
- **THEN** configDirty 变为 true

### Requirement: Use All / Disable All 批量操作

系统必须（SHALL）提供 Use All 和 Disable All 按钮。

#### Scenario: Use All

- **WHEN** 用户点击 "Use All"
- **THEN** 系统清除 agent 的 skills allowlist（设为 undefined）
- **THEN** 切换回全部启用模式
- **THEN** configDirty 变为 true

#### Scenario: Disable All

- **WHEN** 用户点击 "Disable All"
- **THEN** 系统将 agent 的 skills 设为空数组 `[]`
- **THEN** 所有技能开关显示为关闭
- **THEN** configDirty 变为 true

### Requirement: 技能行展示完整状态信息

系统必须（SHALL）为每个技能行展示完整的状态信息。

#### Scenario: 技能行内容

- **WHEN** 渲染单个技能行
- **THEN** 显示技能 emoji（如有）+ 技能名称
- **THEN** 显示技能描述
- **THEN** 显示状态 chip 行：source chip + eligible/blocked chip + disabled chip（如适用）
- **THEN** 如有 missing 依赖，显示 "Missing: bin:xxx, env:xxx" 文本
- **THEN** 如有 reasons，显示 "Reason: disabled, blocked by allowlist" 文本
- **THEN** 右侧显示 toggle 开关

#### Scenario: 技能 missing 依赖

- **WHEN** 技能的 missing 对象中存在 bins / env / config / os 非空项
- **THEN** 合并展示为 "Missing: bin:node, env:API_KEY, config:xxx" 格式

### Requirement: Save / Reload / Refresh 操作

系统必须（SHALL）提供 Save、Reload Config、Refresh 三个操作按钮。

#### Scenario: Refresh

- **WHEN** 用户点击 "Refresh"
- **THEN** 重新调用 `skills.status` RPC 刷新技能列表
- **THEN** 按钮显示 "Loading…" 并禁用

#### Scenario: Save 和 Reload Config

- **WHEN** 用户点击 "Save" 或 "Reload Config"
- **THEN** 行为与 Tools Tab 中的 Save / Reload Config 一致（共享 configForm 状态）
