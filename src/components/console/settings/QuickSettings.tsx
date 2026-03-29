import { Moon, Sun, Volume2, VolumeX, Bell, BellOff, Briefcase } from "lucide-react";
import { useState } from "react";
import { useSoundState } from "@/hooks/useNotificationSounds";
import { useConsoleSettingsStore } from "@/store/console-stores/settings-store";
import { useOfficeStore } from "@/store/office-store";

type WorkMode = "default" | "recording";

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon,
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 dark:text-gray-400">{icon}</span>
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
          {hint && <p className="text-xs text-gray-500 dark:text-gray-500">{hint}</p>}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function QuickSettings() {
  const theme = useConsoleSettingsStore((s) => s.theme);
  const setThemePref = useConsoleSettingsStore((s) => s.setTheme);
  const setOfficeTheme = useOfficeStore((s) => s.setTheme);
  const notificationsEnabled = useConsoleSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useConsoleSettingsStore((s) => s.setNotificationsEnabled);

  const { muted, toggleMute } = useSoundState();

  // Work mode — persisted in localStorage + POST to API
  const [workMode, setWorkModeState] = useState<WorkMode>(() => {
    try {
      return (localStorage.getItem("mc_work_mode") as WorkMode) ?? "default";
    } catch {
      return "default";
    }
  });

  const isDark =
    theme === "dark" ||
    (theme === "system" && resolveSystemTheme() === "dark");

  const handleDarkMode = (on: boolean) => {
    const pref = on ? "dark" : "light";
    setThemePref(pref);
    setOfficeTheme(pref);
  };

  const handleWorkMode = (isRecording: boolean) => {
    const mode: WorkMode = isRecording ? "recording" : "default";
    setWorkModeState(mode);
    try {
      localStorage.setItem("mc_work_mode", mode);
    } catch {}
    void fetch("/mc-api/workmode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    }).catch(() => {});
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        Quick Settings
      </h3>
      <div className="space-y-4">
        <SettingRow
          icon={isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          label="Dark Mode"
          hint="Toggle between light and dark appearance"
          checked={isDark}
          onChange={handleDarkMode}
        />

        <SettingRow
          icon={muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          label="Sound Alerts"
          hint="Notification chimes and activity sounds"
          checked={!muted}
          onChange={() => toggleMute()}
        />

        <SettingRow
          icon={<Briefcase className="h-4 w-4" />}
          label="Recording Mode"
          hint="Switch to focused recording workflow"
          checked={workMode === "recording"}
          onChange={handleWorkMode}
        />

        <SettingRow
          icon={notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          label="Notifications"
          hint="Browser notifications for errors and messages"
          checked={notificationsEnabled}
          onChange={setNotificationsEnabled}
        />
      </div>
    </div>
  );
}
