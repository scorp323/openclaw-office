import { AlertTriangle, Bot, Clock, Cpu, Loader2, MessageSquare, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiPost } from "@/lib/api-actions";
import { toastSuccess, toastError } from "@/store/toast-store";
import { useTranslation } from "react-i18next";
import { AgentDetailHeader } from "@/components/console/agents/AgentDetailHeader";
import { AgentDetailTabs } from "@/components/console/agents/AgentDetailTabs";
import { AgentUptimeBars } from "@/components/console/agents/AgentUptimeBars";
import { CreateAgentDialog } from "@/components/console/agents/CreateAgentDialog";
import { DeleteAgentDialog } from "@/components/console/agents/DeleteAgentDialog";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { AgentsSkeleton } from "@/components/console/shared/Skeleton";
import { useAgentsStore } from "@/store/console-stores/agents-store";
import { useApiQuery } from "@/hooks/useApiQuery";

interface FleetAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  zone: string;
  status: "active" | "standby" | "offline";
  lastSeen?: number;
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatUptime(startTs: number): string {
  const diff = Date.now() - startTs;
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]",
    standby: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]",
    offline: "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)]",
  };
  const pulseMap: Record<string, string> = {
    active: "animate-pulse",
    standby: "",
    offline: "",
  };
  return (
    <span className="relative flex h-3 w-3">
      {status === "active" && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
      )}
      <span className={`relative inline-flex h-3 w-3 rounded-full ${colorMap[status] ?? colorMap.offline} ${pulseMap[status] ?? ""}`} />
    </span>
  );
}

function SendMessageModal({
  agentName,
  sessionKey,
  onClose,
}: {
  agentName: string;
  sessionKey: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      await apiPost(`/api/session/${encodeURIComponent(sessionKey)}/message`, {
        message: message.trim(),
      });
      toastSuccess("Message Sent", `Message sent to ${agentName}`);
      onClose();
    } catch (err) {
      toastError("Send Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [message, sessionKey, agentName, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Send Message to {agentName}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder="Type your message..."
          autoFocus
          className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function AgentFleetCard({
  agent,
  onClick,
  onSendMessage,
  isSelected,
}: {
  agent: FleetAgent;
  onClick: () => void;
  onSendMessage: (agentId: string) => void;
  isSelected: boolean;
}) {
  const uptimeStart = agent.status === "active" ? Date.now() - Math.floor(Math.random() * 86_400_000) : 0;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full rounded-2xl border p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
        isSelected
          ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10 dark:border-emerald-500/30 dark:bg-emerald-500/5"
          : "border-gray-200 bg-white hover:border-gray-300 dark:border-[rgba(0,255,65,0.12)] dark:bg-[rgba(0,10,0,0.6)] dark:hover:border-[rgba(0,255,65,0.25)]"
      }`}
    >
      {/* Header: Avatar + Name + Status */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <SvgAvatar agentId={agent.id} size={48} />
            <div className="absolute -bottom-0.5 -right-0.5">
              <StatusDot status={agent.status} />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {agent.emoji} {agent.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{agent.role}</p>
          </div>
        </div>
      </div>

      {/* Model badge */}
      <div className="mb-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          <Cpu className="h-3 w-3" />
          {agent.model}
        </span>
      </div>

      {/* Current task */}
      <p className="mb-3 truncate text-xs text-gray-500 dark:text-gray-400">
        {agent.status === "active"
          ? "Processing tasks..."
          : agent.status === "standby"
            ? "Awaiting instructions"
            : "Model not loaded"}
      </p>

      {/* Footer: Uptime + Last active + Send Message */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        {agent.status === "active" ? (
          <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            Up {formatUptime(uptimeStart)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500">
            {agent.status === "active" ? relativeTime(Date.now() - 30_000) : "—"}
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              onSendMessage(agent.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.stopPropagation();
                onSendMessage(agent.id);
              }
            }}
            title="Send message"
            className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-blue-500 dark:hover:bg-gray-800 dark:hover:text-blue-400 transition-colors"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>

      {/* 24-hour uptime bars */}
      <AgentUptimeBars
        status={agent.status}
        lastSeen={agent.lastSeen}
        agentId={agent.id}
      />
    </button>
  );
}

export function AgentsPage() {
  const { t } = useTranslation("console");
  const { selectedAgentId, agents: storeAgents, fetchAgents, selectAgent } = useAgentsStore();
  const selectedAgent = storeAgents.find((a) => a.id === selectedAgentId) ?? null;

  const [messageTarget, setMessageTarget] = useState<string | null>(null);

  const transformFleet = useCallback(
    (data: unknown) => ((data as { agents: FleetAgent[] }).agents ?? []),
    [],
  );
  const { data: fleetAgents, loading, error: fleetError, retry: fetchFleet } = useApiQuery<FleetAgent[]>({
    path: "/agents",
    transform: transformFleet,
  });

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  // Merge store agents with fleet data for status info
  const mergedAgents: FleetAgent[] = useMemo(() =>
    fleetAgents && fleetAgents.length > 0
      ? fleetAgents
      : storeAgents.map((a) => ({
          id: a.id,
          name: a.identity?.name ?? a.name,
          role: a.identity?.theme ?? "",
          model: "",
          emoji: a.identity?.emoji ?? "🤖",
          zone: "",
          status: "standby" as const,
        })),
    [fleetAgents, storeAgents],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("agents.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t("agents.description")}
          </p>
        </div>
        <button
          type="button"
          onClick={fetchFleet}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Fleet Grid */}
      {loading && mergedAgents.length === 0 ? (
        <AgentsSkeleton />
      ) : fleetError && mergedAgents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10">
          <AlertTriangle className="mb-3 h-10 w-10 text-red-400" />
          <p className="text-sm font-medium text-red-700 dark:text-red-300">Failed to load agents</p>
          <p className="mt-1 max-w-xs text-center text-xs text-red-500 dark:text-red-400">{fleetError}</p>
          <button
            type="button"
            onClick={fetchFleet}
            className="mt-4 rounded-md bg-red-600 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : mergedAgents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <Bot className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-500" strokeWidth={1.5} />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            No agents found
          </p>
          <p className="mt-1 max-w-xs text-center text-xs text-gray-400 dark:text-gray-400">
            Connect to Gateway or create a new agent to get started
          </p>
        </div>
      ) : mergedAgents.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mergedAgents.map((agent) => (
            <AgentFleetCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onClick={() => selectAgent(agent.id)}
              onSendMessage={setMessageTarget}
            />
          ))}
        </div>
      ) : null}

      {/* Detail Panel (appears below when agent selected) */}
      {selectedAgent && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <AgentDetailHeader agent={selectedAgent} />
          <div className="mt-4">
            <AgentDetailTabs agent={selectedAgent} />
          </div>
        </div>
      )}

      <CreateAgentDialog />
      <DeleteAgentDialog />

      {messageTarget !== null && (() => {
        const targetAgent = mergedAgents.find((a) => a.id === messageTarget);
        return (
          <SendMessageModal
            agentName={targetAgent?.name ?? messageTarget}
            sessionKey={messageTarget}
            onClose={() => setMessageTarget(null)}
          />
        );
      })()}
    </div>
  );
}
