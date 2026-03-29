import { useEffect, useRef } from "react";
import i18n from "@/i18n";
import { showNotification, registerServiceWorker, isNotificationSupported } from "@/lib/push-notifications";
import { useNotificationStore, type NotificationCategory } from "@/store/notification-store";
import { useOfficeStore } from "@/store/office-store";
import type { EventHistoryItem } from "@/gateway/types";

/**
 * Registers the service worker on mount, listens to gateway agent events
 * via the office store, and dispatches browser notifications based on
 * the user's notification preferences.
 */
export function useNotifications(): void {
  const lastErrorRef = useRef<Map<string, number>>(new Map());
  const eventLenRef = useRef(0);

  const enabled = useNotificationStore((s) => s.preferences.enabled);
  const categories = useNotificationStore((s) => s.preferences.categories);
  const onlyWhenHidden = useNotificationStore((s) => s.preferences.onlyWhenHidden);
  const setSwReady = useNotificationStore((s) => s.setSwReady);
  const setPermission = useNotificationStore((s) => s.setPermission);

  // Register service worker once
  useEffect(() => {
    if (!isNotificationSupported()) return;

    void registerServiceWorker().then((reg) => {
      if (reg) setSwReady(true);
    });

    setPermission(Notification.permission);
  }, [setSwReady, setPermission]);

  // Listen to connection status changes
  const connectionStatus = useOfficeStore((s) => s.connectionStatus);
  const prevStatusRef = useRef(connectionStatus);

  useEffect(() => {
    if (!enabled) return;
    const prev = prevStatusRef.current;
    prevStatusRef.current = connectionStatus;

    if (prev === "connected" && connectionStatus === "disconnected") {
      if (!shouldNotify("connectionLost", categories, onlyWhenHidden)) return;
      void showNotification(
        i18n.t("common:notifications.connectionLost"),
        {
          body: i18n.t("common:notifications.connectionLostBody"),
          tag: "connection-lost",
          url: "/dashboard",
        },
      );
    }
  }, [connectionStatus, enabled, categories, onlyWhenHidden]);

  // Subscribe to agent events via store.subscribe (no selector middleware)
  useEffect(() => {
    if (!enabled) return;

    // Initialise length to skip existing events
    eventLenRef.current = useOfficeStore.getState().eventHistory.length;

    const unsub = useOfficeStore.subscribe((state) => {
      const history = state.eventHistory;
      const prevLen = eventLenRef.current;
      if (history.length <= prevLen) return;

      const newEvents = history.slice(prevLen);
      eventLenRef.current = history.length;

      for (const event of newEvents) {
        processEvent(event, categories, onlyWhenHidden, lastErrorRef.current);
      }
    });

    return unsub;
  }, [enabled, categories, onlyWhenHidden]);
}

// ── Event processing ─────────────────────────────────────────────────

function processEvent(
  event: EventHistoryItem,
  categories: Record<NotificationCategory, boolean>,
  onlyWhenHidden: boolean,
  errorDebounce: Map<string, number>,
): void {
  // Agent error
  if (
    event.stream === "error" &&
    shouldNotify("agentError", categories, onlyWhenHidden)
  ) {
    const agentId = event.agentId ?? "agent";
    const key = `error:${agentId}`;
    const now = Date.now();
    if ((errorDebounce.get(key) ?? 0) + 30_000 > now) return;
    errorDebounce.set(key, now);

    void showNotification(
      i18n.t("common:notifications.agentError", { agent: event.agentName || agentId }),
      {
        body: event.summary.slice(0, 200),
        tag: `agent-error-${agentId}`,
        url: "/",
      },
    );
  }

  // Agent lifecycle: start/end — summary-based detection
  if (
    event.stream === "lifecycle" &&
    shouldNotify("agentLifecycle", categories, onlyWhenHidden)
  ) {
    const agentId = event.agentId ?? "agent";
    const name = event.agentName || agentId;
    // We check the summary since EventHistoryItem doesn't carry data.phase
    const isStart = event.summary === i18n.t("common:events.startRunning");
    const isEnd = event.summary === i18n.t("common:events.runEnded");

    if (isStart || isEnd) {
      void showNotification(
        isStart
          ? i18n.t("common:notifications.agentStarted", { agent: name })
          : i18n.t("common:notifications.agentEnded", { agent: name }),
        {
          tag: `agent-lifecycle-${agentId}`,
          url: "/",
        },
      );
    }
  }
}

// ── Chat message notifications ───────────────────────────────────────

export function notifyChatMessage(agentName: string, preview: string): void {
  const { preferences } = useNotificationStore.getState();
  if (!preferences.enabled) return;
  if (!shouldNotify("chatMessage", preferences.categories, preferences.onlyWhenHidden)) return;

  void showNotification(
    i18n.t("common:notifications.chatMessage", { agent: agentName }),
    {
      body: preview.slice(0, 200),
      tag: `chat-${agentName}`,
      url: "/",
    },
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function shouldNotify(
  category: NotificationCategory,
  categories: Record<NotificationCategory, boolean>,
  onlyWhenHidden: boolean,
): boolean {
  if (!categories[category]) return false;
  if (onlyWhenHidden && typeof document !== "undefined" && !document.hidden) return false;
  return true;
}
