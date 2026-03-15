## Context

OpenClaw Office 当前的 Agent 详情页 Tools/Skills/Channels/Cron Jobs 四个 Tab 是在早期快速搭建的，功能和交互远未达到官方 Gateway UI（Lit + vanilla CSS 构建）的完整度。官方 UI 代码位于 `../openclaw/ui/` 目录，采用 Lit html 模板渲染，我们需要将其逐一转译为 React + Tailwind CSS 4 实现，并保持功能和交互的完整一致。

当前状态：

- **ToolsTab**（315 行）：有 profile 编辑器和工具目录，但无 per-tool 开关、无 Enable All/Disable All、无 Quick Presets
- **SkillsTab**（341 行）：有 mode 切换和 allowlist，但无分组折叠、无搜索过滤、状态展示不完整
- **ChannelsTab**（127 行）：仅展示频道卡片列表，无 Agent Context 卡片、无账号汇总统计
- **CronJobsTab**（149 行）：有基本增删改查，但无 Scheduler 状态面板、无 Agent Context 卡片

目标参考源码（官方 UI）：

- `ui/src/ui/views/agents-panels-tools-skills.ts` — Tools + Skills 渲染
- `ui/src/ui/views/agents-panels-status-files.ts` — Channels + Cron 渲染
- `ui/src/ui/views/agents-utils.ts` — 工具策略、config 解析、Agent 上下文
- `ui/src/ui/views/skills-grouping.ts` — 技能分组
- `ui/src/ui/views/skills-shared.ts` — 技能状态 chip
- `ui/src/ui/views/channel-config-extras.ts` — 频道配置字段
- `ui/src/ui/presenter.ts` — Cron 格式化

## Goals / Non-Goals

**Goals：**

- 功能 1:1 复刻官方 UI 的 Tools/Skills/Channels/Cron 四个 Tab
- 交互体验与官方一致（per-tool 开关、分组折叠、搜索过滤、config save/reload 流程）
- 视觉风格与官方对齐（card 布局、cfg-toggle 开关、chip 标签、stat 面板、callout 提示）
- 数据层完整对接（tools.catalog + config.get/set、skills.status、channels.status 快照、cron.status + cron.list）
- 保持 i18n 支持（所有用户可见文本通过 i18n）
- 保持暗色模式支持

**Non-Goals：**

- 不修改 Overview Tab 和 Files Tab
- 不修改 Agent 列表/创建/删除功能
- 不修改 Gateway 侧代码（仅前端适配）
- 不修改全局 Cron 页面（`/cron`），仅改 Agent 详情内的 Cron Tab
- 不新增官方 UI 中不存在的功能

## Decisions

### 1. 组件架构：每个 Tab 拆分为独立子组件

**决策**：将每个 Tab 拆分为多个小组件（每个文件 < 300 行），而非官方 UI 的单文件渲染函数。

**理由**：

- 官方 UI 用 Lit html 模板函数，适合函数式渲染
- 我们用 React，更适合组件化拆分
- 保持每个文件 < 500 行的项目规范

**具体拆分**：

```
tabs/
├── ToolsTab.tsx            # Tab 主容器 + 配置编辑
├── tools/
│   ├── ToolSection.tsx     # 按 section 分组的工具列表
│   └── ToolRow.tsx         # 单个工具行（名称 + badge + toggle）
├── SkillsTab.tsx           # Tab 主容器 + 过滤/模式切换
├── skills/
│   ├── SkillGroup.tsx      # 可折叠的技能分组
│   └── SkillRow.tsx        # 单个技能行（emoji + 名称 + chips + toggle）
├── ChannelsTab.tsx         # Tab 主容器 + 两栏布局
├── channels/
│   └── ChannelListItem.tsx # 频道列表项（标签 + ID + 状态汇总）
├── CronJobsTab.tsx         # Tab 主容器 + 两栏布局
├── shared/
│   └── AgentContextCard.tsx # Agent 上下文卡片（共享）
```

### 2. 数据层：扩展 Gateway 适配类型以匹配官方 API 响应

**决策**：扩展 `adapter-types.ts` 中的类型定义，使其完整匹配官方 Gateway API 的返回结构。

**关键类型变更**：

- `ToolCatalog` → `ToolsCatalogResult`：增加 `agentId`、`profiles[]`、`groups[]` 结构（替代 flat `entries[]`）
- `SkillInfo[]` → `SkillStatusReport`：增加 `workspaceDir`、`managedSkillsDir`，skill 条目增加 `requirements`、`missing`、`configChecks`、`install`
- `ChannelInfo[]` → `ChannelsStatusSnapshot`：增加 `channelOrder`、`channelLabels`、`channelAccounts`、`channelMeta`
- 新增 `CronStatus` 类型：`{ enabled, jobs, nextWakeAtMs }`
- `CronTask` 增加 `state` 字段：`{ nextRunAtMs, lastRunAtMs, lastStatus, lastError, lastDurationMs }`

**理由**：当前适配层对 Gateway 返回数据做了过多简化和扁平化，丢失了许多官方 UI 需要的字段。

### 3. Config 编辑流程：采用 configForm 状态机模式

**决策**：与官方 UI 一致，Tools/Skills Tab 共享一个 config 编辑状态机：

1. `configForm: Record<string, unknown> | null` — 当前 config 快照（可编辑的本地副本）
2. `configHash: string | null` — 乐观并发控制的 baseHash
3. `configDirty: boolean` — 是否有未保存的修改
4. `configLoading / configSaving: boolean` — 加载/保存状态

**理由**：

- 官方 UI 的 Tools/Skills 共用同一个 configForm，修改任何一个 Tab 都在同一个 config 对象上操作
- Save 时通过 `config.set` + `baseHash` 实现乐观并发控制，避免覆盖其他修改

### 4. 工具策略解析：移植官方 resolveToolProfile / isAllowedByPolicy 逻辑

**决策**：在 `src/lib/tool-policy.ts` 中重新实现官方的工具策略解析逻辑，包括：

- `resolveToolProfile(profile)` — 从 profile 名称解析 allow/deny 列表
- `isAllowedByPolicy(toolId, policy)` — 判断工具是否被当前策略允许
- `matchesList(toolId, list)` — 工具是否匹配 alsoAllow/deny 列表中的模式
- `normalizeToolName(name)` — 工具名称标准化
- `expandToolGroups(patterns)` — 展开工具组别名

**替代方案**：直接 import 官方的 `tool-policy-shared.js`。但该文件在 openclaw 主仓库中，不适合跨仓库直接引用。

**理由**：保持 OpenClaw Office 的独立性，同时确保策略解析逻辑与官方完全一致。

### 5. 样式方案：用 Tailwind CSS 4 复刻官方 CSS 类

**决策**：使用 Tailwind 工具类复刻官方 CSS 中的以下视觉元素：

- `cfg-toggle`：50×28px 轨道 + 20px 圆形滑块的开关组件
- `card` / `card-title` / `card-sub`：卡片容器样式
- `chip` / `chip-ok` / `chip-warn`：状态标签
- `stat` / `stat-grid`：统计面板
- `callout info/warn/danger`：提示横幅
- `agent-tools-grid / agent-tools-section`：工具网格
- `agent-skills-group`：可折叠分组（`<details>` 元素）
- `list / list-item / list-main / list-meta`：列表布局
- `grid grid-cols-2`：两栏布局

**理由**：项目已统一使用 Tailwind CSS 4，无需引入额外 CSS 文件。部分复杂组件（如 toggle、collapsible group）可用少量 `@apply` 或内联 Tailwind 类实现。

### 6. ws-adapter 层：扩展 RPC 调用以支持完整 API

**决策**：在 `ws-adapter.ts` 中扩展以下 RPC 调用：

| 方法                     | 变更                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| `toolsCatalog(agentId?)` | 增加 `includePlugins: true` 参数；返回 `ToolsCatalogResult`（含 groups + profiles） |
| `skillsStatus(agentId?)` | 返回完整 `SkillStatusReport`（含 requirements/missing）                             |
| `channelsStatus()`       | 返回完整 `ChannelsStatusSnapshot`（含 channelOrder/channelAccounts/channelMeta）    |
| `cronStatus()`           | 新增方法，调用 `cron.status` RPC                                                    |
| `cronList()`             | 增加 `includeDisabled` 等过滤参数                                                   |

**理由**：当前 ws-adapter 对 Gateway 响应做了过多扁平化处理（如 `flattenChannelAccounts`），丢失了官方 UI 所需的结构化数据。

### 7. Agent 上下文卡片：提取为共享组件

**决策**：将官方 UI 中 Channels Tab 和 Cron Tab 共用的 "Agent Context" 卡片提取为 `AgentContextCard.tsx` 共享组件。

**数据来源**：

- `workspace`：优先从 agentFilesList → config.entry.workspace → config.defaults.workspace → "default"
- `model`：从 config.entry.model 或 config.defaults.model 解析（支持 primary + fallbacks 格式）
- `identityName`：从 agentIdentity / agent.identity / agent.name / config.entry.name 链式解析
- `identityEmoji`：从 emoji/avatar 字段解析（isLikelyEmoji 判断）
- `skillsLabel`：从 config.entry.skills 解析（"all skills" 或 "N selected"）
- `isDefault`：比较 agentId 与 defaultId

### 8. 技能分组：复刻官方 groupSkills 逻辑

**决策**：在 `src/lib/skills-grouping.ts` 中实现与官方一致的分组逻辑：

| 分组             | Source                                  |
| ---------------- | --------------------------------------- |
| Workspace Skills | `openclaw-workspace`                    |
| Built-in Skills  | `openclaw-bundled` (或 `bundled: true`) |
| Installed Skills | `openclaw-managed`                      |
| Extra Skills     | `openclaw-extra`                        |
| Other Skills     | 其余全部                                |

默认折叠：Workspace、Built-in 组默认折叠，其余展开。

## Risks / Trade-offs

- **[Gateway API 版本兼容]** → 官方 UI 紧跟 Gateway 最新 API，部分字段（如 `ChannelsStatusSnapshot.channelMeta`）可能在较旧 Gateway 版本中不存在。缓解：对可选字段做 `?? []` 兜底处理。
- **[工具策略解析同步]** → `tool-policy.ts` 是从官方代码手动移植的，后续官方更新可能导致行为偏差。缓解：添加注释标记源码对应位置，便于后续同步。
- **[Config 竞争写入]** → Tools/Skills 共享 configForm，如果用户在两个 Tab 间快速切换并保存可能导致冲突。缓解：使用 `baseHash` 乐观锁，冲突时提示用户 Reload。
- **[大量文件变更]** → 本次涉及 15+ 文件的新建/修改，需分批提交。缓解：按 Tab 维度分阶段实现，每完成一个 Tab 即可独立验证。
- **[i18n Key 数量]** → 新增约 80+ 个翻译 key。缓解：按 Tab 维度组织 key 结构，保持 zh/en 同步。
