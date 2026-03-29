/**
 * PWA Install Prompt — sleek bottom bar that appears after 2nd visit.
 * Uses beforeinstallprompt event. Dismiss remembers for 7 days.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";

const DISMISS_KEY = "openclaw-pwa-dismiss";
const VISIT_COUNT_KEY = "openclaw-visit-count";
const DISMISS_DAYS = 7;
const MIN_VISITS = 2;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (Number.isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}

function getVisitCount(): number {
  try {
    const raw = localStorage.getItem(VISIT_COUNT_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

function incrementVisitCount(): number {
  const count = getVisitCount() + 1;
  try { localStorage.setItem(VISIT_COUNT_KEY, String(count)); } catch { /* */ }
  return count;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation("common");
  const [show, setShow] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Already in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (isDismissed()) return;

    const visits = incrementVisitCount();
    if (visits < MIN_VISITS) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") {
      setShow(false);
    }
    deferredPromptRef.current = null;
  }, []);

  const handleDismiss = useCallback(() => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* */ }
    setShow(false);
    deferredPromptRef.current = null;
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[9999] animate-[slideUp_0.3s_ease-out] border-t border-gray-200/30 bg-gray-950/95 px-4 py-3 shadow-[0_-4px_20px_rgba(0,255,65,0.1)] backdrop-blur-lg dark:border-[rgba(0,255,65,0.2)]">
      <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(0,255,65,0.1)] text-lg">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="2" y="3" width="16" height="14" rx="2" stroke="#00ff41" strokeWidth="1.5" />
              <path d="M10 8v4M8 10h4" stroke="#00ff41" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-100">
              {t("pwa.installTitle", { defaultValue: "Install Mission Control" })}
            </p>
            <p className="text-xs text-gray-400">
              {t("pwa.installHint", { defaultValue: "Quick access from your home screen" })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-md px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-200"
          >
            {t("pwa.dismiss", { defaultValue: "Not now" })}
          </button>
          <button
            type="button"
            onClick={() => void handleInstall()}
            className="rounded-md bg-[#00ff41] px-4 py-1.5 text-xs font-semibold text-gray-950 shadow-[0_0_10px_rgba(0,255,65,0.3)] transition-all hover:bg-[#33ff66] hover:shadow-[0_0_15px_rgba(0,255,65,0.5)]"
          >
            {t("pwa.install", { defaultValue: "Install" })}
          </button>
        </div>
      </div>
    </div>
  );
}
