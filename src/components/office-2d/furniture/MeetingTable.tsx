import { memo } from "react";

interface MeetingTableProps {
  x: number;
  y: number;
  radius?: number;
  isDark?: boolean;
}

export const MeetingTable = memo(function MeetingTable({
  x,
  y,
  radius = 80,
  isDark = false,
}: MeetingTableProps) {
  const gradId = `mt-grad-${x}-${y}`;
  const surface = isDark ? "#0a2a0a" : "#bfcbda";
  const surfaceCenter = isDark ? "#0d3a0d" : "#dbe4ef";

  return (
    <g transform={`translate(${x}, ${y})`}>
      <defs>
        <radialGradient id={gradId}>
          <stop offset="0%" stopColor={surfaceCenter} />
          <stop offset="100%" stopColor={surface} />
        </radialGradient>
      </defs>
      <circle
        r={radius}
        fill={`url(#${gradId})`}
        stroke={isDark ? "#0a3d0a" : "#94a3b8"}
        strokeWidth={1.5}
        style={{ filter: isDark ? "drop-shadow(0 3px 8px rgba(0,255,65,0.08))" : "drop-shadow(0 3px 6px rgba(0,0,0,0.10))" }}
      />
    </g>
  );
});
