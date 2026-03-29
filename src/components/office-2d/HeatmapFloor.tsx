import { useMemo } from "react";
import type { VisualAgent } from "@/gateway/types";
import { ZONES } from "@/lib/constants";
import "./HeatmapFloor.css";

type ZoneKey = keyof typeof ZONES;

/**
 * Conceptual zone mapping for labelling purposes:
 *   meeting  → trading
 *   desk     → engineering
 *   hotDesk  → engineering
 *   lounge   → content
 *   chill    → ops
 */

interface HeatmapFloorProps {
  agents: VisualAgent[];
}

function getZoneCounts(agents: VisualAgent[]): Record<ZoneKey, number> {
  const counts = {} as Record<ZoneKey, number>;
  for (const key of Object.keys(ZONES) as ZoneKey[]) {
    counts[key] = 0;
  }
  for (const agent of agents) {
    if (agent.zone in counts && !agent.isPlaceholder) {
      counts[agent.zone as ZoneKey]++;
    }
  }
  return counts;
}

function getZoneErrorCounts(agents: VisualAgent[]): Record<ZoneKey, number> {
  const counts = {} as Record<ZoneKey, number>;
  for (const key of Object.keys(ZONES) as ZoneKey[]) {
    counts[key] = 0;
  }
  for (const agent of agents) {
    if (agent.zone in counts && !agent.isPlaceholder && agent.status === "error") {
      counts[agent.zone as ZoneKey]++;
    }
  }
  return counts;
}

/**
 * Interpolate cool blue (#3b82f6) → warm orange (#f97316) by agent density.
 * 0 agents → no glow; 1 agent → blue; 3+ agents → orange.
 */
function getHeatGradientColor(count: number): { color: string; opacity: number } {
  if (count === 0) return { color: "#3b82f6", opacity: 0 };
  const t = Math.min(count / 3, 1);
  // rgb(59,130,246) → rgb(249,115,22)
  const r = Math.round(59 + (249 - 59) * t);
  const g = Math.round(130 + (115 - 130) * t);
  const b = Math.round(246 + (22 - 246) * t);
  const opacity = 0.12 + t * 0.28; // 0.12 → 0.40
  return { color: `rgb(${r},${g},${b})`, opacity };
}

export function HeatmapFloor({ agents }: HeatmapFloorProps) {
  const counts = useMemo(() => getZoneCounts(agents), [agents]);
  const errorCounts = useMemo(() => getZoneErrorCounts(agents), [agents]);

  return (
    <g className="heatmap-floor" pointerEvents="none">
      <defs>
        {(Object.keys(ZONES) as ZoneKey[]).map((key) => {
          const { color, opacity } = getHeatGradientColor(counts[key]);
          return (
            <radialGradient
              key={`heatmap-grad-def-${key}`}
              id={`heatmap-grad-${key}`}
              cx="50%"
              cy="50%"
              r="60%"
            >
              <stop offset="0%" stopColor={color} stopOpacity={opacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </radialGradient>
          );
        })}
        {/* Shared error pulse gradient */}
        <radialGradient id="heatmap-err-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.40" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {(Object.keys(ZONES) as ZoneKey[]).map((key) => {
        const zone = ZONES[key];
        const count = counts[key];
        const hasError = errorCounts[key] > 0;

        return (
          <g key={`heatmap-group-${key}`}>
            {/* Activity heat overlay — radial gradient, blue → orange */}
            <rect
              x={zone.x + 2}
              y={zone.y + 2}
              width={zone.width - 4}
              height={zone.height - 4}
              rx={4}
              fill={count > 0 ? `url(#heatmap-grad-${key})` : "none"}
              className={count > 0 ? "heatmap-zone-active" : undefined}
              style={{ transition: "opacity 1.5s ease" }}
            />
            {/* Error pulse overlay — red throb when any agent in zone has error status */}
            {hasError && (
              <rect
                x={zone.x + 2}
                y={zone.y + 2}
                width={zone.width - 4}
                height={zone.height - 4}
                rx={4}
                fill="url(#heatmap-err-grad)"
                className="heatmap-zone-error"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}
