# chat-session-routing Specification

## Purpose

TBD - created by archiving change stabilize-chat-session-routing. Update Purpose after archive.

## Requirements

### Requirement: Chat dock SHALL only target stable main agents

聊天栏 MUST 仅将已确认、非 placeholder、非 sub-agent 的主智能体作为默认聊天目标或侧栏联动目标。

#### Scenario: Connection selects a default target

- **WHEN** 网关连接成功且存在至少一个已确认的主智能体
- **THEN** 聊天栏选择一个稳定主智能体作为默认目标

#### Scenario: Invalid selected agent is ignored

- **WHEN** 当前选中的 agent 是 placeholder、sub-agent 或未确认对象
- **THEN** 聊天栏 MUST NOT 将其设为目标会话对应的聊天对象

### Requirement: Chat dock SHALL resume the latest active session for the selected agent

当用户选择聊天目标时，系统 SHALL 优先恢复该智能体最近活跃的会话；只有在没有任何匹配会话时，才回退到 `agent:<id>:main`。

#### Scenario: Existing recent session is available

- **WHEN** `sessions.list` 返回多个同 agent 前缀的会话，且存在最近活跃的一条
- **THEN** 聊天栏绑定最近活跃的那条会话并初始化其历史消息

#### Scenario: No prior session exists

- **WHEN** 选中的智能体没有任何匹配会话
- **THEN** 聊天栏回退到 `agent:<id>:main` 作为当前会话

### Requirement: Chat streaming SHALL be isolated by current session

入站 `chat` 事件 MUST 只影响当前 `sessionKey` 对应的消息流、错误状态和历史回写。

#### Scenario: Event matches current session

- **WHEN** 收到的 `chat` 事件 `sessionKey` 与当前会话一致
- **THEN** 聊天栏按该事件更新流式消息、最终消息或错误状态

#### Scenario: Event belongs to another session

- **WHEN** 收到的 `chat` 事件 `sessionKey` 与当前会话不一致
- **THEN** 聊天栏忽略该事件且不修改当前消息列表
