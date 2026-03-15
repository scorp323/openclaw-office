## ADDED Requirements

### Requirement: Speaking content SHALL be readable without an extra expand action

在 2D Office 视图中，处于 speaking 状态的文本 MUST 以默认可读的方式展示，而不是要求用户先点击展开。

#### Scenario: Agent starts speaking

- **WHEN** 某个 agent 进入 speaking 状态并携带 speech bubble 文本
- **THEN** 用户可以直接阅读该文本的主体内容

#### Scenario: Bubble contains markdown content

- **WHEN** speech bubble 文本包含多段落或列表等 Markdown 内容
- **THEN** 气泡以可阅读的排版展示内容，而不是仅显示图标提示

### Requirement: Speech bubbles SHALL adapt dwell time to message length and support manual dismissal

speech bubble SHOULD 根据文本长度自适应停留时间，并 MUST 支持用户主动关闭。

#### Scenario: Short message finishes speaking

- **WHEN** 较短文本停止 speaking
- **THEN** 气泡在最小停留时间后渐隐消失

#### Scenario: Long message finishes speaking

- **WHEN** 较长文本停止 speaking
- **THEN** 气泡停留时间长于短文本，且仍受最大时长上限约束

#### Scenario: User closes the bubble

- **WHEN** 用户点击关闭控件
- **THEN** 当前气泡立即关闭且不再等待自动消失

### Requirement: Speech bubble layout SHALL remain readable near viewport edges

speech bubble 在靠近画布边缘时 MUST 自动调整偏移和布局，以避免正文被裁切。

#### Scenario: Agent is near the left edge

- **WHEN** speaking agent 位于可视区域左侧边缘附近
- **THEN** 气泡向可视区域内偏移并保持正文可见

#### Scenario: Message exceeds preferred height

- **WHEN** 气泡正文超过首选高度
- **THEN** 正文区域可滚动，且外层气泡保持在视口内
