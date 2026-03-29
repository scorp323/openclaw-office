import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useChatDockStore } from "@/store/console-stores/chat-dock-store";
import { useOfficeStore } from "@/store/office-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSessionName(key: string): string {
  const parts = key.split(":");
  if (parts.length >= 3 && parts[0] === "agent") {
    const suffix = parts.slice(2).join(":");
    if (suffix === "main") return parts[1];
    return suffix.length > 22 ? suffix.slice(0, 22) + "…" : suffix;
  }
  return key.length > 22 ? key.slice(0, 22) + "…" : key;
}

function inferAgentIdFromKey(key: string): string | null {
  const match = /^agent:([^:]+):/u.exec(key);
  return match?.[1] ?? null;
}

function resolveTitle(
  key: string,
  label: string | undefined,
  agentId: string | undefined,
  agents: ReturnType<typeof useOfficeStore.getState>["agents"],
): string {
  if (label) return label.length > 28 ? label.slice(0, 28) + "…" : label;
  const id = agentId ?? inferAgentIdFromKey(key);
  if (id) {
    const name = agents.get(id)?.name?.trim();
    if (name) return name;
  }
  return formatSessionName(key);
}

// Time grouping buckets
type TimeGroup = "Today" | "Yesterday" | "This Week" | "Older";

function getTimeGroup(ts: number): TimeGroup {
  const now = Date.now();
  const diff = now - ts;
  const day = 86_400_000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "This Week";
  return "Older";
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ChatHistorySidebar() {
  const { t } = useTranslation("chat");
  const sessions = useChatDockStore((s) => s.sessions);
  const currentSessionKey = useChatDockStore((s) => s.currentSessionKey);
  const switchSession = useChatDockStore((s) => s.switchSession);
  const newSession = useChatDockStore((s) => s.newSession);
  const agents = useOfficeStore((s) => s.agents);

  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.lastActiveAt ?? 0) - (a.lastActiveAt ?? 0)),
    [sessions],
  );

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sortedSessions;
    const q = search.toLowerCase();
    return sortedSessions.filter((s) => {
      const title = resolveTitle(s.key, s.label, s.agentId, agents);
      return (
        title.toLowerCase().includes(q) ||
        s.key.toLowerCase().includes(q) ||
        (s.agentId ?? "").toLowerCase().includes(q)
      );
    });
  }, [sortedSessions, search, agents]);

  // Group by time
  const grouped = useMemo(() => {
    const buckets: Record<TimeGroup, typeof filteredSessions> = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      Older: [],
    };
    for (const s of filteredSessions) {
      const ts = s.lastActiveAt ?? s.updatedAt ?? s.createdAt ?? 0;
      buckets[getTimeGroup(ts)].push(s);
    }
    return buckets;
  }, [filteredSessions]);

  const ORDER: TimeGroup[] = ["Today", "Yesterday", "This Week", "Older"];

  // Collapsed state: show only a thin toggle bar
  if (collapsed) {
    return (
      <aside className="flex w-10 shrink-0 flex-col items-center border-r border-gray-100 bg-gray-50/50 pt-3 dark:border-gray-800 dark:bg-gray-900/50">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="Show chat history"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => newSession()}
          className="mt-2 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title={t("page.newSessionPrimary")}
        >
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-900/50">
      {/* New chat + collapse toggle */}
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <button
          type="button"
          onClick={() => newSession()}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-200/80 bg-white px-3 py-2 text-[13px] font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
          <span>{t("page.newSessionPrimary")}</span>
        </button>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-200 bg-white py-1.5 pl-8 pr-8 text-[12px] text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:placeholder-gray-500 dark:focus:border-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {filteredSessions.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {search ? "No sessions found" : t("page.sessionEmpty")}
          </div>
        ) : (
          <>
            {ORDER.map((group) => {
              const items = grouped[group];
              if (items.length === 0) return null;
              return (
                <div key={group}>
                  <div className="mb-0.5 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">
                    {group}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((session) => {
                      const isActive = session.key === currentSessionKey;
                      const ts = session.lastActiveAt ?? session.updatedAt ?? session.createdAt ?? 0;
                      const title = resolveTitle(session.key, session.label, session.agentId, agents);
                      const agentName = session.agentId
                        ? (agents.get(session.agentId)?.name?.trim() ?? session.agentId)
                        : null;

                      return (
                        <button
                          key={session.key}
                          type="button"
                          onClick={() => switchSession(session.key)}
                          className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                            isActive
                              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-gray-100"
                              : "text-gray-600 hover:bg-white/60 dark:text-gray-400 dark:hover:bg-gray-800/50"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-1">
                            <span className="truncate text-[13px] font-medium">{title}</span>
                            <span className="shrink-0 text-[10px] tabular-nums text-gray-400 dark:text-gray-500">
                              {ts ? formatRelative(ts) : ""}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            {agentName && agentName !== title && (
                              <span className="truncate text-[11px] text-gray-400 dark:text-gray-500">
                                {agentName}
                              </span>
                            )}
                            {(session.messageCount ?? 0) > 0 && (
                              <span className="shrink-0 text-[10px] text-gray-300 dark:text-gray-600">
                                {session.messageCount} msg{session.messageCount !== 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </aside>
  );
}
