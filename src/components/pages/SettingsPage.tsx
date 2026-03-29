import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { startOnboardingTour } from "@/lib/onboarding";
import { AboutSection } from "@/components/console/settings/AboutSection";
import { QuickSettings } from "@/components/console/settings/QuickSettings";
import { AdvancedSection } from "@/components/console/settings/AdvancedSection";
import { AppearanceSection } from "@/components/console/settings/AppearanceSection";
import { DeveloperSection } from "@/components/console/settings/DeveloperSection";
import { GatewaySection } from "@/components/console/settings/GatewaySection";
import { NotificationsSection } from "@/components/console/settings/NotificationsSection";
import { OllamaSection } from "@/components/console/settings/OllamaSection";
import { SoundSection } from "@/components/console/settings/SoundSection";
import { ProvidersSection } from "@/components/console/settings/ProvidersSection";
import { UpdateSection } from "@/components/console/settings/UpdateSection";
import { LoadingState } from "@/components/console/shared/LoadingState";
import { useConfigStore } from "@/store/console-stores/config-store";
import { useConsoleSettingsStore } from "@/store/console-stores/settings-store";

export function SettingsPage() {
  const { t } = useTranslation("console");
  const loading = useConfigStore((s) => s.loading);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const fetchStatus = useConfigStore((s) => s.fetchStatus);
  const devMode = useConsoleSettingsStore((s) => s.devModeUnlocked);

  const loadFromServer = useConsoleSettingsStore((s) => s.loadFromServer);

  useEffect(() => {
    void fetchConfig();
    void fetchStatus();
    void loadFromServer();
  }, [fetchConfig, fetchStatus, loadFromServer]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("settings.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("settings.description")}</p>
        </div>
        <button
          onClick={startOnboardingTour}
          className="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
        >
          <MapPin className="h-3.5 w-3.5" />
          Restart Tour
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <div className="space-y-4">
          <QuickSettings />
          <AppearanceSection />
          <NotificationsSection />
          <SoundSection />
          <ProvidersSection />
          <GatewaySection />
          <OllamaSection />
          <UpdateSection />
          <AdvancedSection />
          {devMode && <DeveloperSection />}
          <AboutSection />
        </div>
      )}
    </div>
  );
}
