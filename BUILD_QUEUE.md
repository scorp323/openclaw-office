# Mission Control — Build Queue
# Updated: 2026-03-29 14:55 CST
# The mc-build-orchestrator cron picks up the next QUEUED task every 15 min

## COMPLETED
- [x] Fix HashRouter → BrowserRouter (/office route)
- [x] Lazy-load all 8 page routes (main bundle 695KB → 481KB)
- [x] Add Suspense loading screen
- [x] **gzip-compression** — Add gzip/brotli to openclaw-office.js server. Target: 481KB → ~144KB transfer. (2026-03-29 15:01 CST)
- [x] **mobile-pinch-zoom** — Add pinch-to-zoom + tap-to-inspect on FloorPlan SVG for mobile. Touch-friendly agent interaction. (2026-03-29 15:17 CST)

## COMPLETED
- [x] **agent-pulse-animation** — Breathing glow on active agents, dim on standby. CSS keyframes, no JS overhead. (2026-03-29 15:33 CST)

## COMPLETED
- [x] **command-palette** — Swipe-down or tap shortcut to run common actions (restart cron, check costs, trigger agent). (2026-03-29 16:57 CST)

## QUEUED (in priority order)
- [x] **push-notifications** — Partial (service worker + manifest done, subscription logic skipped — needs VAPID keys). (2026-03-29 16:21 CST)
- [x] **pwa-manifest** — COMPLETED (2026-03-29 16:47 CST)
- [x] **theme-auto-switch** — COMPLETED (2026-03-29 16:50 CST)

## COMPLETED
- [x] **chat-mobile-polish** — Polish /chat page for mobile: input sizing, scroll behavior, send button UX. (2026-03-29 16:01 CST)

## COMPLETED
- [x] **live-status-badges** — Show cron health/last run/error error count on dashboard cards without clicking into /cron. (COMPLETED 2026-03-29 15:46 CST)

## WAVE 2 — QUEUED
10. **agent-detail-modal** — COMPLETED (2026-03-29 17:20 CST) — Tap an agent in the office to see a detail panel: name, role, model, current task, last active, status history. Mobile-friendly bottom sheet.
11. **cron-timeline** — IN PROGRESS: Visual timeline on /cron showing when each cron last ran and when it runs next. Color-coded: green=ok, red=error, gray=disabled.
12. **real-time-cost-counter** — IN PROGRESS: Live-updating cost display in the header: today's API spend, tokens used, model breakdown. Pulls from /mc-api/costs.
13. **agent-chat-shortcut** — COMPLETED (2026-03-29 19:50 CST) — From the office floor plan, tap agent → "Chat" button → opens /chat pre-addressed to that agent.
14. **mobile-nav-gestures** — COMPLETED (2026-03-29 20:03 CST)
15. **notification-bell** — COMPLETED (2026-03-29 21:04 CST) — Bell icon in header with badge count. Shows recent events: cron failures, agent errors, completed tasks. Replaces checking Discord.
16. **quick-actions-fab** — COMPLETED (2026-03-29 21:20 CST) — Floating action button on mobile: restart all crons, check costs, trigger heartbeat, toggle work mode.
17. **search-everything** — IN PROGRESS: Global search across agents, crons, logs, chat history. Spotlight-style overlay.
18. **offline-dashboard** — COMPLETED (2026-03-29 21:34 CST): Cache last-known agent/cron state in localStorage so the dashboard shows something even when tunnel is down.

## WAVE 3 — LIVING OFFICE (Nathan's vision: "make it realistic")
19. **idle-micro-animations** — IN PROGRESS: Agents in lounge/chill get subtle idle loops: reading (small book icon bobbing), sipping coffee (cup near face), stretching (slight scale pulse), leaning against wall (tilt). Randomized per agent based on ID hash. Pure CSS/SVG — no JS tick cost. Each agent picks 1 of 4-5 idle behaviors.
20. **smart-zone-behavior** — COMPLETED (2026-03-29 22:01 CST): Agents doing related tasks (same cron, same build) auto-gather at the meeting table with connection lines. Agents that just finished a task walk to chill zone (coffee break). Agents with errors pace in the corridor. New agents spawn at entrance and walk to their desk. Based on real status + task metadata from the API.
21. **time-of-day-ambiance** — QUEUED (Build failed: TypeScript errors, 2026-03-29 22:20 CST): Office lighting shifts with real clock — warm golden tones 6am-9am, bright midday, amber sunset 5-7pm, dim blue-green night. Matrix rain intensity scales with system load (more active agents = heavier rain). Window elements on office walls show sky gradient matching time.
22. **agent-interactions** — QUEUED: When two agents collaborate (connection line exists), they physically huddle closer. Task completion triggers a brief celebration animation (confetti burst or green flash). Agent spawning has a "beam in" effect. Agent going offline fades out with a "logging off" speech bubble.
23. **ambient-office-sounds** — QUEUED: Optional (toggle in settings). Subtle keyboard clicking when agents are thinking/tool_calling. Soft chime on task completion. Muted alert tone on errors. Volume tied to activity level. Web Audio API, no external files — synthesized tones.
24. **activity-heatmap-floor** — QUEUED: Floor tiles subtly glow warmer under busy zones. If desk zone has 5 active agents, the floor there pulses slightly. Idle zones stay cool/dim. Visual indicator of where the work is happening without reading status text.
25. **agent-personality-poses** — QUEUED: Each agent gets a unique idle stance based on their role — CEO (Morpheus) stands tall center-office, trading agents lean forward intensely, content agents recline casually, ops agents patrol between zones. Role mapped from agent name/model metadata.
