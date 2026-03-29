import { create } from "zustand";

type ThemePreference = "light" | "dark" | "system";

const SETTINGS_KEY = "openclaw-console-settings";
const THEME_KEY = "openclaw-console-theme";
const LANG_KEY = "openclaw-console-lang";
const DEV_MODE_KEY = "openclaw-console-dev-mode";

interface PersistedSettings {
  theme: ThemePreference;
  language: string;
  gatewayUrl: string;
  refreshInterval: number;
  notificationsEnabled: boolean;
  notifyOnError: boolean;
  notifyOnChat: boolean;
  notifyOnConnection: boolean;
  notifyOnlyWhenHidden: boolean;
}

const DEFAULT_SETTINGS: PersistedSettings = {
  theme: "system",
  language: "zh",
  gatewayUrl: "ws://localhost:18789",
  refreshInterval: 30000,
  notificationsEnabled: false,
  notifyOnError: true,
  notifyOnChat: true,
  notifyOnConnection: true,
  notifyOnlyWhenHidden: false,
};

function loadSettings(): PersistedSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  // Migrate from legacy keys
  const theme = readLocal(THEME_KEY, DEFAULT_SETTINGS.theme) as ThemePreference;
  const language = readLocal(LANG_KEY, DEFAULT_SETTINGS.language);
  return { ...DEFAULT_SETTINGS, theme, language };
}

function readLocal(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return localStorage.getItem(key) ?? fallback;
}

function readLocalBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const val = localStorage.getItem(key);
  if (val === null) return fallback;
  return val === "true";
}

function saveToLocalStorage(settings: PersistedSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    // Also save to legacy keys for backward compat
    localStorage.setItem(THEME_KEY, settings.theme);
    localStorage.setItem(LANG_KEY, settings.language);
  } catch {}
}

function saveToServer(settings: PersistedSettings): void {
  const token = (() => { try { return localStorage.getItem("openclaw-mc-auth-token"); } catch { return null; } })();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  fetch("/mc-api/settings", {
    method: "POST",
    headers,
    body: JSON.stringify(settings),
  }).catch(() => {});
}

interface ConsoleSettingsState {
  theme: ThemePreference;
  language: string;
  devModeUnlocked: boolean;
  gatewayUrl: string;
  refreshInterval: number;
  notificationsEnabled: boolean;
  notifyOnError: boolean;
  notifyOnChat: boolean;
  notifyOnConnection: boolean;
  notifyOnlyWhenHidden: boolean;
  settingsLoaded: boolean;

  setTheme: (theme: ThemePreference) => void;
  setLanguage: (lang: string) => void;
  setDevModeUnlocked: (v: boolean) => void;
  setGatewayUrl: (url: string) => void;
  setRefreshInterval: (ms: number) => void;
  setNotificationsEnabled: (v: boolean) => void;
  setNotifyOnError: (v: boolean) => void;
  setNotifyOnChat: (v: boolean) => void;
  setNotifyOnConnection: (v: boolean) => void;
  setNotifyOnlyWhenHidden: (v: boolean) => void;
  loadFromServer: () => Promise<void>;
  persistAll: () => void;
}

function getPersistedFromState(state: ConsoleSettingsState): PersistedSettings {
  return {
    theme: state.theme,
    language: state.language,
    gatewayUrl: state.gatewayUrl,
    refreshInterval: state.refreshInterval,
    notificationsEnabled: state.notificationsEnabled,
    notifyOnError: state.notifyOnError,
    notifyOnChat: state.notifyOnChat,
    notifyOnConnection: state.notifyOnConnection,
    notifyOnlyWhenHidden: state.notifyOnlyWhenHidden,
  };
}

const initial = loadSettings();

export const useConsoleSettingsStore = create<ConsoleSettingsState>((set, get) => ({
  theme: initial.theme,
  language: initial.language,
  devModeUnlocked: readLocalBool(DEV_MODE_KEY, false),
  gatewayUrl: initial.gatewayUrl,
  refreshInterval: initial.refreshInterval,
  notificationsEnabled: initial.notificationsEnabled,
  notifyOnError: initial.notifyOnError,
  notifyOnChat: initial.notifyOnChat,
  notifyOnConnection: initial.notifyOnConnection,
  notifyOnlyWhenHidden: initial.notifyOnlyWhenHidden,
  settingsLoaded: false,

  setTheme: (theme) => {
    set({ theme });
    const persisted = getPersistedFromState({ ...get(), theme });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setLanguage: (language) => {
    set({ language });
    const persisted = getPersistedFromState({ ...get(), language });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setDevModeUnlocked: (devModeUnlocked) => {
    localStorage.setItem(DEV_MODE_KEY, String(devModeUnlocked));
    set({ devModeUnlocked });
  },

  setGatewayUrl: (gatewayUrl) => {
    set({ gatewayUrl });
    const persisted = getPersistedFromState({ ...get(), gatewayUrl });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setRefreshInterval: (refreshInterval) => {
    set({ refreshInterval });
    const persisted = getPersistedFromState({ ...get(), refreshInterval });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setNotificationsEnabled: (notificationsEnabled) => {
    set({ notificationsEnabled });
    const persisted = getPersistedFromState({ ...get(), notificationsEnabled });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setNotifyOnError: (notifyOnError) => {
    set({ notifyOnError });
    const persisted = getPersistedFromState({ ...get(), notifyOnError });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setNotifyOnChat: (notifyOnChat) => {
    set({ notifyOnChat });
    const persisted = getPersistedFromState({ ...get(), notifyOnChat });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setNotifyOnConnection: (notifyOnConnection) => {
    set({ notifyOnConnection });
    const persisted = getPersistedFromState({ ...get(), notifyOnConnection });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  setNotifyOnlyWhenHidden: (notifyOnlyWhenHidden) => {
    set({ notifyOnlyWhenHidden });
    const persisted = getPersistedFromState({ ...get(), notifyOnlyWhenHidden });
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },

  loadFromServer: async () => {
    try {
      const token = (() => { try { return localStorage.getItem("openclaw-mc-auth-token"); } catch { return null; } })();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/mc-api/settings", { headers });
      if (!res.ok) return;
      const serverSettings = await res.json();
      if (serverSettings && typeof serverSettings === "object" && Object.keys(serverSettings).length > 0) {
        const merged = { ...DEFAULT_SETTINGS, ...serverSettings } as PersistedSettings;
        set({
          theme: merged.theme,
          language: merged.language,
          gatewayUrl: merged.gatewayUrl,
          refreshInterval: merged.refreshInterval,
          notificationsEnabled: merged.notificationsEnabled,
          notifyOnError: merged.notifyOnError,
          notifyOnChat: merged.notifyOnChat,
          notifyOnConnection: merged.notifyOnConnection,
          notifyOnlyWhenHidden: merged.notifyOnlyWhenHidden,
          settingsLoaded: true,
        });
        saveToLocalStorage(merged);
      } else {
        set({ settingsLoaded: true });
      }
    } catch {
      set({ settingsLoaded: true });
    }
  },

  persistAll: () => {
    const persisted = getPersistedFromState(get());
    saveToLocalStorage(persisted);
    saveToServer(persisted);
  },
}));
