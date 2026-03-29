import { create } from "zustand";

export interface NotificationItem {
  id: string;
  type: "cron_failure" | "agent_error" | "task_complete" | "info";
  title: string;
  message: string;
  ts: number;
  read: boolean;
}

interface NotificationBellState {
  items: NotificationItem[];
  unreadCount: number;
  isOpen: boolean;
  addNotification: (item: Omit<NotificationItem, "id" | "read">) => void;
  markAllRead: () => void;
  toggleOpen: () => void;
  close: () => void;
  fetchActivity: () => Promise<void>;
}

const API_BASE = "/mc-api";
let lastFetchTs = 0;

export const useNotificationBellStore = create<NotificationBellState>((set, get) => ({
  items: [],
  unreadCount: 0,
  isOpen: false,

  addNotification: (item) => {
    const newItem: NotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      read: false,
    };
    set((s) => ({
      items: [newItem, ...s.items].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    }));
  },

  markAllRead: () => {
    set((s) => ({
      items: s.items.map((i) => ({ ...i, read: true })),
      unreadCount: 0,
    }));
  },

  toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
  close: () => set({ isOpen: false }),

  fetchActivity: async () => {
    try {
      const res = await fetch(`${API_BASE}/activity`);
      if (!res.ok) return;
      const data = await res.json();
      const events: Array<{ type: string; agent: string; message: string; ts: number }> =
        data.events ?? [];

      const existingIds = new Set(get().items.map((i) => i.id));
      const newItems: NotificationItem[] = [];

      for (const ev of events) {
        if (ev.ts <= lastFetchTs) continue;
        const id = `activity-${ev.ts}-${ev.agent}`;
        if (existingIds.has(id)) continue;

        let type: NotificationItem["type"] = "info";
        if (ev.type === "error") type = "cron_failure";
        else if (ev.type === "cron") type = "task_complete";

        newItems.push({
          id,
          type,
          title: ev.agent,
          message: ev.message,
          ts: ev.ts,
          read: false,
        });
      }

      if (newItems.length > 0) {
        set((s) => ({
          items: [...newItems, ...s.items].slice(0, 50),
          unreadCount: s.unreadCount + newItems.length,
        }));
      }

      if (events.length > 0) {
        lastFetchTs = Math.max(...events.map((e) => e.ts));
      }
    } catch {
      // silently fail
    }
  },
}));
