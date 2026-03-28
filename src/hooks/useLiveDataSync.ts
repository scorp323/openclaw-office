import { useEffect, useRef } from 'react';
import { useLiveData } from './useLiveData';
import { useOfficeStore } from '@/store/office-store';
import type { AgentVisualStatus } from '@/gateway/types';

/**
 * Agent role mapping — maps OpenClaw agent IDs to display names and roles.
 * The office store uses these to place agents in the correct zones.
 */
const KNOWN_AGENTS: Record<string, { name: string; role: string }> = {
  main: { name: 'Morpheus', role: 'CEO' },
  fast: { name: 'Chief Analyst', role: 'deepseek-r1' },
};

/**
 * Syncs REST API live data into the office Zustand store so the FloorPlan
 * can render real agents from the gateway alongside WebSocket-driven state.
 */
export function useLiveDataSync(pollIntervalMs = 15000) {
  const liveData = useLiveData(pollIntervalMs);
  const prevAgentIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const { gateway, crons } = liveData;
    if (!gateway) return;

    const store = useOfficeStore.getState();
    const agents = gateway.agents?.agents || [];
    const currentIds = new Set(agents.map(a => a.id));

    // Find which crons are currently running (have recent activity)
    const activeCronAgents = new Set<string>();
    for (const cron of crons) {
      if (cron.state?.lastRunAtMs && Date.now() - cron.state.lastRunAtMs < 120_000) {
        // This cron ran recently — try to identify the agent
        // Cron names often contain agent ids or we can infer from the pattern
        activeCronAgents.add(cron.id);
      }
    }

    for (const apiAgent of agents) {
      const existing = store.agents.get(apiAgent.id);
      const known = KNOWN_AGENTS[apiAgent.id];
      const displayName = known?.name || apiAgent.name || apiAgent.id;

      if (!existing) {
        // Agent doesn't exist in store yet — ensure it's added via the store's own API
        // Only add if it wasn't already there from WebSocket events
        const isActive = apiAgent.lastActiveAgeMs < 120_000;
        const status: AgentVisualStatus = isActive ? 'thinking' : 'idle';
        store.updateAgent(apiAgent.id, { name: displayName, status });
        // If updateAgent doesn't work (agent doesn't exist), we use addAgent indirectly
        // by checking again
        if (!store.agents.get(apiAgent.id)) {
          // Let initAgents handle new agents — it properly positions them
          store.initAgents([{ id: apiAgent.id, name: displayName }]);
        }
      } else {
        // Update name if we have a better one
        if (known && existing.name !== displayName) {
          store.updateAgent(apiAgent.id, { name: displayName });
        }
        // If agent was recently active via REST but shows idle in store, mark as thinking
        if (apiAgent.lastActiveAgeMs < 60_000 && existing.status === 'idle') {
          store.updateAgent(apiAgent.id, { status: 'thinking' });
        }
      }
    }

    prevAgentIdsRef.current = currentIds;
  }, [liveData]);

  return liveData;
}
