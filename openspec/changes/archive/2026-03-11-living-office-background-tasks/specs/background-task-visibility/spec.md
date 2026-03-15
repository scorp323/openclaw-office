## ADDED Requirements

### Requirement: Subscribe to Cron events for background task visualization
The system SHALL listen to `cron` WebSocket events from the Gateway to detect when scheduled background jobs start and finish.

#### Scenario: Cron job starts
- **WHEN** the Gateway emits a `cron` event indicating a job has started (e.g., state transitioning to running)
- **THEN** the system updates the `OfficeStore` to mark the corresponding agent as actively executing a background task

#### Scenario: Cron job finishes
- **WHEN** the Gateway emits a `cron` event indicating a job has finished
- **THEN** the system clears the background task active status for that agent

### Requirement: Detect unlinked background sessions
The system SHALL poll `sessions.list` and identify active sessions even if they lack a `requesterSessionKey` (isolated sessions), to ensure all background work is captured.

#### Scenario: Isolated session detection
- **WHEN** the `useSubAgentPoller` receives the sessions list
- **THEN** it does not filter out top-level or isolated sessions (those without a parent requester)
- **THEN** it maps these isolated sessions to their respective agents in the UI or assigns them as generic background workers if the agent is not in the primary view

### Requirement: Visual indicator for background activity
The `AgentAvatar` component SHALL display a distinct visual state (such as the `activity-halo` or a badge) when the agent is executing a background task, independent of chat-driven events.

#### Scenario: Agent is running a background task but has no chat activity
- **WHEN** an agent is marked as running a background task (e.g., via a running Cron job)
- **THEN** the agent's visual avatar shows a working state (e.g., "thinking" animation or an activity halo)
- **THEN** the agent ceases "idle" behaviors (like wandering) and appears to be working at their desk

### Requirement: Background activity visibility duration
The system SHALL keep each background activity visual state visible for at least 5 seconds, so users can perceive status changes without flash transitions.

#### Scenario: Background task finishes quickly
- **WHEN** a background task starts and ends within less than 5 seconds
- **THEN** the corresponding agent remains in background-working visual state until 5 seconds have elapsed
- **THEN** the system clears the background-working visual state only after the minimum display duration is met