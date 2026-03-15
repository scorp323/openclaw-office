## Why

当前 OpenClaw Office 中 Agent 详情页的 Tools、Skills、Channels、Cron Jobs 四个 Tab 的实现与官方 Gateway UI（http://127.0.0.1:18789/agents）存在较大差距：功能不完善（如 Tools Tab 缺少 per-tool 开关、无 profile 快捷预设按钮；Skills Tab 缺少分组折叠和搜索过滤；Channels Tab 缺少 Agent Context 上下文卡片和频道账号汇总；Cron Tab 缺少 Scheduler 状态面板和 Agent Context），视觉风格也远不如官方 UI 精致。需要以官方 Gateway UI 源码为基准进行完整复刻，使 OpenClaw Office 在这四个 Tab 上达到与官方一致的功能和交互体验。

## What Changes

- **Tools Tab 全面重写**：新增 per-tool 开关（cfg-toggle）、Enable All / Disable All 批量操作、Quick Presets 快捷 profile 按钮（Minimal / Coding / Messaging / Full / Inherit）、Profile/Source/Status 元信息展示、工具按 section 分组显示（带 plugin badge）、Save/Reload Config 按钮、callout 提示（allowlist/global allow/catalog error）、工具策略解析逻辑（alsoAllow/deny/profile policy）
- **Skills Tab 全面重写**：新增按 source 分组折叠展示（Workspace / Built-in / Installed / Extra / Other）、搜索过滤功能、Use All / Disable All 按钮、Reload Config / Refresh / Save 按钮、per-skill 开关（cfg-toggle）、skill 状态 chip（source/eligible/blocked/disabled）、missing deps 和 reasons 展示、allowlist callout 提示
- **Channels Tab 重写**：新增 Agent Context 信息卡片（Workspace / Model / Identity Name / Emoji / Skills Filter / Default）、频道账号汇总统计（connected/configured/enabled）、频道配置额外字段展示（groupPolicy/streamMode/dmPolicy）、Last refresh 时间展示、两栏 grid 布局
- **Cron Jobs Tab 重写**：新增 Agent Context 信息卡片、Scheduler 状态面板（Enabled/Jobs/Next wake 统计）、Cron Job 列表展示增强（schedule chip / enabled chip / sessionTarget chip / state 格式化 / payload 格式化）、两栏 grid 布局
- **Gateway 适配层增强**：新增 `tools.catalog` 支持 `includePlugins` 参数、新增 `cron.status` RPC 方法、Channels 返回结构从 flat `ChannelInfo[]` 增强为 `ChannelsStatusSnapshot` 完整快照、Skills 返回结构增强为 `SkillStatusReport`（含 requirements/missing/configChecks）
- **Store 层重构**：`agents-store` 中 Tools/Skills 的 config 编辑流程与官方对齐（configForm + configDirty + configSaving 状态机）、工具策略解析逻辑（resolveToolProfile / isAllowedByPolicy / matchesList）
- **新增辅助模块**：技能分组逻辑（skills-grouping）、技能状态 chip 渲染（skills-shared）、频道配置额外字段解析（channel-config-extras）、Agent 上下文构建逻辑（agent-context builder）、Cron 格式化工具（formatCronState/formatCronSchedule/formatCronPayload/formatNextRun）

## Capabilities

### New Capabilities

- `agent-tools-management`: Agent 详情页 Tools Tab 的完整工具访问管理，包括 profile 选择、per-tool 开关、alsoAllow/deny 覆盖、Enable/Disable All、Save/Reload 配置
- `agent-skills-management`: Agent 详情页 Skills Tab 的完整技能管理，包括分组展示、搜索过滤、per-skill 允许列表、Use All/Disable All、状态 chip、missing/reasons 展示
- `agent-channels-status`: Agent 详情页 Channels Tab 的频道状态展示，包括 Agent Context 卡片、频道账号连接/配置/启用汇总、频道配置字段展示
- `agent-cron-overview`: Agent 详情页 Cron Jobs Tab 的定时任务概览，包括 Agent Context 卡片、Scheduler 状态面板、Cron Job 列表增强展示

### Modified Capabilities

（无需修改现有 spec，全部为新建）

## Impact

- **组件层**：重写 `ToolsTab.tsx`、`SkillsTab.tsx`、`ChannelsTab.tsx`、`CronJobsTab.tsx`；新增 `AgentContextCard.tsx`、`SkillGroup.tsx`、`ToolSection.tsx` 等子组件
- **Store 层**：重构 `agents-store.ts` 中 Tools/Skills/Channels/Cron 相关状态和 action
- **Gateway 适配层**：扩展 `adapter-types.ts` 类型定义、扩展 `adapter.ts` 接口、更新 `ws-adapter.ts` RPC 调用
- **工具库**：新增 `src/lib/tool-policy.ts`、`src/lib/skills-grouping.ts`、`src/lib/skills-shared.ts`、`src/lib/channel-extras.ts`、`src/lib/agent-context.ts`；重构 `src/lib/cron-presets.ts`
- **i18n**：新增 console 命名空间下 tools/skills/channels/cron 相关翻译 key（zh/en）
- **依赖**：无新增外部依赖
