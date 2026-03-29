import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOfficeStore } from "@/store/office-store";

interface SearchResult {
  id: string;
  type: "agent" | "page" | "cron";
  title: string;
  subtitle: string;
  path: string;
}

const PAGES: SearchResult[] = [
  { id: "p-home", type: "page", title: "Home", subtitle: "Command Center", path: "/" },
  { id: "p-office", type: "page", title: "Office", subtitle: "Floor plan view", path: "/office" },
  { id: "p-chat", type: "page", title: "Chat", subtitle: "Agent conversations", path: "/chat" },
  { id: "p-dashboard", type: "page", title: "Dashboard", subtitle: "System overview", path: "/dashboard" },
  { id: "p-agents", type: "page", title: "Agents", subtitle: "Agent management", path: "/agents" },
  { id: "p-channels", type: "page", title: "Channels", subtitle: "Messaging channels", path: "/channels" },
  { id: "p-skills", type: "page", title: "Skills", subtitle: "Skill marketplace", path: "/skills" },
  { id: "p-cron", type: "page", title: "Cron Tasks", subtitle: "Scheduled tasks", path: "/cron" },
  { id: "p-settings", type: "page", title: "Settings", subtitle: "App configuration", path: "/settings" },
];

const API_BASE = "/mc-api";

export function SearchSpotlight() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cronResults, setCronResults] = useState<SearchResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const agents = useOfficeStore((s) => s.agents);

  // Cmd+K / Ctrl+K to open
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery("");
        setSelectedIndex(0);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Fetch cron tasks for search
  useEffect(() => {
    if (!isOpen) return;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/crons`);
        const data = await res.json();
        const jobs: Array<{ id: string; name: string }> = data.jobs ?? [];
        setCronResults(
          jobs.map((j) => ({
            id: `cron-${j.id}`,
            type: "cron" as const,
            title: j.name,
            subtitle: "Cron task",
            path: "/cron",
          })),
        );
      } catch {
        setCronResults([]);
      }
    })();
  }, [isOpen]);

  const agentResults = useMemo<SearchResult[]>(() => {
    const list: SearchResult[] = [];
    for (const [, agent] of agents) {
      if (agent.isPlaceholder) continue;
      list.push({
        id: `agent-${agent.id}`,
        type: "agent",
        title: agent.name,
        subtitle: `Agent \u2022 ${agent.status}`,
        path: "/agents",
      });
    }
    return list;
  }, [agents]);

  const allItems = useMemo(
    () => [...PAGES, ...agentResults, ...cronResults],
    [agentResults, cronResults],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems.slice(0, 10);
    const q = query.toLowerCase();
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, allItems]);

  // Reset selection on filter change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filtered.length]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      navigate(result.path);
      setIsOpen(false);
    },
    [navigate],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    },
    [filtered, selectedIndex, handleSelect],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Escape" && setIsOpen(false)}
      />

      {/* Search panel */}
      <div className="relative w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(10,15,10,0.97)]">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3 dark:border-[rgba(0,255,65,0.1)]">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search agents, pages, cron tasks..."
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-[#00ff41] dark:placeholder:text-[#0a5d0a]"
          />
          <kbd className="rounded border border-gray-200 px-1.5 py-0.5 text-[10px] text-gray-400 dark:border-[rgba(0,255,65,0.2)] dark:text-[#0a5d0a]">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400 dark:text-[#0a5d0a]">
              No results found
            </div>
          ) : (
            filtered.map((result, i) => (
              <button
                key={result.id}
                type="button"
                onClick={() => handleSelect(result)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                  i === selectedIndex
                    ? "bg-gray-100 dark:bg-[rgba(0,255,65,0.08)]"
                    : "hover:bg-gray-50 dark:hover:bg-[rgba(0,255,65,0.04)]"
                }`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs">
                  {result.type === "agent" ? "\uD83E\uDD16" : result.type === "cron" ? "\u23F0" : "\uD83D\uDCC4"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-200">
                    {result.title}
                  </div>
                  <div className="truncate text-xs text-gray-400 dark:text-[#0a5d0a]">
                    {result.subtitle}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-400 dark:bg-[rgba(0,255,65,0.08)] dark:text-[#0a5d0a]">
                  {result.type}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-gray-200 px-4 py-2 text-[10px] text-gray-400 dark:border-[rgba(0,255,65,0.1)] dark:text-[#0a5d0a]">
          <span>\u2191\u2193 navigate</span>
          <span>\u21B5 select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-gray-400 dark:text-[#0a5d0a]"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
