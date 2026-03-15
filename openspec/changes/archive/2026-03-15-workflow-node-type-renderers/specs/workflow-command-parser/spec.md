## ADDED Requirements

### Requirement: 命令字符串解析为结构化对象
系统 SHALL 提供 `parseCommand(command: string)` 函数，将 Lobster 命令字符串解析为结构化的 `ParsedCommand` 对象，包含命令类型标识和类型化的参数映射。

#### Scenario: 解析 openclaw.invoke 命令
- **WHEN** 输入命令为 `openclaw.invoke --tool message --action send --args-json '{"to":"user","text":"hello"}'`
- **THEN** 返回 `{ kind: "openclaw-invoke", tool: "message", action: "send", argsJson: { to: "user", text: "hello" }, raw: "..." }`

#### Scenario: 解析 llm_task.invoke 命令
- **WHEN** 输入命令为 `llm_task.invoke --prompt "Summarize" --model gpt-4 --temperature 0.7`
- **THEN** 返回 `{ kind: "llm-task", prompt: "Summarize", model: "gpt-4", temperature: 0.7, raw: "..." }`

#### Scenario: 解析 exec 命令
- **WHEN** 输入命令为 `exec --json --shell 'curl https://api.example.com'`
- **THEN** 返回 `{ kind: "exec", json: true, shell: "curl https://api.example.com", raw: "..." }`

#### Scenario: 解析 approve 命令
- **WHEN** 输入命令为 `approve --prompt "Continue?" --emit`
- **THEN** 返回 `{ kind: "approve", prompt: "Continue?", emit: true, raw: "..." }`

#### Scenario: 解析数据变换命令
- **WHEN** 输入命令为 `where '0>=0'`、`pick 'name,age'`、`head 5`、`sort 'name'`、`dedupe 'id'`
- **THEN** 分别返回对应的 `{ kind: "data-transform", subKind: "where"|"pick"|"head"|"sort"|"dedupe", expression: "...", raw: "..." }`

#### Scenario: 解析 state 命令
- **WHEN** 输入命令为 `state.get --key myKey` 或 `state.set --key myKey --value '{"a":1}'`
- **THEN** 返回 `{ kind: "state-op", op: "get"|"set", key: "myKey", value?: {...}, raw: "..." }`

#### Scenario: 未识别命令降级为 shell
- **WHEN** 输入命令为 `echo "hello world"` 或其他未注册的命令
- **THEN** 返回 `{ kind: "shell", raw: "echo \"hello world\"" }`

### Requirement: 结构化对象序列化回命令字符串
系统 SHALL 提供 `serializeCommand(parsed: ParsedCommand)` 函数，将结构化的 `ParsedCommand` 对象序列化回合法的 Lobster 命令字符串。序列化结果 MUST 与原命令语义等价。

#### Scenario: openclaw.invoke 往返序列化
- **WHEN** 对 `parseCommand("openclaw.invoke --tool message --action send --args-json '{\"to\":\"user\"}'")` 的结果调用 `serializeCommand`
- **THEN** 生成的命令字符串经再次 `parseCommand` 后 MUST 与原结构化对象等价

#### Scenario: 保留未修改字段的原始格式
- **WHEN** 用户仅修改了 `tool` 参数，其余字段未变
- **THEN** 未修改字段 MUST 保持原始文本格式（如引号风格、空格风格不变），避免不必要的 diff

### Requirement: 管道命令分段处理
系统 SHALL 识别 Lobster 管道分隔符 `|`，对管道的第一段做结构化解析，后续管道段作为原始字符串保留在 `pipelineTail` 字段中。

#### Scenario: 含管道的命令解析
- **WHEN** 输入命令为 `exec --json --shell 'gh pr list' | where 'state=="OPEN"' | pick 'title,url'`
- **THEN** 返回 `{ kind: "exec", json: true, shell: "gh pr list", pipelineTail: "where 'state==\"OPEN\"' | pick 'title,url'", raw: "..." }`

### Requirement: JSON 嵌套引号安全解析
系统 SHALL 正确处理 `--args-json` 参数中的嵌套引号和特殊字符，包括单引号包裹的 JSON、转义的双引号、以及包含 `$` 变量引用的 JSON 字符串。

#### Scenario: 单引号包裹的嵌套 JSON
- **WHEN** 输入命令包含 `--args-json '{"key":"value with \"quotes\""}'`
- **THEN** 正确解析出 JSON 对象 `{ key: "value with \"quotes\"" }`

#### Scenario: 包含环境变量引用的 JSON
- **WHEN** 输入命令包含 `--args-json '{"text":"$LOBSTER_ARG_TEXT"}'`
- **THEN** 保留变量引用原样，解析为 `{ text: "$LOBSTER_ARG_TEXT" }`

### Requirement: 节点类型推断
系统 SHALL 提供 `classifyStepExtended(step: LobsterStep)` 函数，返回扩展后的节点类型（7 种），取代现有的 3 种类型分类。

#### Scenario: llm_task.invoke 命令分类
- **WHEN** step.command 包含 `llm_task.invoke` 或 `openclaw.invoke --tool llm-task`
- **THEN** 返回 `"llm-task-step"`

#### Scenario: approval 字段分类
- **WHEN** step.approval 为 `true` 或 `"required"`
- **THEN** 返回 `"approval-step"`，无论 command 内容如何

#### Scenario: 数据变换命令分类
- **WHEN** step.command 以 `where`、`pick`、`head`、`sort`、`dedupe`、`map`、`group_by` 开头
- **THEN** 返回 `"data-transform-step"`

#### Scenario: 未知命令降级
- **WHEN** step.command 不匹配任何已知命令模式
- **THEN** 返回 `"shell-step"`
