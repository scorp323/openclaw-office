import { useMemo } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテト0123456789";
const COLUMN_COUNT = 24;

export function MatrixRain() {
  const columns = useMemo(
    () =>
      Array.from({ length: COLUMN_COUNT }, (_, i) => ({
        id: i,
        left: `${(i / COLUMN_COUNT) * 100}%`,
        delay: `${-(Math.random() * 8).toFixed(2)}s`,
        duration: `${(6 + Math.random() * 6).toFixed(2)}s`,
        chars: Array.from({ length: 16 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join(
          "\n",
        ),
      })),
    [],
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
      style={{ opacity: 0.04 }}
    >
      <style>{`
        @keyframes matrix-fall {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>
      {columns.map((col) => (
        <span
          key={col.id}
          style={{
            position: "absolute",
            left: col.left,
            top: 0,
            color: "#00d4aa",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.2em",
            whiteSpace: "pre",
            animation: `matrix-fall ${col.duration} linear ${col.delay} infinite`,
            willChange: "transform",
          }}
        >
          {col.chars}
        </span>
      ))}
    </div>
  );
}
