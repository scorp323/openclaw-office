## Why

当前 Workflow 编辑界面仅将节点分为三类（shell-step / tool-step / approval-step），所有节点使用统一的 `BaseStepNode` 渲染，只展示截断的 command 文本预览。对于 `openclaw.invoke --tool llm-task --action json --args-json '{...}'` 这类调用，用户看到的只是一行截断的命令字符串，无法直观理解节点的语义；在 `StepDetailPanel` 中也只能通过 textarea 编辑原始命令文本，对 JSON 参数的查看和编辑非常不友好。

Lobster 引擎支持丰富的命令类型（exec、openclaw.invoke、llm_task.invoke、approve、where/pick/head 数据处理管道、state.get/set 状态管理等），每种命令的参数结构差异很大。我们需要为每种节点类型实现专属的结构化渲染和编辑能力，将命令参数拆解为语义化的表单字段，让用户无需手动编写 CLI 命令就能配置工作流步骤。

## What Changes

- **扩展节点类型分类**：将现有 3 种类型（shell/tool/approval）扩展为 7+ 种细分类型：`exec`、`openclaw-invoke`、`llm-task`、`approval`、`data-transform`（where/pick/head/sort/dedupe）、`state-op`（state.get/set）、`shell`（通用 fallback）
- **专属节点组件**：为每种节点类型创建独立的 React Flow 节点组件，展示与该类型语义相关的关键信息（如 LLM Task 节点展示 prompt 摘要和 model、Tool 节点展示 tool + action、Approval 节点展示审批提示等）
- **结构化编辑面板**：`StepDetailPanel` 根据节点类型渲染不同的表单字段，将 `--args-json` 中的 JSON 拆解为独立的输入控件（文本、数字、下拉、JSON 编辑器等）
- **命令解析/生成工具**：新增 `command-parser.ts`，能将 CLI 命令字符串解析为结构化对象，也能将结构化对象序列化回命令字符串，双向无损转换
- **调色板扩展**：`StepPalette` 增加更多可拖入的节点类型，按功能分组展示
- **环境变量可编辑**：`env` 字段从只读展示变为可编辑的键值对列表

## Capabilities

### New Capabilities
- `workflow-command-parser`: 命令字符串 ↔ 结构化参数对象的双向解析引擎，支持 Lobster 所有命令类型的参数提取和序列化
- `workflow-typed-node-renderers`: 针对每种 Lobster 命令类型的专属画布节点组件和编辑面板，提供结构化的可视化与表单编辑

### Modified Capabilities

## Impact

- **组件层**：`flow-nodes.tsx`（拆分为多个专属节点组件）、`StepDetailPanel.tsx`（根据类型切换面板）、`StepPalette.tsx`（扩展可拖节点列表）
- **解析层**：新增 `src/lib/command-parser.ts`；修改 `lobster-parser.ts` 中 `classifyStep` 使其支持细分类型
- **类型层**：`lobster-types.ts` 增加命令参数类型定义
- **国际化**：`console.json`（zh/en）增加新节点类型名称和字段标签
- **依赖**：无需新增外部依赖，JSON 编辑可使用 textarea + 格式化
