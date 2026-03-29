import { create } from "zustand";

export type StreamEventType =
  | "agent_status"
  | "cron_complete"
  | "error"
  | "session_message"
  | "generic";

export interface StreamEvent {
  id: string;
  type: StreamEventType;
  timestamp: number;
  agentId?: string;
  agentName?: string;
  message: string;
  data: Record<string, unknown>;
}

interface EventStoreState {
  events: StreamEvent[];
  lastEvent: StreamEvent | null;
  wsConnected: boolean;
  addEvent: (event: Omit<StreamEvent, "id">) => void;
  setWsConnected: (connected: boolean) => void;
  clearEvents: () => void;
}

const MAX_EVENTS = 50;

export const useEventStore = create<EventStoreState>((set) => ({
  events: [],
  lastEvent: null,
  wsConnected: false,

  addEvent: (event) => {
    const id = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const item: StreamEvent = { id, ...event };
    set((s) => {
      const events = [item, ...s.events].slice(0, MAX_EVENTS);
      return { events, lastEvent: item };
    });
  },

  setWsConnected: (wsConnected) => set({ wsConnected }),

  clearEvents: () => set({ events: [], lastEvent: null }),
}));
