# Design: 工作流编辑器 UX 改进

## 问题根因分析

### Bug 1：+ Add Field 无响应

**根因**：`JsonArgsEditor` 中的 `+ Add Field` 按钮调用 `onChange({ ...value, ["new_key"]: "" })`。当 `value` 为 `undefined` 时，展开 `undefined` 会产生空对象 `{}`，结合 `"new_key": ""` 得到 `{ new_key: "" }`，这理论上应该有效。

实际问题出在 `OpenClawInvokeFields` 中 `JsonArgsEditor` 初始时 `value={parsed.argsJson}`，而 `parsed.argsJson` 为 `undefined`。**`{ ...undefined }` 在 JS 中合法**，但问题在于 `JsonArgsEditor` 读取的 `entries` 为 `[]`，点击 Add 后 `onChange(newObj)` 调用父层更新 `parsed.argsJson`——然而 `OpenClawInvokeFields` 的 `onChange` 只传递了 `parsed` 对象，而 `parsed` 本身是从 `parseCommand(step.command)` 动态解析而来，并未 `useState` 持久化。

**真正根因**：`StepDetailPanel` 没有将解析出的 `parsedCommand` 保存为受控状态，每次渲染都重新 `parseCommand(step.command)`。`JsonArgsEditor` 调用 `onChange` 后，上游 `handleCommandChange` → `serializeCommand` → `step.command` 更新，但 `argsJson` 为空对象 `{}` 时 `serializeCommand` 可能不序列化它，导致解析回来依然是 `undefined`，形成无限回路的"写入-丢弃"。

**修复方案**：在 `JsonArgsEditor` 中，当 `value` 为 `undefined` 且点击 Add 时，先用空对象初始化再添加 key，确保 `onChange({ new_key: "" })` 被正确触发；同时检查 `command-parser.ts` 中 `OpenClawInvokeCommand` 的序列化逻辑，确保空的 `argsJson: {}` 被保留而不是丢弃。

### Bug 2：字段自由输入无约束

**现状**：`OpenClawInvokeFields` 的 Tool Name 和 Action 均为 `<input type="text">`，没有任何枚举约束。

**设计方案**：
- **Tool Name**：改为 `<select>` + 动态加载。数据来源是 Gateway RPC `tools.catalog`（已有 `useWorkflowsStore` 或直接调 gateway adapter）。若离线或加载失败，回退到自由输入（`<input>`）。
- **Action**：每个 Tool 有固定的 action 列表。Tool Name 选定后，Action 下拉只显示该 Tool 的合法 actions。若 Tool 不在已知列表中，允许自由输入。
- 如果是唯一值的，直接固定不允许修改。

**工具目录数据结构**（来自 `tools.catalog` RPC）：
```typescript
interface ToolCatalogEntry {
  name: string;      // tool name, e.g. "fs", "http"
  actions: string[]; // available actions, e.g. ["read", "write", "list"]
}
```

为避免引入复杂的异步依赖，采用**静态已知常用工具列表 + 动态补充**策略：预内置常见工具名（fs、http、logseq 等），同时通过 Gateway adapter 异步加载实际可用工具列表，加载后合并去重展示。

### Bug 3：新节点拖入后并行问题

**根因**：`onDrop` 回调只执行 `setNodes((nds) => [...nds, newNode])`，没有检测鼠标释放位置是否在某条已有 Edge 上。React Flow 不提供"拖到边上自动插入"的内置功能，需要手动实现。

**设计方案**：在 `onDrop` 中检测投放位置是否与已有 Edge 相交（通过流坐标系中的边线段距离判断）。若相交：
1. 找到最近的 Edge（源节点 `sourceId`，目标节点 `targetId`）
2. 删除原 Edge
3. 添加两条新 Edge：`sourceId → newNodeId` 和 `newNodeId → targetId`

边的位置信息通过 `useStore` 从 React Flow 内部状态获取（`state.edges` 包含渲染后的坐标）。

**判断"是否落在边上"的算法**：
- 将投放点 `dropPosition` 转为流坐标
- 遍历所有 Edge，获取其源节点和目标节点的中心坐标
- 计算点到线段的距离，距离 < 阈值（如 30px）则认为落在该边上
- 取距离最小的 Edge 作为插入目标

## 组件修改清单

| 文件 | 修改内容 |
|------|----------|
| `step-fields/JsonArgsEditor.tsx` | 修复 Add Field：`value ?? {}` 保证展开操作不丢失 |
| `step-fields/OpenClawInvokeFields.tsx` | Tool Name 改 select+async 加载，Action 改 select（依赖 Tool Name） |
| `WorkflowFlowCanvas.tsx` | `onDrop` 增加边相交检测与自动插入逻辑 |
| `StepDetailPanel.tsx` | STDIN 字段改为步骤引用选择器（`<datalist>` 或自定义下拉） |
| `store/console-stores/workflows-store.ts` | 增加 `toolsCatalog` 状态与 `fetchToolsCatalog` action |

## STDIN 步骤引用选择器设计

- 显示为 `<input list="stdin-refs">` + `<datalist>`，即带建议的自由输入
- 建议项从当前流中所有节点（排除自身）生成：`$nodeId.stdout`、`$nodeId.result`
- 保留手动输入能力，兼容现有已有配置

## 不做的事

- 不重构工作流序列化/反序列化层
- 不引入复杂的步骤依赖图分析
- 不改变 YAML 存储格式
