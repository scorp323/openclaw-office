/**
 * Smart polling hook — adapts poll interval based on tab visibility and user activity.
 *
 * - Tab visible + user active (interacted within 30s): poll every 5s
 * - Tab visible + user idle (no interaction for 30s): poll every 30s
 * - Tab hidden: pause polling entirely
 */
import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";

const ACTIVE_INTERVAL_MS = 5_000;
const IDLE_INTERVAL_MS = 30_000;
const IDLE_THRESHOLD_MS = 30_000;

// ── Shared activity tracker (singleton) ──

let _lastActivity = Date.now();
let _isVisible = typeof document !== "undefined" ? !document.hidden : true;
let _isIdle = false;
const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((l) => l());
}

function updateActivity() {
  _lastActivity = Date.now();
  if (_isIdle) {
    _isIdle = false;
    notifyListeners();
  }
}

function checkIdle() {
  const idle = Date.now() - _lastActivity > IDLE_THRESHOLD_MS;
  if (idle !== _isIdle) {
    _isIdle = idle;
    notifyListeners();
  }
}

// Set up global listeners once
if (typeof window !== "undefined") {
  const activityEvents = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "pointerdown"] as const;
  for (const event of activityEvents) {
    window.addEventListener(event, updateActivity, { passive: true, capture: true });
  }

  document.addEventListener("visibilitychange", () => {
    const wasVisible = _isVisible;
    _isVisible = !document.hidden;
    if (_isVisible && !wasVisible) {
      updateActivity();
    }
    notifyListeners();
  });

  setInterval(checkIdle, 5_000);
}

interface PollingState {
  visible: boolean;
  idle: boolean;
}

function getSnapshot(): PollingState {
  return { visible: _isVisible, idle: _isIdle };
}

// Cache the snapshot to avoid unnecessary re-renders
let _cachedSnapshot: PollingState = getSnapshot();
let _cachedKey = `${_isVisible}-${_isIdle}`;

function getStableSnapshot(): PollingState {
  const key = `${_isVisible}-${_isIdle}`;
  if (key !== _cachedKey) {
    _cachedKey = key;
    _cachedSnapshot = getSnapshot();
  }
  return _cachedSnapshot;
}

function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

/** Read current polling state reactively */
export function usePollingState(): PollingState {
  return useSyncExternalStore(subscribe, getStableSnapshot);
}

interface UseSmartPollingOptions {
  /** The async function to call on each poll tick */
  fetcher: () => void | Promise<void>;
  /** Whether polling is enabled at all (default true) */
  enabled?: boolean;
}

/**
 * Smart polling hook that adapts to user activity and tab visibility.
 *
 * Usage:
 * ```ts
 * useSmartPolling({ fetcher: () => refresh() });
 * ```
 */
export function useSmartPolling({ fetcher, enabled = true }: UseSmartPollingOptions): void {
  const { visible, idle } = usePollingState();
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const tick = useCallback(() => {
    try {
      void fetcherRef.current();
    } catch {
      // silent — fetcher handles its own errors
    }
  }, []);

  useEffect(() => {
    if (!enabled || !visible) return;

    const interval = idle ? IDLE_INTERVAL_MS : ACTIVE_INTERVAL_MS;
    const id = setInterval(tick, interval);
    return () => clearInterval(id);
  }, [enabled, visible, idle, tick]);
}
