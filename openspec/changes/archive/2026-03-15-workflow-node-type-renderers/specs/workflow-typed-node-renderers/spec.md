## ADDED Requirements

### Requirement: 专属节点画布组件
系统 SHALL 为每种扩展节点类型提供独立的 React Flow 节点组件，在画布上展示与该类型语义相关的关键信息摘要。

#### Scenario: LLM Task 节点展示 prompt 和 model
- **WHEN** 画布渲染一个 `llm-task-step` 类型的节点
- **THEN** 节点 MUST 展示：Brain 图标 + 绿色配色、step id 标题、prompt 前 40 字符摘要、model badge（如有）

#### Scenario: OpenClaw Invoke 节点展示 tool 和 action
- **WHEN** 画布渲染一个 `openclaw-invoke-step` 类型的节点
- **THEN** 节点 MUST 展示：Plug 图标 + 紫色配色、step id 标题、tool 名称 badge、action badge

#### Scenario: Exec 节点展示 shell 命令
- **WHEN** 画布渲染一个 `exec-step` 类型的节点
- **THEN** 节点 MUST 展示：Play 图标 + 青色配色、step id 标题、shell 命令前 50 字符预览、JSON 输出标记（如启用）

#### Scenario: Approval 节点展示审批信息
- **WHEN** 画布渲染一个 `approval-step` 类型的节点
- **THEN** 节点 MUST 展示：ShieldCheck 图标 + 橙色配色、step id 标题、审批提示文本预览

#### Scenario: Data Transform 节点展示操作类型
- **WHEN** 画布渲染一个 `data-transform-step` 类型的节点
- **THEN** 节点 MUST 展示：Filter 图标 + 蓝绿配色、step id 标题、操作子类型（where/pick/head/sort/dedupe）badge、表达式预览

#### Scenario: State Op 节点展示状态操作
- **WHEN** 画布渲染一个 `state-op-step` 类型的节点
- **THEN** 节点 MUST 展示：Database 图标 + 灰蓝配色、step id 标题、操作（get/set）badge、state key

#### Scenario: Shell 节点兜底展示
- **WHEN** 画布渲染一个 `shell-step` 类型的节点
- **THEN** 节点 MUST 展示：Terminal 图标 + 蓝色配色、step id 标题、原始命令前 60 字符预览（与现有行为一致）

### Requirement: 类型化编辑面板
`StepDetailPanel` SHALL 根据节点类型分发到不同的子面板组件，每种子面板提供与命令参数匹配的结构化表单字段。

#### Scenario: LLM Task 编辑面板
- **WHEN** 用户选中一个 `llm-task-step` 节点
- **THEN** 右侧面板 MUST 展示：prompt（多行文本域）、model（文本输入）、temperature（数字输入/滑块，0-2 范围）、max_output_tokens（数字输入）、output_schema（JSON 编辑区域）、artifacts（JSON 编辑区域）

#### Scenario: OpenClaw Invoke 编辑面板
- **WHEN** 用户选中一个 `openclaw-invoke-step` 节点
- **THEN** 右侧面板 MUST 展示：tool（文本输入）、action（文本输入）、args（JSON 结构化编辑器，将 `--args-json` 拆解为键值对表单）、dry-run（复选框）、session-key（文本输入，可选）

#### Scenario: Exec 编辑面板
- **WHEN** 用户选中一个 `exec-step` 节点
- **THEN** 右侧面板 MUST 展示：shell 命令（多行文本域）、json 输出（复选框）、stdin 模式（下拉：raw/json/jsonl）

#### Scenario: Approval 编辑面板
- **WHEN** 用户选中一个 `approval-step` 节点
- **THEN** 右侧面板 MUST 展示：prompt（文本输入）、emit 开关（复选框）、approval 等级（必须/可选，下拉）

#### Scenario: Data Transform 编辑面板
- **WHEN** 用户选中一个 `data-transform-step` 节点
- **THEN** 右侧面板 MUST 展示：操作类型（下拉：where/pick/head/sort/dedupe/map/group_by）、表达式/参数（文本输入，根据操作类型不同有不同 placeholder 提示）

#### Scenario: State Op 编辑面板
- **WHEN** 用户选中一个 `state-op-step` 节点
- **THEN** 右侧面板 MUST 展示：操作（下拉：get/set）、key（文本输入）、value（JSON 编辑区域，仅 set 时显示）

#### Scenario: 表单编辑同步回 command 字段
- **WHEN** 用户在类型化表单中修改任何字段并失焦
- **THEN** 系统 MUST 通过 `serializeCommand` 将修改后的结构化对象序列化回 command 字符串，并触发 `onChange` 回调更新节点数据

### Requirement: 扩展步骤调色板
`StepPalette` SHALL 展示扩展后的节点类型，按功能分组排列，支持拖拽到画布创建对应类型的新节点。

#### Scenario: 调色板展示所有节点类型
- **WHEN** 用户查看步骤调色板
- **THEN** MUST 展示以下可拖拽项（按组）：
  - 执行类：Shell、Exec、OpenClaw Invoke、LLM Task
  - 控制类：Approval
  - 数据类：Data Transform、State Op

#### Scenario: 拖拽创建新节点
- **WHEN** 用户将调色板中的 "LLM Task" 拖拽到画布
- **THEN** 在放置位置创建一个 `llm-task-step` 节点，command 预填 `llm_task.invoke --prompt ""`，节点使用 LLM Task 专属渲染

### Requirement: 环境变量可编辑
步骤的 `env` 字段 SHALL 从只读展示变为可编辑的键值对列表。

#### Scenario: 添加新环境变量
- **WHEN** 用户点击 env 区域的"添加"按钮
- **THEN** 新增一行空的 key-value 输入，用户可输入键名和值

#### Scenario: 删除环境变量
- **WHEN** 用户点击某个 env 条目的删除按钮
- **THEN** 该环境变量从步骤中移除

#### Scenario: 编辑环境变量
- **WHEN** 用户修改 env 条目的 key 或 value
- **THEN** 修改即时反映到步骤数据中，标记工作流为脏（dirty）

### Requirement: JSON 参数结构化编辑器
对于 `--args-json` 参数，系统 SHALL 提供结构化的键值对编辑器，将 JSON 对象拆解为可独立编辑的字段行。

#### Scenario: JSON 对象拆解展示
- **WHEN** `--args-json` 的值为 `{"prompt":"Hello","model":"gpt-4","temperature":0.7}`
- **THEN** 编辑器 MUST 展示 3 行：`prompt = Hello`（文本）、`model = gpt-4`（文本）、`temperature = 0.7`（数字）

#### Scenario: 新增 JSON 字段
- **WHEN** 用户点击"添加字段"按钮
- **THEN** 新增一行空的 key-value 输入

#### Scenario: 切换到原始 JSON 编辑
- **WHEN** 用户点击"原始 JSON"切换按钮
- **THEN** 展示格式化的 JSON 文本域，用户可直接编辑原始 JSON

#### Scenario: 嵌套对象/数组展示
- **WHEN** JSON 中某个值为对象或数组
- **THEN** 该字段的值区域展示为只读的 JSON 预览 + "编辑"按钮，点击后弹出 JSON 文本域编辑
