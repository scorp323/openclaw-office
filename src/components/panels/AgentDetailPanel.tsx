import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import Markdown from "react-markdown";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { STATUS_COLORS } from "@/lib/constants";
import { useChatDockStore } from "@/store/console-stores/chat-dock-store";
import { useOfficeStore } from "@/store/office-store";
import { AgentTaskHistory } from "@/components/console/agents/AgentTaskHistory";


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
        <AgentTaskHistory agentId={agent.id} />
      )}
    </div>
  );
}
