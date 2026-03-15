# office-agent-resolution Specification

## Purpose

TBD - created by archiving change harden-office-agent-resolution. Update Purpose after archive.

## Requirements

### Requirement: Office runtime SHALL prefer confirmed identities during event resolution

Office 运行时 MUST 在解析普通 agent 事件时优先选择已确认的真实身份，而不是新建持久 agent 记录。

#### Scenario: Session already maps to a confirmed main agent

- **WHEN** 收到普通 session 的事件，且该 session 已映射到一个已确认主 agent
- **THEN** 运行时将该事件归并到该已确认主 agent

#### Scenario: Event carries explicit sub-agent identity

- **WHEN** 事件通过 payload 或 session 结构明确标识 sub-agent
- **THEN** 运行时将该事件归并到对应 sub-agent，而不是父 agent 或新的主 agent

### Requirement: Office runtime SHALL not promote unresolved runtime identifiers into persistent main agents without identity evidence

运行时 MUST NOT 仅凭超时把未解析清楚的运行标识升级成持久主 agent。

#### Scenario: Unknown runtime id receives no confirming evidence

- **WHEN** 一个临时实体在 TTL 内没有获得已知 agent、session 或 payload 证据
- **THEN** 运行时回收该临时实体而不是将其确认成主 agent

#### Scenario: Unknown runtime id later receives confirming evidence

- **WHEN** 一个临时实体随后被 `agents.list`、明确 session 映射或显式 payload 证实身份
- **THEN** 运行时将其归并到真实 agent，并保留已有运行态信息

### Requirement: Office runtime SHALL retire ephemeral entities without harming valid agents

临时实体的回收机制 MUST 只移除缺乏身份证据的对象，且不得误删已确认主 agent 或合法 sub-agent。

#### Scenario: Ephemeral entity expires

- **WHEN** 临时实体超过生存时间且仍未被证实
- **THEN** 系统移除该实体，并清理相关临时映射

#### Scenario: Confirmed agent uses uuid-like identifier

- **WHEN** 一个已确认的真实 agent 使用 UUID-like 或十六进制风格的 `agentId`
- **THEN** 系统 MUST NOT 因标识形态而将其视为临时实体并移除
