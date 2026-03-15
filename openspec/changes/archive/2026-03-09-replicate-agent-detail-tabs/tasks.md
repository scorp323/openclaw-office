## 1. Gateway 适配层类型与接口扩展

- [x] 1.1 扩展 `adapter-types.ts`：新增 `ToolsCatalogResult`（含 agentId / profiles[] / groups[]）、`ToolCatalogProfile`、`ToolCatalogGroup` 类型，替代现有扁平 `ToolCatalog`
- [x] 1.2 扩展 `adapter-types.ts`：新增 `SkillStatusReport`（含 workspaceDir / managedSkillsDir / skills[]）、扩展 `SkillInfo` 为 `SkillStatusEntry`（增加 requirements / missing / configChecks / install / always / blockedByAllowlist / eligible / bundled / source / emoji / homepage 等字段）
- [x] 1.3 扩展 `adapter-types.ts`：新增 `ChannelsStatusSnapshot`（含 channelOrder / channelLabels / channelDetailLabels / channelAccounts / channelMeta）、`ChannelAccountSnapshot`、`ChannelUiMetaEntry` 类型
- [x] 1.4 扩展 `adapter-types.ts`：新增 `CronStatus`（含 enabled / jobs / nextWakeAtMs）类型；扩展 `CronTask` 增加 `state: CronJobState`（含 nextRunAtMs / lastRunAtMs / lastStatus / lastError / lastDurationMs）
- [x] 1.5 扩展 `adapter.ts` 接口：修改 `toolsCatalog` 返回类型为 `ToolsCatalogResult`；修改 `skillsStatus` 返回类型为 `SkillStatusReport`；修改 `channelsStatus` 返回类型为 `ChannelsStatusSnapshot`；新增 `cronStatus()` 方法
- [x] 1.6 更新 `ws-adapter.ts`：`toolsCatalog` 传参增加 `includePlugins: true`，返回完整 `ToolsCatalogResult`；`skillsStatus` 返回完整 `SkillStatusReport`；`channelsStatus` 返回完整 `ChannelsStatusSnapshot`（保留原始结构不再 flatten）；新增 `cronStatus` RPC 调用
- [x] 1.7 更新 `mock-adapter.ts`：同步更新 mock 返回数据以匹配新类型结构

## 2. 工具库新增与重构

- [x] 2.1 新增 `src/lib/tool-policy.ts`：实现 `normalizeToolName`、`expandToolGroups`、`resolveToolProfilePolicy`、`resolveToolProfile`、`isAllowedByPolicy`、`matchesList`，移植官方 `tool-policy-shared.js` + `agents-utils.ts` 中的逻辑
- [x] 2.2 新增 `src/lib/skills-grouping.ts`：实现 `groupSkills()` 函数，按 source 将技能分为 Workspace / Built-in / Installed / Extra / Other 五组
- [x] 2.3 新增 `src/lib/skills-shared.ts`：实现 `computeSkillMissing()`、`computeSkillReasons()` 函数
- [x] 2.4 新增 `src/lib/channel-extras.ts`：实现 `resolveChannelExtras()` 函数，从 config 中提取频道的 groupPolicy / streamMode / dmPolicy 字段
- [x] 2.5 新增 `src/lib/agent-context.ts`：实现 `buildAgentContext()` 和 `resolveAgentEmoji()` 函数，从多数据源构建 Agent 上下文视图模型
- [x] 2.6 重构 `src/lib/cron-presets.ts`：新增 `formatCronSchedule()`、`formatCronState()`、`formatCronPayload()`、`formatNextRun()` 格式化函数，移植官方 `presenter.ts` 中的逻辑
- [x] 2.7 新增 `src/lib/format-helpers.ts`：实现 `formatRelativeTimestamp()`、`formatDurationHuman()`、`formatMs()`、`formatBytes()` 通用格式化工具（如与现有 `view-models.ts` 中的工具有重叠则合并）

## 3. Store 层重构

- [x] 3.1 重构 `agents-store.ts` — Config 状态机：新增 `configForm`、`configHash`、`configDirty`、`configLoading`、`configSaving` 状态；新增 `loadConfig()`、`saveConfig()`、`updateConfigFormValue()`、`removeConfigFormValue()` action
- [x] 3.2 重构 `agents-store.ts` — Tools 状态：新增 `toolsCatalogResult`、`toolsCatalogLoading`、`toolsCatalogError` 状态；重写 `fetchAgentTools()` 使用新类型
- [x] 3.3 重构 `agents-store.ts` — Skills 状态：新增 `skillsReport`、`skillsLoading`、`skillsError`、`skillsFilter`、`activeSkillsAgentId` 状态；重写 `fetchAgentSkills()` 使用新类型；新增 `toggleSkill()`、`clearSkillsAllowlist()`、`disableAllSkills()` action
- [x] 3.4 重构 `agents-store.ts` — Channels 状态：将 `channels` 从 `ChannelInfo[]` 改为 `ChannelsStatusSnapshot | null`；新增 `channelsLastSuccess` 时间戳
- [x] 3.5 重构 `agents-store.ts` — Cron 状态：新增 `cronStatus: CronStatus | null` 状态；新增 `fetchCronStatus()` action；`fetchAgentCronJobs` 增加 `includeDisabled` 参数
- [x] 3.6 重构 `agents-store.ts` — Tools config 编辑：新增 `onProfileChange(agentId, profile, clearAllow)`、`onOverridesChange(agentId, alsoAllow, deny)` action，实现 per-tool 开关和 profile 切换的 configForm 更新逻辑

## 4. Tools Tab 重写

- [x] 4.1 重写 `ToolsTab.tsx`：实现头部行（标题 + Enable All / Disable All / Reload Config / Save 按钮）、callout 提示、元信息区（Profile / Source / Status）、Quick Presets 按钮行
- [x] 4.2 新增 `tools/ToolSection.tsx`：实现按 section 分组的工具区域，标题行含可选 "plugin" badge
- [x] 4.3 重写 `tools/ToolRow.tsx`（或在现有 ToolRow 基础上改造）：实现工具名称（mono）+ source 标签 + optional badge + 描述 + cfg-toggle 开关
- [x] 4.4 实现 cfg-toggle 组件：50×28px 轨道 + 20px 圆形滑块的开关组件样式，支持 checked / disabled 状态

## 5. Skills Tab 重写

- [x] 5.1 重写 `SkillsTab.tsx`：实现头部行（标题 + Use All / Disable All / Reload Config / Refresh / Save 按钮）、callout 提示、Filter 搜索框 + "X shown" 计数
- [x] 5.2 新增 `skills/SkillGroup.tsx`：实现可折叠的技能分组（使用 `<details>` 元素），头部显示分组名称 + 数量，Workspace/Built-in 默认折叠
- [x] 5.3 新增 `skills/SkillRow.tsx`：实现技能行（emoji + 名称 + 描述 + chip 行 + missing/reasons 文本 + toggle 开关）

## 6. Channels Tab 重写

- [x] 6.1 新增 `shared/AgentContextCard.tsx`：实现 Agent Context 信息卡片，展示 Workspace / Model / Identity Name / Emoji / Skills Filter / Default 六个字段
- [x] 6.2 重写 `ChannelsTab.tsx`：实现两栏 grid 布局（左 Agent Context + 右 Channels），Channels 卡片含标题 + Refresh 按钮 + Last refresh 时间 + callout + 频道列表
- [x] 6.3 新增 `channels/ChannelListItem.tsx`：实现频道列表项（label + ID + 账号汇总 connected/configured/enabled + 配置额外字段）
- [x] 6.4 实现频道账号汇总逻辑 `summarizeChannelAccounts()`：统计 connected / configured / enabled 数量

## 7. Cron Jobs Tab 重写

- [x] 7.1 重写 `CronJobsTab.tsx`：实现两栏 grid 布局（上方 Agent Context + Scheduler 状态，下方 Cron Jobs 列表）
- [x] 7.2 实现 Scheduler 状态面板：stat grid 展示 Enabled / Jobs / Next wake 三个统计项 + Refresh 按钮
- [x] 7.3 实现 Agent Cron Jobs 列表：按 agentId 过滤任务，展示名称 + 描述 + chip 行（schedule / enabled / sessionTarget）+ 状态 + payload 信息

## 8. i18n 翻译

- [x] 8.1 新增 `console` 命名空间下 Tools Tab 相关翻译 key（zh/en）：toolAccess / profileOverrides / enableAll / disableAll / reloadConfig / save / quickPresets / inherit / catalogError 等
- [x] 8.2 新增 `console` 命名空间下 Skills Tab 相关翻译 key（zh/en）：skills / skillAllowlist / useAll / disableAll / filter / shown / noSkillsFound / eligible / blocked / disabled / missing 等
- [x] 8.3 新增 `console` 命名空间下 Channels Tab 相关翻译 key（zh/en）：agentContext / channels / gatewayChannelStatus / lastRefresh / noChannelsFound / loadChannels / connected / configured / enabled 等
- [x] 8.4 新增 `console` 命名空间下 Cron Jobs Tab 相关翻译 key（zh/en）：scheduler / cronStatus / jobs / nextWake / agentCronJobs / noJobsAssigned 等

## 9. 验证与测试

- [ ] 9.1 为 `tool-policy.ts` 编写单元测试：覆盖 resolveToolProfile / isAllowedByPolicy / matchesList / normalizeToolName 的核心场景
- [ ] 9.2 为 `skills-grouping.ts` 编写单元测试：覆盖各 source 分组和 Other 兜底
- [ ] 9.3 为 `cron-presets.ts` 新增格式化函数编写单元测试：覆盖 formatCronSchedule / formatCronState / formatCronPayload
- [x] 9.4 运行 `pnpm typecheck` 确保无类型错误
- [x] 9.5 运行 `pnpm lint` 确保无 lint 警告
- [x] 9.6 运行 `pnpm build` 确保生产构建成功
- [ ] 9.7 连接真实 Gateway 验证四个 Tab 的功能与交互，对比官方 UI 确认一致
