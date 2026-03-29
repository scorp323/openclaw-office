/**
 * useFetchWithRetry — fetch with 2 retries, exponential backoff (1s then 3s), 10s timeout.
 * Returns { data, error, isLoading, retry }.
 * Pass null as url to skip fetching; re-fetches whenever url changes.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface UseFetchWithRetryResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  retry: () => void;
}

/** Delays in ms between retry attempts: [1st retry, 2nd retry] */
const RETRY_DELAYS = [1000, 3000] as const;

async function fetchAttempt<T>(
  url: string,
  timeoutMs: number,
  outerSignal: AbortSignal,
): Promise<T> {
  // Per-attempt timeout + outer cancellation chained
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  outerSignal.addEventListener("abort", onAbort, { once: true });

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
    outerSignal.removeEventListener("abort", onAbort);
  }
}

export function useFetchWithRetry<T>(
  url: string | null,
  options: { timeout?: number } = {},
): UseFetchWithRetryResult<T> {
  const { timeout = 10_000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    (fetchUrl: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);

      const run = async () => {
        let lastErr: Error | null = null;

        for (let i = 0; i <= RETRY_DELAYS.length; i++) {
          if (controller.signal.aborted) return;
          try {
            const result = await fetchAttempt<T>(fetchUrl, timeout, controller.signal);
            if (!controller.signal.aborted) {
              setData(result);
              setError(null);
              setIsLoading(false);
            }
            return;
          } catch (err) {
            if (controller.signal.aborted) return;
            lastErr = err instanceof Error ? err : new Error(String(err));
            if (i < RETRY_DELAYS.length) {
              await new Promise<void>((r) => setTimeout(r, RETRY_DELAYS[i]));
            }
          }
        }

        if (!controller.signal.aborted) {
          setError(lastErr?.message ?? "Unknown error");
          setIsLoading(false);
        }
      };

      void run();
    },
    [timeout],
  );

  const retry = useCallback(() => {
    if (url) execute(url);
  }, [url, execute]);

  useEffect(() => {
    if (url) {
      execute(url);
    } else {
      setData(null);
      setError(null);
      setIsLoading(false);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [url, execute]);

  return { data, error, isLoading, retry };
}
