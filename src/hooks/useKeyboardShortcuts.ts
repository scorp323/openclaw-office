import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export interface ShortcutEntry {
  keys: string;
  label: string;
}

export const SHORTCUT_LIST: ShortcutEntry[] = [
  { keys: "⌘ 1", label: "Command Center" },
  { keys: "⌘ 2", label: "Office" },
  { keys: "⌘ 3", label: "Dashboard" },
  { keys: "⌘ 4", label: "Chat" },
  { keys: "⌘ 5", label: "Agents" },
  { keys: "⌘ 6", label: "Cron" },
  { keys: "⌘ 7", label: "Channels" },
  { keys: "⌘ 8", label: "Settings" },
  { keys: "⌘ 9", label: "Logs" },
  { keys: "⌘ K", label: "Search" },
  { keys: "?", label: "Keyboard shortcuts" },
  { keys: "Esc", label: "Close overlay / modal" },
];

const NAV_MAP: Record<string, string> = {
  "1": "/",
  "2": "/office",
  "3": "/dashboard",
  "4": "/chat",
  "5": "/agents",
  "6": "/cron",
  "7": "/channels",
  "8": "/settings",
  "9": "/logs",
};

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const closeHelp = useCallback(() => setHelpOpen(false), []);
  const toggleHelp = useCallback(() => setHelpOpen((p) => !p), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      // Escape: close any open dialog / overlay
      if (e.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
          e.preventDefault();
          return;
        }
        // Close any open <dialog> elements
        const openDialog = document.querySelector("dialog[open]") as HTMLDialogElement | null;
        if (openDialog) {
          openDialog.close();
          e.preventDefault();
          return;
        }
        return;
      }

      // '?' to show help (only when not typing in an input)
      if (e.key === "?" && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleHelp();
        return;
      }

      // Cmd/Ctrl + number for page navigation
      if ((e.metaKey || e.ctrlKey) && NAV_MAP[e.key]) {
        e.preventDefault();
        navigate(NAV_MAP[e.key]);
        return;
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [navigate, helpOpen, toggleHelp]);

  return { helpOpen, closeHelp, toggleHelp };
}
