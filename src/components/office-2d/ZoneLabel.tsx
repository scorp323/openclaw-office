import { useTranslation } from "react-i18next";
import { ZONES } from "@/lib/constants";
import { useOfficeStore } from "@/store/office-store";

interface ZoneLabelProps {
  zone: { x: number; y: number; width: number; height: number; label: string };
  zoneKey: keyof typeof ZONES;
}

export function ZoneLabel({ zone, zoneKey }: ZoneLabelProps) {
  const { t } = useTranslation("common");
  const theme = useOfficeStore((s) => s.theme);
  const isDark = theme === "dark";
  const textColor = isDark ? "#00ff41" : "#94a3b8";

  return (
    <text
      x={zone.x + 14}
      y={zone.y + 22}
      fill={textColor}
      fontSize={11}
      fontWeight={600}
      fontFamily="'JetBrains Mono', monospace"
      letterSpacing="0.08em"
      style={isDark ? { filter: "drop-shadow(0 0 4px rgba(0,255,65,0.4))" } : undefined}
    >
      {t(`zones.${zoneKey}`)}
    </text>
  );
}
