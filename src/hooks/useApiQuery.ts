import { useState, useEffect, useCallback, useRef } from "react";

interface UseApiQueryOptions<T> {
  /** URL path relative to /mc-api (e.g. "/agents") */
  path: string;
  /** Transform raw JSON response into desired shape */
  transform?: (data: unknown) => T;
  /** Number of retry attempts (default 3) */
  retries?: number;
  /** Timeout per request in ms (default 10000) */
  timeout?: number;
  /** Whether to fetch immediately on mount (default true) */
  enabled?: boolean;
}

interface UseApiQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const API_BASE = "/mc-api";

function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  try {
    const token = localStorage.getItem("openclaw-mc-auth-token");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // localStorage unavailable
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Chain external signal cancellation
  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const res = await fetch(url, {
      headers: getAuthHeaders(),
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchWithRetry<T>(
  path: string,
  retries: number,
  timeout: number,
  transform: (data: unknown) => T,
  signal: AbortSignal,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal.aborted) throw new Error("Aborted");

    try {
      const res = await fetchWithTimeout(`${API_BASE}${path}`, timeout, signal);
      if (res.status === 401) {
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
          window.location.href = "/login";
        }
        throw new Error("Unauthorized");
      }
      if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
      const json: unknown = await res.json();
      return transform(json);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (lastError.message === "Unauthorized" || lastError.message === "Aborted") {
        throw lastError;
      }
      if (attempt < retries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.min(1000 * 2 ** attempt, 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError ?? new Error("Unknown error");
}

const identity = (d: unknown) => d;

export function useApiQuery<T>(options: UseApiQueryOptions<T>): UseApiQueryResult<T> {
  const {
    path,
    transform = identity as (data: unknown) => T,
    retries = 3,
    timeout = 10000,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(() => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    fetchWithRetry<T>(path, retries, timeout, transform, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, [path, retries, timeout, transform]);

  useEffect(() => {
    if (enabled) {
      execute();
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [execute, enabled]);

  return { data, loading, error, retry: execute };
}
