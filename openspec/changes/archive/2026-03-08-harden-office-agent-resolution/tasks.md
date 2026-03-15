## 1. 身份解析重构

- [x] 1.1 抽离并实现主 agent、sub-agent、临时实体的解析优先级规则
- [x] 1.2 将普通 session 的解析从“数组首项”改为“偏好主 agent”策略
- [x] 1.3 为未知实体引入受限创建路径，避免直接污染持久主 agent 列表

## 2. 临时实体生命周期治理

- [x] 2.1 替换纯超时自动确认逻辑，定义临时实体的确认条件与回收条件
- [x] 2.2 清理临时实体对应的 `runIdMap`、`sessionKeyMap` 和移除缓存
- [x] 2.3 评估是否需要显式保存解析来源以支持调试

## 3. 回归验证

- [x] 3.1 为主 agent、sub-agent、ghost agent、过期回收路径补充 store 单测
- [x] 3.2 为 UUID-like 真实 agentId 增加防误删测试
- [x] 3.3 手动验证真实 Gateway 事件流与 mock adapter 路径
