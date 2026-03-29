import { useCallback } from "react";
import { useToastStore, toastSuccess, toastError, toastWarning, toastInfo } from "@/store/toast-store";

export function useToast() {
  const removeToast = useToastStore((s) => s.removeToast);
  const clearAll = useToastStore((s) => s.clearAll);

  return {
    success: useCallback((title: string, message?: string) => toastSuccess(title, message), []),
    error: useCallback((title: string, message?: string, detail?: string) => toastError(title, message, detail), []),
    warning: useCallback((title: string, message?: string, detail?: string) => toastWarning(title, message, detail), []),
    info: useCallback((title: string, message?: string) => toastInfo(title, message), []),
    dismiss: removeToast,
    clearAll,
  };
}
