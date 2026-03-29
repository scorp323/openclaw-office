import { useCallback, useEffect, useRef, useState } from "react";
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
  { keys: "/", label: "Focus search" },
  { keys: "g d", label: "Go to Dashboard" },
  { keys: "g o", label: "Go to Office" },
  { keys: "g a", label: "Go to Agents" },
  { keys: "g c", label: "Go to Cron" },
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

/** "g then X" navigation sequences */
const G_NAV_MAP: Record<string, string> = {
  d: "/dashboard",
  o: "/office",
  a: "/agents",
  c: "/cron",
};

const G_SEQUENCE_TIMEOUT_MS = 800;

export function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const gPendingRef = useRef(false);
  const gTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        // Reset g-sequence
        gPendingRef.current = false;
        if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }

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

      // Skip non-escape shortcuts when typing in inputs
      if (isInput) return;

      // Handle second key of "g then X" sequence
      if (gPendingRef.current) {
        gPendingRef.current = false;
        if (gTimerRef.current) { clearTimeout(gTimerRef.current); gTimerRef.current = null; }
        const route = G_NAV_MAP[e.key];
        if (route) {
          e.preventDefault();
          navigate(route);
          return;
        }
        // Not a valid g-sequence follow-up — fall through to normal handling
      }

      // "/" to focus search (triggers Cmd+K spotlight)
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        // Dispatch Ctrl+K to open SearchSpotlight
        document.dispatchEvent(
          new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }),
        );
        return;
      }

      // "g" to start a navigation sequence
      if (e.key === "g" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        gPendingRef.current = true;
        gTimerRef.current = setTimeout(() => {
          gPendingRef.current = false;
          gTimerRef.current = null;
        }, G_SEQUENCE_TIMEOUT_MS);
        return;
      }

      // '?' to show help
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
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
    return () => {
      document.removeEventListener("keydown", handler);
      if (gTimerRef.current) clearTimeout(gTimerRef.current);
    };
  }, [navigate, helpOpen, toggleHelp]);

  return { helpOpen, closeHelp, toggleHelp };
}
