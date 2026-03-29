import { Bot, Clock, Cpu, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AgentDetailHeader } from "@/components/console/agents/AgentDetailHeader";
import { AgentDetailTabs } from "@/components/console/agents/AgentDetailTabs";
import { CreateAgentDialog } from "@/components/console/agents/CreateAgentDialog";
import { DeleteAgentDialog } from "@/components/console/agents/DeleteAgentDialog";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { useAgentsStore } from "@/store/console-stores/agents-store";

interface FleetAgent {
  id: string;
  name: string;
  role: string;
  model: string;
  emoji: string;
  zone: string;
  status: "active" | "standby" | "offline";
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

function AgentFleetCard({
  agent,
  onClick,
  isSelected,
}: {
  agent: FleetAgent;
  onClick: () => void;
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

      {/* Footer: Uptime + Last active */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-800">
        {agent.status === "active" ? (
          <span className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
            <Clock className="h-3 w-3" />
            Up {formatUptime(uptimeStart)}
          </span>
        ) : (
          <span className="text-[10px] text-gray-400 dark:text-gray-500">—</span>
        )}
        <span className="text-[10px] text-gray-400 dark:text-gray-500">
          {agent.status === "active" ? relativeTime(Date.now() - 30_000) : "—"}
        </span>
      </div>
    </button>
  );
}

export function AgentsPage() {
  const { t } = useTranslation("console");
  const { selectedAgentId, agents: storeAgents, fetchAgents, selectAgent } = useAgentsStore();
  const selectedAgent = storeAgents.find((a) => a.id === selectedAgentId) ?? null;

  const [fleetAgents, setFleetAgents] = useState<FleetAgent[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchFleet = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/mc-api/agents");
      if (res.ok) {
        const data = (await res.json()) as { agents: FleetAgent[] };
        setFleetAgents(data.agents ?? []);
      }
    } catch {
      // fall back to store agents
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchFleet();
  }, [fetchAgents, fetchFleet]);

  // Merge store agents with fleet data for status info
  const mergedAgents: FleetAgent[] =
    fleetAgents.length > 0
      ? fleetAgents
      : storeAgents.map((a) => ({
          id: a.id,
          name: a.identity?.name ?? a.name,
          role: a.identity?.theme ?? "",
          model: "",
          emoji: a.identity?.emoji ?? "🤖",
          zone: "",
          status: "standby" as const,
        }));

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
      {mergedAgents.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <Bot className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            No agents found
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mergedAgents.map((agent) => (
            <AgentFleetCard
              key={agent.id}
              agent={agent}
              isSelected={agent.id === selectedAgentId}
              onClick={() => selectAgent(agent.id)}
            />
          ))}
        </div>
      )}

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
    </div>
  );
}
