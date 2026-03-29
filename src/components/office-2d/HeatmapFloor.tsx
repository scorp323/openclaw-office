import { useMemo } from "react";
import type { VisualAgent } from "@/gateway/types";
import { ZONES } from "@/lib/constants";
import "./HeatmapFloor.css";

type ZoneKey = keyof typeof ZONES;

interface HeatmapFloorProps {
  agents: VisualAgent[];
}

/** Count agents per zone and return normalized intensity (0-1) */
function getZoneIntensities(agents: VisualAgent[]): Record<ZoneKey, number> {
  const counts: Record<string, number> = {};
  for (const key of Object.keys(ZONES)) {
    counts[key] = 0;
  }
  for (const agent of agents) {
    if (agent.zone in counts && !agent.isPlaceholder) {
      counts[agent.zone]++;
    }
  }

  const max = Math.max(1, ...Object.values(counts));
  const intensities = {} as Record<ZoneKey, number>;
  for (const key of Object.keys(ZONES) as ZoneKey[]) {
    intensities[key] = counts[key] / max;
  }
  return intensities;
}

/** Interpolate between cool blue and warm orange-red based on intensity */
function getHeatColor(intensity: number): string {
  if (intensity <= 0.01) return "rgba(59, 130, 246, 0.04)"; // dim blue
  // Lerp from blue to orange-red
  const r = Math.round(59 + (249 - 59) * intensity);
  const g = Math.round(130 + (115 - 130) * intensity);
  const b = Math.round(246 + (22 - 246) * intensity);
  const alpha = 0.04 + intensity * 0.12;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function HeatmapFloor({ agents }: HeatmapFloorProps) {
  const intensities = useMemo(() => getZoneIntensities(agents), [agents]);

  return (
    <g className="heatmap-floor" pointerEvents="none">
      {(Object.keys(ZONES) as ZoneKey[]).map((key) => {
        const zone = ZONES[key];
        const intensity = intensities[key];
        const isActive = intensity > 0.3;

        return (
          <rect
            key={`heatmap-${key}`}
            x={zone.x + 2}
            y={zone.y + 2}
            width={zone.width - 4}
            height={zone.height - 4}
            rx={4}
            fill={getHeatColor(intensity)}
            className={isActive ? "heatmap-zone-active" : undefined}
          />
        );
      })}
    </g>
  );
}
