## ADDED Requirements

### Requirement: Console 侧边栏显示 Workflows 菜单项

Console 左侧导航栏 SHALL 在 Cron 与 Settings 之间新增 "Workflows" 菜单项，使用 Lucide `Workflow` 图标，点击后导航至 `/workflows` 路由。菜单文案 SHALL 通过 i18n 翻译（`layout.consoleNav.workflows`）。

#### Scenario: 用户点击 Workflows 菜单

- **WHEN** 用户在 Console 侧边栏点击 "Workflows" 菜单项
- **THEN** 页面导航至 `/workflows`，该菜单项高亮为激活状态

#### Scenario: 菜单项国际化

- **WHEN** 用户切换语言为英文
- **THEN** 菜单文案显示为 "Workflows"
- **WHEN** 用户切换语言为中文
- **THEN** 菜单文案显示为 "工作流"

### Requirement: Workflows 路由注册

`/workflows` 路由 SHALL 注册在 `ConsoleLayout` 下，加载 `WorkflowsPage` 组件。`/workflows/:workflowName` 路由 SHALL 加载 `WorkflowDetailPage` 组件。`PAGE_MAP` SHALL 包含 `"/workflows": "workflows"` 映射。

#### Scenario: 直接访问 /workflows

- **WHEN** 用户在浏览器地址栏输入 `/workflows` 并访问
- **THEN** 系统渲染 WorkflowsPage 组件，侧边栏 Workflows 菜单项高亮

#### Scenario: 直接访问 /workflows/:name

- **WHEN** 用户在浏览器地址栏输入 `/workflows/simple-test` 并访问
- **THEN** 系统渲染 WorkflowDetailPage 组件，展示该工作流的流程图

### Requirement: 工作流列表加载与展示

WorkflowsPage SHALL 在挂载时通过 `workflowsApi.list()` HTTP 客户端获取工作流列表。列表中的每个工作流卡片 SHALL 显示以下信息：
- 工作流名称（`displayName` 或 `name` 字段）
- 描述（`description` 字段，若无则显示占位文案）
- 步骤数量（`stepsCount`）
- 参数列表摘要（`args` 以标签形式展示）

#### Scenario: 成功加载工作流列表

- **WHEN** 本地 API 返回包含 3 个工作流的列表
- **THEN** 页面展示 3 张工作流卡片，每张卡片显示名称、描述、步骤数和参数标签

#### Scenario: 加载中状态

- **WHEN** 工作流列表正在加载且尚无缓存数据
- **THEN** 页面显示 LoadingState 骨架屏

#### Scenario: 加载失败

- **WHEN** `workflowsApi.list()` 调用失败（如后端未启动或网络错误）
- **THEN** 页面显示 ErrorState，包含错误信息和"重试"按钮

#### Scenario: 空列表

- **WHEN** 本地 API 返回空的工作流列表
- **THEN** 页面显示 EmptyState，提示用户在 `~/.openclaw/workflows/` 目录中放置 `.lobster` 文件

### Requirement: 工作流卡片交互

点击工作流卡片 SHALL 导航至 `/workflows/:workflowName` 详情页面。卡片 SHALL 在鼠标悬停时展示视觉反馈（hover 效果）。

#### Scenario: 点击卡片进入详情

- **WHEN** 用户点击名为 "simple-test" 的工作流卡片
- **THEN** 页面导航至 `/workflows/simple-test`

### Requirement: 页面标题与刷新

WorkflowsPage SHALL 包含 PageHeader 组件，显示标题 "Workflows" 和刷新按钮。点击刷新 SHALL 重新加载工作流列表。

#### Scenario: 刷新列表

- **WHEN** 用户点击 PageHeader 中的刷新按钮
- **THEN** 系统重新调用 `workflowsApi.list()` 并更新列表数据
