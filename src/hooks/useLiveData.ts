import { useState, useEffect, useCallback, useSyncExternalStore, useRef } from 'react';
import { useWsLiveData, type WsLiveUpdate } from './useWsLiveData';

const WS_REFRESH_DEBOUNCE_MS = 2_000;
const FALLBACK_POLL_INTERVAL_MS = 15_000;

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

interface ActivityEvent {
  type: string;
  agent: string;
  message: string;
  ts: number;
}

interface OllamaInfo {
  loaded: Array<{ name: string; size: string }>;
  available: Array<{ name: string; size: string }>;
}

interface LiveData {
  crons: CronJob[];
  system: SystemInfo | null;
  gateway: GatewayStatus | null;
  agents: RealAgent[];
  history: HistoryPoint[];
  activity: ActivityEvent[];
  ollama: OllamaInfo | null;
  channels: string[];
  memoryFiles: Array<{ name: string; lines: number }>;
  loading: boolean;
  error: string | null;
  stale: boolean;
  lastRefresh: number;
  refresh: () => void;
  wsConnected: boolean;
}

const CACHE_KEY = 'openclaw-live-data-cache';

interface CachedLiveData {
  crons: CronJob[];
  system: SystemInfo | null;
  gateway: GatewayStatus | null;
  agents: RealAgent[];
  history: HistoryPoint[];
  activity: ActivityEvent[];
  ollama: OllamaInfo | null;
  channels: string[];
  memoryFiles: Array<{ name: string; lines: number }>;
  cachedAt: number;
}

function saveCache(data: CachedLiveData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

function loadCache(): CachedLiveData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedLiveData;
  } catch {
    return null;
  }
}

// Module-level stale signal for components that need stale status without polling
let _isStale = false;
const _staleListeners = new Set<() => void>();

function setStaleFlag(value: boolean) {
  if (_isStale !== value) {
    _isStale = value;
    _staleListeners.forEach((l) => l());
  }
}

export function useIsStale(): boolean {
  return useSyncExternalStore(
    (cb) => {
      _staleListeners.add(cb);
      return () => { _staleListeners.delete(cb); };
    },
    () => _isStale,
  );
}

const API_BASE = '/mc-api';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path}: ${res.status}`);
  return res.json();
}

export function useLiveData(pollIntervalMs = 30000): LiveData {
  const cached = loadCache();
  const [crons, setCrons] = useState<CronJob[]>(cached?.crons ?? []);
  const [system, setSystem] = useState<SystemInfo | null>(cached?.system ?? null);
  const [gateway, setGateway] = useState<GatewayStatus | null>(cached?.gateway ?? null);
  const [agents, setAgents] = useState<RealAgent[]>(cached?.agents ?? []);
  const [history, setHistory] = useState<HistoryPoint[]>(cached?.history ?? []);
  const [activity, setActivity] = useState<ActivityEvent[]>(cached?.activity ?? []);
  const [ollama, setOllama] = useState<OllamaInfo | null>(cached?.ollama ?? null);
  const [channels, setChannels] = useState<string[]>(cached?.channels ?? []);
  const [memoryFiles, setMemoryFiles] = useState<Array<{ name: string; lines: number }>>(cached?.memoryFiles ?? []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(cached?.cachedAt ?? 0);

  const refresh = useCallback(async () => {
    try {
      const [cronData, sysData, statusData, agentData, historyData, activityData, ollamaData, channelData, memData] = await Promise.all([
        fetchJson<{ jobs: CronJob[] }>('/crons'),
        fetchJson<SystemInfo>('/system'),
        fetchJson<GatewayStatus>('/status'),
        fetchJson<{ agents: RealAgent[] }>('/agents'),
        fetchJson<{ history: HistoryPoint[] }>('/history'),
        fetchJson<{ events: ActivityEvent[] }>('/activity'),
        fetchJson<OllamaInfo>('/ollama').catch(() => null),
        fetchJson<{ channels: string[] }>('/channels').catch(() => ({ channels: [] })),
        fetchJson<{ files: Array<{ name: string; lines: number }> }>('/memory').catch(() => ({ files: [] })),
      ]);
      const resolvedCrons = cronData.jobs || [];
      const resolvedAgents = agentData.agents || [];
      const resolvedHistory = historyData.history || [];
      const resolvedActivity = activityData.events || [];
      const resolvedChannels = channelData.channels || [];
      const resolvedMemory = memData.files || [];

      setCrons(resolvedCrons);
      setSystem(sysData);
      setGateway(statusData);
      setAgents(resolvedAgents);
      setHistory(resolvedHistory);
      setActivity(resolvedActivity);
      if (ollamaData) setOllama(ollamaData);
      setChannels(resolvedChannels);
      setMemoryFiles(resolvedMemory);
      setError(null);
      setStale(false);
      setStaleFlag(false);
      const now = Date.now();
      setLastRefresh(now);

      saveCache({
        crons: resolvedCrons,
        system: sysData,
        gateway: statusData,
        agents: resolvedAgents,
        history: resolvedHistory,
        activity: resolvedActivity,
        ollama: ollamaData,
        channels: resolvedChannels,
        memoryFiles: resolvedMemory,
        cachedAt: now,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      // If we have cached data loaded, mark as stale
      const fallback = loadCache();
      if (fallback) {
        setCrons(fallback.crons);
        setSystem(fallback.system);
        setGateway(fallback.gateway);
        setAgents(fallback.agents);
        setHistory(fallback.history);
        setActivity(fallback.activity);
        setOllama(fallback.ollama);
        setChannels(fallback.channels);
        setMemoryFiles(fallback.memoryFiles);
        setLastRefresh(fallback.cachedAt);
        setStale(true);
        setStaleFlag(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // WS-driven refresh: when gateway WS pushes updates, debounce a refresh
  const wsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWsUpdate = useCallback((_update: WsLiveUpdate) => {
    // Debounce: batch rapid WS events into a single refresh
    if (wsDebounceRef.current) clearTimeout(wsDebounceRef.current);
    wsDebounceRef.current = setTimeout(() => {
      wsDebounceRef.current = null;
      void refresh();
    }, WS_REFRESH_DEBOUNCE_MS);
  }, [refresh]);

  const { wsConnected } = useWsLiveData({ onUpdate: handleWsUpdate });

  useEffect(() => {
    // Always do an initial fetch
    void refresh();

    if (wsConnected) {
      // WS connected: no periodic polling needed, WS events trigger debounced refresh.
      // But do a slow background poll as safety net (every 60s).
      const safetyInterval = setInterval(() => void refresh(), 60_000);
      return () => {
        clearInterval(safetyInterval);
        if (wsDebounceRef.current) clearTimeout(wsDebounceRef.current);
      };
    }

    // WS disconnected: fall back to 15s polling
    const interval = setInterval(() => void refresh(), pollIntervalMs > 0 ? Math.min(pollIntervalMs, FALLBACK_POLL_INTERVAL_MS) : FALLBACK_POLL_INTERVAL_MS);
    return () => {
      clearInterval(interval);
      if (wsDebounceRef.current) clearTimeout(wsDebounceRef.current);
    };
  }, [refresh, pollIntervalMs, wsConnected]);

  return { crons, system, gateway, agents, history, activity, ollama, channels, memoryFiles, loading, error, stale, lastRefresh, refresh, wsConnected };
}
