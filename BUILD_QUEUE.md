# Mission Control — Build Queue
# Updated: 2026-03-29 14:55 CST
# The mc-build-orchestrator cron picks up the next QUEUED task every 15 min

## COMPLETED
- [x] Fix HashRouter → BrowserRouter (/office route)
- [x] Lazy-load all 8 page routes (main bundle 695KB → 481KB)
- [x] Add Suspense loading screen
- [x] **gzip-compression** — Add gzip/brotli to openclaw-office.js server. Target: 481KB → ~144KB transfer. (2026-03-29 15:01 CST)
- [x] **mobile-pinch-zoom** — Add pinch-to-zoom + tap-to-inspect on FloorPlan SVG for mobile. Touch-friendly agent interaction. (2026-03-29 15:17 CST)

## QUEUED (in priority order)
3. **agent-pulse-animation** — Breathing glow on active agents, dim on standby. CSS keyframes, no JS overhead.
4. **live-status-badges** — Show cron health/last run/error count on dashboard cards without clicking into /cron.
5. **chat-mobile-polish** — Polish /chat page for mobile: input sizing, scroll behavior, send button UX.
6. **push-notifications** — Service worker + notification API for cron failures and agent errors.
7. **pwa-manifest** — Add manifest.json, service worker, icons for "Add to Home Screen" on iOS/Android.
8. **theme-auto-switch** — Respect prefers-color-scheme media query for auto dark/light.
9. **command-palette** — Swipe-down or tap shortcut to run common actions (restart cron, check costs, trigger agent).

## IN PROGRESS
(none)
