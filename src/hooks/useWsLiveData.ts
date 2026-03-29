import { useEffect, useRef } from "react";
import { useOfficeStore } from "@/store/office-store";

/**
 * Subscribes to gateway WS events (agent, health, cron, cost) and dispatches
 * updates to a callback. When WS is connected, the caller can skip HTTP polling.
 *
 * Returns { wsConnected } so callers know whether to fall back to polling.
 */

export interface WsLiveUpdate {
  kind: "health" | "agent-status" | "cron" | "cost" | "session";
  data: Record<string, unknown>;
}

interface UseWsLiveDataOptions {
  onUpdate: (update: WsLiveUpdate) => void;
}

export function useWsLiveData({ onUpdate }: UseWsLiveDataOptions): { wsConnected: boolean } {
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const wsConnected = connectionStatus === "connected";
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!wsConnected) return;

    // Subscribe to store event history for real-time agent/cron/cost changes.
    // The gateway pushes agent events, health snapshots, etc. which the office
    // store already processes. We piggyback on those to push live data updates.
    let prevEventLen = useOfficeStore.getState().eventHistory.length;

    const unsub = useOfficeStore.subscribe((state) => {
      const history = state.eventHistory;
      if (history.length <= prevEventLen) return;

      const newEvents = history.slice(prevEventLen);
      prevEventLen = history.length;

      for (const event of newEvents) {
        // Agent status changes
        if (event.stream === "lifecycle" || event.stream === "error") {
          onUpdateRef.current({
            kind: "agent-status",
            data: { agentId: event.agentId, stream: event.stream, timestamp: event.timestamp },
          });
        }
        // Tool calls may indicate cron completions
        if (event.stream === "tool") {
          onUpdateRef.current({
            kind: "cron",
            data: { agentId: event.agentId, timestamp: event.timestamp },
          });
        }
      }
    });

    return unsub;
  }, [wsConnected]);

  // Also subscribe to token/cost snapshots from the store
  useEffect(() => {
    if (!wsConnected) return;

    let prevTokenLen = useOfficeStore.getState().tokenHistory.length;

    const unsub = useOfficeStore.subscribe((state) => {
      const tokens = state.tokenHistory;
      if (tokens.length <= prevTokenLen) return;
      prevTokenLen = tokens.length;

      const latest = tokens[tokens.length - 1];
      if (latest) {
        onUpdateRef.current({
          kind: "cost",
          data: { total: latest.total, byAgent: latest.byAgent, timestamp: latest.timestamp },
        });
      }
    });

    return unsub;
  }, [wsConnected]);

  return { wsConnected };
}

/**
 * Hook that returns the gateway WS connection status for use as a
 * connection indicator in health bars and status displays.
 */
export function useWsConnectionStatus(): {
  connected: boolean;
  status: string;
  error: string | undefined;
} {
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const connectionError = useOfficeStore((s) => s.connectionError);

  return {
    connected: connectionStatus === "connected",
    status: connectionStatus,
    error: connectionError ?? undefined,
  };
}
