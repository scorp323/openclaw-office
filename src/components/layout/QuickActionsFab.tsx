import { useState, useRef, useEffect } from "react";

interface FabAction {
  icon: string;
  label: string;
  onClick: () => void;
}

const API_BASE = "/mc-api";

async function triggerHeartbeat() {
  try {
    await fetch(`${API_BASE}/status`);
  } catch { /* ignore */ }
}

async function checkCosts() {
  try {
    const res = await fetch(`${API_BASE}/costs`);
    const data = await res.json();
    const cost = data.todayCostUsd ?? 0;
    const tokens = data.todayTokens ?? 0;
    window.alert(`Today: $${cost.toFixed(2)} | ${tokens.toLocaleString()} tokens`);
  } catch {
    window.alert("Failed to fetch cost data");
  }
}

export function QuickActionsFab() {
  const [isOpen, setIsOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  const actions: FabAction[] = [
    {
      icon: "\u21BB",
      label: "Refresh Crons",
      onClick: () => {
        void fetch(`${API_BASE}/crons`);
        setIsOpen(false);
      },
    },
    {
      icon: "$",
      label: "Check Costs",
      onClick: () => {
        void checkCosts();
        setIsOpen(false);
      },
    },
    {
      icon: "\u2665",
      label: "Heartbeat",
      onClick: () => {
        void triggerHeartbeat();
        setIsOpen(false);
      },
    },
    {
      icon: "\u263E",
      label: "Toggle Theme",
      onClick: () => {
        // Use store directly
        const storeModule = document.querySelector("[data-theme]");
        if (storeModule) {
          const current = storeModule.getAttribute("data-theme");
          storeModule.setAttribute("data-theme", current === "dark" ? "light" : "dark");
        }
        setIsOpen(false);
      },
    },
  ];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen]);

  return (
    <div ref={fabRef} className="fixed bottom-20 right-4 z-40 md:hidden">
      {/* Expanded radial actions */}
      {isOpen && (
        <div className="absolute bottom-14 right-0 flex flex-col-reverse items-end gap-2">
          {actions.map((action, i) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 shadow-lg transition-all dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.9)] dark:text-[#00ff41]"
              style={{
                animation: `fab-item-in 0.15s ease-out ${i * 0.04}s both`,
              }}
            >
              <span className="text-sm">{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? "Close quick actions" : "Quick actions"}
        className={`flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform ${
          isOpen
            ? "rotate-45 bg-red-500 text-white"
            : "bg-[#00ff41] text-black dark:shadow-[0_0_12px_rgba(0,255,65,0.4)]"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          className="h-6 w-6"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Inline animation keyframes */}
      <style>{`
        @keyframes fab-item-in {
          from { opacity: 0; transform: translateY(8px) scale(0.9); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
