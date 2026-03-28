import { useState, useEffect, useCallback } from 'react';

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  schedule: { kind: string; everyMs?: number; expr?: string };
  state: {
    lastRunAtMs?: number;
    lastRunStatus?: string;
    nextRunAtMs?: number;
    consecutiveErrors: number;
    lastDurationMs?: number;
  };
}

interface SystemInfo {
  uptime: string;
  ollama: string;
  disk: string;
  mem: string;
}

interface GatewayStatus {
  runtimeVersion: string;
  agents: { defaultId: string; agents: Array<{ id: string; name?: string; sessionsCount: number; lastActiveAgeMs: number }> };
  sessions: { count: number };
  gateway: { mode: string; reachable: boolean; self: { host: string; ip: string; version: string } };
  channelSummary: string[];
  os: { platform: string; arch: string; release: string; label: string };
}

interface RealAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  zone: string;
  status: 'active' | 'standby' | 'offline';
}

interface HistoryPoint {
  ts: number;
  cronHealthy: number;
  cronErrors: number;
  cronTotal: number;
  ollamaCount: number;
  sessionCount: number;
}

interface LiveData {
  crons: CronJob[];
  system: SystemInfo | null;
  gateway: GatewayStatus | null;
  agents: RealAgent[];
  history: HistoryPoint[];
  loading: boolean;
  error: string | null;
  lastRefresh: number;
  refresh: () => void;
}

const API_BASE = '/mc-api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export function useLiveData(pollIntervalMs = 30000): LiveData {
  const [crons, setCrons] = useState<CronJob[]>([]);
  const [system, setSystem] = useState<SystemInfo | null>(null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(null);
  const [agents, setAgents] = useState<RealAgent[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [cronData, sysData, statusData, agentData, historyData] = await Promise.all([
        fetchJson<{ jobs: CronJob[] }>('/crons'),
        fetchJson<SystemInfo>('/system'),
        fetchJson<GatewayStatus>('/status'),
        fetchJson<{ agents: RealAgent[] }>('/agents'),
        fetchJson<{ history: HistoryPoint[] }>('/history'),
      ]);
      setCrons(cronData.jobs || []);
      setSystem(sysData);
      setGateway(statusData);
      setAgents(agentData.agents || []);
      setHistory(historyData.history || []);
      setError(null);
      setLastRefresh(Date.now());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  return { crons, system, gateway, agents, history, loading, error, lastRefresh, refresh };
}
