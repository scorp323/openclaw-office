# Settings Page — 完整页面 UI

> 本 spec 定义 Settings 页面 UI 交互：七大模块的布局、交互和数据源。

## 页面结构

Settings 页面是一个垂直滚动布局，由以下七个 Card 模块从上到下堆叠：

1. **Appearance** — 主题 + 语言切换（本地偏好）
2. **AI Providers** — Provider 管理（config RPC）
3. **Gateway** — Gateway 运行状态（status RPC）
4. **Updates** — 版本信息 + 更新操作（status + update.run RPC）
5. **Advanced** — 开发者模式开关（本地偏好）
6. **Developer** — 开发者工具（仅开发者模式可见）
7. **About** — 关于信息

## 要求

### R1: Appearance 模块

**主题切换**
- 三选一：Light / Dark / System
- 当前值从现有 `useOfficeStore` 的 `theme` 状态读取
- 切换时调用 `useOfficeStore.getState().setTheme()`，同时持久化到 localStorage

**语言切换**
- 两选一：中文 / English
- 当前值从 `i18next.language` 读取
- 切换时调用 `i18next.changeLanguage()`，语言偏好自动持久化到 `localStorage('i18nextLng')`

#### 场景

**S1.1 主题跟随系统**
- 选择 System → 读取 `prefers-color-scheme` 媒体查询
- 系统主题变化时自动切换

**S1.2 语言切换后页面立即刷新翻译**
- 选择 English → 所有 `t()` 文本立即切换为英文
- 无需刷新页面

### R2: AI Providers 模块

详见 `settings-providers/spec.md`。

本模块在 SettingsPage 中作为一个 Card 嵌入，内含：
- Provider 列表（ProviderCard 组成）
- 添加 Provider 按钮
- 空状态提示

### R3: Gateway 模块

从 `statusSummary()` RPC 获取 Gateway 运行信息，展示为只读信息卡片：

| 展示字段 | 数据来源 |
|---|---|
| 版本号 | `status.version` |
| 运行端口 | `status.port` |
| 运行时间 | `status.uptime`（格式化为"x小时y分钟"） |
| 运行模式 | `status.mode` |
| Node.js 版本 | `status.nodeVersion` |
| 平台 | `status.platform` |

**刷新按钮**：重新调用 `statusSummary()` 刷新状态。

#### 场景

**S3.1 Gateway 未连接时**
- Adapter 调用失败（WS 未连接）
- 展示"Gateway 未连接"状态，提示用户检查 Gateway 是否运行

**S3.2 Gateway 已连接时**
- 正常展示所有字段
- uptime 每分钟自动更新（前端计时器，不重新 RPC）

### R4: Updates 模块

**版本信息展示**
- 当前版本号从 `statusSummary()` 获取
- 配置通道（stable / beta / dev）从 `configGet()` 的 `config.update.channel` 获取

**更新操作**
- "检查更新" 按钮：调用 `updateRun()` 触发更新
- 更新前展示 ConfirmDialog："更新过程中 Gateway 将重启，连接将短暂中断。确定继续？"
- 更新中展示进度状态（loading spinner + "正在更新..."）
- 更新结果展示：成功（新版本号 + "Gateway 正在重启"） / 失败（错误信息） / 无更新（"已是最新版本"）

#### 场景

**S4.1 更新成功流程**
- 用户点击"检查更新" → 确认弹窗 → 确认
- 调用 `updateRun()` → 等待结果
- 结果 `status: "ok"` → 展示"更新成功，版本从 x 升级到 y，Gateway 正在重启"
- WS 连接中断 → 自动重连 → 重连后刷新 statusSummary

**S4.2 更新无变化**
- 结果 `status: "noop"` → 展示"已是最新版本"

**S4.3 更新失败**
- 结果 `status: "error"` → 展示错误信息 + 步骤日志

### R5: Advanced 模块

**开发者模式开关**
- Toggle 开关，状态存储在 `settings-store.ts` 的 `devModeUnlocked` 字段
- 持久化到 localStorage
- 关闭时 Developer 模块不渲染
- 提示文案："启用后将显示开发者工具选项"

### R6: Developer 模块（仅开发者模式可见）

**Gateway Token**
- 从 `configGet()` 获取 `config.gateway.auth.token` 值（已脱敏为 `__OPENCLAW_REDACTED__`）
- 展示"已配置"状态 + 复制按钮
- 实际在 Web 端无法获取明文 Token（Gateway 脱敏了），可展示提示"请使用 CLI `openclaw config get gateway.auth.token` 查看完整 Token"

**配置文件路径**
- 从 `configGet()` 获取 `path` 字段（如 `~/.openclaw/openclaw.json`）
- 展示路径 + 复制按钮

**原始配置预览**
- 从 `configGet()` 获取 `raw` 字段（已脱敏的 JSON5 文本）
- 在 `<pre>` 代码块中展示
- 可折叠/展开

**连接信息**
- Gateway WebSocket URL（从环境变量 / 当前连接 URL 获取）
- 连接状态（来自 WS 客户端状态）

#### 场景

**S6.1 开发者查看配置**
- 打开 Developer 模块
- 配置文件路径显示 `~/.openclaw/openclaw.json`
- 原始配置展示脱敏后的 JSON5 文本

### R7: About 模块

静态信息展示：
- 应用名称：OpenClaw Office
- 描述标语（i18n 管理）
- 版本号：从 `statusSummary()` 获取 Gateway 版本
- 文档链接：`https://docs.openclaw.ai`
- GitHub 链接：`https://github.com/openclaw/openclaw`

### R8: Settings Store 本地偏好扩展

扩展 `src/store/console-stores/settings-store.ts`，新增字段：

```typescript
devModeUnlocked: boolean;
setDevModeUnlocked: (v: boolean) => void;
```

持久化到 localStorage（key: `openclaw-office-settings`）。

### R9: 页面初始化与数据加载

**加载时序**
1. SettingsPage 挂载 → 并行触发 `configStore.fetchConfig()` + `configStore.statusSummary()`
2. Provider 列表从 config 中提取
3. Gateway 状态从 status 结果展示
4. 本地偏好从 settings-store 读取（localStorage，同步）

**加载状态**
- Config 和 Status 加载中时展示 LoadingState
- 任一失败时展示对应模块的 ErrorState（不阻塞其他模块）

#### 场景

**S9.1 部分加载失败**
- config.get 成功但 status 失败
- Provider 模块正常展示，Gateway 模块展示 ErrorState
- 其他本地偏好模块（Appearance / Advanced / About）不受影响

## 验收标准

- [ ] 7 个模块全部渲染在 Settings 页面中
- [ ] Appearance 主题切换立即生效
- [ ] Appearance 语言切换立即刷新所有 i18n 文本
- [ ] Gateway 模块展示真实运行状态（连接 Gateway 时）
- [ ] Updates 模块可触发真实更新（连接 Gateway 时）
- [ ] Developer 模块仅在开发者模式开启后可见
- [ ] 所有用户可见文本通过 i18n 管理
- [ ] 页面加载失败时各模块独立降级
