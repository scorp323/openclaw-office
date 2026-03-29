import { create } from "zustand";

interface CostState {
  todayCostUsd: number;
  todayTokens: number;
  updatedAt: number;
  fetchCosts: () => Promise<void>;
}

const API_BASE = "/mc-api";

export const useCostStore = create<CostState>((set) => ({
  todayCostUsd: 0,
  todayTokens: 0,
  updatedAt: 0,

  fetchCosts: async () => {
    try {
      const token = (() => { try { return localStorage.getItem("openclaw-mc-auth-token"); } catch { return null; } })();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${API_BASE}/costs`, { headers });
      if (!res.ok) return;
      const data = await res.json();
      set({
        todayCostUsd: data.todayCostUsd ?? 0,
        todayTokens: data.todayTokens ?? 0,
        updatedAt: data.updatedAt ?? Date.now(),
      });
    } catch {
      // silently fail
    }
  },
}));
