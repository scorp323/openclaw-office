import { useMemo } from "react";
import type { VisualAgent } from "@/gateway/types";
import { ZONES } from "@/lib/constants";
import "./HeatmapFloor.css";

type ZoneKey = keyof typeof ZONES;

interface HeatmapFloorProps {
  agents: VisualAgent[];
}

/** Count agents per zone */
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

/** Warm amber glow — opacity scales with agent count, transparent when empty */
function getHeatColor(count: number): string {
  if (count === 0) return "transparent";
  // Clamp intensity: 1 agent → 0.08, 3+ agents → 0.15-0.3
  const t = Math.min(count / 5, 1);
  const alpha = 0.08 + t * 0.22; // 0.08 → 0.30
  return `rgba(245, 158, 11, ${alpha.toFixed(3)})`;
}

export function HeatmapFloor({ agents }: HeatmapFloorProps) {
  const counts = useMemo(() => getZoneCounts(agents), [agents]);

  return (
    <g className="heatmap-floor" pointerEvents="none">
      {(Object.keys(ZONES) as ZoneKey[]).map((key) => {
        const zone = ZONES[key];
        const count = counts[key];

        return (
          <rect
            key={`heatmap-${key}`}
            x={zone.x + 2}
            y={zone.y + 2}
            width={zone.width - 4}
            height={zone.height - 4}
            rx={4}
            fill={getHeatColor(count)}
            className={count > 0 ? "heatmap-zone-active" : undefined}
            style={{ transition: "fill 2s ease" }}
          />
        );
      })}
    </g>
  );
}
