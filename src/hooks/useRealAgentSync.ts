import { useEffect, useRef } from "react";
import { useOfficeStore } from "@/store/office-store";

interface RealAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  zone: string;
  status: "active" | "standby" | "offline";
}

/**
 * Syncs the real 7-agent roster from MC API into the office store
 * so they appear on the FloorPlan. Only injects agents not already
 * present from the gateway WebSocket.
 */
export function useRealAgentSync(realAgents: RealAgent[]) {
  const initAgents = useOfficeStore((s) => s.initAgents);
  const agents = useOfficeStore((s) => s.agents);
  const syncMainAgents = useOfficeStore((s) => s.syncMainAgents);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (realAgents.length === 0) return;

    // Convert real agents to AgentSummary format for the store
    const summaries = realAgents.map((a) => ({
      id: a.id,
      name: a.name,
      identity: { name: a.name },
      sessionsCount: 0,
      lastActiveAgeMs: 0,
    }));

    if (!hasInitialized.current) {
      // First load: initialize with real roster
      // Only do this if the store has fewer agents than our roster
      const existingNonPlaceholder = Array.from(agents.values()).filter(
        (a) => !a.isPlaceholder
      );
      if (existingNonPlaceholder.length < realAgents.length) {
        initAgents(summaries);
        hasInitialized.current = true;
      }
    } else {
      // Subsequent: sync without wiping sub-agents
      syncMainAgents(summaries);
    }
  }, [realAgents, initAgents, syncMainAgents]);

  // Update agent statuses based on API data
  useEffect(() => {
    if (realAgents.length === 0) return;
    const updateAgent = useOfficeStore.getState().updateAgent;
    const store = useOfficeStore.getState();

    for (const ra of realAgents) {
      const existing = store.agents.get(ra.id);
      if (existing) {
        // Map API status to visual status
        if (ra.status === "active" && existing.status === "idle") {
          // Keep the visual status from WebSocket if it's more specific
        } else if (ra.status === "offline") {
          updateAgent(ra.id, { status: "offline" as any });
        }
      }
    }
  }, [realAgents]);
}
