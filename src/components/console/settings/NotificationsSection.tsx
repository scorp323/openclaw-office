import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { requestPermission, isNotificationSupported } from "@/lib/push-notifications";
import {
  useNotificationStore,
  type NotificationCategory,
} from "@/store/notification-store";

const CATEGORIES: NotificationCategory[] = [
  "agentError",
  "chatMessage",
  "connectionLost",
  "agentLifecycle",
];

export function NotificationsSection() {
  const { t } = useTranslation("console");
  const permission = useNotificationStore((s) => s.permission);
  const swReady = useNotificationStore((s) => s.swReady);
  const prefs = useNotificationStore((s) => s.preferences);
  const setEnabled = useNotificationStore((s) => s.setEnabled);
  const setCategoryEnabled = useNotificationStore((s) => s.setCategoryEnabled);
  const setOnlyWhenHidden = useNotificationStore((s) => s.setOnlyWhenHidden);
  const setPermission = useNotificationStore((s) => s.setPermission);

  const supported = isNotificationSupported();

  const handleToggle = useCallback(async () => {
    if (prefs.enabled) {
      setEnabled(false);
      return;
    }
    // Need permission first
    if (permission !== "granted") {
      const result = await requestPermission();
      setPermission(result);
      if (result !== "granted") return;
    }
    setEnabled(true);
  }, [prefs.enabled, permission, setEnabled, setPermission]);

  if (!supported) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
          {t("settings.notifications.title")}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("settings.notifications.notSupported")}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">
        {t("settings.notifications.title")}
      </h3>

      {/* Main toggle */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {t("settings.notifications.enable")}
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("settings.notifications.enableHint")}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={prefs.enabled}
          onClick={handleToggle}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
            prefs.enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              prefs.enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Permission denied warning */}
      {permission === "denied" && (
        <p className="mt-3 text-xs text-red-500">
          {t("settings.notifications.denied")}
        </p>
      )}

      {/* SW not ready info */}
      {prefs.enabled && !swReady && (
        <p className="mt-3 text-xs text-amber-500">
          {t("settings.notifications.swNotReady")}
        </p>
      )}

      {/* Category toggles */}
      {prefs.enabled && (
        <div className="mt-5 space-y-3 border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
            {t("settings.notifications.categories")}
          </p>

          {CATEGORIES.map((cat) => (
            <div key={cat} className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t(`settings.notifications.cat_${cat}`)}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.categories[cat]}
                onClick={() => setCategoryEnabled(cat, !prefs.categories[cat])}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  prefs.categories[cat] ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                    prefs.categories[cat] ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          ))}

          {/* Only when hidden toggle */}
          <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-gray-700">
            <div>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {t("settings.notifications.onlyWhenHidden")}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t("settings.notifications.onlyWhenHiddenHint")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.onlyWhenHidden}
              onClick={() => setOnlyWhenHidden(!prefs.onlyWhenHidden)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                prefs.onlyWhenHidden ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                  prefs.onlyWhenHidden ? "translate-x-4.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
