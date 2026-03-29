import { useEffect, useRef, useState } from "react";
import { useCostStore } from "@/store/console-stores/cost-store";
import { useOfficeStore } from "@/store/office-store";

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
  const fetchCosts = useCostStore((s) => s.fetchCosts);
  const wsConnected = useOfficeStore((s) => s.connectionStatus) === "connected";

  const animatedWeekly = useAnimatedNumber(weeklyPct);
  const animatedSession = useAnimatedNumber(sessionPct);
  const animatedCost = useAnimatedNumber(estimatedWeeklyCost);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, wsConnected ? WS_POLL_INTERVAL : POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCosts, wsConnected]);

  if (weeklyPct === 0 && sessionPct === 0) return null;

  const baseState = throttleState.replace(/_AWAKE_HALF|_SLEEP_BOOST/g, "");
  const colorClass = getThrottleColor(throttleState);
  const emoji = getThrottleEmoji(throttleState);

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs tabular-nums dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,255,65,0.05)]">
      <span className={colorClass} title={`Throttle: ${baseState} (${maxAgents} agents)`}>
        {emoji} {baseState}
      </span>
      <span className="text-gray-400 dark:text-[#4ade80]" title={`Weekly: ${animatedWeekly.toFixed(0)}% | Session: ${animatedSession.toFixed(0)}%`}>
        W:{animatedWeekly.toFixed(0)}%
      </span>
      <span className="text-gray-400 dark:text-[#0a5d0a]" title={`Session usage: ${animatedSession.toFixed(0)}%`}>
        S:{animatedSession.toFixed(0)}%
      </span>
      {estimatedWeeklyCost > 0 && (
        <span className="text-gray-500 dark:text-[#4ade80]" title={`Est. weekly: $${animatedCost.toFixed(2)} / Daily budget: ${dailyBudgetPct.toFixed(0)}%`}>
          ~${animatedCost.toFixed(0)}/wk
        </span>
      )}
    </div>
  );
}
