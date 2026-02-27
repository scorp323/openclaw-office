## Why

Phase A（架构底座）、Phase B（Chat Dock）、Phase C（Dashboard / Channels / Skills / Cron）已完成并归档/通过验收。Settings 页面目前仍为"Coming Soon"占位组件，是 `docs/ClawX-界面复刻实施规划.md` Phase D 的核心交付项。用户当前无法在 Web 端进行外观切换、AI Provider 管理、Gateway 状态查看、版本更新操作，以及开发者工具访问。

**关键设计变更**：经过对父级 OpenClaw 仓库的深入调研，确认 Gateway 已经具备 Settings 所需的全部底层 RPC 能力。本次实现**直接复用 Gateway 原生 RPC**（`config.get` / `config.patch` / `config.schema` / `status` / `update.run` / `models.list`），将 OpenClaw Office 定位为 **OpenClaw 内置 Control UI 的升级版**，底层能力完全复用，不发明新的 RPC 方法。

与 ClawX（Electron 桌面应用）的核心区别：ClawX 通过独立的 Provider Registry + Electron IPC 管理 Provider 配置；Office 直接通过 Gateway `config.patch` 读写 `~/.openclaw/openclaw.json` 配置文件中的 `models.providers` 节，与 CLI `openclaw config set` 完全等价。

## What Changes

**Appearance（外观设置）**
- 主题切换：light / dark / system 三选一，与现有 `office-store.theme` 统一同步
- 语言切换：中文 / English，与现有 i18n `changeLanguage()` 联动
- 偏好持久化到 localStorage（本地浏览器级别，不写入 Gateway 配置）

**AI Providers（AI 模型供应商管理）——基于 config.get/config.patch**
- 从 `config.get` 返回的 `models.providers` 节构建 Provider 列表
- 通过 `config.patch` 的 JSON Merge Patch 修改 Provider 配置（新增/编辑/删除）
- API Key 写入 `models.providers.<id>.apiKey`，Gateway 自动处理脱敏/恢复
- 利用 `config.schema` 返回的 `uiHints`（`sensitive` / `label` / `placeholder`）辅助表单渲染
- 支持 `baseHash` 乐观并发控制，防止配置覆盖冲突
- 配置写入后 Gateway 自动重启，前端需处理 WS 重连

**Gateway 状态——基于 status RPC**
- 从 `status` RPC 获取真实的 Gateway 运行信息（版本号、端口、运行时间）
- 重启提示（config.patch 写入配置后 Gateway 自动重启）

**Updates（版本更新）——基于 update.run RPC**
- 版本号从 `status` RPC 获取
- 调用 `update.run` 触发真实的 git pull + pnpm install + Gateway 重启
- 更新前展示确认弹窗（更新过程中 Gateway 会重启）
- 展示更新结果（成功/失败/步骤日志）

**Advanced（高级设置）**
- 开发者模式开关（本地偏好）

**Developer（开发者工具）——仅在开发者模式开启后显示**
- 从 `status` RPC 获取 Gateway Token 并支持复制
- Gateway 配置文件路径展示
- 从 `config.get` 获取原始配置 JSON 展示

**About（关于）**
- 应用名称、标语、版本号（从 `status` RPC 获取）
- 文档链接、GitHub 链接

**横向基础设施**
- 扩展 `GatewayAdapter` 接口：新增 `configGet()` / `configPatch()` / `configSchema()` / `statusSummary()` / `updateRun()` 共 5 个通用方法（对 Gateway RPC 的薄封装）
- 扩展 `adapter-types.ts`：新增 `ConfigSnapshot` / `ConfigPatchResult` / `StatusSummary` / `UpdateRunResult` 类型
- 新建 `config-store.ts`：Gateway 配置读写 store（configGet + configPatch + baseHash 管理）
- 扩展 `settings-store.ts`：新增本地偏好字段（gatewayAutoStart / devModeUnlocked 等）
- 新增 `provider-types.ts`：Provider 类型元数据（UI 展示用）
- 补充 `console.json` 中英文翻译 key

## Capabilities

### New Capabilities
- `settings-page`: Settings 完整界面——Appearance / AI Providers / Gateway / Updates / Advanced / Developer / About 七大模块的交互 UI
- `settings-providers`: AI Provider 管理能力——基于 `config.get`/`config.patch` 的 Provider 列表/新增/编辑/删除流程，直接读写 `openclaw.json` 配置文件
- `settings-adapter`: Gateway Adapter Settings 扩展——`configGet` / `configPatch` / `configSchema` / `statusSummary` / `updateRun` 五个通用 RPC 封装方法的接口定义与 Mock/WS 双实现

### Modified Capabilities
（无已有 spec 需要修改）

## Impact

**新增/修改文件预估**
- `src/gateway/adapter-types.ts` — 新增 ConfigSnapshot / StatusSummary / UpdateRunResult 类型
- `src/gateway/adapter.ts` — 新增 5 个方法签名（configGet / configPatch / configSchema / statusSummary / updateRun）
- `src/gateway/mock-adapter.ts` — 新增方法 Mock 实现（模拟 config 读写 + 状态/更新）
- `src/gateway/ws-adapter.ts` — 新增方法 RPC 映射（config.get → configGet 等）
- `src/store/console-stores/settings-store.ts` — 扩展本地偏好字段
- `src/store/console-stores/config-store.ts` — 新增 Gateway 配置读写 store
- `src/lib/provider-types.ts` — Provider 类型元数据（UI 展示用）
- `src/components/pages/SettingsPage.tsx` — 从占位重写为完整功能页面
- `src/components/console/settings/*.tsx` — 新增 ~9 个子组件
- `src/i18n/locales/{zh,en}/console.json` — 大幅扩展 settings 翻译 key

**依赖变更**
- 无新增 npm 依赖

**风险点**
- `config.patch` 写入后 Gateway 自动重启，WS 连接中断需自动重连
- `config.get` 返回的 API Key 已脱敏为 `__OPENCLAW_REDACTED__`，无法展示前缀/后缀
- `baseHash` 并发控制在多用户同时修改配置时可能导致写入失败
- OpenClaw `ModelProviderConfig` 结构与 ClawX `ProviderConfig` 不完全对齐（无 `name`/`enabled`/`type` 字段）
