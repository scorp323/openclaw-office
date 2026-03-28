import { memo } from "react";

interface ChairProps {
  x: number;
  y: number;
  isDark?: boolean;
}

export const Chair = memo(function Chair({ x, y, isDark = false }: ChairProps) {
  const seat = isDark ? "#0a3d0a" : "#94a3b8";
  const back = isDark ? "#062806" : "#7c8ba0";

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Backrest (top-down view – arc shape) */}
      <path
        d="M -12 -14 Q 0 -20 12 -14"
        fill="none"
        stroke={back}
        strokeWidth={4}
        strokeLinecap="round"
      />
      {/* Seat cushion */}
      <circle r={14} fill={seat} opacity={0.85} />
    </g>
  );
});
