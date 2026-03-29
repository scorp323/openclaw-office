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
11. **cron-timeline** — Visual timeline on /cron showing when each cron last ran and when it runs next. Color-coded: green=ok, red=error, gray=disabled.
12. **real-time-cost-counter** — Live-updating cost display in the header: today's API spend, tokens used, model breakdown. Pulls from /mc-api/costs.
13. **agent-chat-shortcut** — From the office floor plan, tap agent → "Chat" button → opens /chat pre-addressed to that agent.
14. **mobile-nav-gestures** — Swipe left/right to navigate between pages (office → dashboard → cron → chat). Feels native.
15. **notification-bell** — Bell icon in header with badge count. Shows recent events: cron failures, agent errors, completed tasks. Replaces checking Discord.
16. **quick-actions-fab** — Floating action button on mobile: restart all crons, check costs, trigger heartbeat, toggle work mode.
17. **search-everything** — Global search across agents, crons, logs, chat history. Spotlight-style overlay.
18. **offline-dashboard** — Cache last-known agent/cron state in localStorage so the dashboard shows something even when tunnel is down.
