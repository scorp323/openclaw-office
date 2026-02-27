import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { PROVIDER_TYPE_INFO, type ProviderTypeMeta } from "@/lib/provider-types";

interface AddProviderDialogProps {
  open: boolean;
  existingIds: string[];
  onSave: (id: string, config: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function AddProviderDialog({ open, existingIds, onSave, onCancel }: AddProviderDialogProps) {
  const { t } = useTranslation("console");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<ProviderTypeMeta | null>(null);
  const [providerId, setProviderId] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiType, setApiType] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setStep(1);
      setSelectedType(null);
      setProviderId("");
      setBaseUrl("");
      setApiKey("");
      setApiType("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleSelectType = (meta: ProviderTypeMeta) => {
    setSelectedType(meta);
    setProviderId(meta.id === "custom" ? "" : meta.id);
    setBaseUrl(meta.defaultBaseUrl);
    setApiType(meta.defaultApi);
    setStep(2);
  };

  const idConflict = existingIds.includes(providerId);
  const canSave = providerId.length > 0 && !idConflict;

  const handleSave = () => {
    if (!canSave) return;
    const config: Record<string, unknown> = { baseUrl, api: apiType, models: [] };
    if (apiKey) config.apiKey = apiKey;
    onSave(providerId, config);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 z-50 m-auto max-w-lg rounded-lg border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("settings.providers.addDialog.title")}
        </h3>

        {step === 1 && (
          <div>
            <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
              {t("settings.providers.addDialog.selectType")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_TYPE_INFO.map((meta) => (
                <button
                  key={meta.id}
                  type="button"
                  onClick={() => handleSelectType(meta)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/20 transition-colors"
                >
                  <span className="text-lg">{meta.icon}</span>
                  <span className="font-medium text-gray-800 dark:text-gray-200">{meta.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && selectedType && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="mb-2 text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              ← {t("settings.providers.addDialog.selectType")}
            </button>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.providers.addDialog.providerId")}
              </label>
              <input
                type="text"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value.replace(/\s/g, "-").toLowerCase())}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder={selectedType.id}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t("settings.providers.addDialog.providerIdHint")}
              </p>
              {idConflict && (
                <p className="mt-1 text-xs text-red-500">{t("settings.providers.addDialog.idConflict")}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.providers.addDialog.baseUrl")}
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            {selectedType.requiresApiKey && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("settings.providers.addDialog.apiKey")}
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                  placeholder={selectedType.placeholder}
                />
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.providers.addDialog.apiType")}
              </label>
              <input
                type="text"
                value={apiType}
                onChange={(e) => setApiType(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
              >
                {t("settings.providers.addDialog.cancel")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("settings.providers.addDialog.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </dialog>
  );
}
