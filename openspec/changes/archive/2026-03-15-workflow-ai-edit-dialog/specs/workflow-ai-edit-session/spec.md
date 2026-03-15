## ADDED Requirements

### Requirement: AI 编辑面板组件
系统 SHALL 在 Workflow 编辑页提供一个可展开/收起的 AI 编辑对话面板，用户可通过自然语言向 Agent 发送编辑指令。

#### Scenario: 打开 AI 编辑面板
- **WHEN** 用户点击 Workflow 编辑页的 "AI 编辑" 按钮
- **THEN** 在页面右侧展开 AI 编辑对话面板，面板包含消息列表区域和底部输入框

#### Scenario: 收起 AI 编辑面板
- **WHEN** 用户点击面板的关闭按钮
- **THEN** 面板收起，不影响画布和步骤详情面板的正常使用

#### Scenario: 面板与步骤详情共存
- **WHEN** AI 编辑面板已打开且用户选中了画布上的节点
- **THEN** 步骤详情面板 MUST 切换为 tab 模式，用户可在 "步骤详情" 和 "AI 编辑" 两个 tab 之间切换

### Requirement: 专用 Session 管理
系统 SHALL 为每个 Workflow 创建/复用一个专用的 chat session，session key 格式为 `agent:{agentId}:workflow-edit:{workflowName}`。

#### Scenario: 首次打开 AI 编辑面板
- **WHEN** 用户首次在某个 Workflow 编辑页打开 AI 编辑面板
- **THEN** 系统 MUST 使用 `agent:main:workflow-edit:{workflowName}` 作为 session key，并尝试加载该 session 的历史消息

#### Scenario: 切换 Workflow 后 session 切换
- **WHEN** 用户从 workflow A 的编辑页导航到 workflow B 的编辑页
- **THEN** AI 编辑面板的 session MUST 切换为 workflow B 的专用 session

#### Scenario: 复用已有 session
- **WHEN** 用户再次打开之前使用过 AI 编辑的 Workflow
- **THEN** 系统 MUST 加载该 Workflow 的历史对话消息，让用户看到之前的编辑讨论

### Requirement: Workflow 上下文自动注入
系统 SHALL 在发送 AI 编辑指令时，自动将当前 Workflow YAML 内容作为上下文前缀注入到消息中。

#### Scenario: 发送编辑指令
- **WHEN** 用户在 AI 编辑面板输入 "在第 2 步后面加一个审批步骤" 并发送
- **THEN** 实际发送给 Gateway 的消息 MUST 包含当前 Workflow YAML 作为上下文前缀，格式为：`[Workflow: {name}]\n```yaml\n{yaml内容}\n```\n\n{用户指令}`

#### Scenario: 大型 Workflow 上下文截断
- **WHEN** 当前 Workflow YAML 超过 10000 字符
- **THEN** 系统 SHALL 对 YAML 内容进行摘要处理（仅保留步骤 id 和命令前 80 字符），并附注 "[内容已截断，完整文件在 Gateway 文件系统]"

### Requirement: 流式响应展示
AI 编辑面板 SHALL 支持流式展示 Agent 的回复过程。

#### Scenario: Agent 思考中
- **WHEN** Agent 正在处理编辑请求，Gateway 发送 `delta` 状态的 chat 事件
- **THEN** 面板 MUST 实时展示 Agent 的回复文本，使用 Markdown 渲染，并显示流式指示动画

#### Scenario: Agent 回复完成
- **WHEN** Gateway 发送 `final` 状态的 chat 事件
- **THEN** 面板 MUST 将完整回复添加到消息列表，清除流式指示，并触发 Workflow 变更检测

#### Scenario: 中止 Agent 回复
- **WHEN** 用户在 Agent 回复过程中点击 "停止" 按钮
- **THEN** 系统 MUST 调用 `chatAbort` RPC 中止当前回复，清除流式状态

### Requirement: 编辑结果自动检测与画布刷新
系统 SHALL 在 Agent 回复完成后自动检测 Workflow 文件是否被修改，若已修改则自动刷新画布。

#### Scenario: Agent 修改了 Workflow 文件
- **WHEN** Agent 回复 `final` 后，系统重新拉取 Workflow YAML 发现内容与当前本地内容不同
- **THEN** 系统 MUST 在刷新前推入 undo 快照，然后用新内容重新解析 YAML → 生成节点/边 → 更新画布，并显示 "AI 已更新工作流" 提示

#### Scenario: Agent 未修改 Workflow 文件
- **WHEN** Agent 回复 `final` 后，系统重新拉取 Workflow YAML 发现内容与当前一致
- **THEN** 系统 MUST 不触发画布刷新，不显示更新提示

#### Scenario: 用户有未保存的本地修改
- **WHEN** Agent 修改了 Workflow 文件，但用户本地有未保存（dirty）的修改
- **THEN** 系统 MUST 弹出确认对话框，提示 "AI 修改了工作流，但您有未保存的本地修改。是否覆盖？"，提供 "应用 AI 修改" 和 "保留本地修改" 两个选项

### Requirement: 手动应用兜底路径
当 Agent 回复中包含 YAML 代码块但未直接修改文件时，系统 SHALL 提供手动应用选项。

#### Scenario: Agent 建议了修改但未存盘
- **WHEN** Agent 的回复中包含 ` ```yaml ` 代码块，但 Workflow 文件未发生变化
- **THEN** 面板 MUST 在回复下方显示 "应用此修改" 按钮，用户点击后将代码块中的 YAML 写入 Workflow 文件并刷新画布

#### Scenario: 多个 YAML 代码块
- **WHEN** Agent 回复中包含多个 YAML 代码块
- **THEN** 系统 MUST 仅识别最后一个完整的 YAML 代码块（假设为最终版本），并提供 "应用此修改" 按钮
