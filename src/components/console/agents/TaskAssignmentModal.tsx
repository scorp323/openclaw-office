import { useCallback, useEffect, useState } from "react";
import { X, Send, Loader2, CheckCircle, ChevronDown } from "lucide-react";
import { toastSuccess, toastError } from "@/store/toast-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskPriority = "low" | "medium" | "high" | "critical";
export type TaskDuration = "quick" | "short" | "long" | "extended";

interface AgentOption {
  id: string;
  name: string;
}

interface AssignedTask {
  agentId: string;
  agentName: string;
  description: string;
  priority: TaskPriority;
  duration: TaskDuration;
  assignedAt: number;
}

interface TaskAssignmentModalProps {
  agentId?: string;
  agentName?: string;
  onClose: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HISTORY_KEY = "mc_task_assignment_history";
const MAX_HISTORY = 20;

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: "low", label: "Low", color: "text-gray-500" },
  { value: "medium", label: "Medium", color: "text-blue-500" },
  { value: "high", label: "High", color: "text-amber-500" },
  { value: "critical", label: "Critical", color: "text-red-500" },
];

const DURATION_OPTIONS: Array<{ value: TaskDuration; label: string; hint: string }> = [
  { value: "quick", label: "Quick", hint: "< 5 min" },
  { value: "short", label: "Short", hint: "< 30 min" },
  { value: "long", label: "Long", hint: "< 2 hours" },
  { value: "extended", label: "Extended", hint: "2+ hours" },
];

const PRIORITY_BADGE: Record<TaskPriority, string> = {
  low: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

// ─── History helpers ──────────────────────────────────────────────────────────

function loadHistory(): AssignedTask[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as AssignedTask[]) : [];
  } catch {
    return [];
  }
}

function saveHistory(task: AssignedTask) {
  const existing = loadHistory();
  const next = [task, ...existing].slice(0, MAX_HISTORY);
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* empty */ }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskAssignmentModal({ agentId, agentName, onClose }: TaskAssignmentModalProps) {
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState(agentId ?? "");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [duration, setDuration] = useState<TaskDuration>("short");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<AssignedTask[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Fetch agents list
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/mc-api/agents");
        const data = await res.json();
        const list: AgentOption[] = (data.agents ?? []).map(
          (a: { id: string; name?: string; identity?: { name?: string } }) => ({
            id: a.id,
            name: a.identity?.name ?? a.name ?? a.id,
          }),
        );
        setAgents(list);
        if (!agentId && list.length > 0) {
          setSelectedAgentId(list[0].id);
        }
      } catch {
        // If we have a pre-filled agentId, that's enough
      }
    })();
    setHistory(loadHistory());
  }, [agentId]);

  const selectedAgentName = agentName
    ?? agents.find((a) => a.id === selectedAgentId)?.name
    ?? selectedAgentId;

  const handleAssign = useCallback(async () => {
    if (!selectedAgentId || !description.trim()) return;
    setSubmitting(true);
    try {
      await fetch("/mc-api/actions/agent-spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgentId,
          task: description.trim(),
          priority,
          estimatedDuration: duration,
        }),
      });

      const task: AssignedTask = {
        agentId: selectedAgentId,
        agentName: selectedAgentName,
        description: description.trim(),
        priority,
        duration,
        assignedAt: Date.now(),
      };
      saveHistory(task);
      setHistory((prev) => [task, ...prev].slice(0, MAX_HISTORY));

      setSuccess(true);
      toastSuccess("Task Assigned", `Sent to ${selectedAgentName}`);
      setTimeout(onClose, 1200);
    } catch (err) {
      toastError("Assignment Failed", err instanceof Error ? err.message : "Unknown error");
      setSubmitting(false);
    }
  }, [selectedAgentId, selectedAgentName, description, priority, duration, onClose]);

  // Esc to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-gray-800">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Assign Task
            </h3>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              Send a task directly to an agent
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-12">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Task assigned!</p>
          </div>
        ) : (
          <div className="space-y-4 p-6">
            {/* Agent selector */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Agent
              </label>
              {agentId ? (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-lg">🤖</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {selectedAgentName}
                  </span>
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-sm text-gray-800 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">Select an agent...</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                </div>
              )}
            </div>

            {/* Task description */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                Task Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe what you need the agent to do..."
                autoFocus={!agentId}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-600"
              />
            </div>

            {/* Priority + Duration */}
            <div className="grid grid-cols-2 gap-4">
              {/* Priority */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Priority
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRIORITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPriority(opt.value)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        priority === opt.value
                          ? `${PRIORITY_BADGE[opt.value]} ring-2 ring-offset-1 ring-current/30`
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Estimated Duration
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDuration(opt.value)}
                      title={opt.hint}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        duration === opt.value
                          ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300/50 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {opt.label}
                      <span className="ml-1 opacity-60">{opt.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="text-xs text-gray-400 underline-offset-2 hover:text-gray-600 hover:underline dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              >
                {showHistory ? "Hide" : "View"} recent ({history.length})
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleAssign()}
                  disabled={submitting || !selectedAgentId || !description.trim()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History drawer */}
        {showHistory && history.length > 0 && (
          <div className="border-t border-gray-100 dark:border-gray-800">
            <div className="max-h-48 overflow-y-auto p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Recent Assignments
              </p>
              <div className="space-y-2">
                {history.slice(0, 8).map((task, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDescription(task.description);
                      setPriority(task.priority);
                      setDuration(task.duration);
                      if (!agentId) setSelectedAgentId(task.agentId);
                    }}
                    className="w-full rounded-lg border border-gray-100 p-2.5 text-left hover:border-blue-200 hover:bg-blue-50 dark:border-gray-800 dark:hover:border-blue-800 dark:hover:bg-blue-900/10 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                        {task.description.slice(0, 60)}{task.description.length > 60 ? "…" : ""}
                      </span>
                      <span className={`ml-2 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${PRIORITY_BADGE[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-400">
                      → {task.agentName} · {new Date(task.assignedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
