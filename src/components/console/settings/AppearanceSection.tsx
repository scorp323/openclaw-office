import { useEffect } from "react";
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

// ─── Accent colors ────────────────────────────────────────────────────────────

interface AccentColor {
  name: string;
  hex: string;
}

const ACCENT_COLORS: AccentColor[] = [
  { name: "Matrix Green", hex: "#00ff41" },
  { name: "Ocean Blue", hex: "#3b82f6" },
  { name: "Royal Purple", hex: "#8b5cf6" },
  { name: "Sunset Orange", hex: "#f97316" },
  { name: "Ruby Red", hex: "#ef4444" },
  { name: "Gold", hex: "#eab308" },
];

const ACCENT_KEY = "mc_accent_color";
const DEFAULT_ACCENT = "#3b82f6";

function loadAccent(): string {
  try { return localStorage.getItem(ACCENT_KEY) ?? DEFAULT_ACCENT; } catch { return DEFAULT_ACCENT; }
}

function applyAccent(hex: string) {
  document.documentElement.style.setProperty("--accent", hex);
  try { localStorage.setItem(ACCENT_KEY, hex); } catch { /* empty */ }
}

// ─── Preset combos ────────────────────────────────────────────────────────────

interface ThemePreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  theme: "light" | "dark";
  accent: string;
  colorTheme: ColorTheme;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "hacker",
    name: "Hacker",
    emoji: "🟢",
    description: "Dark + Matrix Green",
    theme: "dark",
    accent: "#00ff41",
    colorTheme: "matrix",
  },
  {
    id: "corporate",
    name: "Corporate",
    emoji: "🔵",
    description: "Light + Ocean Blue",
    theme: "light",
    accent: "#3b82f6",
    colorTheme: "matrix",
  },
  {
    id: "neon",
    name: "Neon",
    emoji: "🟣",
    description: "Dark + Royal Purple",
    theme: "dark",
    accent: "#8b5cf6",
    colorTheme: "cyberpunk",
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppearanceSection() {
  const { t, i18n } = useTranslation("console");
  const theme = useConsoleSettingsStore((s) => s.theme);
  const setThemePref = useConsoleSettingsStore((s) => s.setTheme);
  const setOfficeTheme = useOfficeStore((s) => s.setTheme);
  const colorTheme = useOfficeStore((s) => s.colorTheme);
  const setColorTheme = useOfficeStore((s) => s.setColorTheme);
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);
  const setSoundEnabled = useOfficeStore((s) => s.setSoundEnabled);

  // Restore accent on mount
  useEffect(() => {
    applyAccent(loadAccent());
  }, []);

  const currentAccent = loadAccent();

  const handleThemeChange = (pref: ThemePreference) => {
    setThemePref(pref);
    const resolved = pref === "system" ? resolveSystemTheme() : pref;
    setOfficeTheme(resolved);
  };

  const handlePreset = (preset: ThemePreset) => {
    setThemePref(preset.theme);
    setOfficeTheme(preset.theme);
    setColorTheme(preset.colorTheme);
    applyAccent(preset.accent);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("settings.appearance.title")}
      </h3>

      <div className="space-y-5">
        {/* ── Theme presets ── */}
        <div>
          <span className="mb-2 block text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Theme Presets
          </span>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePreset(preset)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:border-gray-400 hover:shadow-md dark:border-gray-600 dark:text-gray-300 dark:hover:border-gray-400"
              >
                <span>{preset.emoji}</span>
                <span>{preset.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{preset.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Light/Dark/System ── */}
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

        {/* ── Color theme ── */}
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

        {/* ── Accent color picker ── */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">Accent Color</span>
            <span
              className="h-4 w-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: currentAccent }}
              title={currentAccent}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {ACCENT_COLORS.map((ac) => (
              <button
                key={ac.hex}
                type="button"
                onClick={() => applyAccent(ac.hex)}
                title={ac.name}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                  currentAccent === ac.hex
                    ? "border-gray-400 bg-gray-50 text-gray-800 shadow-sm dark:border-gray-400 dark:bg-gray-700 dark:text-gray-100"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: ac.hex,
                    boxShadow: currentAccent === ac.hex ? `0 0 8px ${ac.hex}` : "none",
                  }}
                />
                {ac.name}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-gray-400 dark:text-gray-500">
            Applies to buttons, active nav, links, and progress indicators via{" "}
            <code className="rounded bg-gray-100 px-1 dark:bg-gray-700">--accent</code>
          </p>
        </div>

        {/* ── Language ── */}
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

        {/* ── Sound ── */}
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
