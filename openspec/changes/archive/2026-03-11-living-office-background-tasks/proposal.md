## Why

当前 OpenClaw Office 的 2D 界面仅能反映通过聊天（Chat）触发的 Agent 会话或强绑定的子 Agent 状态。当 OpenClaw 后台运行并发任务（如 Cron 定时任务、Agent 创建的后台脚本或工作流）时，尽管底层 Gateway 正在持续输出日志和执行任务，Office 界面上的小人们依然处于闲置（Idle）状态。这打破了“拟人化办公”的预期，导致界面呈现与实际系统工作状态脱节。我们需要将所有后台工作进行可视化，哪怕是后台的脚本或任务，也能通过某种方式（如对应 Agent 的状态变化、或专门的系统助手）在办公室中展现出来。

## What Changes

- **拦截并订阅后台任务事件**：在 `useGatewayConnection` 中新增对 `cron` 等后台任务事件的 WebSocket 订阅，获取其实时运行状态（Start/End）。
- **后台任务状态映射**：在 `office-store` 中增加处理逻辑，当后台任务（如定时任务）运行时，找到所属的 Agent，将其状态切换为工作状态（如 `thinking` 或 `tool_calling`），并伴随特定的后台任务视觉提示（如显示齿轮图标或"Cron"标签）。
- **完善会话轮询**：优化 `useSubAgentPoller.ts`，不再仅仅过滤带有 `requesterSessionKey` 的子 Agent 会话；对于无来源但正在活跃的顶层 Session（如直接触发的工作流或后台任务），也应能映射到具体的 Agent 或作为临时后台 Worker 在 Office 中呈现。
- **视觉反馈增强**：在 `AgentAvatar` 中，为后台任务增加专门的活动光环（Activity Halo）样式或标识，使用户一眼就能分辨出 Agent 是在处理直接对话还是在执行后台/定时任务。
- **最小可见时长**：关键动作状态（尤其后台任务开始/结束）增加最小 5 秒可见停留，避免状态一闪而过。

## Capabilities

### New Capabilities
- `background-task-visibility`: 将 OpenClaw 的后台任务（Cron、独立 Session 等）状态与 2D Office 视图中的 Agent 头像进行实时映射与可视化呈现。

### Modified Capabilities
- `<existing-name>`: （如果本地有已有的规格说明涉及 office-ui，则需要更新，暂留空）

## Impact

- `src/hooks/useGatewayConnection.ts`：需要增加 `ws.onEvent("cron", ...)` 及相关的事件流入口。
- `src/store/office-store.ts`：需要扩展 Agent 的状态机，增加对后台任务类型（如 CronJob）的处理逻辑。
- `src/hooks/useSubAgentPoller.ts`：需要调整 Session 过滤逻辑，捕获非对话触发的活跃 Session。
- `src/components/office-2d/AgentAvatar.tsx`：需要扩展 UI 组件，支持显示后台任务专属的视觉徽章或动画。
- `src/gateway/adapter-types.ts`：可能需要补充或使用现有的 `CronTask` 相关类型。