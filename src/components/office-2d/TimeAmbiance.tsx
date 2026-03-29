import { useState, useEffect } from "react";
import { OFFICE } from "@/lib/constants";

interface AmbiancePeriod {
  color: string;
  opacity: number;
  blendMode: string;
}

function getAmbiancePeriod(hour: number): AmbiancePeriod {
  if (hour >= 6 && hour < 9) {
    // Early morning: warm golden
    return { color: "#fbbf24", opacity: 0.08, blendMode: "overlay" };
  }
  if (hour >= 9 && hour < 17) {
    // Daytime: bright, no filter
    return { color: "transparent", opacity: 0, blendMode: "normal" };
  }
  if (hour >= 17 && hour < 19) {
    // Sunset: amber tint
    return { color: "#f97316", opacity: 0.1, blendMode: "overlay" };
  }
  if (hour >= 19 && hour < 23) {
    // Evening: dim blue-purple
    return { color: "#6366f1", opacity: 0.12, blendMode: "multiply" };
  }
  // Night (11pm-6am): dark mode enhanced, blue-green
  return { color: "#0d9488", opacity: 0.08, blendMode: "multiply" };
}

export function TimeAmbiance() {
  const [period, setPeriod] = useState(() => getAmbiancePeriod(new Date().getHours()));

  useEffect(() => {
    function update() {
      setPeriod(getAmbiancePeriod(new Date().getHours()));
    }
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  if (period.opacity === 0) return null;

  return (
    <rect
      x={OFFICE.x}
      y={OFFICE.y}
      width={OFFICE.width}
      height={OFFICE.height}
      rx={OFFICE.cornerRadius}
      fill={period.color}
      opacity={period.opacity}
      style={{ mixBlendMode: period.blendMode as React.CSSProperties["mixBlendMode"] }}
      pointerEvents="none"
    />
  );
}
