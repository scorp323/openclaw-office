import { useState, useEffect } from "react";
import { OFFICE } from "@/lib/constants";

interface AmbiancePeriod {
  color: string;
  opacity: number;
  blendMode: string;
  label: string;
  vignetteOpacity: number;
  skyColor: string;
}

function getAmbiancePeriod(hour: number): AmbiancePeriod {
  if (hour >= 6 && hour < 9) {
    // Early morning: warm golden
    return {
      color: "#fbbf24",
      opacity: 0.15,
      blendMode: "overlay",
      label: "MORNING",
      vignetteOpacity: 0.06,
      skyColor: "#fde68a",
    };
  }
  if (hour >= 9 && hour < 17) {
    // Daytime: bright, minimal filter
    return {
      color: "#93c5fd",
      opacity: 0.04,
      blendMode: "normal",
      label: "DAY",
      vignetteOpacity: 0,
      skyColor: "#60a5fa",
    };
  }
  if (hour >= 17 && hour < 19) {
    // Sunset: amber tint
    return {
      color: "#f97316",
      opacity: 0.20,
      blendMode: "overlay",
      label: "SUNSET",
      vignetteOpacity: 0.08,
      skyColor: "#fb923c",
    };
  }
  if (hour >= 19 && hour < 23) {
    // Evening: deep blue-purple
    return {
      color: "#4338ca",
      opacity: 0.25,
      blendMode: "multiply",
      label: "NIGHT",
      vignetteOpacity: 0.18,
      skyColor: "#312e81",
    };
  }
  // Night (11pm-6am): dark blue-purple
  return {
    color: "#4338ca",
    opacity: 0.25,
    blendMode: "multiply",
    label: "NIGHT",
    vignetteOpacity: 0.22,
    skyColor: "#1e1b4b",
  };
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function TimeAmbiance() {
  const [period, setPeriod] = useState(() => getAmbiancePeriod(new Date().getHours()));
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    function update() {
      setPeriod(getAmbiancePeriod(new Date().getHours()));
      setTime(formatTime(new Date()));
    }
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  const ox = OFFICE.x;
  const oy = OFFICE.y;
  const ow = OFFICE.width;
  const oh = OFFICE.height;
  const cr = OFFICE.cornerRadius;
  const vigId = "time-ambiance-vignette";
  const windowCount = 6;
  const windowW = 28;
  const windowH = 10;
  const windowGap = (ow - windowCount * windowW) / (windowCount + 1);

  return (
    <g pointerEvents="none">
      {/* Radial vignette gradient definition */}
      <defs>
        <radialGradient id={vigId} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="transparent" stopOpacity={0} />
          <stop offset="70%" stopColor={period.color} stopOpacity={period.vignetteOpacity * 0.3} />
          <stop offset="100%" stopColor={period.color} stopOpacity={period.vignetteOpacity} />
        </radialGradient>
      </defs>

      {/* Main time-of-day color overlay */}
      <rect
        x={ox}
        y={oy}
        width={ow}
        height={oh}
        rx={cr}
        fill={period.color}
        opacity={period.opacity}
        style={{ mixBlendMode: period.blendMode as React.CSSProperties["mixBlendMode"] }}
      />

      {/* Vignette overlay — darker at edges, lighter at center */}
      {period.vignetteOpacity > 0 && (
        <rect
          x={ox}
          y={oy}
          width={ow}
          height={oh}
          rx={cr}
          fill={`url(#${vigId})`}
        />
      )}

      {/* Window elements along top edge showing sky color */}
      <g>
        {Array.from({ length: windowCount }, (_, i) => {
          const wx = ox + windowGap + i * (windowW + windowGap);
          return (
            <g key={`window-${i}`}>
              {/* Window frame */}
              <rect
                x={wx}
                y={oy - 2}
                width={windowW}
                height={windowH}
                rx={3}
                fill={period.skyColor}
                opacity={0.7}
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={1}
              />
              {/* Window cross-bar */}
              <line
                x1={wx + windowW / 2}
                y1={oy - 2}
                x2={wx + windowW / 2}
                y2={oy - 2 + windowH}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.5}
              />
              <line
                x1={wx}
                y1={oy - 2 + windowH / 2}
                x2={wx + windowW}
                y2={oy - 2 + windowH / 2}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={0.5}
              />
            </g>
          );
        })}
      </g>

      {/* Time indicator — top right corner */}
      <foreignObject
        x={ox + ow - 120}
        y={oy + 6}
        width={112}
        height={28}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "4px",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span
            style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: period.label === "NIGHT" || period.label === "SUNSET"
                ? "rgba(67,56,202,0.7)"
                : "rgba(59,130,246,0.6)",
              borderRadius: "4px",
              padding: "2px 6px",
              whiteSpace: "nowrap",
              backdropFilter: "blur(4px)",
              letterSpacing: "0.5px",
            }}
          >
            {time} · {period.label}
          </span>
        </div>
      </foreignObject>
    </g>
  );
}
