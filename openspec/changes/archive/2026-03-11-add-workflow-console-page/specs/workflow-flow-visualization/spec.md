## ADDED Requirements

### Requirement: Lobster 步骤到 React Flow 节点映射

系统 SHALL 将每个 Lobster 工作流步骤（step）映射为一个 React Flow 节点。节点 SHALL 根据步骤特征分为三种类型：

| 步骤特征 | 节点类型 | 视觉标识 |
|---------|---------|---------|
| `command` 包含 `openclaw.invoke` | `tool-step` | 工具图标 + 工具名称提取 |
| `approval` 为 `true` 或 `"required"` | `approval-step` | 盾牌图标 + "审批" 标记 |
| 其他普通命令 | `shell-step` | 终端图标 + 命令预览（截断至 60 字符） |

每个节点 SHALL 显示：步骤 ID（`id`）、节点类型图标、命令/工具简要预览。

#### Scenario: 普通 shell 命令步骤

- **WHEN** 工作流包含步骤 `{ id: "list_files", command: "ls -t ~/logseq/journals/*.md | head -5" }`
- **THEN** 渲染为 `shell-step` 类型节点，显示终端图标、ID "list_files"、命令预览 "ls -t ~/logseq/journals/*.md | head-5"

#### Scenario: openclaw.invoke 工具调用步骤

- **WHEN** 工作流包含步骤 `{ id: "extract", command: "openclaw.invoke --tool llm-task ..." }`
- **THEN** 渲染为 `tool-step` 类型节点，显示工具图标、ID "extract"、工具名 "llm-task"

#### Scenario: 审批门控步骤

- **WHEN** 工作流包含步骤 `{ id: "approve", approval: "required" }`
- **THEN** 渲染为 `approval-step` 类型节点，显示盾牌图标、ID "approve"、"需要审批" 标记

### Requirement: 步骤间边的映射

系统 SHALL 根据步骤关系生成三种类型的边：

1. **顺序执行边**（默认边）：相邻步骤 i 和 i+1 之间 SHALL 生成实线箭头边，表示执行顺序
2. **数据流边**：当步骤 B 的 `stdin` 字段引用 `$stepA.stdout` 或 `$stepA.json` 时，SHALL 从节点 A 到节点 B 生成蓝色虚线边，标注 "stdout" 或 "json"
3. **条件边**：当步骤 B 的 `condition`/`when` 字段引用 `$stepA.approved` 或 `$stepA.skipped` 时，SHALL 从节点 A 到节点 B 生成橙色虚线边，标注条件表达式

#### Scenario: 线性顺序工作流

- **WHEN** 工作流有 3 个步骤 test1 → test2 → test3，无 stdin/condition 引用
- **THEN** 生成 2 条顺序执行边：test1→test2、test2→test3

#### Scenario: 数据流依赖

- **WHEN** 步骤 categorize 的 stdin 为 `$collect.stdout`
- **THEN** 生成一条从 collect 到 categorize 的蓝色数据流边，标注 "stdout"

#### Scenario: 条件门控

- **WHEN** 步骤 execute 的 condition 为 `$approve.approved`
- **THEN** 生成一条从 approve 到 execute 的橙色条件边，标注 "$approve.approved"

### Requirement: 自动布局

系统 SHALL 使用 dagre 布局算法对节点进行自上而下（top-to-bottom）的自动排列。初次打开工作流时 SHALL 自动计算布局。节点间 SHALL 保持合适的垂直和水平间距（建议节点间距垂直 80px、水平 200px）。

#### Scenario: 打开线性工作流

- **WHEN** 用户打开一个包含 5 个顺序步骤的工作流
- **THEN** 5 个节点自上而下排列，顺序边连接相邻节点，整体居中显示

#### Scenario: 打开含数据流交叉的工作流

- **WHEN** 工作流中步骤 D 的 stdin 引用步骤 A（非相邻）
- **THEN** dagre 算法计算合理布局，数据流边清晰可见无严重交叉

### Requirement: 流程图交互控件

流程图视图 SHALL 支持以下交互：
- 鼠标滚轮缩放（zoom）
- 鼠标拖拽画布平移（pan）
- 点击节点选中并高亮
- 小地图（MiniMap）展示全局视图
- 控制栏（Controls）包含放大、缩小、适配视图按钮
- "重新布局" 按钮触发 dagre 重新计算节点位置

#### Scenario: 缩放与平移

- **WHEN** 用户在流程图区域滚动鼠标滚轮
- **THEN** 流程图按鼠标位置缩放

- **WHEN** 用户按住鼠标左键拖拽画布空白区域
- **THEN** 流程图平移

#### Scenario: 选中节点

- **WHEN** 用户点击某个步骤节点
- **THEN** 该节点高亮选中，右侧展开步骤属性面板

#### Scenario: 重新布局

- **WHEN** 用户点击"重新布局"按钮
- **THEN** 所有节点使用 dagre 重新计算位置，动画过渡到新位置

### Requirement: 步骤详情面板

选中节点时 SHALL 在右侧展开步骤详情面板，展示该步骤的完整属性：
- 步骤 ID（`id`）
- 命令（`command`）— 以代码块形式展示
- 数据输入（`stdin`）— 显示引用的步骤 ID 和数据类型
- 审批要求（`approval`）— 是/否
- 执行条件（`condition`/`when`）— 显示条件表达式
- 环境变量（`env`）— 键值对列表
- 工作目录（`cwd`）

#### Scenario: 查看普通步骤详情

- **WHEN** 用户点击一个 shell-step 节点
- **THEN** 右侧面板展示该步骤的 id、command（代码块）、stdin（若有）、condition（若有）

#### Scenario: 关闭详情面板

- **WHEN** 用户点击流程图画布空白区域
- **THEN** 步骤详情面板关闭

### Requirement: Lobster YAML 解析器

系统 SHALL 提供 `src/lib/lobster-parser.ts` 模块，包含以下函数：
- `parseLobsterYaml(content: string): LobsterWorkflow` — 将 YAML 字符串解析为类型安全的工作流对象
- `lobsterToFlow(workflow: LobsterWorkflow): { nodes: Node[], edges: Edge[] }` — 将工作流对象转换为 React Flow 节点和边
- 解析器 SHALL 对未知字段做 passthrough 保留，不丢弃

该解析器运行在前端浏览器中，处理从本地 API（`workflowsApi.get()`）获取的 `rawContent` YAML 字符串。后端 API 同样需要解析 YAML 以提取元信息（name/description/stepsCount/args），后端使用内联的轻量 YAML 解析（`js-yaml` 或 Node 原生方案）。

#### Scenario: 解析合法的 .lobster YAML

- **WHEN** 输入一段合法的 Lobster YAML（包含 name、description、steps）
- **THEN** 返回正确的 LobsterWorkflow 对象，steps 数组包含所有步骤

#### Scenario: 解析含 args 的工作流

- **WHEN** YAML 包含 `args: { model: { default: "gpt-4" } }`
- **THEN** 解析结果中 `args` 为 `{ model: { default: "gpt-4" } }`

#### Scenario: 转换为 React Flow 图数据

- **WHEN** 工作流包含 4 个步骤，步骤 2 的 stdin 引用步骤 1
- **THEN** 生成 4 个节点和至少 4 条边（3 条顺序边 + 1 条数据流边）

#### Scenario: 解析实际的 .lobster 文件

- **WHEN** 输入 `~/.openclaw/workflows/logseq-memory-ingest.lobster` 的真实内容
- **THEN** 正确解析出 name "logseq-memory-ingest"、5 个步骤、各步骤的 command 字段
