import { Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toastSuccess, toastError } from "@/store/toast-store";

import type { LucideIcon } from "lucide-react";

interface ActionButtonProps {
  label: string;
  icon?: LucideIcon;
  onClick: () => Promise<void>;
  /** Toast title on success (defaults to label) */
  successMessage?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

const VARIANT_CLASSES: Record<string, string> = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white",
  secondary:
    "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700",
  danger: "bg-red-600 hover:bg-red-700 text-white",
};

const SIZE_CLASSES: Record<string, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function ActionButton({
  label,
  icon: Icon,
  onClick,
  successMessage,
  variant = "primary",
  size = "sm",
  disabled,
  className = "",
}: ActionButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading || disabled) return;
    setLoading(true);
    try {
      await onClick();
      toastSuccess(successMessage ?? label);
    } catch (err) {
      toastError(label, err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loading, disabled, onClick, label, successMessage]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5" />
      ) : null}
      {label}
    </button>
  );
}
