import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock, History, RefreshCw } from "lucide-react";
import Markdown from "react-markdown";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { STATUS_COLORS } from "@/lib/constants";
import { useChatDockStore } from "@/store/console-stores/chat-dock-store";
import { useOfficeStore } from "@/store/office-store";

interface TaskHistoryItem {
  id: string;
  type: string;
  task: string;
  result: "success" | "fail";
  durationMs: number;
  timestamp: number;
  detail: string;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// TODO: Remove mock generator once /mc-api/agents/:id/history endpoint is available
function generatePanelMockHistory(agentId: string): TaskHistoryItem[] {
  const now = Date.now();
  const templates = [
    { task: "Process message", type: "chat", detail: "Handled user query" },
    { task: "Tool call: search", type: "tool", detail: "Searched codebase" },
    { task: "Health check", type: "cron", detail: "System verification" },
    { task: "File analysis", type: "tool", detail: "Reviewed 5 files" },
    { task: "Send notification", type: "chat", detail: "Channel broadcast" },
  ];
  let seed = 0;
  for (let i = 0; i < agentId.length; i++) seed = ((seed << 5) - seed + agentId.charCodeAt(i)) | 0;
  const rng = () => { seed = (seed * 16807) % 2147483647; return (seed & 0x7fffffff) / 2147483647; };

  return Array.from({ length: 5 }, (_, i) => {
    const tmpl = templates[Math.floor(rng() * templates.length)];
    const success = rng() > 0.25;
    return {
      id: `mock-panel-${agentId.slice(0, 8)}-${i}`,
      type: tmpl.type,
      task: tmpl.task,
      result: success ? ("success" as const) : ("fail" as const),
      durationMs: Math.floor(rng() * 15000) + 100,
      timestamp: now - (i * 2400000 + Math.floor(rng() * 1200000)),
      detail: success ? tmpl.detail : "Error: timeout",
    };
  });
}

function HistoryTab({ agentId }: { agentId: string }) {
  const [tasks, setTasks] = useState<TaskHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/mc-api/agents/${encodeURIComponent(agentId)}/history`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data.tasks) && data.tasks.length > 0) {
        setTasks(data.tasks.slice(0, 20));
      } else {
        // TODO: Remove mock fallback once real history endpoint returns data
        setTasks(generatePanelMockHistory(agentId));
      }
    } catch {
      // TODO: Remove mock fallback once /mc-api/agents/:id/history is implemented
      setTasks(generatePanelMockHistory(agentId));
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 py-6 text-center">
        <History className="h-6 w-6 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
        <p className="text-xs text-gray-400">No task history</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {tasks.map((task, i) => {
        const isSuccess = task.result === "success";
        return (
          <div key={task.id} className="relative flex gap-2 pl-3">
            {/* Timeline connector */}
            {i < tasks.length - 1 && (
              <div className="absolute left-[6px] top-4 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
            )}
            {/* Dot */}
            <div className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${
              isSuccess
                ? "border-green-400 bg-green-100 dark:border-green-500 dark:bg-green-900/30"
                : "border-red-400 bg-red-100 dark:border-red-500 dark:bg-red-900/30"
            }`} />
            {/* Content */}
            <div className="min-w-0 flex-1 pb-2">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-xs font-medium text-gray-700 dark:text-gray-300">
                  {task.task}
                </span>
                {isSuccess ? (
                  <CheckCircle className="h-3 w-3 shrink-0 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 shrink-0 text-red-500" />
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-400">
                <span title={new Date(task.timestamp).toLocaleString()}>
                  {relativeTime(task.timestamp)}
                </span>
                <span className="flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDuration(task.durationMs)}
                </span>
                {task.type && (
                  <span className="rounded bg-gray-100 px-1 py-0.5 text-[9px] dark:bg-gray-700">
                    {task.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AgentDetailPanel() {
  const { t } = useTranslation("panels");
  const navigate = useNavigate();
  const selectedId = useOfficeStore((s) => s.selectedAgentId);
  const agents = useOfficeStore((s) => s.agents);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const setTargetAgent = useChatDockStore((s) => s.setTargetAgent);
  const [activeTab, setActiveTab] = useState<"info" | "history">("info");

  if (!selectedId) {
    return null;
  }
  const agent = agents.get(selectedId);
  if (!agent) {
    return null;
  }

  return (
    <div className="px-3 py-2">
      <div className="mb-2 flex items-center gap-2">
        <SvgAvatar agentId={agent.id} size={32} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
            {agent.name}
          </div>
          <div className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[agent.status] }}
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {t(`common:agent.statusLabels.${agent.status}`)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setTargetAgent(agent.id);
              navigate("/chat");
            }}
            className="shrink-0 rounded bg-blue-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
            title={t("agentDetail.chat", { defaultValue: "Chat" })}
          >
            {t("agentDetail.chat", { defaultValue: "Chat" })}
          </button>
          <button
            onClick={() => selectAgent(null)}
            className="shrink-0 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            title={t("agentDetail.deselect")}
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mb-2 flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("info")}
          className={`px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "info"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          Info
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === "history"
              ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
          }`}
        >
          <History className="h-3 w-3" />
          History
        </button>
      </div>

      {activeTab === "info" ? (
        <>
          {agent.currentTool && (
            <div className="mb-2 rounded bg-orange-50 px-2 py-1.5 text-xs dark:bg-orange-950/50">
              <div className="text-orange-600 dark:text-orange-400">🔧 {agent.currentTool.name}</div>
            </div>
          )}

          {agent.speechBubble && (
            <div className="mb-2 rounded bg-white px-2 py-1.5 text-xs leading-relaxed text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-300">
              <Markdown>{agent.speechBubble.text}</Markdown>
            </div>
          )}

          {agent.toolCallHistory.length > 0 && (
            <div className="mt-2">
              <div className="mb-1 text-xs font-medium text-gray-400 dark:text-gray-500">
                {t("agentDetail.toolCallHistory")}
              </div>
              {agent.toolCallHistory.map((tc, i) => (
                <div
                  key={`${tc.name}-${tc.timestamp}-${i}`}
                  className="flex items-center justify-between border-b border-gray-100 py-1 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400"
                >
                  <span>{tc.name}</span>
                  <span className="text-gray-400">{new Date(tc.timestamp).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <HistoryTab agentId={agent.id} />
      )}
    </div>
  );
}
