# Tasks: 工作流编辑器 UX 改进

## Task 1: 修复 JsonArgsEditor + Add Field 无响应

**文件**：`src/components/console/workflows/step-fields/JsonArgsEditor.tsx`

- [ ] 检查 `+ Add Field` 按钮的 onClick 处理：当 `value` 为 `undefined` 时，使用 `{ ...(value ?? {}), new_key: "" }` 确保正确初始化
- [ ] 调查 `command-parser.ts` 中 `serializeOpenClawInvokeCommand`，确认空的 `argsJson: {}` 是否被序列化（若丢弃则修复）
- [ ] 确认修复后重新解析的 `argsJson` 不为 `undefined`

## Task 2: OpenClawInvokeFields — Tool Name 改为选择器

**文件**：`src/components/console/workflows/step-fields/OpenClawInvokeFields.tsx`

- [ ] 创建内置工具列表（静态 fallback），包含常见工具名
- [ ] 使用 `useEffect` + Gateway adapter 的 `tools.catalog` RPC 异步加载工具列表
- [ ] Tool Name 字段改为 `<select>`，选项为加载的工具列表；若工具不在列表中保留当前值作为自定义选项
- [ ] 加载中显示 loading 状态，加载失败回退为 `<input>`

## Task 3: OpenClawInvokeFields — Action 改为受限下拉

**文件**：`src/components/console/workflows/step-fields/OpenClawInvokeFields.tsx`

- [ ] 根据选中的 Tool Name，动态计算合法 Action 列表（来自 tools.catalog 数据）
- [ ] Action 字段改为 `<select>`（当有已知操作列表时）或 `<input>`（fallback）
- [ ] 切换 Tool Name 时，若当前 Action 不在新 Tool 的列表中，清空 Action

## Task 4: WorkflowFlowCanvas — 拖入节点自动插入到连线

**文件**：`src/components/console/workflows/WorkflowFlowCanvas.tsx`

- [ ] 在 `onDrop` 中，获取当前所有 edges 和节点中心坐标
- [ ] 计算投放点（流坐标）与每条 edge 的线段距离
- [ ] 若距离 < 30px，标记该 edge 为插入目标
- [ ] 若有插入目标：删除原 edge，新增 `source→newNode` 和 `newNode→target` 两条 edge
- [ ] 若无插入目标：保持原有行为（仅添加节点）
- [ ] 确保插入操作被 pushUndo 记录，支持 Undo

## Task 5: StepDetailPanel — STDIN 字段改为步骤引用选择器

**文件**：`src/components/console/workflows/StepDetailPanel.tsx`

- [ ] `StepDetailPanel` 接收新 prop `allStepIds: string[]`（当前工作流所有步骤 ID）
- [ ] STDIN 字段改为 `<input list="stdin-hints">` + `<datalist>`，datalist 选项为 `$stepId.stdout`
- [ ] 在 `WorkflowDetailPage.tsx` 中传入 `allStepIds`（来自 `currentNodesRef.current.map(n => n.id)`）

## Task 6: 调试验证

- [ ] 手动测试：添加 openclaw-invoke-step，点击 + Add Field 确认新增成功
- [ ] 手动测试：拖入新节点到已有连线上，确认自动插入
- [ ] 手动测试：STDIN 字段显示正确的步骤引用建议
- [ ] 运行 `pnpm typecheck` 确认无类型错误
- [ ] 运行 `pnpm lint` 确认无 lint 错误
