import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SHORTCUT_CATEGORIES, type ShortcutEntry } from "@/hooks/useKeyboardShortcuts";

const STARTUP_KEY = "mc_shortcuts_startup";

interface Props {
  open: boolean;
  onClose: () => void;
}

function KbdKey({ keys }: { keys: string }) {
  const parts = keys.split(" ");
  return (
    <span className="flex items-center gap-0.5">
      {parts.map((part, i) => (
        <kbd
          key={i}
          className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-[11px] text-gray-500 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,255,65,0.06)] dark:text-[rgba(0,255,65,0.7)]"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}

function ShortcutRow({ shortcut }: { shortcut: ShortcutEntry }) {
  return (
    <div className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-[rgba(0,255,65,0.04)]">
      <span className="text-sm text-gray-600 dark:text-gray-300">{shortcut.label}</span>
      <KbdKey keys={shortcut.keys} />
    </div>
  );
}

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [showOnStartup, setShowOnStartup] = useState(() => {
    try { return localStorage.getItem(STARTUP_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleStartupChange = (checked: boolean) => {
    setShowOnStartup(checked);
    try { localStorage.setItem(STARTUP_KEY, checked ? "true" : "false"); } catch { /* ignore */ }
  };

  const q = query.trim().toLowerCase();
  const filteredCategories = SHORTCUT_CATEGORIES.map((cat) => ({
    ...cat,
    shortcuts: q
      ? cat.shortcuts.filter(
          (s) => s.label.toLowerCase().includes(q) || s.keys.toLowerCase().includes(q),
        )
      : cat.shortcuts,
  })).filter((cat) => cat.shortcuts.length > 0);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
      className="m-auto w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-0 shadow-2xl backdrop:bg-black/50 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(10,15,10,0.97)]"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-[rgba(0,255,65,0.1)]">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Press ? to toggle this panel</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close keyboard shortcuts"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-[rgba(0,255,65,0.08)] dark:hover:text-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="border-b border-gray-100 px-5 py-3 dark:border-[rgba(0,255,65,0.1)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts…"
            aria-label="Search shortcuts"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-8 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-200 dark:placeholder-gray-500 dark:focus:border-[rgba(0,255,65,0.4)]"
          />
        </div>
      </div>

      {/* Shortcut grid */}
      <div className="max-h-[60vh] overflow-y-auto px-5 py-4">
        {filteredCategories.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">No shortcuts match &ldquo;{query}&rdquo;</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {filteredCategories.map((cat) => (
              <div key={cat.name}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-[rgba(0,255,65,0.5)]">
                  {cat.name}
                </h3>
                <div className="space-y-0.5">
                  {cat.shortcuts.map((s) => (
                    <ShortcutRow key={s.keys} shortcut={s} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 dark:border-[rgba(0,255,65,0.1)]">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={showOnStartup}
            onChange={(e) => handleStartupChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-500 focus:ring-blue-400 dark:border-gray-600"
          />
          Show on startup
        </label>
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
