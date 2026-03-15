## 1. 数据归一化

- [x] 1.1 为 `usage.status` 增加统一归一化函数，覆盖已知 schema 变体
- [x] 1.2 在轮询路径中使用归一化结果替代分散的字段读取
- [x] 1.3 明确无可用字段时的 fallback 条件与行为

## 2. Store 指标同步

- [x] 2.1 扩展 `pushTokenSnapshot()`，同步更新 `globalMetrics.totalTokens`
- [x] 2.2 基于相邻快照差值计算 `globalMetrics.tokenRate`
- [x] 2.3 确保历史裁剪不会破坏当前指标显示

## 3. 回归验证

- [x] 3.1 为平铺 schema、嵌套 schema、空响应和失败 fallback 编写测试
- [x] 3.2 验证 topbar 与 MetricsPanel 在最新快照后显示一致
- [x] 3.3 手动验证 Gateway 正常响应与失败退化两条路径
