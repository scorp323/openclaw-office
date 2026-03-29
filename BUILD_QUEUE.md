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

## QUEUED (in priority order)
6. **push-notifications** — IN PROGRESS (2026-03-29 16:21 CST)
7. **pwa-manifest** — COMPLETED (2026-03-29 16:47 CST)
8. **theme-auto-switch** — COMPLETED (2026-03-29 16:50 CST)
9. **command-palette** — Swipe-down or tap shortcut to run common actions (restart cron, check costs, trigger agent).

## COMPLETED
- [x] **chat-mobile-polish** — Polish /chat page for mobile: input sizing, scroll behavior, send button UX. (2026-03-29 16:01 CST)

## COMPLETED
- [x] **live-status-badges** — Show cron health/last run/error error count on dashboard cards without clicking into /cron. (COMPLETED 2026-03-29 15:46 CST)
