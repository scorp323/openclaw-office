# Proposal: 工作流编辑器 UX 体验改进

## 问题描述

用户在使用工作流编辑器时遇到三类问题，影响了核心编辑体验：

1. **Args JSON 无法新增字段**：`OpenClawInvokeFields` 中点击「+ Add Field」按钮无任何响应，导致用户无法通过 UI 方式为工具调用节点添加参数键值对。

2. **自由文本输入导致填写错误**：`Action`、`Tool Name` 等字段当前均为自由文本 `<input>`，但这些字段实际上有固定或有限的合法值范围，允许随意填写容易产生错误配置。

3. **新增节点后连线逻辑混乱**：从调色板拖入新节点后，原有两个节点间的连线并不会自动断开或重新路由，导致新节点游离在外，视觉上形成"并行"错觉，而非插入到原有链路中。

## 目标

- **Bug 修复**：彻底解决 `+ Add Field` 点击无效问题。
- **字段约束**：对有限值域的字段（Tool Name、Action 等）改为下拉选择器，减少填写错误。
- **节点插入体验**：当用户将新节点拖放到已有边（连线）上时，自动在该边中插入节点，保持工作流链路连续。
- **STDIN 引用辅助**：将 STDIN 字段由自由输入改为"步骤输出引用选择器"，引导用户从已有步骤选择，避免手动拼写 `$stepId.stdout`。

## 范围

**包含**：
- `JsonArgsEditor` 组件 + Add Field 按钮 Bug 修复
- `OpenClawInvokeFields` 的 Tool Name、Action 改为选择器（数据来自 Gateway `tools.catalog` RPC 或静态已知列表）
- `WorkflowFlowCanvas` 新增「拖到边上自动插入」逻辑
- `StepDetailPanel` 的 STDIN 字段改为步骤引用下拉

**不包含**：
- 工作流整体架构重构
- 后端 Gateway 协议变更
- 其他页面（Agents、Channels 等）的修改

## 预期结果

- 点击「+ Add Field」立即新增空白键值行，可正常输入并保存。
- Tool Name 字段显示工具下拉列表，Action 字段根据所选 Tool 动态更新选项；若列表为空则回退到自由输入。
- 拖入新节点到已有连线上，旧连线自动断开并重建为「源→新节点→目标」的串行链路。
- STDIN 字段显示当前工作流中所有上游步骤的 `$stepId.stdout` / `$stepId.result` 选项，仍保留手动输入模式。
