import { useEffect, useRef, useState } from "react";
import { useCostStore } from "@/store/console-stores/cost-store";

const POLL_INTERVAL = 15_000;

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
      // ease-out
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

export function CostCounter() {
  const todayCostUsd = useCostStore((s) => s.todayCostUsd);
  const todayTokens = useCostStore((s) => s.todayTokens);
  const fetchCosts = useCostStore((s) => s.fetchCosts);

  const animatedCost = useAnimatedNumber(todayCostUsd);
  const animatedTokens = useAnimatedNumber(todayTokens);

  useEffect(() => {
    fetchCosts();
    const interval = setInterval(fetchCosts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchCosts]);

  if (todayCostUsd === 0 && todayTokens === 0) return null;

  return (
    <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs tabular-nums dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,255,65,0.05)]">
      {todayCostUsd > 0 && (
        <span className="text-gray-500 dark:text-[#0a5d0a]">
          ${animatedCost.toFixed(2)}
        </span>
      )}
      {todayTokens > 0 && (
        <span className="text-gray-400 dark:text-[#0a5d0a]">
          {formatTokens(animatedTokens)}
          <span className="ml-0.5 opacity-60">tok</span>
        </span>
      )}
    </div>
  );
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(Math.round(n));
}
