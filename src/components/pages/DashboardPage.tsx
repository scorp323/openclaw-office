import { Radio, Wrench, Zap, Clock, RefreshCw, WifiOff, Loader2, GripVertical } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityFeed } from "@/components/console/dashboard/ActivityFeed";
import { ActivityFeedWidget } from "@/components/console/dashboard/ActivityFeedWidget";
import { AlertBanner } from "@/components/console/dashboard/AlertBanner";
import { ChannelOverview } from "@/components/console/dashboard/ChannelOverview";
import { QuickNavGrid } from "@/components/console/dashboard/QuickNavGrid";
import { SkillOverview } from "@/components/console/dashboard/SkillOverview";
import { StatCard } from "@/components/console/dashboard/StatCard";
import { SystemHealthWidget } from "@/components/console/dashboard/SystemHealthWidget";
import { ErrorState } from "@/components/console/shared/ErrorState";
import { DashboardSkeleton } from "@/components/console/shared/Skeleton";
import { useDashboardStore } from "@/store/console-stores/dashboard-store";
import { isHttpAdapter } from "@/gateway/adapter-provider";
import { useOfficeStore } from "@/store/office-store";

const CARD_ORDER_KEY = "openclaw-dashboard-card-order";
const DEFAULT_ORDER = ["systemhealth", "stats", "quicknav", "channels", "skills", "activity", "liveactivity"];

function loadCardOrder(): string[] {
  try {
    const stored = localStorage.getItem(CARD_ORDER_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as string[];
      if (Array.isArray(parsed)) {
        // Ensure all default cards are present (handles migration)
        const merged = [...parsed.filter((id) => DEFAULT_ORDER.includes(id))];
        for (const id of DEFAULT_ORDER) {
          if (!merged.includes(id)) merged.push(id);
        }
        if (merged.length === DEFAULT_ORDER.length) return merged;
      }
    }
  } catch { /* use default */ }
  return DEFAULT_ORDER;
}

function DraggableGrid({ children, cardIds }: { children: React.ReactNode[]; cardIds: string[] }) {
  const [order, setOrder] = useState(loadCardOrder);
  const dragItem = useRef<number | null>(null);
  const dragOver = useRef<number | null>(null);

  const handleDragStart = useCallback((idx: number) => {
    dragItem.current = idx;
  }, []);

  const handleDragEnter = useCallback((idx: number) => {
    dragOver.current = idx;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (dragItem.current === null || dragOver.current === null) return;
    const newOrder = [...order];
    const [removed] = newOrder.splice(dragItem.current, 1);
    newOrder.splice(dragOver.current, 0, removed);
    setOrder(newOrder);
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(newOrder));
    dragItem.current = null;
    dragOver.current = null;
  }, [order]);

  const cardMap = new Map<string, React.ReactNode>();
  cardIds.forEach((id, i) => cardMap.set(id, children[i]));

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {order.map((id, idx) => {
        const child = cardMap.get(id);
        if (!child) return null;
        return (
          <div
            key={id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className="cursor-grab rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md active:cursor-grabbing dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,10,0,0.6)]"
          >
            <div className="mb-2 flex items-center justify-end">
              <GripVertical className="h-4 w-4 text-gray-300 dark:text-gray-600" />
            </div>
            {child}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation("console");
  const { channelsSummary, skillsSummary, usage, isLoading, error, refresh } = useDashboardStore();
  const wsStatus = useOfficeStore((s) => s.connectionStatus);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const usingHttpAdapter = isHttpAdapter();

  if (isLoading && channelsSummary.length === 0) {
    const isDisconnected = wsStatus !== "connected" && wsStatus !== "connecting" && !usingHttpAdapter;
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.description")}
          onRefresh={refresh}
        />
        {isDisconnected ? (
          <GatewayConnectionGuide status={wsStatus} onRetry={refresh} />
        ) : (
          <DashboardSkeleton />
        )}
      </div>
    );
  }

  if (error && channelsSummary.length === 0 && skillsSummary.length === 0) {
    const isConnectionError = wsStatus !== "connected" && !usingHttpAdapter;
    return (
      <div className="space-y-6">
        <PageHeader
          title={t("dashboard.title")}
          description={t("dashboard.description")}
          onRefresh={refresh}
        />
        {isConnectionError ? (
          <GatewayConnectionGuide status={wsStatus} onRetry={refresh} />
        ) : (
          <ErrorState message={error} onRetry={refresh} />
        )}
      </div>
    );
  }

  const connectedCount = channelsSummary.filter((c) => c.status === "connected").length;
  const errorChannelCount = channelsSummary.filter((c) => c.status === "error").length;
  const enabledSkillCount = skillsSummary.filter((s) => s.enabled).length;

  const primaryProvider = usage?.providers[0];
  const primaryWindow = primaryProvider?.windows[0];
  const usageDisplay = primaryProvider
    ? `${primaryProvider.displayName}: ${primaryWindow?.usedPercent ?? 0}%`
    : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        onRefresh={refresh}
        loading={isLoading}
      />

      {wsStatus !== "connected" && !usingHttpAdapter && (
        <AlertBanner variant="warning" message={t("dashboard.alerts.gatewayDisconnected")} />
      )}
      {errorChannelCount > 0 && (
        <AlertBanner
          variant="error"
          message={t("dashboard.alerts.channelErrors", { count: errorChannelCount })}
        />
      )}

      <DraggableGrid cardIds={DEFAULT_ORDER}>
        <SystemHealthWidget />

        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={Radio}
              title={t("dashboard.stats.channels")}
              value={`${connectedCount} / ${channelsSummary.length}`}
              color="text-green-500"
            />
            <StatCard
              icon={Wrench}
              title={t("dashboard.stats.skills")}
              value={`${enabledSkillCount} / ${skillsSummary.length}`}
              color="text-purple-500"
            />
            <StatCard
              icon={Zap}
              title={t("dashboard.stats.usage")}
              value={usageDisplay}
              progress={primaryWindow?.usedPercent}
              color="text-blue-500"
            />
            <StatCard
              icon={Clock}
              title={t("dashboard.stats.uptime")}
              value={wsStatus === "connected" || usingHttpAdapter ? t("dashboard.stats.uptimeOnline") : "—"}
              color="text-amber-500"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("dashboard.quickNav.title")}
          </h3>
          <QuickNavGrid />
        </div>

        <ChannelOverview channels={channelsSummary} />

        <SkillOverview skills={skillsSummary} />

        <ActivityFeed />

        <ActivityFeedWidget />
      </DraggableGrid>
    </div>
  );
}

function GatewayConnectionGuide({
  status,
  onRetry,
}: {
  status: string;
  onRetry: () => void;
}) {
  const { t } = useTranslation("console");
  const { t: tc } = useTranslation("common");
  const isReconnecting = status === "reconnecting";

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-full max-w-md rounded-lg border border-amber-500/30 bg-amber-500/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          {isReconnecting ? (
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          ) : (
            <WifiOff className="h-8 w-8 text-amber-500" />
          )}
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t("dashboard.connectionGuide.title")}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isReconnecting
                ? t("dashboard.connectionGuide.reconnecting")
                : t("dashboard.connectionGuide.subtitle")}
            </p>
          </div>
        </div>

        <ol className="mb-5 space-y-2.5 text-sm text-gray-600 dark:text-gray-300">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
              1
            </span>
            <span>{t("dashboard.connectionGuide.step1")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
              2
            </span>
            <span>{t("dashboard.connectionGuide.step2")}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400">
              3
            </span>
            <span>{t("dashboard.connectionGuide.step3")}</span>
          </li>
        </ol>

        <div className="mb-4 rounded-md bg-gray-900/60 px-3 py-2 font-mono text-xs text-gray-300">
          <p className="text-gray-500"># {t("dashboard.connectionGuide.cmdComment")}</p>
          <p>openclaw-office --token &lt;your-token&gt;</p>
        </div>

        <button
          type="button"
          onClick={onRetry}
          className="w-full rounded-md bg-amber-500/90 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 transition-colors"
        >
          {tc("actions.retry")}
        </button>
      </div>
    </div>
  );
}

function PageHeader({
  title,
  description,
  onRefresh,
  loading,
}: {
  title: string;
  description: string;
  onRefresh: () => void;
  loading?: boolean;
}) {
  const { t } = useTranslation("common");
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        {t("actions.refresh")}
      </button>
    </div>
  );
}
