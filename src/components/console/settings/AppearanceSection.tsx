import { Sun, Moon, Monitor, Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ColorTheme } from "@/gateway/types";
import { useConsoleSettingsStore } from "@/store/console-stores/settings-store";
import { useOfficeStore } from "@/store/office-store";

type ThemePreference = "light" | "dark" | "system";

const THEME_OPTIONS: Array<{ value: ThemePreference; icon: typeof Sun; labelKey: string }> = [
  { value: "light", icon: Sun, labelKey: "settings.appearance.themeLight" },
  { value: "dark", icon: Moon, labelKey: "settings.appearance.themeDark" },
  { value: "system", icon: Monitor, labelKey: "settings.appearance.themeSystem" },
];

const COLOR_THEME_OPTIONS: Array<{ value: ColorTheme; labelKey: string; color: string }> = [
  { value: "matrix", labelKey: "settings.appearance.colorMatrix", color: "#00ff41" },
  { value: "cyberpunk", labelKey: "settings.appearance.colorCyberpunk", color: "#ff00ff" },
  { value: "midnight", labelKey: "settings.appearance.colorMidnight", color: "#e0e0ff" },
];

const LANG_OPTIONS = [
  { value: "zh", labelKey: "settings.appearance.langZh" },
  { value: "en", labelKey: "settings.appearance.langEn" },
];

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function AppearanceSection() {
  const { t, i18n } = useTranslation("console");
  const theme = useConsoleSettingsStore((s) => s.theme);
  const setThemePref = useConsoleSettingsStore((s) => s.setTheme);
  const setOfficeTheme = useOfficeStore((s) => s.setTheme);
  const colorTheme = useOfficeStore((s) => s.colorTheme);
  const setColorTheme = useOfficeStore((s) => s.setColorTheme);
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);
  const setSoundEnabled = useOfficeStore((s) => s.setSoundEnabled);

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePref(pref);
    const resolved = pref === "system" ? resolveSystemTheme() : pref;
    setOfficeTheme(resolved);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("settings.appearance.title")}
      </h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("settings.appearance.theme")}
          </span>
          <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-600">
            {THEME_OPTIONS.map(({ value, icon: Icon, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => handleThemeChange(value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  theme === value
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("settings.appearance.language")}
          </span>
          <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-600">
            {LANG_OPTIONS.map(({ value, labelKey }) => (
              <button
                key={value}
                type="button"
                onClick={() => i18n.changeLanguage(value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  i18n.language === value
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("settings.appearance.colorTheme")}
          </span>
          <div className="flex gap-1 rounded-lg border border-gray-200 p-1 dark:border-gray-600">
            {COLOR_THEME_OPTIONS.map(({ value, labelKey, color }) => (
              <button
                key={value}
                type="button"
                onClick={() => setColorTheme(value)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  colorTheme === value
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                    : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
                />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("settings.appearance.ambientSound")}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.appearance.ambientSoundHint")}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              soundEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                soundEnabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
