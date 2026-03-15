## ADDED Requirements

### Requirement: 拖拽添加新步骤

编辑器 SHALL 在流程图左侧或上方提供步骤工具栏（Step Palette），包含可拖拽的步骤模板：
- Shell 命令步骤（`shell-step`）
- OpenClaw 工具调用步骤（`tool-step`）
- 审批门控步骤（`approval-step`）

用户 SHALL 能将步骤模板从工具栏拖拽到画布上创建新节点。新节点 SHALL 自动生成唯一的步骤 ID（格式：`step_N`，N 为递增序号）。

#### Scenario: 拖拽添加 shell 步骤

- **WHEN** 用户从步骤工具栏将 "Shell 命令" 拖拽到画布上
- **THEN** 画布上在放置位置创建一个新的 shell-step 节点
- **THEN** 新节点的 id 自动设为 `step_N`（N 为当前最大序号 +1）
- **THEN** 新节点自动选中并打开属性编辑面板

#### Scenario: 拖拽添加审批步骤

- **WHEN** 用户从步骤工具栏将 "审批门控" 拖拽到画布上
- **THEN** 创建一个 approval-step 节点，`approval` 字段默认为 `"required"`

### Requirement: 步骤属性编辑面板

选中节点后，右侧步骤详情面板 SHALL 切换为可编辑模式，包含以下可编辑字段：
- **步骤 ID**（`id`）— 文本输入，修改后 SHALL 自动更新所有引用该 ID 的 `stdin`/`condition` 表达式
- **命令**（`command`）— 多行文本编辑器（等宽字体）
- **数据输入**（`stdin`）— 下拉选择可引用的上游步骤 + 数据类型（stdout/json）
- **审批要求**（`approval`）— 开关（boolean/required）
- **执行条件**（`condition`）— 文本输入，支持 `$step.approved`/`$step.skipped`/`true`/`false`
- **环境变量**（`env`）— 键值对编辑器（可添加/删除行）
- **工作目录**（`cwd`）— 文本输入

#### Scenario: 编辑步骤命令

- **WHEN** 用户选中一个 shell-step 节点
- **THEN** 右侧面板显示该步骤的所有可编辑字段
- **WHEN** 用户修改 command 字段为 `echo "hello"`
- **THEN** 节点上的命令预览实时更新为 `echo "hello"`

#### Scenario: 修改步骤 ID 并自动更新引用

- **WHEN** 工作流中步骤 B 的 stdin 为 `$stepA.stdout`，用户将步骤 A 的 id 从 "stepA" 改为 "collect"
- **THEN** 步骤 B 的 stdin 自动更新为 `$collect.stdout`
- **THEN** 所有引用 `$stepA.*` 的条件表达式也自动更新

#### Scenario: 配置 stdin 数据源

- **WHEN** 用户在步骤属性面板的 stdin 下拉中选择 "list_files → stdout"
- **THEN** 该步骤的 stdin 设为 `$list_files.stdout`
- **THEN** 画布上自动生成从 list_files 到当前步骤的蓝色数据流边

### Requirement: 连线管理

用户 SHALL 能通过以下方式管理步骤间的连线：
- **创建连线**：从节点的输出锚点（handle）拖拽到另一节点的输入锚点，创建数据流边
- **删除连线**：选中边后按 Delete/Backspace 键删除
- **删除节点**：选中节点后按 Delete/Backspace 键删除该节点及其所有关联边

创建数据流边时，SHALL 自动更新目标节点的 `stdin` 字段为 `$source.stdout`。

#### Scenario: 拖拽创建数据流连线

- **WHEN** 用户从节点 A 的输出锚点拖拽到节点 B 的输入锚点
- **THEN** 生成一条从 A 到 B 的数据流边
- **THEN** 节点 B 的 stdin 自动设为 `$A.stdout`

#### Scenario: 删除步骤节点

- **WHEN** 用户选中一个步骤节点并按 Delete 键
- **THEN** 该节点和所有关联边被移除
- **THEN** 其他步骤中引用该节点 ID 的 stdin/condition 表达式标记为无效（红色高亮）

#### Scenario: 删除边

- **WHEN** 用户选中一条数据流边并按 Delete 键
- **THEN** 该边被移除
- **THEN** 目标节点的 stdin 字段被清空

### Requirement: 工作流元信息编辑

编辑器 SHALL 在页面顶部或流程图上方提供工作流元信息编辑区域：
- **名称**（`name`）— 文本输入
- **描述**（`description`）— 文本输入
- **参数**（`args`）— 键值对编辑器（键为参数名，值为默认值）

#### Scenario: 编辑工作流名称

- **WHEN** 用户将工作流名称从 "simple-test" 修改为 "my-workflow"
- **THEN** 工作流元信息中 name 字段更新

#### Scenario: 添加工作流参数

- **WHEN** 用户在参数编辑器中添加新行，键为 "tag"，默认值为 "family"
- **THEN** 工作流 args 中新增 `tag: { default: "family" }`

### Requirement: 序列化与保存

编辑器 SHALL 提供"保存"按钮（以及 Ctrl/Cmd+S 快捷键），将当前编辑状态序列化为 `.lobster` YAML 格式并通过 `workflowsApi.save(name, content)` HTTP 客户端保存到本地文件系统。

序列化 SHALL 遵循以下规则：
- 节点的纵向位置（y 坐标）决定步骤在 `steps` 数组中的顺序
- 数据流边转换为目标步骤的 `stdin` 字段
- 条件边转换为目标步骤的 `condition` 字段
- 未知/保留字段 SHALL 原样保留

`lobster-parser.ts` SHALL 提供：
- `flowToLobster(nodes, edges, metadata): LobsterWorkflow` — 从图数据反序列化为工作流对象
- `serializeLobsterYaml(workflow: LobsterWorkflow): string` — 序列化为 YAML 字符串

#### Scenario: 保存编辑后的工作流

- **WHEN** 用户修改了工作流的步骤和连线后点击"保存"
- **THEN** 系统将图结构序列化为 YAML
- **THEN** 调用 `workflowsApi.save(name, yamlContent)` 发送 PUT 请求保存到磁盘
- **THEN** 显示保存成功提示

#### Scenario: 步骤顺序由 y 坐标决定

- **WHEN** 用户将节点 C 拖拽到节点 A 和 B 之间（y 坐标排序为 A < C < B）
- **THEN** 序列化后 steps 数组顺序为 [A, C, B]

#### Scenario: Ctrl+S 快捷键保存

- **WHEN** 用户按 Ctrl+S（或 Cmd+S）
- **THEN** 触发保存操作，与点击保存按钮效果一致

### Requirement: 创建新工作流

WorkflowsPage 列表页 SHALL 提供"新建工作流"按钮。点击后 SHALL 导航至 `/workflows/_new` 并展示空的编辑器，用户可从零开始编排步骤。首次保存时 SHALL 使用工作流名称作为文件名（`<name>.lobster`），通过 `workflowsApi.save()` 写入磁盘。

#### Scenario: 创建新工作流

- **WHEN** 用户点击"新建工作流"按钮
- **THEN** 导航至 `/workflows/_new`
- **THEN** 展示空的流程图编辑器，工作流名称为空，无步骤

#### Scenario: 保存新工作流

- **WHEN** 用户在新建编辑器中添加了 2 个步骤，设置名称为 "my-pipeline"，点击保存
- **THEN** 调用 `workflowsApi.save("my-pipeline", yamlContent)` 发送 PUT 请求创建文件
- **THEN** 导航至 `/workflows/my-pipeline`

### Requirement: 未保存变更提示

当编辑器中存在未保存的变更时，系统 SHALL 在以下场景给出提示：
- 用户尝试离开编辑页面时显示确认对话框
- 页面标题或保存按钮旁显示"未保存"标记

#### Scenario: 离开时提示未保存

- **WHEN** 用户修改了工作流但未保存，尝试导航到其他页面
- **THEN** 系统弹出确认对话框："有未保存的更改，确定离开？"
- **WHEN** 用户确认离开
- **THEN** 丢弃更改并导航

#### Scenario: 未保存标记

- **WHEN** 用户修改了任何步骤属性或连线
- **THEN** 保存按钮旁显示圆点标记表示有未保存变更
