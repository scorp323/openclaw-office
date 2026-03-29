import { useCallback, useEffect, useRef, useState } from "react";
import { useCostStore } from "@/store/console-stores/cost-store";
import { useOfficeStore } from "@/store/office-store";

interface ModelBreakdown {
  model: string;
  cost: number;
  tokens: number;
}

const POLL_INTERVAL = 15_000;
const WS_POLL_INTERVAL = 60_000;

function useAnimatedNumber(target: number, duration = 600): number {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number>(0);
  const startRef = useRef(display);
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (target === startRef.current) return;
    startRef.current = display;
    startTimeRef.current = performance.now();

    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(startRef.current + (target - startRef.current) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);

  return display;
}

function getThrottleColor(state: string): string {
  const base = state.replace(/_AWAKE_HALF|_SLEEP_BOOST/g, "");
  switch (base) {
    case "SPRINT":
    case "FULL_THROTTLE": return "text-green-400";
    case "SURGE": return "text-blue-400";
    case "MODERATE": return "text-cyan-400";
    case "CONSERVE": return "text-yellow-400";
    case "CAUTIOUS": return "text-orange-400";
    case "LOCKDOWN": return "text-red-400";
    default: return "text-gray-400";
  }
}

function getThrottleEmoji(state: string): string {
  const base = state.replace(/_AWAKE_HALF|_SLEEP_BOOST/g, "");
  switch (base) {
    case "SPRINT": return "🏁";
    case "SURGE": return "⚡";
    case "FULL_THROTTLE": return "🚀";
    case "MODERATE": return "🔵";
    case "CONSERVE": return "🟡";
    case "CAUTIOUS": return "🟠";
    case "LOCKDOWN": return "⛔";
    default: return "⚪";
  }
}

export function CostCounter() {
  const weeklyPct = useCostStore((s) => s.weeklyPct);
  const sessionPct = useCostStore((s) => s.sessionPct);
  const dailyBudgetPct = useCostStore((s) => s.dailyBudgetPct);
  const throttleState = useCostStore((s) => s.throttleState);
  const maxAgents = useCostStore((s) => s.maxAgents);
  const estimatedWeeklyCost = useCostStore((s) => s.estimatedWeeklyCostUsd);
  const todayCostUsd = useCostStore((s) => s.todayCostUsd);
  const todayTokens = useCostStore((s) => s.todayTokens);
  const fetchCosts = useCostStore((s) => s.fetchCosts);
  const wsConnected = useOfficeStore((s) => s.connectionStatus) === "connected";

  const [showBreakdown, setShowBreakdown] = useState(false);
  const [modelBreakdown, setModelBreakdown] = useState<ModelBreakdown[]>([]);
  const breakdownRef = useRef<HTMLDivElement>(null);

  const animatedWeekly = useAnimatedNumber(weeklyPct);
  const animatedSession = useAnimatedNumber(sessionPct);
  const animatedCost = useAnimatedNumber(estimatedWeeklyCost);
  const animatedDailyCost = useAnimatedNumber(todayCostUsd);
  const animatedTokens = useAnimatedNumber(todayTokens);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, wsConnected ? WS_POLL_INTERVAL : POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCosts, wsConnected]);

  const fetchBreakdown = useCallback(async () => {
    try {
      const token = (() => { try { return localStorage.getItem("openclaw-mc-auth-token"); } catch { return null; } })();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/mc-api/costs/detail", { headers });
      if (!res.ok) return;
      const data = await res.json();
      const byModel: Record<string, { cost: number; tokens: number }> = data.byModel ?? {};
      setModelBreakdown(
        Object.entries(byModel).map(([model, v]) => ({
          model,
          cost: (v as { cost: number; tokens: number }).cost,
          tokens: (v as { cost: number; tokens: number }).tokens,
        })),
      );
    } catch {
      setModelBreakdown([]);
    }
  }, []);

  // Close breakdown on outside click
  useEffect(() => {
    if (!showBreakdown) return;
    const handler = (e: MouseEvent) => {
      if (breakdownRef.current && !breakdownRef.current.contains(e.target as Node)) {
        setShowBreakdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBreakdown]);

  if (weeklyPct === 0 && sessionPct === 0 && todayCostUsd === 0) return null;

  const baseState = throttleState.replace(/_AWAKE_HALF|_SLEEP_BOOST/g, "");
  const colorClass = getThrottleColor(throttleState);
  const emoji = getThrottleEmoji(throttleState);

  const handleToggleBreakdown = () => {
    if (!showBreakdown) void fetchBreakdown();
    setShowBreakdown((p) => !p);
  };

  return (
    <div className="relative" ref={breakdownRef}>
      <button
        type="button"
        onClick={handleToggleBreakdown}
        className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs tabular-nums transition-colors hover:bg-gray-100 dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,255,65,0.05)] dark:hover:bg-[rgba(0,255,65,0.1)]"
      >
        <span className={colorClass} title={`Throttle: ${baseState} (${maxAgents} agents)`}>
          {emoji} {baseState}
        </span>
        {todayCostUsd > 0 && (
          <span className="text-gray-500 dark:text-[#4ade80]" title={`Today: $${animatedDailyCost.toFixed(2)}`}>
            ${animatedDailyCost.toFixed(2)}/d
          </span>
        )}
        {todayTokens > 0 && (
          <span className="text-gray-400 dark:text-[#0a5d0a]" title={`Today's tokens: ${Math.round(animatedTokens).toLocaleString()}`}>
            {formatTokenCount(animatedTokens)}
          </span>
        )}
        <span className="text-gray-400 dark:text-[#4ade80]" title={`Weekly: ${animatedWeekly.toFixed(0)}% | Session: ${animatedSession.toFixed(0)}%`}>
          W:{animatedWeekly.toFixed(0)}%
        </span>
        {estimatedWeeklyCost > 0 && (
          <span className="text-gray-500 dark:text-[#4ade80]" title={`Est. weekly: $${animatedCost.toFixed(2)} / Daily budget: ${dailyBudgetPct.toFixed(0)}%`}>
            ~${animatedCost.toFixed(0)}/wk
          </span>
        )}
      </button>

      {/* Model breakdown dropdown */}
      {showBreakdown && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[220px] rounded-lg border border-gray-200 bg-white p-3 shadow-xl dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(10,15,10,0.97)]">
          <h4 className="mb-2 text-xs font-semibold text-gray-700 dark:text-[#00ff41]">
            Model Breakdown
          </h4>
          {modelBreakdown.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-[#0a5d0a]">No data</p>
          ) : (
            <div className="space-y-1.5">
              {modelBreakdown.map((m) => (
                <div key={m.model} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-gray-600 dark:text-gray-300">{m.model}</span>
                  <div className="flex items-center gap-2 shrink-0 tabular-nums">
                    <span className="text-gray-500 dark:text-[#4ade80]">${m.cost.toFixed(2)}</span>
                    <span className="text-gray-400 dark:text-[#0a5d0a]">{formatTokenCount(m.tokens)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 border-t border-gray-100 pt-2 text-[10px] text-gray-400 dark:border-[rgba(0,255,65,0.1)] dark:text-[#0a5d0a]">
            Session: {animatedSession.toFixed(0)}% | Daily budget: {dailyBudgetPct.toFixed(0)}%
          </div>
        </div>
      )}
    </div>
  );
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
