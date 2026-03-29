/**
 * Session persistence — remembers last visited page, scroll positions, and filter states.
 */
import { useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const LAST_PAGE_KEY = "openclaw-last-page";
const SCROLL_KEY_PREFIX = "openclaw-scroll-";
const FILTER_KEY = "openclaw-filters";

// Pages that should be remembered for navigation restore
const RESTORABLE_PAGES = new Set([
  "/dashboard", "/agents", "/channels", "/skills", "/cron",
  "/settings", "/logs", "/costs", "/memory", "/actions",
  "/office", "/chat",
]);

/** Save/load helpers */
function safeGet(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSet(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* quota exceeded */ }
}

/**
 * Restores the last visited page on initial app load.
 * Should be called once in the app root.
 */
export function useRestoreLastPage(): void {
  const navigate = useNavigate();
  const location = useLocation();
  const restored = useRef(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;

    // Only restore if we're on the root page (fresh load)
    if (location.pathname !== "/") return;

    const lastPage = safeGet(LAST_PAGE_KEY);
    if (lastPage && RESTORABLE_PAGES.has(lastPage) && lastPage !== "/") {
      navigate(lastPage, { replace: true });
    }
  }, [navigate, location.pathname]);
}

/**
 * Tracks the current page and saves it for next session.
 */
export function useTrackCurrentPage(): void {
  const location = useLocation();

  useEffect(() => {
    if (RESTORABLE_PAGES.has(location.pathname)) {
      safeSet(LAST_PAGE_KEY, location.pathname);
    }
  }, [location.pathname]);
}

/**
 * Saves and restores scroll position for the current page.
 * Attach to the scrollable container element.
 */
export function useScrollRestore(containerRef: React.RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const pathRef = useRef(location.pathname);

  // Save scroll position when navigating away
  useEffect(() => {
    const prevPath = pathRef.current;
    pathRef.current = location.pathname;

    return () => {
      const el = containerRef.current;
      if (el) {
        safeSet(`${SCROLL_KEY_PREFIX}${prevPath}`, String(el.scrollTop));
      }
    };
  }, [location.pathname, containerRef]);

  // Restore scroll position when arriving
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const saved = safeGet(`${SCROLL_KEY_PREFIX}${location.pathname}`);
    if (saved) {
      const scrollTop = parseInt(saved, 10);
      if (!Number.isNaN(scrollTop)) {
        requestAnimationFrame(() => {
          el.scrollTop = scrollTop;
        });
      }
    }
  }, [location.pathname, containerRef]);
}

type FilterState = Record<string, Record<string, unknown>>;

function loadAllFilters(): FilterState {
  const raw = safeGet(FILTER_KEY);
  if (!raw) return {};
  try { return JSON.parse(raw) as FilterState; } catch { return {}; }
}

function saveAllFilters(filters: FilterState): void {
  safeSet(FILTER_KEY, JSON.stringify(filters));
}

/**
 * Persists filter/preference state per page to localStorage.
 *
 * Usage:
 * ```ts
 * const [filters, setFilters] = useSessionFilters<{ level: string }>("logs", { level: "all" });
 * ```
 */
export function useSessionFilters<T extends Record<string, unknown>>(
  pageKey: string,
  defaultValue: T,
): [T, (update: Partial<T>) => void] {
  const ref = useRef<T | null>(null);

  // Initialize lazily from sessionStorage
  if (ref.current === null) {
    const all = loadAllFilters();
    const saved = all[pageKey];
    ref.current = saved ? ({ ...defaultValue, ...saved } as T) : defaultValue;
  }

  const setFilters = useCallback((update: Partial<T>) => {
    const next = { ...(ref.current as T), ...update };
    ref.current = next;
    const all = loadAllFilters();
    all[pageKey] = next;
    saveAllFilters(all);
  }, [pageKey]);

  return [ref.current as T, setFilters];
}
