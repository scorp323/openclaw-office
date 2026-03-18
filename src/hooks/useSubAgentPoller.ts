import { useEffect, useRef } from "react";
import type { GatewayRpcClient } from "@/gateway/rpc-client";
import type { SubAgentInfo } from "@/gateway/types";
import { useOfficeStore } from "@/store/office-store";

const POLL_INTERVAL_MS = 3_000;
const SUB_AGENT_MAX_IDLE_MS = 5 * 60_000;

interface SessionEntry {
  sessionKey: string;
  agentId: string;
  label?: string;
  task?: string;
  requesterSessionKey?: string;
  startedAt?: number;
}

interface SessionsListResponse {
  sessions: SessionEntry[];
}

export function diffSessions(
  prev: SubAgentInfo[],
  next: SubAgentInfo[],
): { added: SubAgentInfo[]; removed: SubAgentInfo[] } {
  const prevKeys = new Set(prev.map((s) => s.sessionKey));
  const nextKeys = new Set(next.map((s) => s.sessionKey));

  const added = next.filter((s) => !prevKeys.has(s.sessionKey));
  const removed = prev.filter((s) => !nextKeys.has(s.sessionKey));

  return { added, removed };
}

/**
 * Extract the sub-agent UUID from a sessionKey like "agent:<parent>:subagent:<uuid>".
 * Returns null if the pattern doesn't match.
 */
export { extractSubAgentUuid as extractSubAgentUuidForTest };
function extractSubAgentUuid(sessionKey: string): string | null {
  const marker = ":subagent:";
  const idx = sessionKey.indexOf(marker);
  if (idx >= 0) {
    return sessionKey.slice(idx + marker.length);
  }
  return null;
}

function toSubAgentInfoList(entries: SessionEntry[]): SubAgentInfo[] {
  return entries
    .filter((s) => s.requesterSessionKey)
    .map((s) => {
      // Gateway returns agentId as the parent agent name (e.g. "main"), not the
      // sub-agent's unique id. Extract the UUID from the sessionKey instead to
      // avoid colliding with the parent agent in the store.
      const subUuid = extractSubAgentUuid(s.sessionKey);
      const effectiveId = subUuid ?? s.agentId;
      return {
        sessionKey: s.sessionKey,
        agentId: effectiveId,
        label: s.label ?? (subUuid ? `Sub-${subUuid.slice(0, 6)}` : s.agentId),
        task: s.task ?? "",
        requesterSessionKey: s.requesterSessionKey!,
        startedAt: s.startedAt ?? Date.now(),
      };
    });
}

export function useSubAgentPoller(rpcClient: React.RefObject<GatewayRpcClient | null>) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const connectionStatus = useOfficeStore((s) => s.connectionStatus);

  useEffect(() => {
    if (connectionStatus !== "connected" || !rpcClient.current) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const poll = async () => {
      const rpc = rpcClient.current;
      if (!rpc) {
        return;
      }

      try {
        const resp = await rpc.request<SessionsListResponse>("sessions.list");
        const nextSubs = toSubAgentInfoList(resp.sessions ?? []);

        // Read snapshot from store directly to avoid stale closure
        const currentSnapshot = useOfficeStore.getState().lastSessionsSnapshot;
        const prevSubs = currentSnapshot?.sessions ?? [];
        const { added, removed } = diffSessions(prevSubs, nextSubs);

        for (const sub of added) {
          const parentId = resolveParentAgent(sub.requesterSessionKey);
          if (parentId) {
            useOfficeStore.getState().addSubAgent(parentId, sub);
          }
        }

        for (const sub of removed) {
          if (useOfficeStore.getState().agents.has(sub.agentId)) {
            useOfficeStore.getState().retireSubAgent(sub.agentId);
          }
        }

        useOfficeStore.getState().setSessionsSnapshot({ sessions: nextSubs, fetchedAt: Date.now() });

        // Safety net: retire idle sub-agents that have been around too long
        // without pendingRetire (missed lifecycle:end or stale session).
        const now = Date.now();
        const activeSessionIds = new Set(nextSubs.map((s) => s.agentId));
        for (const [id, agent] of useOfficeStore.getState().agents) {
          if (
            agent.isSubAgent &&
            !agent.isPlaceholder &&
            !agent.pendingRetire &&
            agent.status === "idle" &&
            !activeSessionIds.has(id) &&
            now - agent.lastActiveAt > SUB_AGENT_MAX_IDLE_MS
          ) {
            useOfficeStore.getState().retireSubAgent(id);
          }
        }
      } catch {
        // RPC failure — skip this cycle
      }
    };

    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    poll();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionStatus]);

  function resolveParentAgent(requesterSessionKey: string): string | null {
    const sessionKeyMap = useOfficeStore.getState().sessionKeyMap;
    const agentIds = sessionKeyMap.get(requesterSessionKey);
    if (agentIds && agentIds.length > 0) {
      return agentIds[0];
    }

    for (const [id, agent] of useOfficeStore.getState().agents) {
      if (!agent.isSubAgent) {
        return id;
      }
    }
    return null;
  }
}
