import { memo } from "react";

interface DeskProps {
  x: number;
  y: number;
  isDark?: boolean;
}

export const Desk = memo(function Desk({ x, y, isDark = false }: DeskProps) {
  const surface = isDark ? "#0a2a0a" : "#dfe5ed";
  const side = isDark ? "#062006" : "#c8d0dc";
  const monitor = isDark ? "#001a00" : "#f1f5f9";
  const monitorFrame = isDark ? "#0a3d0a" : "#94a3b8";

  return (
    <g transform={`translate(${x}, ${y})`}>
      {/* Desk top – flat isometric rectangle */}
      <rect
        x={-50}
        y={-6}
        width={100}
        height={60}
        rx={6}
        fill={surface}
        stroke={side}
        strokeWidth={1}
      />
      {/* Desk front edge (depth) */}
      <path
        d="M -50 54 L -50 60 Q -50 66 -44 66 L 44 66 Q 50 66 50 60 L 50 54"
        fill={side}
        opacity={0.6}
      />
      {/* Monitor / laptop screen hint */}
      <rect
        x={-20}
        y={4}
        width={40}
        height={26}
        rx={3}
        fill={monitor}
        stroke={monitorFrame}
        strokeWidth={0.8}
      />
      {/* Keyboard hint */}
      <rect
        x={-16}
        y={36}
        width={32}
        height={12}
        rx={2}
        fill={isDark ? "#0a3d0a" : "#cbd5e1"}
        opacity={0.6}
      />
    </g>
  );
});
