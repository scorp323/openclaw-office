import { X, ChevronRight } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { isTourCompleted, markTourCompleted } from "@/lib/onboarding";

const TOUR_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Mission Control",
    message: "Your AI agent monitoring and management hub. Let's take a quick tour.",
    selector: null,
  },
  {
    id: "sidebar",
    title: "Navigation Sidebar",
    message: "Use the sidebar to navigate between pages — Dashboard, Agents, Cron, Settings, and more.",
    selector: "[data-tour='console-nav']",
  },
  {
    id: "agents",
    title: "AI Agents",
    message: "Click Agents to view, configure, and monitor your AI agents in real time.",
    selector: "[data-tour='nav-agents']",
  },
  {
    id: "cron",
    title: "Cron Tasks",
    message: "Schedule automated tasks to run on a recurring schedule.",
    selector: "[data-tour='nav-cron']",
  },
  {
    id: "settings",
    title: "Settings",
    message: "Configure your API providers, appearance, and system preferences.",
    selector: "[data-tour='nav-settings']",
  },
];

interface TooltipPos {
  top: number;
  left: number;
  placement: "right" | "bottom" | "center";
}

function calcTooltipPos(selector: string | null): TooltipPos {
  if (!selector) {
    return { top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, placement: "center" };
  }
  const el = document.querySelector(selector);
  if (!el) {
    return { top: window.innerHeight / 2 - 100, left: window.innerWidth / 2 - 160, placement: "center" };
  }
  const rect = el.getBoundingClientRect();
  const TOOLTIP_W = 320;
  const TOOLTIP_H = 140;
  if (rect.right + TOOLTIP_W + 16 < window.innerWidth) {
    return {
      top: Math.max(8, rect.top + rect.height / 2 - TOOLTIP_H / 2),
      left: rect.right + 16,
      placement: "right",
    };
  }
  return {
    top: Math.min(window.innerHeight - TOOLTIP_H - 16, rect.bottom + 12),
    left: Math.max(8, rect.left),
    placement: "bottom",
  };
}

export function OnboardingTour() {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const dismiss = useCallback(() => {
    markTourCompleted();
    setActive(false);
  }, []);

  const handleNext = useCallback(() => {
    if (step === TOUR_STEPS.length - 1) {
      dismiss();
    } else {
      setStep((s) => s + 1);
    }
  }, [step, dismiss]);

  useEffect(() => {
    if (!isTourCompleted()) {
      setActive(true);
    }
    const handler = () => {
      setStep(0);
      setActive(true);
    };
    window.addEventListener("mc:start-tour", handler);
    return () => window.removeEventListener("mc:start-tour", handler);
  }, []);

  // Apply highlight ring to target element
  useEffect(() => {
    if (!active) return;
    const selector = TOUR_STEPS[step].selector;
    if (!selector) return;
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;
    const prev = el.getAttribute("style") ?? "";
    el.style.outline = "2px solid rgba(59,130,246,0.8)";
    el.style.outlineOffset = "4px";
    el.style.borderRadius = "8px";
    el.style.position = "relative";
    el.style.zIndex = "9997";
    return () => {
      el.setAttribute("style", prev);
    };
  }, [active, step]);

  if (!active) return null;

  const current = TOUR_STEPS[step];
  const pos = calcTooltipPos(current.selector);
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[9998] bg-black/30" onClick={dismiss} />

      {/* Tooltip card */}
      <div
        className="fixed z-[9999] w-80 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        style={{ top: pos.top, left: pos.left }}
      >
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close tour"
        >
          <X size={14} />
        </button>

        {/* Header */}
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold">{current.title}</span>
        </div>

        {/* Message */}
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{current.message}</p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i === step ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={dismiss}
              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-1 rounded-lg bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              {isLast ? "Finish" : "Next"}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
