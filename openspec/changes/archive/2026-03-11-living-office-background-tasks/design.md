## Context

在目前的 OpenClaw Office 中，代理的工作状态显示仅仅与 `agent` 事件流相关。这些事件流主要是由用户直接对话（Chat）或对话引发的子代理（Sub-agent）活动触发。然而，OpenClaw 支持基于 Cron 的定时任务（CronTask）以及其他无依赖或脱离当前会话的后台任务（Isolated Sessions）。
由于这些任务的执行可能：
1. 产生专属于 `cron` 的 Gateway 事件，而不是标准的 `agent` 聊天事件。
2. 即使产生了 `agent` 事件，其 sessionKey 格式（如 `agent:<agentName>:cron:<timestamp>`）可能与当前的解析规则不够契合，或者是其不在 UI 轮询（`useSubAgentPoller`）处理的名单中（因为它缺乏 `requesterSessionKey`）。

因此，从用户的视角看，明明系统日志在大量输出任务运行的信息，但 2D 办公室界面的对应 Agent 却似乎在“闲置或散步”。为了实现真正的“拟人化”，我们必须捕获这些后台工作，并将它们映射回对应的 Agent 身上。

## Goals / Non-Goals

**Goals:**
- 在 2D 办公室视图中正确反映由 Cron 或其他后台脚本触发的任务执行状态。
- 为后台运行的任务提供可见的 UI 呈现（如将相关的 Agent 状态变更为 working/thinking，并可能附加一个标识，如⚙️ 或其他提示）。
- 确保没有丢失活跃会话的跟踪，让所有在 `sessions.list` 中的活动都能在界面有所体现。

**Non-Goals:**
- 不改变后台任务的实际执行逻辑或 Gateway 的数据结构。
- 不需要在 2D 视图中呈现非常详细的“控制台级别的”日志或任务进度条（只在视觉上反映出“在干活”）。

## Decisions

### 1. 订阅并处理 `cron` 事件
Gateway 会向所有建立 WebSocket 连接的客户端广播 `cron` 事件。虽然 `WsAdapter` 在内部有进行监听，但主要服务于 Console 的 Cron 管理页。我们将在 `useGatewayConnection.ts` 的 Office 核心监听逻辑中直接订阅 `cron`，将任务状态映射回 Office Store：
- 当 `cron` 事件表明任务处于运行状态（如 `state === 'running'`）时，调用 `office-store` 的 `setAgentCronStatus(agentId, true)`，使该 Agent 呈现特定的工作状态。
- 考虑到容错，在 `cron` 任务结束时移除该状态。

### 2. 增强 `sessions.list` 轮询覆盖面
目前 `useSubAgentPoller` 中的 `toSubAgentInfoList` 强制要求有 `requesterSessionKey`，这忽略了顶级的脱机运行会话（Isolated sessions）。
**修改：** 放宽此过滤条件，将被过滤的顶级后台会话也纳入管理，如果是独立于现有 Agent 的后台任务，可以作为特殊的“后台辅助小人”（Background Worker Placeholder）展示，或者如果它能够映射到已知 Agent（匹配 agentId），就直接显示在该主 Agent 上。

### 3. UI 层级的状态反馈
在 `AgentAvatar.tsx` 中：
- 当 Agent 处于普通的闲置（idle）状态，但如果因为上述 `cron` 事件或后台 session 的映射而具有“后台活跃”（e.g., `isBackgroundWorking: true`）标志时，我们给它施加一个 `activity-halo` 或额外的“忙碌”徽章（Badge），让它在“闲逛”时也能让人看出他在后台跑着脚本，或者让他停留在工位上工作。
- 考虑到“拟人化”的需求，后台任务运行时，小人可以在工位上表现出“在敲键盘/思考”的视觉效果（`thinking` 或 `tool_calling`），而不是四处闲逛。
- 为了避免“状态一闪而过”，后台任务视觉状态采用最小可见时长策略：每次进入后台工作状态后至少停留 5 秒，结束信号到达时若未满 5 秒则延迟清除。

## Risks / Trade-offs

- **Risk**: 状态不同步导致的“常亮”。如果漏掉了 `cron` 的结束事件或 Session 异常中止，UI 上的小人可能一直卡在工作状态。
  - *Mitigation*: 结合 `sessions.list` 的定期轮询（当前是 3s）作为兜底检查，如果一个后台任务在 session 中已经消失，主动清除其后台活跃标志。
- **Trade-off**: “普通事件工作”与“后台任务工作”可能冲突。如果一个 Agent 同时在进行 Chat 交互并运行后台 Cron 任务，该显示什么？
  - *Mitigation*: Chat 的直接交互优先级更高（有具体的 Speech Bubble 和 Tool 弹窗），后台任务作为一个全局光环或标志叠加在其身上即可。