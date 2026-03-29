import { CheckCircle, Loader2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toastSuccess, toastError } from "@/store/toast-store";

type ActionState = "idle" | "loading" | "done";

interface ActionConfig {
  id: string;
  emoji: string;
  label: string;
  colorClass: string;
}

async function postAction(url: string, body?: Record<string, unknown>): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
}

const ACTIONS: ActionConfig[] = [
  {
    id: "gateway-restart",
    emoji: "🔄",
    label: "Restart Gateway",
    colorClass: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700",
  },
  {
    id: "check-email",
    emoji: "📧",
    label: "Check Email Now",
    colorClass: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700",
  },
  {
    id: "morning-brief",
    emoji: "🔔",
    label: "Morning Brief",
    colorClass: "bg-purple-500 hover:bg-purple-600 active:bg-purple-700",
  },
  {
    id: "work-mode",
    emoji: "🎯",
    label: "Toggle Work Mode",
    colorClass: "bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700",
  },
  {
    id: "cost-check",
    emoji: "📊",
    label: "Run Cost Check",
    colorClass: "bg-green-500 hover:bg-green-600 active:bg-green-700",
  },
  {
    id: "clean-inbox",
    emoji: "🧹",
    label: "Clean Inbox",
    colorClass: "bg-teal-500 hover:bg-teal-600 active:bg-teal-700",
  },
];

function getActionRunner(id: string): () => Promise<void> {
  switch (id) {
    case "gateway-restart":
      return () => postAction("/mc-api/actions/gateway-restart");
    case "check-email":
      return () => postAction("/mc-api/actions/cron-run", { cronId: "9d6b5c1d-8d01-4a86-a401-aad9bb9e133e" });
    case "morning-brief":
      return () => postAction("/mc-api/actions/cron-run", { cronId: "c871c28f-c0a7-478d-b3b6-3794c167a670" });
    case "work-mode":
      return () => postAction("/mc-api/workmode");
    case "cost-check":
      return () => postAction("/mc-api/actions/cron-run", { cronId: "30186d72-7b4a-47a8-a426-1d5192e7f1f6" });
    case "clean-inbox":
      return () => postAction("/mc-api/actions/cron-run", { cronId: "1fdb064b-636c-4572-ae10-eaf787df7dc6" });
    default:
      return () => Promise.resolve();
  }
}

export function QuickActionsPanel() {
  const [states, setStates] = useState<Record<string, ActionState>>({});

  const runAction = useCallback(async (action: ActionConfig) => {
    setStates((s) => ({ ...s, [action.id]: "loading" }));
    try {
      await getActionRunner(action.id)();
      setStates((s) => ({ ...s, [action.id]: "done" }));
      toastSuccess(action.label, "Action completed successfully");
      setTimeout(() => setStates((s) => ({ ...s, [action.id]: "idle" })), 2000);
    } catch (err) {
      setStates((s) => ({ ...s, [action.id]: "idle" }));
      toastError(action.label, err instanceof Error ? err.message : "Action failed");
    }
  }, []);

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ACTIONS.map((action) => {
          const state = states[action.id] ?? "idle";
          return (
            <button
              key={action.id}
              type="button"
              disabled={state === "loading"}
              onClick={() => void runAction(action)}
              className={`flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-3 text-white transition-all active:scale-95 disabled:opacity-60 ${action.colorClass}`}
            >
              {state === "loading" ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : state === "done" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="text-xl leading-none">{action.emoji}</span>
              )}
              <span className="text-center text-[11px] font-medium leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
