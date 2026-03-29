import { useState } from "react";

type HourStatus = "active" | "error" | "idle";

interface AgentUptimeBarsProps {
  status: "active" | "standby" | "offline";
  lastSeen?: number; // epoch ms
  agentId: string;
}

/**
 * Infer hourly status over the past 24 hours from current status + lastSeen.
 * Returns array index 0 = oldest hour (23h ago), index 23 = current hour.
 */
function inferHourlyStatus(
  status: "active" | "standby" | "offline",
  lastSeen?: number,
): HourStatus[] {
  const now = Date.now();
  const hours: HourStatus[] = [];

  for (let i = 23; i >= 0; i--) {
    const hourStart = now - (i + 1) * 3_600_000;
    const hourEnd = now - i * 3_600_000;

    if (lastSeen && lastSeen >= hourStart && lastSeen < hourEnd) {
      // Agent was seen in this specific hour
      hours.push(status === "offline" ? "idle" : "active");
    } else if (lastSeen && lastSeen >= hourEnd) {
      // Agent was seen after this hour — it was likely active during this hour
      hours.push(status === "offline" ? "idle" : i < 2 ? status === "active" ? "active" : "idle" : "active");
    } else if (status === "active" && i === 0) {
      // Currently active
      hours.push("active");
    } else {
      hours.push("idle");
    }
  }

  return hours;
}

const STATUS_COLOR: Record<HourStatus, string> = {
  active: "bg-green-500 dark:bg-green-500",
  error: "bg-red-500 dark:bg-red-500",
  idle: "bg-gray-200 dark:bg-gray-700",
};

const STATUS_LABEL: Record<HourStatus, string> = {
  active: "Active",
  error: "Error",
  idle: "Offline / Idle",
};

export function AgentUptimeBars({ status, lastSeen, agentId: _ }: AgentUptimeBarsProps) {
  const hours = inferHourlyStatus(status, lastSeen);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="mt-3 px-5 pb-4">
      <div className="mb-1 flex items-center justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>24h ago</span>
        <span>now</span>
      </div>
      <div className="relative flex items-end gap-0.5">
        {hours.map((s, i) => {
          const hourLabel = i === 23 ? "now" : `${23 - i}h ago`;
          const isHovered = hoveredIdx === i;
          return (
            <div
              key={i}
              className="relative flex-1"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div
                className={`h-3 w-full rounded-sm transition-all ${STATUS_COLOR[s]} ${
                  isHovered ? "scale-y-125 opacity-100" : "opacity-80"
                }`}
              />
              {isHovered && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-1.5 py-0.5 text-[10px] text-gray-100 shadow">
                  {hourLabel}: {STATUS_LABEL[s]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
