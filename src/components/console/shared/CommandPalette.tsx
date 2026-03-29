import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOfficeStore } from "@/store/office-store";
import { toastSuccess } from "@/store/toast-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type ItemType = "recent" | "page" | "action" | "agent" | "cron" | "setting";

interface PaletteItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle: string;
  icon: string;
  /** For navigation items */
  path?: string;
  /** For action items */
  action?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RECENT_KEY = "mc_cmd_palette_recent";
const MAX_RECENT = 5;

const PAGES: PaletteItem[] = [
  { id: "p-home", type: "page", title: "Command Center", subtitle: "Home", icon: "⌂", path: "/" },
  { id: "p-dashboard", type: "page", title: "Dashboard", subtitle: "System overview", icon: "▦", path: "/dashboard" },
  { id: "p-office", type: "page", title: "Office", subtitle: "Floor plan view", icon: "🏢", path: "/office" },
  { id: "p-agents", type: "page", title: "Agents", subtitle: "Manage your AI fleet", icon: "🤖", path: "/agents" },
  { id: "p-chat", type: "page", title: "Chat", subtitle: "Agent conversations", icon: "💬", path: "/chat" },
  { id: "p-briefing", type: "page", title: "Morning Briefing", subtitle: "Daily status summary", icon: "📋", path: "/briefing" },
  { id: "p-channels", type: "page", title: "Channels", subtitle: "Messaging channels", icon: "📡", path: "/channels" },
  { id: "p-skills", type: "page", title: "Skills", subtitle: "Skill marketplace", icon: "⚡", path: "/skills" },
  { id: "p-cron", type: "page", title: "Cron Tasks", subtitle: "Scheduled automation", icon: "⏰", path: "/cron" },
  { id: "p-costs", type: "page", title: "Costs", subtitle: "Usage & billing", icon: "💰", path: "/costs" },
  { id: "p-metrics", type: "page", title: "Metrics", subtitle: "Performance data", icon: "📊", path: "/metrics" },
  { id: "p-notifications", type: "page", title: "Notifications", subtitle: "Activity alerts", icon: "🔔", path: "/notifications" },
  { id: "p-backup", type: "page", title: "Backup", subtitle: "Data backup", icon: "💾", path: "/backup" },
  { id: "p-settings", type: "page", title: "Settings", subtitle: "Configuration", icon: "⚙", path: "/settings" },
];

const SETTINGS_ITEMS: PaletteItem[] = [
  { id: "s-appearance", type: "setting", title: "Appearance", subtitle: "Theme, colors, language", icon: "🎨", path: "/settings" },
  { id: "s-gateway", type: "setting", title: "Gateway Config", subtitle: "WebSocket connection", icon: "🔌", path: "/settings" },
  { id: "s-providers", type: "setting", title: "AI Providers", subtitle: "API keys & models", icon: "🧠", path: "/settings" },
  { id: "s-notifications", type: "setting", title: "Notification Settings", subtitle: "Alerts & sounds", icon: "🔕", path: "/settings" },
];

// ─── Fuzzy match ──────────────────────────────────────────────────────────────

function fuzzyScore(str: string, query: string): number {
  const s = str.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return 1;
  if (s === q) return 100;
  if (s.startsWith(q)) return 85;
  if (s.includes(q)) return 65;
  // Character-by-character fuzzy
  let j = 0;
  for (let i = 0; i < s.length && j < q.length; i++) {
    if (s[i] === q[j]) j++;
  }
  return j === q.length ? 40 : 0;
}

function fuzzyFilter(items: PaletteItem[], query: string): PaletteItem[] {
  if (!query.trim()) return items;
  return items
    .map((item) => {
      const titleScore = fuzzyScore(item.title, query);
      const subScore = fuzzyScore(item.subtitle, query) * 0.7;
      return { item, score: Math.max(titleScore, subScore) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

// ─── Recent items ─────────────────────────────────────────────────────────────

interface RecentEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  path?: string;
}

function loadRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (raw) return JSON.parse(raw) as RecentEntry[];
  } catch { /* empty */ }
  return [];
}

function saveRecent(item: PaletteItem) {
  if (!item.path) return;
  const existing = loadRecent().filter((r) => r.id !== item.id);
  const next: RecentEntry[] = [
    { id: item.id, title: item.title, subtitle: item.subtitle, icon: item.icon, path: item.path },
    ...existing,
  ].slice(0, MAX_RECENT);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* empty */ }
}

// ─── Group header ─────────────────────────────────────────────────────────────

function GroupHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-[#0a5d0a]">
      {label}
    </div>
  );
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  item,
  isSelected,
  onHover,
  onSelect,
}: {
  item: PaletteItem;
  isSelected: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-all ${
        isSelected
          ? "bg-gray-100 dark:bg-[rgba(0,255,65,0.09)]"
          : "hover:bg-gray-50 dark:hover:bg-[rgba(0,255,65,0.04)]"
      }`}
    >
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm transition-transform ${
          isSelected
            ? "scale-110 bg-white shadow-md dark:bg-[rgba(0,255,65,0.15)]"
            : "bg-gray-100 dark:bg-[rgba(255,255,255,0.05)]"
        }`}
      >
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm font-medium transition-colors ${
          isSelected
            ? "text-gray-900 dark:text-[#00ff41]"
            : "text-gray-700 dark:text-gray-200"
        }`}>
          {item.title}
        </div>
        <div className="truncate text-[11px] text-gray-400 dark:text-[#0a5d0a]">
          {item.subtitle}
        </div>
      </div>
      {item.type === "action" && (
        <span className="shrink-0 rounded bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-violet-600 dark:bg-[rgba(139,92,246,0.15)] dark:text-violet-400">
          action
        </span>
      )}
      {item.path && item.type !== "action" && (
        <span className="shrink-0 text-[10px] text-gray-300 dark:text-[#0a3d0a]">
          {item.path}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cronItems, setCronItems] = useState<PaletteItem[]>([]);
  const [recentItems, setRecentItems] = useState<PaletteItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const agents = useOfficeStore((s) => s.agents);
  const theme = useOfficeStore((s) => s.theme);
  const setTheme = useOfficeStore((s) => s.setTheme);
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);
  const setSoundEnabled = useOfficeStore((s) => s.setSoundEnabled);

  // Build actions array inside component so they close over store state
  const ACTIONS: PaletteItem[] = useMemo(() => [
    {
      id: "a-dark-mode",
      type: "action",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      subtitle: "Toggle theme",
      icon: theme === "dark" ? "☀️" : "🌙",
      action: () => {
        setTheme(theme === "dark" ? "light" : "dark");
        toastSuccess("Theme changed");
      },
    },
    {
      id: "a-sound",
      type: "action",
      title: soundEnabled ? "Mute Sounds" : "Enable Sounds",
      subtitle: "Toggle ambient audio",
      icon: soundEnabled ? "🔇" : "🔊",
      action: () => {
        setSoundEnabled(!soundEnabled);
        toastSuccess(soundEnabled ? "Sounds muted" : "Sounds enabled");
      },
    },
    {
      id: "a-morning-brief",
      type: "action",
      title: "Run Morning Brief",
      subtitle: "Open daily briefing",
      icon: "📋",
      path: "/briefing",
      action: () => navigate("/briefing"),
    },
    {
      id: "a-work-mode",
      type: "action",
      title: "Toggle Work Mode",
      subtitle: "Switch focus mode",
      icon: "🎯",
      action: async () => {
        try {
          await fetch("/mc-api/settings/work-mode/toggle", { method: "POST" });
          toastSuccess("Work mode toggled");
        } catch {
          toastSuccess("Work mode toggled (offline)");
        }
      },
    },
    {
      id: "a-restart-gw",
      type: "action",
      title: "Restart Gateway",
      subtitle: "Reconnect to backend",
      icon: "🔄",
      action: async () => {
        try {
          await fetch("/mc-api/gateway/restart", { method: "POST" });
          toastSuccess("Gateway restart requested");
        } catch {
          toastSuccess("Restart signal sent");
        }
      },
    },
    {
      id: "a-check-email",
      type: "action",
      title: "Check Email",
      subtitle: "View channel messages",
      icon: "📧",
      path: "/channels",
      action: () => navigate("/channels"),
    },
  ], [theme, setTheme, soundEnabled, setSoundEnabled, navigate]);

  // Build agent items
  const agentItems = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];
    for (const [, agent] of agents) {
      if (agent.isPlaceholder) continue;
      list.push({
        id: `agent-${agent.id}`,
        type: "agent",
        title: agent.name,
        subtitle: `Agent · ${agent.status}`,
        icon: "🤖",
        path: "/agents",
      });
    }
    return list.slice(0, 20);
  }, [agents]);

  // Fetch cron data when opened
  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        const res = await fetch("/mc-api/crons");
        const data = await res.json();
        const jobs: Array<{ id: string; name: string }> = data.jobs ?? [];
        setCronItems(
          jobs.map((j) => ({
            id: `cron-${j.id}`,
            type: "cron" as const,
            title: j.name,
            subtitle: "Scheduled task",
            icon: "⏰",
            path: "/cron",
          })),
        );
      } catch {
        setCronItems([]);
      }
    })();
    // Reload recent on open
    const recent = loadRecent();
    setRecentItems(
      recent.map((r) => ({
        id: `recent-${r.id}`,
        type: "recent" as const,
        title: r.title,
        subtitle: r.subtitle,
        icon: r.icon,
        path: r.path,
      })),
    );
  }, [isOpen]);

  // Cmd+K / Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          if (!prev) {
            setQuery("");
            setSelectedIndex(0);
          }
          return !prev;
        });
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  // Build grouped sections
  const { sections, flatList } = useMemo(() => {
    const q = query.trim();

    if (!q) {
      // No query: show recent + pages + actions
      const secs: Array<{ label: string; items: PaletteItem[] }> = [];
      if (recentItems.length > 0) secs.push({ label: "Recent", items: recentItems });
      secs.push({ label: "Pages", items: PAGES.slice(0, 8) });
      secs.push({ label: "Actions", items: ACTIONS });
      if (agentItems.length > 0) secs.push({ label: "Agents", items: agentItems.slice(0, 4) });
      const flat = secs.flatMap((s) => s.items);
      return { sections: secs, flatList: flat };
    }

    // With query: fuzzy filter all categories
    const secs: Array<{ label: string; items: PaletteItem[] }> = [];

    const filteredPages = fuzzyFilter(PAGES, q).slice(0, 5);
    if (filteredPages.length > 0) secs.push({ label: "Pages", items: filteredPages });

    const filteredActions = fuzzyFilter(ACTIONS, q).slice(0, 4);
    if (filteredActions.length > 0) secs.push({ label: "Actions", items: filteredActions });

    const filteredAgents = fuzzyFilter(agentItems, q).slice(0, 5);
    if (filteredAgents.length > 0) secs.push({ label: "Agents", items: filteredAgents });

    const filteredCrons = fuzzyFilter(cronItems, q).slice(0, 4);
    if (filteredCrons.length > 0) secs.push({ label: "Crons", items: filteredCrons });

    const filteredSettings = fuzzyFilter(SETTINGS_ITEMS, q).slice(0, 3);
    if (filteredSettings.length > 0) secs.push({ label: "Settings", items: filteredSettings });

    const flat = secs.flatMap((s) => s.items);
    return { sections: secs, flatList: flat };
  }, [query, recentItems, ACTIONS, agentItems, cronItems]);

  // Reset selection on results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [flatList.length, query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector<HTMLElement>("[data-selected='true']");
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (item.action) {
        void (item.action as () => void | Promise<void>)();
      }
      if (item.path) {
        navigate(item.path);
        // Save non-recent items to recent
        if (item.type !== "recent") {
          saveRecent(item);
        }
      }
      setIsOpen(false);
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && flatList[selectedIndex]) {
        handleSelect(flatList[selectedIndex]);
      }
    },
    [flatList, selectedIndex, handleSelect],
  );

  if (!isOpen) return null;

  // Build flat index for isSelected check
  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[12vh]"
      style={{ animation: "palette-appear 150ms ease-out" }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={() => setIsOpen(false)}
        role="button"
        tabIndex={-1}
        onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
        aria-label="Close command palette"
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-[rgba(0,255,65,0.18)] dark:bg-[rgba(6,12,6,0.98)]"
        style={{
          boxShadow: "0 25px 60px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,255,65,0.08)",
          animation: "palette-slide-in 150ms ease-out",
        }}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4 dark:border-[rgba(0,255,65,0.1)]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 shrink-0 text-gray-400 dark:text-[#0a5d0a]"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, agents, actions..."
            className="flex-1 bg-transparent text-lg font-light text-gray-800 outline-none placeholder:text-gray-300 dark:text-gray-100 dark:placeholder:text-[#0a4a0a]"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded-lg border border-gray-200 px-2 py-1 text-[11px] text-gray-400 sm:block dark:border-[rgba(0,255,65,0.15)] dark:text-[#0a5d0a]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          className="max-h-[420px] overflow-y-auto py-2"
        >
          {flatList.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="text-3xl opacity-30">🔍</span>
              <p className="text-sm text-gray-400 dark:text-[#0a5d0a]">No results for "{query}"</p>
            </div>
          ) : (
            sections.map((section) => (
              <div key={section.label}>
                <GroupHeader label={section.label} />
                {section.items.map((item) => {
                  const idx = globalIdx++;
                  return (
                    <div key={item.id} data-selected={idx === selectedIndex ? "true" : undefined}>
                      <ResultRow
                        item={item}
                        isSelected={idx === selectedIndex}
                        onHover={() => setSelectedIndex(idx)}
                        onSelect={() => handleSelect(item)}
                      />
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-5 py-2.5 dark:border-[rgba(0,255,65,0.08)]">
          <span className="text-[10px] text-gray-300 dark:text-[#0a3d0a]">↑↓ navigate</span>
          <span className="text-[10px] text-gray-300 dark:text-[#0a3d0a]">↵ select</span>
          <span className="text-[10px] text-gray-300 dark:text-[#0a3d0a]">esc close</span>
          <span className="ml-auto text-[10px] text-gray-300 dark:text-[#0a3d0a]">
            {flatList.length} result{flatList.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <style>{`
        @keyframes palette-appear {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes palette-slide-in {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
