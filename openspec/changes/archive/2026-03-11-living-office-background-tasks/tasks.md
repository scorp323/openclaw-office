## 1. 扩展 Store 状态以支持后台任务

- [x] 1.1 在 `src/gateway/types.ts` 中的 `VisualAgent` 接口新增标识属性（如 `isBackgroundWorking: boolean`）
- [x] 1.2 在 `src/store/office-store.ts` 中新增处理 cron/后台任务的 Action（如 `setAgentBackgroundWorkStatus(agentId: string, isWorking: boolean)`）
- [x] 1.3 确保后台工作状态的开启会中断该 Agent 的 `idleBehavior`（取消散步或小动作），并设定为类似 `thinking` 的视觉状态

## 2. 捕获并处理 Gateway 后台事件

- [x] 2.1 修改 `src/hooks/useGatewayConnection.ts`，增加对 `cron` 事件流的订阅 (`ws.onEvent("cron", ...)`)
- [x] 2.2 在 `cron` 事件处理逻辑中，提取 `agentId` 与 `state`，当状态为 `running` 时调用 store 标记后台任务开始，完成时取消标记
- [x] 2.3 （可选）处理 Mock 模式下对应的 cron 事件，以便前端开发调试

## 3. 会话轮询机制调整

- [x] 3.1 修改 `src/hooks/useSubAgentPoller.ts` 中的 `toSubAgentInfoList` 逻辑
- [x] 3.2 移除强制要求存在 `requesterSessionKey` 的过滤，或者针对没有父会话的 Isolated Session 进行特殊标记
- [x] 3.3 将这些检测到的无主活动 Session 映射到已知的 Agent，并同样触发其工作状态

## 4. UI 视觉表现升级

- [x] 4.1 更新 `src/components/office-2d/AgentAvatar.tsx` 渲染逻辑，识别 `isBackgroundWorking` 状态
- [x] 4.2 当处于后台工作时，显示特殊的视觉徽章（如角落的⚙️图标）或者强制展示 `activity-halo`
- [x] 4.3 确认该状态能够和现有的 `idle` / `thinking` / `tool_calling` 动画正确混排，不破坏之前的拟人化动作（即后台运行时不应发呆散步）

## 5. 验证与测试

- [x] 5.1 运行 typecheck 确保没有引入 TS 错误（已执行；存在仓库内与本变更无关的 workflow 类型错误）
- [x] 5.2 在实际/Mock环境中运行，验证启动 CronJob 后，2D Office 中的对应小人是否会有反应，并在结束后恢复（已完成事件/会话映射逻辑烟测）
