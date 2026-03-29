import {
  X,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useToastStore, type ToastItem, type ToastType } from "@/store/toast-store";

const ICON_MAP: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLE_MAP: Record<ToastType, { border: string; icon: string; bg: string }> = {
  success: {
    border: "border-green-300 dark:border-green-700",
    icon: "text-green-500",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
  error: {
    border: "border-red-300 dark:border-red-700",
    icon: "text-red-500",
    bg: "bg-red-50 dark:bg-red-900/20",
  },
  warning: {
    border: "border-yellow-300 dark:border-yellow-700",
    icon: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  info: {
    border: "border-blue-300 dark:border-blue-700",
    icon: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
};

const PROGRESS_COLORS: Record<ToastType, string> = {
  success: "bg-green-500",
  error: "bg-red-500",
  warning: "bg-yellow-500",
  info: "bg-blue-500",
};

function ToastCard({ toast }: { toast: ToastItem }) {
  const { t } = useTranslation("console");
  const removeToast = useToastStore((s) => s.removeToast);
  const [expanded, setExpanded] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(toast.duration);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    clearTimer();
    if (toast.duration > 0 && !expanded) {
      startTimeRef.current = Date.now();
      timerRef.current = setTimeout(() => removeToast(toast.id), remainingRef.current);
      const tick = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const pct = Math.max(0, ((remainingRef.current - elapsed) / toast.duration) * 100);
        setProgress(pct);
        if (pct > 0) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [toast.duration, toast.id, expanded, removeToast, clearTimer]);

  const pauseTimer = useCallback(() => {
    if (toast.duration > 0) {
      const elapsed = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - elapsed);
    }
    clearTimer();
  }, [toast.duration, clearTimer]);

  useEffect(() => {
    if (!hovered) startTimer();
    else pauseTimer();
    return clearTimer;
  }, [hovered, startTimer, pauseTimer, clearTimer]);

  const Icon = ICON_MAP[toast.type];
  const style = STYLE_MAP[toast.type];

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`pointer-events-auto w-80 overflow-hidden rounded-xl border ${style.border} ${style.bg} shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5 fade-in duration-200`}
    >
      <div className="flex items-start gap-2.5 p-3">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">{toast.message}</p>
          )}
          {toast.detail && (
            <>
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? t("toast.hideDetail") : t("toast.showDetail")}
              </button>
              {expanded && (
                <pre className="mt-1.5 max-h-[200px] overflow-auto rounded-lg bg-gray-900 p-2 text-xs text-gray-200 dark:bg-gray-800">
                  {toast.detail}
                </pre>
              )}
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => removeToast(toast.id)}
          className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {toast.duration > 0 && (
        <div className="h-0.5 w-full bg-gray-200/30 dark:bg-gray-700/30">
          <div
            className={`h-full transition-none ${PROGRESS_COLORS[toast.type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
