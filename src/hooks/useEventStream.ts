import { useEffect, useRef } from "react";
import { useOfficeStore } from "@/store/office-store";
import { useEventStore } from "@/stores/eventStore";
import { toastError } from "@/store/toast-store";
import type { StreamEventType } from "@/stores/eventStore";

/**
 * Bridges office-store gateway events into the eventStore.
 * Watches connection status and eventHistory for new items.
 * Fires toast notifications on errors.
 */
export function useEventStream() {
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const eventHistory = useOfficeStore((s) => s.eventHistory);
  const addEvent = useEventStore((s) => s.addEvent);
  const setWsConnected = useEventStore((s) => s.setWsConnected);
  const events = useEventStore((s) => s.events);
  const lastEvent = useEventStore((s) => s.lastEvent);
  const wsConnected = useEventStore((s) => s.wsConnected);

  // Sync WS connection status
  useEffect(() => {
    setWsConnected(connectionStatus === "connected");
  }, [connectionStatus, setWsConnected]);

  // Track last processed snapshot by length + first timestamp
  const lastSnapshotRef = useRef<{ length: number; firstTs: number }>({
    length: 0,
    firstTs: 0,
  });
  const seenIdsRef = useRef(new Set<string>());

  useEffect(() => {
    if (eventHistory.length === 0) return;

    const snap = lastSnapshotRef.current;
    const firstTs = eventHistory[0]?.timestamp ?? 0;

    // Detect new items: array grew or first item changed (prepend pattern)
    const isReset = firstTs !== snap.firstTs && eventHistory.length <= snap.length;
    const hasNew = eventHistory.length > snap.length || isReset;

    if (!hasNew) return;

    // Find truly new items (not yet seen)
    const toProcess = isReset
      ? eventHistory.slice(0, 5) // reset case: process most recent few
      : eventHistory.slice(0, eventHistory.length - snap.length);

    for (const item of toProcess) {
      const itemKey = `${item.timestamp}-${item.agentId}-${item.stream}`;
      if (seenIdsRef.current.has(itemKey)) continue;
      seenIdsRef.current.add(itemKey);

      let type: StreamEventType = "generic";
      if (item.stream === "error") type = "error";
      else if (item.stream === "lifecycle") type = "agent_status";
      else if (item.stream === "assistant") type = "session_message";
      else if (item.stream === "tool") type = "generic";

      addEvent({
        type,
        timestamp: item.timestamp,
        agentId: item.agentId,
        agentName: item.agentName,
        message: item.summary,
        data: { stream: item.stream },
      });

      // Toast on errors
      if (item.stream === "error") {
        toastError(
          `Agent Error — ${item.agentName}`,
          item.summary.slice(0, 120),
        );
      }
    }

    lastSnapshotRef.current = {
      length: eventHistory.length,
      firstTs,
    };
  }, [eventHistory, addEvent]);

  // Periodically prune seen IDs to prevent unbounded growth
  useEffect(() => {
    const interval = setInterval(() => {
      if (seenIdsRef.current.size > 300) {
        seenIdsRef.current.clear();
      }
    }, 120_000);
    return () => clearInterval(interval);
  }, []);

  return { events, lastEvent, wsConnected };
}
