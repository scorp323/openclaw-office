import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSoundState } from "@/hooks/useNotificationSounds";

export function SoundSection() {
  const { t } = useTranslation("console");
  const { volume, muted, setVolume, toggleMute } = useSoundState();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("settings.sound.title", { defaultValue: "Notification Sounds" })}
      </h3>

      <div className="space-y-4">
        {/* Mute toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {muted ? (
              <VolumeX className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <Volume2 className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("settings.sound.enable", { defaultValue: "Sound Alerts" })}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.sound.enableHint", { defaultValue: "Chimes on completion, alerts on errors, activity clicks" })}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!muted}
            onClick={toggleMute}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
              !muted ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                !muted ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Volume slider */}
        {!muted && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm text-gray-700 dark:text-gray-300">
              {t("settings.sound.volume", { defaultValue: "Volume" })}
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-300 accent-blue-600 dark:bg-gray-600"
            />
            <span className="w-10 text-right text-xs tabular-nums text-gray-500 dark:text-gray-400">
              {Math.round(volume * 100)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
