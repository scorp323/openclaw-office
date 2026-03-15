## Why

当前 speech bubble 的交互偏向“提示器”而不是“可阅读正文”：默认只显示小图标，用户需要额外点击才能读到消息内容，且停止说话后 5 秒即消失。这对长文本、Markdown 内容和演示场景都不够友好。

## What Changes

- 将 active speaking 状态下的 speech bubble 提升为“默认可读”而不是“点开可读”。
- 为气泡可见时长引入基于文本长度的自适应策略，并支持手动关闭。
- 优化气泡宽度、高度、换行和视口边界处理，减少裁切与阅读压力。
- 保持变更聚焦在可读性上，不引入品牌、语言或演示模式控制。
- 为 2D 视图优先落地，并补充相关交互测试。

## Capabilities

### New Capabilities

- `speech-bubble-readability`: 定义 speaking 文本在 Office 视图中的展示、停留和关闭行为。

### Modified Capabilities

- None.

## Impact

- 影响 `src/components/overlays/SpeechBubble.tsx` 的展示策略与交互。
- 可能影响 2D FloorPlan 中的 overlay 使用方式与相关测试。
- 需要评估 3D 视图的兼容策略，但本 change 不以 3D 重做为目标。
