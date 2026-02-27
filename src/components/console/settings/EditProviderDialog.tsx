import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { inferProviderType, REDACTED_SENTINEL } from "@/lib/provider-types";

interface EditProviderDialogProps {
  open: boolean;
  providerId: string;
  config: Record<string, unknown>;
  onSave: (patch: Record<string, unknown>) => void;
  onCancel: () => void;
}

export function EditProviderDialog({ open, providerId, config, onSave, onCancel }: EditProviderDialogProps) {
  const { t } = useTranslation("console");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const meta = inferProviderType(providerId, config.api as string | undefined, config.baseUrl as string | undefined);

  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiType, setApiType] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setBaseUrl(String(config.baseUrl ?? ""));
      setApiKey("");
      setApiType(String(config.api ?? ""));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, config]);

  const handleSave = () => {
    const patch: Record<string, unknown> = {};
    if (baseUrl !== String(config.baseUrl ?? "")) patch.baseUrl = baseUrl;
    if (apiType !== String(config.api ?? "")) patch.api = apiType;
    if (apiKey.length > 0) patch.apiKey = apiKey;
    onSave(patch);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      className="fixed inset-0 z-50 m-auto max-w-lg rounded-lg border border-gray-200 bg-white p-0 shadow-xl backdrop:bg-black/40 dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t("settings.providers.editDialog.title")} — {meta.icon} {providerId}
        </h3>

        <div className="space-y-4">
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

          {meta.requiresApiKey && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("settings.providers.addDialog.apiKey")}
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                placeholder={
                  config.apiKey === REDACTED_SENTINEL
                    ? t("settings.providers.editDialog.apiKeyPlaceholder")
                    : meta.placeholder
                }
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
              {t("settings.providers.editDialog.cancel")}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              {t("settings.providers.editDialog.save")}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
