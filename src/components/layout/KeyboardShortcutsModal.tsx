import { useEffect, useRef } from "react";
import { SHORTCUT_LIST } from "@/hooks/useKeyboardShortcuts";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="m-auto w-full max-w-sm rounded-xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-black/50 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(10,15,10,0.97)]"
    >
      <div className="px-5 pt-5 pb-2">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Keyboard Shortcuts
        </h2>
      </div>
      <div className="px-5 pb-5">
        <ul className="space-y-1.5">
          {SHORTCUT_LIST.map((s) => (
            <li key={s.keys} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-600 dark:text-gray-300">{s.label}</span>
              <kbd className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-xs text-gray-500 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,255,65,0.05)] dark:text-[#0a5d0a]">
                {s.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-gray-200 px-5 py-3 text-right dark:border-[rgba(0,255,65,0.1)]">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[rgba(0,255,65,0.08)]"
        >
          Close
        </button>
      </div>
    </dialog>
  );
}
