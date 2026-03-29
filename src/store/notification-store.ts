import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────

export type NotificationCategory = "agentError" | "agentLifecycle" | "chatMessage" | "connectionLost";

export interface NotificationPreferences {
  enabled: boolean;
  categories: Record<NotificationCategory, boolean>;
  /** Only notify when page is not visible (background/minimized) */
  onlyWhenHidden: boolean;
}

interface NotificationStoreState {
  /** Browser permission: "default" | "granted" | "denied" */
  permission: NotificationPermission;
  /** Service worker registered */
  swReady: boolean;
  /** User preferences (persisted to localStorage) */
  preferences: NotificationPreferences;

  setPermission: (p: NotificationPermission) => void;
  setSwReady: (ready: boolean) => void;
  setEnabled: (enabled: boolean) => void;
  setCategoryEnabled: (category: NotificationCategory, enabled: boolean) => void;
  setOnlyWhenHidden: (v: boolean) => void;
}

// ── Persistence ──────────────────────────────────────────────────────

const PREFS_KEY = "openclaw-notification-prefs";

const defaultPreferences: NotificationPreferences = {
  enabled: false,
  categories: {
    agentError: true,
    agentLifecycle: false,
    chatMessage: true,
    connectionLost: true,
  },
  onlyWhenHidden: true,
};

function loadPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<NotificationPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      categories: { ...defaultPreferences.categories, ...parsed.categories },
    };
  } catch {
    return defaultPreferences;
  }
}

function savePreferences(prefs: NotificationPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // quota exceeded — ignore
  }
}

// ── Store ────────────────────────────────────────────────────────────

export const useNotificationStore = create<NotificationStoreState>((set, get) => ({
  permission: typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "default",
  swReady: false,
  preferences: loadPreferences(),

  setPermission: (permission) => set({ permission }),

  setSwReady: (swReady) => set({ swReady }),

  setEnabled: (enabled) => {
    const prefs = { ...get().preferences, enabled };
    savePreferences(prefs);
    set({ preferences: prefs });
  },

  setCategoryEnabled: (category, enabled) => {
    const prefs = {
      ...get().preferences,
      categories: { ...get().preferences.categories, [category]: enabled },
    };
    savePreferences(prefs);
    set({ preferences: prefs });
  },

  setOnlyWhenHidden: (onlyWhenHidden) => {
    const prefs = { ...get().preferences, onlyWhenHidden };
    savePreferences(prefs);
    set({ preferences: prefs });
  },
}));
