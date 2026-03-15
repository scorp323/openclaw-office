## Why

Living Office 页面中的 Agent 数字员工目前是"死的"——空闲时完全静止（仅有不可察觉的 scale 微缩放），角色外形只是一个圆头+方身，缺乏拟人特征。用户无法一眼看出谁在忙、为何忙、任务流转方向和结果归属。需要让 Agent 角色拟人化、idle 时有生命感（走动/呼吸/视线微转），并将组织行为（分派/工作/协作/汇报/阻塞）以直观视觉语言呈现。

## What Changes

- **角色拟人化**：为 CharacterBody 增加眼睛、手臂轮廓，不同 Agent 使用不同衣服颜色，让角色具备辨识度
- **idle 行为系统**：空闲 Agent 会进行随机小范围走动、呼吸感上下浮动、头部视线微转（看向其他忙碌 Agent 或随机方向），而非纹丝不动
- **组织行为状态可视化增强**：
  - WORKING 状态：头顶显示工作进度条/齿轮图标，身体亮度增强
  - TOOL_CALL 状态：显示工具调用浮层标签
  - COLLABORATING 状态：协作粒子线 + 走向协作对象
  - BLOCKED 状态：头顶红色 ! 感叹号 + 身体变红 + 抖动
  - WAITING 状态：头顶 ⏳ 等待图标 + 缓慢呼吸
  - DONE/RETURNING 状态：走回工位 + 绿色完成闪光
- **环境生命感**：白板区域文字闪烁/更新动画、工位指示灯呼吸效果

## Capabilities

### New Capabilities
- `agent-humanized-appearance`: 角色拟人化外观（眼睛/手臂/个性化颜色），替换当前的简单圆头方身
- `agent-idle-behavior`: 空闲行为系统——随机走动、呼吸浮动、视线微转，让角色在无任务时仍有生命感
- `agent-status-indicators`: 组织行为状态指示器——每种工作状态有清晰的视觉符号（图标/标签/粒子/颜色变化）

### Modified Capabilities

## Impact

- `src/components/living-office/characters/CharacterBody.tsx` — 重写角色外观，增加眼睛/手臂/个性化
- `src/components/living-office/characters/AgentCharacter2D5.tsx` — 增加 idle 行为逻辑（随机走动+视线转向）
- `src/components/living-office/characters/constants.ts` — 增加角色颜色映射、idle 行为参数
- `src/components/living-office/theme/living-office-vars.css` — 增加新动画关键帧（呼吸浮动/抖动/进度/视线转向）
- 新增 `src/components/living-office/characters/StatusIndicator.tsx` — 状态指示器组件
- 新增 `src/components/living-office/characters/useIdleBehavior.ts` — idle 行为 hook
