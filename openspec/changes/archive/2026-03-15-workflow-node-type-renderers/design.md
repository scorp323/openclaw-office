## Context

当前 Workflow 编辑界面基于 React Flow 构建，使用 `lobster-parser.ts` 中的 `classifyStep()` 将步骤分为 3 类（shell-step / tool-step / approval-step），然后在画布上使用 `BaseStepNode` 统一渲染。`StepDetailPanel` 对所有类型展示相同的 textarea 字段。

Lobster 引擎支持 20+ 种命令类型，每种命令的参数结构差异显著：
- `openclaw.invoke` 需要 `--tool`、`--action`、`--args-json` 等参数
- `llm_task.invoke` 需要 `--prompt`、`--model`、`--output-schema`、`--temperature` 等参数
- `approve` 需要 `--prompt`、`--emit` 等参数
- `exec` 需要 `--json`、`--shell`、`--stdin` 等参数
- `where`/`pick`/`head` 等数据处理命令有各自的过滤/选择语法

将这些命令参数从原始 CLI 字符串拆解为结构化表单，是提升 Workflow 可维护性的关键。

## Goals / Non-Goals

**Goals:**
- 为 Lobster 主要命令类型实现专属节点渲染（画布 + 编辑面板），覆盖最常用的 7 种类型
- 实现命令字符串 ↔ 结构化参数的双向无损解析
- 用户可通过表单字段编辑命令参数，不需手写 CLI
- `--args-json` 中的 JSON 拆解为独立字段展示和编辑
- 保持对未识别命令的 fallback（降级为通用 shell 节点）

**Non-Goals:**
- 不实现所有 20+ 种 Lobster 命令的专属渲染，仅覆盖高频类型
- 不实现工作流的运行/调试功能（属于后续提案）
- 不改变 Lobster YAML 文件格式本身
- 不实现 AI 辅助编辑（属于独立提案 #2）

## Decisions

### D1: 节点类型分类扩展策略

**决定**：将 `StepNodeType` 从 3 种扩展为 7 种：`exec-step`、`openclaw-invoke-step`、`llm-task-step`、`approval-step`、`data-transform-step`、`state-op-step`、`shell-step`（fallback）。

**备选方案**：
- A) 保持 3 类但增加子类型标识 → 缺点：节点组件无法按类型差异化渲染
- B) 为每种 Lobster 命令创建独立类型 → 缺点：类型数量过多，维护负担大

**理由**：7 种类型覆盖了 95%+ 的实际使用场景，且每种类型有明显不同的参数结构值得差异化展示。低频命令通过 `shell-step` 兜底。

### D2: 命令解析架构

**决定**：新增 `src/lib/command-parser.ts`，实现以下核心能力：
1. `parseCommand(command: string): ParsedCommand` — 将命令字符串解析为结构化对象
2. `serializeCommand(parsed: ParsedCommand): string` — 将结构化对象序列化回命令字符串
3. 每种命令类型定义参数 schema（TypeScript 接口 + 默认值）

解析策略：先检测命令是否以已知 Lobster 命令开头（`openclaw.invoke`、`llm_task.invoke`、`approve`、`exec`、`where`、`pick`、`head`、`sort`、`dedupe` 等），匹配到则按该命令的参数模式解析 `--flag value` 对，未匹配到的走 shell fallback。

**备选方案**：
- A) 使用通用 CLI 解析库（如 minimist）→ 缺点：无法处理 Lobster 管道语法和特殊的 `--args-json` 嵌套 JSON
- B) 正则逐个匹配 → 缺点：脆弱、难维护

**理由**：自建轻量解析器，针对 Lobster 的参数风格（`--flag value`、`--flag 'json-string'`）做精确匹配，同时处理管道（`|`）分隔和引号嵌套。

### D3: 节点画布渲染差异化

**决定**：每种节点类型展示不同的关键信息摘要：

| 节点类型 | 画布展示 |
|---|---|
| `exec-step` | Shell 命令预览、是否 JSON 输出 |
| `openclaw-invoke-step` | Tool 名称 badge、Action badge |
| `llm-task-step` | Prompt 摘要（前 40 字）、Model badge |
| `approval-step` | 审批提示文本、是否必须 |
| `data-transform-step` | 操作类型（where/pick/...）、表达式预览 |
| `state-op-step` | 操作（get/set）、state key |
| `shell-step` | 原始命令预览（兜底） |

节点使用不同的图标和配色，保持视觉辨识度。

### D4: StepDetailPanel 动态表单

**决定**：`StepDetailPanel` 根据 `nodeType` 分发到不同的子面板组件：

- `ExecStepFields` — shell 命令输入、JSON 输出开关、stdin 模式选择
- `OpenClawInvokeFields` — tool 下拉、action 输入、args JSON 结构化编辑器
- `LlmTaskFields` — prompt textarea、model 输入、temperature 滑块、output-schema 编辑器
- `ApprovalFields` — prompt 输入、emit 开关
- `DataTransformFields` — 操作类型选择（where/pick/head/sort/dedupe）、表达式输入
- `StateOpFields` — 操作选择（get/set）、key 输入、value 输入
- `ShellStepFields` — 通用 command textarea（兜底）

每个子面板内部使用 `parseCommand` 解析当前 command 为结构化对象，编辑后通过 `serializeCommand` 写回。

### D5: env 可编辑

**决定**：将 `env` 从只读展示改为键值对列表编辑器，支持增/删/改。使用简单的 `<input key> = <input value>` 行列表 + "添加" 按钮。

## Risks / Trade-offs

- **[命令解析不完美]** → 对无法解析的命令，保留 raw textarea 编辑，不丢失任何信息。`serializeCommand` 对未修改的字段保持原始文本。
- **[类型扩展后向兼容]** → `classifyStep` 的新分类是旧分类的细化，旧工作流文件不受影响，只是获得更精确的分类。
- **[JSON args-json 嵌套引号]** → 解析器需处理单引号包裹的 JSON 字符串和转义，使用状态机逐字符扫描而非简单正则。
- **[管道命令解析]** → Lobster 管道（`|`）分隔的多段命令，当前仅对第一段做结构化解析，后续管道段作为原始文本展示。后续可迭代改进。
