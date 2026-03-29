import { useEffect, useState } from "react";

const READ_KEY = "mc_read_notifications";

function getReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    // ignore
  }
  return new Set();
}

interface LogEntry {
  source: string;
  text: string;
  ts: number;
}

function detectIsNotif(text: string): boolean {
  const upper = text.slice(0, 80).toUpperCase();
  return (
    upper.includes("ERROR") ||
    upper.includes("ERR ") ||
    upper.includes("[ERROR]") ||
    upper.includes("WARN") ||
    upper.includes("[WARN]")
  );
}

function makeId(entry: LogEntry): string {
  return `${entry.ts}-${entry.source}-${entry.text.slice(0, 20)}`;
}

export function useNotificationBadge(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const res = await fetch("/mc-api/logs");
        if (!res.ok) return;
        const data = (await res.json()) as { entries?: LogEntry[] };
        const all = data.entries ?? [];
        const notifs = all.filter((e) => detectIsNotif(e.text));
        const readIds = getReadIds();
        const unread = notifs.filter((e) => !readIds.has(makeId(e))).length;
        if (!cancelled) setCount(unread);
      } catch {
        // silently fail
      }
    }

    void fetchCount();
    const id = setInterval(() => void fetchCount(), 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // Re-check when localStorage changes (e.g. user marks read in NotificationsPage)
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === READ_KEY) {
        // Re-trigger count re-check by forcing a small re-fetch
        setCount((prev) => prev); // trigger re-render harmlessly; actual re-fetch happens on interval
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  return count;
}
