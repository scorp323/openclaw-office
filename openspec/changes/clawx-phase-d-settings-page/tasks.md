# Phase D — Settings Page 任务清单

> 基于 config.get / config.patch / status / update.run 等 Gateway 原生 RPC 的新架构。

---

## 一、类型定义 & Adapter 层

- [x] **T1.1** `adapter-types.ts` — 新增 `ConfigSnapshot`、`ConfigPatchResult`、`ConfigSchemaResponse`、`ConfigUiHint`、`StatusSummary`、`UpdateRunResult` 类型定义
- [x] **T1.2** `adapter.ts` — 在 `GatewayAdapter` 接口新增 5 个方法签名：`configGet()`、`configPatch()`、`configSchema()`、`statusSummary()`、`updateRun()`
- [x] **T1.3** `ws-adapter.ts` — 实现 5 个新方法：分别映射到 `config.get`、`config.patch`、`config.schema`、`status`、`update.run` RPC
- [x] **T1.4** `mock-adapter.ts` — 实现 5 个新方法：内存 config 读写（含 merge-patch 和 null 删除语义）+ 预填示例 Provider 数据 + mock 状态/更新结果
- [x] **T1.5** `adapter-phase-d.test.ts` — MockAdapter 新方法单元测试：configGet/configPatch（含 baseHash、merge-patch 删除、脱敏模拟）

## 二、Store 层

- [x] **T2.1** `config-store.ts`（新建）— Gateway 配置读写 store：`fetchConfig()`、`patchConfig()`、`fetchSchema()`，管理 config + hash + loading + error 状态
- [x] **T2.2** `settings-store.ts`（扩展）— 新增 `devModeUnlocked` 字段 + setter，localStorage 持久化
- [x] **T2.3** `config-store.test.ts`（新建）— Config Store 单元测试：fetchConfig、patchConfig（成功/失败/baseHash 冲突）、Provider CRUD 通过 patchConfig 的流程

## 三、Provider 类型元数据

- [x] **T3.1** `src/lib/provider-types.ts`（新建）— 定义 `ProviderTypeMeta` 接口 + `PROVIDER_TYPE_INFO` 数组 + `inferProviderType()` 推断函数

## 四、UI 组件

- [x] **T4.1** `src/components/console/settings/AppearanceSection.tsx` — 主题三选（Light/Dark/System）+ 语言二选（中文/English），读写 useOfficeStore.theme + i18n.changeLanguage
- [x] **T4.2** `src/components/console/settings/ProvidersSection.tsx` — Provider 列表容器，从 configStore.config 提取 models.providers，渲染 ProviderCard 列表 + 添加按钮 + EmptyState
- [x] **T4.3** `src/components/console/settings/ProviderCard.tsx` — 单个 Provider 卡片：展示 ID、类型（推断）、baseUrl、apiKey 状态、编辑/删除按钮
- [x] **T4.4** `src/components/console/settings/AddProviderDialog.tsx` — 两步弹窗：Step1 选择类型 → Step2 填写配置（ID/baseUrl/apiKey/api），提交调用 configStore.patchConfig
- [x] **T4.5** `src/components/console/settings/EditProviderDialog.tsx` — 编辑弹窗：预填当前值（apiKey 为脱敏 placeholder），保存调用 configStore.patchConfig
- [x] **T4.6** `src/components/console/settings/GatewaySection.tsx` — 从 statusSummary 展示 Gateway 运行信息（版本/端口/运行时间/模式/Node版本/平台）+ 刷新按钮
- [x] **T4.7** `src/components/console/settings/UpdateSection.tsx` — 版本号展示 + 更新通道 + "检查更新"按钮（含确认弹窗）+ 更新结果展示（成功/noop/失败）
- [x] **T4.8** `src/components/console/settings/AdvancedSection.tsx` — 开发者模式 Toggle 开关
- [x] **T4.9** `src/components/console/settings/DeveloperSection.tsx` — Gateway Token 状态、配置文件路径、原始配置预览（可折叠）、WS 连接信息
- [x] **T4.10** `src/components/console/settings/AboutSection.tsx` — 应用名称/标语/版本/文档链接/GitHub链接

## 五、页面集成

- [x] **T5.1** `src/components/pages/SettingsPage.tsx` — 从占位重写为完整功能页面：垂直 Card 布局，挂载时并行加载 config + status，各模块独立降级
- [x] **T5.2** Developer 模块条件渲染 — 仅在 settingsStore.devModeUnlocked === true 时渲染 DeveloperSection

## 六、国际化 (i18n)

- [x] **T6.1** `src/i18n/locales/zh/console.json` — 扩展 `settings` 子树：7 个模块的所有标签/提示/按钮/状态文本 + Provider 类型名称 + 更新状态文案 + 开发者工具文案
- [x] **T6.2** `src/i18n/locales/en/console.json` — 英文翻译，与中文 key 结构完全镜像

## 七、验收 & 扫尾

- [x] **T7.1** TypeScript 编译检查 — `pnpm typecheck` 通过
- [x] **T7.2** 单元测试 — `pnpm test` 所有现有 + 新增测试通过
- [x] **T7.3** 无 Gateway 连接烟测 — Settings 页面所有 7 个模块正确渲染，Gateway 未连接时显示合理空状态
- [x] **T7.4** 真实 Gateway 连接验证 — 连接 Gateway 后 Provider 列表(2个)、Gateway 状态(版本2026.2.26/端口18789/运行时间0h21m)、开发者工具(configPath/wsUrl/token状态) 均正确显示

---

**总计: 27 个任务**

**依赖顺序:**
- T1.x（Adapter 层）→ T2.x（Store 层）→ T4.x（UI 组件）→ T5.x（页面集成）
- T3.1（Provider 元数据）可与 T1.x 并行
- T6.x（i18n）可与 T4.x 并行
- T7.x（验收）最后执行
