import { useState, memo, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { VisualAgent, AgentVisualStatus } from "@/gateway/types";
import { getMatrixCharacter, type MatrixCharacterStyle } from "@/lib/avatar-generator";
import { getCodename, getCharacterKey } from "@/lib/matrix-codenames";
import { STATUS_COLORS, AVATAR } from "@/lib/constants";
import { useOfficeStore } from "@/store/office-store";
import "./IdleAnimations.css";

const WALK_BOB_AMPLITUDE = 2;
const WALK_BOB_FREQ = 8;

const IDLE_BEHAVIORS = ["reading", "sipping", "stretching", "leaning", "typing"] as const;
type IdleBehavior = (typeof IDLE_BEHAVIORS)[number];

/** Deterministic idle behavior based on agent id hash */
function getIdleBehavior(agentId: string): IdleBehavior {
  let hash = 0;
  for (let i = 0; i < agentId.length; i++) {
    hash = ((hash << 5) - hash + agentId.charCodeAt(i)) | 0;
  }
  return IDLE_BEHAVIORS[Math.abs(hash) % IDLE_BEHAVIORS.length];
}

interface AgentAvatarProps {
  agent: VisualAgent;
}

export const AgentAvatar = memo(function AgentAvatar({ agent }: AgentAvatarProps) {
  const { t } = useTranslation("common");
  const selectedAgentId = useOfficeStore((s) => s.selectedAgentId);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const tickMovement = useOfficeStore((s) => s.tickMovement);
  const theme = useOfficeStore((s) => s.theme);
  const [hovered, setHovered] = useState(false);
  const gRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const isSelected = selectedAgentId === agent.id;
  const r = isSelected ? AVATAR.selectedRadius : AVATAR.radius;
  const isPlaceholder = agent.isPlaceholder;
  const isUnconfirmed = !agent.confirmed;
  const isWalking = agent.movement !== null;
  const color = isPlaceholder || isUnconfirmed ? "#6b7280" : STATUS_COLORS[agent.status];
  const isDark = theme === "dark";
  const characterKey = getCharacterKey(agent.id, agent.name);
  const matrixStyle = getMatrixCharacter(characterKey);
  const codename = getCodename(agent.id, agent.name);
  const clipId = `avatar-clip-${agent.id}`;
  const groupOpacity = isPlaceholder ? 0.3 : isUnconfirmed ? 0.5 : 1;

  const displayCodename =
    codename.length > AVATAR.nameLabelMaxChars
      ? `${codename.slice(0, AVATAR.nameLabelMaxChars)}…`
      : codename;

  const isIdleZone = agent.zone === "lounge" || agent.zone === "chill";
  const showIdleAnim = isIdleZone && !isWalking && !isPlaceholder && agent.status === "idle";
  const idleBehavior = showIdleAnim ? getIdleBehavior(agent.id) : undefined;

  // Walk animation loop via requestAnimationFrame
  const agentIdRef = useRef(agent.id);
  agentIdRef.current = agent.id;

  const animate = useCallback(
    (time: number) => {
      if (!gRef.current) return;
      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
      lastTimeRef.current = time;

      tickMovement(agentIdRef.current, delta);

      const state = useOfficeStore.getState();
      const a = state.agents.get(agentIdRef.current);
      if (!a) return;

      // Walk bob effect
      let bobY = 0;
      let walkScale = 1;
      if (a.movement) {
        const p = a.movement.progress;
        const elapsed = (Date.now() - a.movement.startTime) / 1000;
        bobY = Math.sin(elapsed * WALK_BOB_FREQ * Math.PI * 2) * WALK_BOB_AMPLITUDE;

        // Stand-up effect at start
        if (p < 0.1) walkScale = 0.9 + p;
        // Sit-down effect at end
        else if (p > 0.9) {
          const t = (p - 0.9) / 0.1;
          walkScale = 1 - 0.05 * Math.sin(t * Math.PI);
        }
      }

      gRef.current.setAttribute(
        "transform",
        `translate(${a.position.x}, ${a.position.y + bobY}) scale(${walkScale})`,
      );

      if (a.movement) {
        rafRef.current = requestAnimationFrame(animate);
      }
    },
    [tickMovement],
  );

  useEffect(() => {
    if (isWalking) {
      lastTimeRef.current = 0;
      rafRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isWalking, animate]);

  return (
    <g
      ref={gRef}
      transform={`translate(${agent.position.x}, ${agent.position.y})`}
      style={{ cursor: isPlaceholder ? "default" : "pointer" }}
      opacity={groupOpacity}
      data-idle-behavior={idleBehavior}
      onClick={() => !isPlaceholder && selectAgent(agent.id)}
      onMouseEnter={() => !isPlaceholder && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Selected glow */}
      {isSelected && (
        <circle
          r={r + 8}
          fill={color}
          opacity={0.18}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      )}

      {/* Status ring with animation */}
      <StatusRing status={agent.status} r={r} color={color} isWalking={isWalking} isPlaceholder={isPlaceholder} />

      {/* Avatar face — Matrix themed */}
      <defs>
        <clipPath id={clipId}>
          <circle r={r - 2} />
        </clipPath>
      </defs>
      <circle r={r - 2} fill={isDark ? "#0a0f0a" : "#f8fafc"} />
      <g clipPath={`url(#${clipId})`}>
        <MatrixAvatarFace style={matrixStyle} size={r * 2 - 4} />
      </g>

      {/* Sub-agent badge */}
      {agent.isSubAgent && (
        <g transform={`translate(${r * 0.6}, ${r * 0.5})`}>
          <circle r={7} fill={isDark ? "#0a0f0a" : "#fff"} stroke={color} strokeWidth={1.2} />
          <text textAnchor="middle" dy="3.5" fontSize="9" fill={color} fontWeight="bold">
            S
          </text>
        </g>
      )}

      {/* Thinking indicator (three dots) */}
      {agent.status === "thinking" && <ThinkingDots r={r} />}

      {/* Error badge */}
      {agent.status === "error" && (
        <g transform={`translate(${r * 0.65}, ${-r * 0.65})`}>
          <circle r={7} fill="#ef4444" />
          <text textAnchor="middle" dy="4" fontSize="10" fill="#fff" fontWeight="bold">
            !
          </text>
        </g>
      )}

      {/* Speaking indicator */}
      {agent.status === "speaking" && <SpeakingIndicator r={r} />}

      {/* Tool name label */}
      {agent.status === "tool_calling" && agent.currentTool && (
        <foreignObject x={-50} y={r + 2} width={100} height={20} style={{ pointerEvents: "none" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 600,
                color: "#fff",
                backgroundColor: "#f97316",
                borderRadius: "4px",
                padding: "1px 6px",
                whiteSpace: "nowrap",
                maxWidth: "90px",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {agent.currentTool.name}
            </span>
          </div>
        </foreignObject>
      )}

      {/* Speech bubble — last action text */}
      {agent.speechBubble?.text && (
        <foreignObject
          x={-80}
          y={-r - 52}
          width={160}
          height={44}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              animation: "bubble-fade-in 0.3s ease-out",
            }}
          >
            <span
              style={{
                fontSize: "9px",
                fontWeight: 400,
                color: isDark ? "#00ff41" : "#166534",
                backgroundColor: isDark ? "rgba(0,10,0,0.85)" : "rgba(255,255,255,0.9)",
                backdropFilter: "blur(8px)",
                borderRadius: "8px",
                padding: "3px 8px",
                maxWidth: "150px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                border: `1px solid ${isDark ? "rgba(0,255,65,0.2)" : "rgba(0,0,0,0.08)"}`,
                boxShadow: isDark ? "0 2px 8px rgba(0,255,65,0.1)" : "0 2px 6px rgba(0,0,0,0.08)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {agent.speechBubble.text.length > 30
                ? `${agent.speechBubble.text.slice(0, 30)}…`
                : agent.speechBubble.text}
            </span>
          </div>
        </foreignObject>
      )}

      {/* Idle micro-animation prop icon */}
      {idleBehavior && <IdlePropIcon behavior={idleBehavior} r={r} />}

      {/* Codename + real name label */}
      <foreignObject
        x={-60}
        y={r + (agent.status === "tool_calling" && agent.currentTool ? 18 : 4)}
        width={120}
        height={34}
        style={{ pointerEvents: "none" }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span
            title={codename}
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: isDark ? "#00ff41" : "#166534",
              backgroundColor: isDark ? "rgba(10,15,10,0.8)" : "rgba(255,255,255,0.75)",
              backdropFilter: "blur(6px)",
              borderRadius: "6px 6px 0 0",
              padding: "1px 8px 0",
              whiteSpace: "nowrap",
              border: `1px solid ${isDark ? "rgba(0,255,65,0.15)" : "rgba(0,0,0,0.06)"}`,
              borderBottom: "none",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {displayCodename}
          </span>
          {codename !== agent.name && (
            <span
              style={{
                fontSize: "8px",
                fontWeight: 400,
                color: isDark ? "#4ade80" : "#475569",
                backgroundColor: isDark ? "rgba(10,15,10,0.8)" : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(6px)",
                borderRadius: "0 0 6px 6px",
                padding: "0 8px 1px",
                whiteSpace: "nowrap",
                border: `1px solid ${isDark ? "rgba(0,255,65,0.15)" : "rgba(0,0,0,0.06)"}`,
                borderTop: "none",
                opacity: 0.7,
              }}
            >
              {agent.name}
            </span>
          )}
        </div>
      </foreignObject>

      {/* Hover tooltip */}
      {hovered && (
        <foreignObject
          x={-80}
          y={-r - 38}
          width={160}
          height={32}
          style={{ pointerEvents: "none" }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 500,
                color: isDark ? "#00ff41" : "#374151",
                backgroundColor: isDark ? "rgba(10,15,10,0.9)" : "rgba(255,255,255,0.9)",
                backdropFilter: "blur(8px)",
                borderRadius: "8px",
                padding: "4px 10px",
                whiteSpace: "nowrap",
                boxShadow: isDark ? "0 4px 8px rgba(0,0,0,0.3)" : "0 4px 8px rgba(0,0,0,0.1)",
                border: `1px solid ${isDark ? "rgba(0,255,65,0.2)" : "rgba(0,0,0,0.06)"}`,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {codename} · {t(`agent.statusLabels.${agent.status}`)}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
});

/* --- Status ring with per-state animation --- */

function StatusRing({
  status,
  r,
  color,
  isWalking,
  isPlaceholder,
}: {
  status: AgentVisualStatus;
  r: number;
  color: string;
  isWalking: boolean;
  isPlaceholder: boolean;
}) {
  const animStyle = isWalking || isPlaceholder ? {} : getStatusRingAnimation(status);
  const dashArray = isWalking ? "4 3" : isPlaceholder ? "6 3" : undefined;
  const strokeColor = isWalking ? "#3b82f6" : color;
  return (
    <circle
      r={r}
      fill="none"
      stroke={strokeColor}
      strokeWidth={AVATAR.strokeWidth}
      strokeDasharray={dashArray}
      style={{
        transition: "stroke 300ms ease",
        ...animStyle,
      }}
    />
  );
}

function getStatusRingAnimation(status: AgentVisualStatus): React.CSSProperties {
  switch (status) {
    case "thinking":
      return { animation: "agent-pulse 1.5s ease-in-out infinite" };
    case "tool_calling":
      return { animation: "agent-pulse 2s ease-in-out infinite", strokeDasharray: "6 3" };
    case "speaking":
      return { animation: "agent-pulse 1s ease-in-out infinite" };
    case "error":
      return { animation: "agent-blink 0.8s ease-in-out infinite" };
    case "spawning":
      return { animation: "agent-spawn 0.5s ease-out forwards" };
    case "idle":
      return { animation: "agent-breathe 3s ease-in-out infinite" };
    default:
      return {};
  }
}

/* --- Thinking dots indicator --- */

function ThinkingDots({ r }: { r: number }) {
  return (
    <g transform={`translate(${r * 0.55}, ${-r * 0.7})`}>
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={i * 5}
          cy={0}
          r={2}
          fill="#00ff41"
          style={{
            animation: `thinking-dots 1.2s ease-in-out ${i * 0.15}s infinite`,
          }}
        />
      ))}
    </g>
  );
}

/* --- Speaking indicator --- */

function SpeakingIndicator({ r }: { r: number }) {
  return (
    <g transform={`translate(${r * 0.55}, ${-r * 0.75})`}>
      <circle r={7} fill="#00ff41" opacity={0.9}>
        <animate attributeName="r" values="6;8;6" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <g transform="translate(-4.5,-4.5) scale(0.45)">
        <path
          fill="#000"
          fillRule="evenodd"
          d="M3.43 2.524A41.29 41.29 0 0110 2c2.236 0 4.43.18 6.57.524 1.437.231 2.43 1.49 2.43 2.902v5.148c0 1.413-.993 2.67-2.43 2.902a41.102 41.102 0 01-3.55.414c-.28.02-.521.18-.643.413l-1.712 3.293a.75.75 0 01-1.33 0l-1.713-3.293a.783.783 0 00-.642-.413 41.108 41.108 0 01-3.55-.414C1.993 13.245 1 11.986 1 10.574V5.426c0-1.413.993-2.67 2.43-2.902z"
          clipRule="evenodd"
        />
      </g>
    </g>
  );
}

/* --- Matrix-themed Avatar Face --- */

function MatrixAvatarFace({ style: ms, size }: { style: MatrixCharacterStyle; size: number }) {
  const s = size / 2;
  const faceRx = s * 0.75;
  const faceRy = s * 0.85;
  const ey = -s * 0.05; // eye y position
  const gap = s * 0.28; // eye gap

  return (
    <g>
      {/* Body / outfit */}
      {ms.hasCoat ? (
        <>
          {/* Long trench coat */}
          <rect x={-s} y={s * 0.3} width={size} height={s * 1.4} fill={ms.coatColor} />
          {/* Coat collar / lapels */}
          <polygon
            points={`${-s * 0.4},${s * 0.3} 0,${s * 0.55} ${s * 0.4},${s * 0.3}`}
            fill={ms.innerColor}
          />
        </>
      ) : (
        <>
          {/* Simple outfit */}
          <rect x={-s} y={s * 0.35} width={size} height={s * 1.3} fill={ms.coatColor} />
          {/* Neckline */}
          <ellipse cx={0} cy={s * 0.38} rx={s * 0.3} ry={s * 0.12} fill={ms.innerColor} />
        </>
      )}

      {/* Face */}
      <ellipse cx={0} cy={-s * 0.05} rx={faceRx} ry={faceRy} fill={ms.skinColor} />

      {/* Hair */}
      <MatrixHair hairStyle={ms.hairStyle} color={ms.hairColor} s={s} faceRx={faceRx} />

      {/* Eyes / Glasses */}
      {ms.glasses !== "none" ? (
        <MatrixGlasses type={ms.glasses} color={ms.glassesColor} ey={ey} gap={gap} s={s} />
      ) : (
        <g>
          <circle cx={-gap} cy={ey} r={1.8} fill="#1a1a0a" />
          <circle cx={gap} cy={ey} r={1.8} fill="#1a1a0a" />
        </g>
      )}
    </g>
  );
}

function MatrixHair({
  hairStyle,
  color,
  s,
  faceRx,
}: {
  hairStyle: MatrixCharacterStyle["hairStyle"];
  color: string;
  s: number;
  faceRx: number;
}) {
  switch (hairStyle) {
    case "bald":
      return <ellipse cx={0} cy={-s * 0.5} rx={faceRx * 0.85} ry={s * 0.3} fill={color} opacity={0.3} />;
    case "short":
      return <ellipse cx={0} cy={-s * 0.55} rx={faceRx * 0.95} ry={s * 0.45} fill={color} />;
    case "slicked":
      return (
        <g>
          <ellipse cx={0} cy={-s * 0.55} rx={faceRx * 0.95} ry={s * 0.45} fill={color} />
          {/* Slicked back shine */}
          <ellipse cx={s * 0.15} cy={-s * 0.65} rx={faceRx * 0.3} ry={s * 0.15} fill={color} opacity={0.6} />
        </g>
      );
    case "braided":
      return (
        <g>
          <ellipse cx={0} cy={-s * 0.55} rx={faceRx * 0.9} ry={s * 0.4} fill={color} />
          {/* Braids hanging down sides */}
          <rect x={-faceRx * 0.85} y={-s * 0.3} width={s * 0.15} height={s * 0.7} rx={2} fill={color} />
          <rect x={faceRx * 0.7} y={-s * 0.3} width={s * 0.15} height={s * 0.7} rx={2} fill={color} />
        </g>
      );
    case "long":
      return (
        <g>
          <ellipse cx={0} cy={-s * 0.55} rx={faceRx} ry={s * 0.5} fill={color} />
          <rect x={-faceRx * 0.9} y={-s * 0.3} width={s * 0.2} height={s * 0.8} rx={3} fill={color} />
          <rect x={faceRx * 0.7} y={-s * 0.3} width={s * 0.2} height={s * 0.8} rx={3} fill={color} />
        </g>
      );
    case "buzz":
      return <ellipse cx={0} cy={-s * 0.45} rx={faceRx * 0.85} ry={s * 0.35} fill={color} opacity={0.7} />;
    default:
      return null;
  }
}

function MatrixGlasses({
  type,
  color,
  ey,
  gap,
  s,
}: {
  type: MatrixCharacterStyle["glasses"];
  color: string;
  ey: number;
  gap: number;
  s: number;
}) {
  switch (type) {
    case "round":
      return (
        <g>
          <circle cx={-gap} cy={ey} r={s * 0.2} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <circle cx={gap} cy={ey} r={s * 0.2} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <line x1={-gap + s * 0.2} y1={ey} x2={gap - s * 0.2} y2={ey} stroke="#0a0a0a" strokeWidth={0.8} />
          {/* Lens reflection */}
          <circle cx={-gap + 1} cy={ey - 1} r={s * 0.06} fill="#00ff41" opacity={0.3} />
          <circle cx={gap + 1} cy={ey - 1} r={s * 0.06} fill="#00ff41" opacity={0.3} />
        </g>
      );
    case "narrow":
      return (
        <g>
          <rect x={-gap - s * 0.2} y={ey - s * 0.08} width={s * 0.4} height={s * 0.16} rx={2} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <rect x={gap - s * 0.2} y={ey - s * 0.08} width={s * 0.4} height={s * 0.16} rx={2} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <line x1={-gap + s * 0.2} y1={ey} x2={gap - s * 0.2} y2={ey} stroke="#0a0a0a" strokeWidth={0.8} />
          <rect x={-gap - s * 0.15} y={ey - s * 0.04} width={s * 0.1} height={s * 0.04} rx={1} fill="#00ff41" opacity={0.25} />
        </g>
      );
    case "sleek":
      return (
        <g>
          <ellipse cx={-gap} cy={ey} rx={s * 0.22} ry={s * 0.1} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <ellipse cx={gap} cy={ey} rx={s * 0.22} ry={s * 0.1} fill={color} stroke="#0a0a0a" strokeWidth={0.5} />
          <line x1={-gap + s * 0.22} y1={ey} x2={gap - s * 0.22} y2={ey} stroke="#0a0a0a" strokeWidth={0.8} />
          <ellipse cx={-gap} cy={ey - 1} rx={s * 0.08} ry={s * 0.03} fill="#00ff41" opacity={0.3} />
        </g>
      );
    case "green-tint":
      return (
        <g>
          <rect x={-gap - s * 0.18} y={ey - s * 0.12} width={s * 0.36} height={s * 0.24} rx={3} fill={color} stroke="#0a0a0a" strokeWidth={0.5} opacity={0.8} />
          <rect x={gap - s * 0.18} y={ey - s * 0.12} width={s * 0.36} height={s * 0.24} rx={3} fill={color} stroke="#0a0a0a" strokeWidth={0.5} opacity={0.8} />
          <line x1={-gap + s * 0.18} y1={ey} x2={gap - s * 0.18} y2={ey} stroke="#0a0a0a" strokeWidth={0.8} />
          {/* Green tint glow */}
          <rect x={-gap - s * 0.12} y={ey - s * 0.06} width={s * 0.24} height={s * 0.12} rx={2} fill="#00ff41" opacity={0.15} />
          <rect x={gap - s * 0.12} y={ey - s * 0.06} width={s * 0.24} height={s * 0.12} rx={2} fill="#00ff41" opacity={0.15} />
        </g>
      );
    default:
      return null;
  }
}

/* --- Idle prop icon for lounge/chill micro-animations --- */

function IdlePropIcon({ behavior, r }: { behavior: IdleBehavior; r: number }) {
  const x = -r * 0.75;
  const y = r * 0.3;

  switch (behavior) {
    case "reading":
      return (
        <g className="idle-prop" transform={`translate(${x}, ${y})`}>
          <rect x={-4} y={-3} width={8} height={6} rx={1} fill="#a78bfa" opacity={0.8} />
          <line x1={-2} y1={-1} x2={2} y2={-1} stroke="#fff" strokeWidth={0.5} opacity={0.6} />
          <line x1={-2} y1={1} x2={2} y2={1} stroke="#fff" strokeWidth={0.5} opacity={0.6} />
        </g>
      );
    case "sipping":
      return (
        <g className="idle-prop" transform={`translate(${x}, ${y})`}>
          <rect x={-3} y={-2} width={6} height={5} rx={1} fill="#d97706" opacity={0.8} />
          <rect x={-2} y={-3} width={4} height={1.5} rx={0.5} fill="#fbbf24" opacity={0.5} />
        </g>
      );
    case "typing":
      return (
        <g className="idle-prop" transform={`translate(${x}, ${y})`}>
          {[0, 1, 2].map((i) => (
            <rect key={i} x={-3 + i * 2.5} y={0} width={1.5} height={2} rx={0.3} fill="#6ee7b7" opacity={0.7} />
          ))}
        </g>
      );
    default:
      // stretching and leaning use whole-group animation, no prop icon needed
      return null;
  }
}
