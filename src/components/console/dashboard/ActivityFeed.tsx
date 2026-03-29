import { Activity, AlertTriangle, Bot, Clock, Play, Terminal, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ActivityEvent {
  type: string;
  agent: string;
  message: string;
  ts: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function eventIcon(type: string) {
  switch (type) {
    case "cron":
      return <Clock className="h-3.5 w-3.5 text-blue-400" />;
    case "error":
      return <AlertTriangle className="h-3.5 w-3.5 text-red-400" />;
    case "session":
      return <Bot className="h-3.5 w-3.5 text-green-400" />;
    case "log":
      return <Terminal className="h-3.5 w-3.5 text-gray-400" />;
    case "system":
      return <Activity className="h-3.5 w-3.5 text-purple-400" />;
    default:
      return <Play className="h-3.5 w-3.5 text-amber-400" />;
  }
}

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchActivity = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/mc-api/activity");
      if (res.ok) {
        const data = (await res.json()) as { events: ActivityEvent[] };
        setEvents(data.events ?? []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
    intervalRef.current = setInterval(fetchActivity, 10_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchActivity]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Activity Feed</h3>
        <button
          type="button"
          onClick={fetchActivity}
          disabled={loading}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {events.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
          No recent activity
        </p>
      ) : (
        <div className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {events.map((evt, i) => (
            <div
              key={`${evt.ts}-${i}`}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <div className="mt-0.5 shrink-0">{eventIcon(evt.type)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                    {evt.agent}
                  </span>
                  <span className="shrink-0 text-[10px] text-gray-400 dark:text-gray-500">
                    {relativeTime(evt.ts)}
                  </span>
                </div>
                <p className="truncate text-xs text-gray-500 dark:text-gray-400">{evt.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
