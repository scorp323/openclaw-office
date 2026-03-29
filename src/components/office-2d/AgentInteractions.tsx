/**
 * Agent Interactions — celebration, beam-in, fade-out, and huddle effects.
 * Rendered as SVG overlays inside FloorPlan.
 */
import { useEffect, useRef, useState, memo } from "react";
import type { VisualAgent } from "@/gateway/types";

/* ── Celebration particles (green confetti burst on task completion) ── */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
}

function createBurst(cx: number, cy: number, count = 12): Particle[] {
  const colors = ["#00ff41", "#4ade80", "#22d3ee", "#a78bfa", "#fbbf24"];
  return Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 60;
    return {
      x: cx,
      y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 30,
      size: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
    };
  });
}

export const CelebrationEffect = memo(function CelebrationEffect({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  const [particles, setParticles] = useState(() => createBurst(x, y));
  const rafRef = useRef(0);
  const lastRef = useRef(performance.now());

  useEffect(() => {
    const animate = (now: number) => {
      const dt = Math.min((now - lastRef.current) / 1000, 0.05);
      lastRef.current = now;

      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx * dt,
            y: p.y + p.vy * dt,
            vy: p.vy + 120 * dt, // gravity
            life: p.life - dt * 1.2,
          }))
          .filter((p) => p.life > 0);

        if (next.length === 0) {
          onDone();
          return [];
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [onDone]);

  return (
    <g>
      {particles.map((p, i) => (
        <rect
          key={i}
          x={p.x - p.size / 2}
          y={p.y - p.size / 2}
          width={p.size}
          height={p.size}
          rx={1}
          fill={p.color}
          opacity={p.life}
          transform={`rotate(${p.life * 360}, ${p.x}, ${p.y})`}
        />
      ))}
      {/* Green flash ring */}
      <circle cx={x} cy={y} r={30} fill="none" stroke="#00ff41" strokeWidth={2} opacity={particles.length > 0 ? particles[0].life * 0.5 : 0}>
        <animate attributeName="r" from="10" to="50" dur="0.6s" fill="freeze" />
      </circle>
    </g>
  );
});

/* ── Beam-in effect (spawning agent) ── */

export const BeamInEffect = memo(function BeamInEffect({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <g>
      {/* Vertical beam */}
      <line x1={x} y1={y - 80} x2={x} y2={y} stroke="#00ff41" strokeWidth={3} opacity={0.8}>
        <animate attributeName="opacity" values="0.8;0.2;0" dur="0.8s" fill="freeze" />
        <animate attributeName="stroke-width" values="6;2;0" dur="0.8s" fill="freeze" />
      </line>
      {/* Ripple rings */}
      {[0, 1, 2].map((i) => (
        <circle key={i} cx={x} cy={y} fill="none" stroke="#00ff41" strokeWidth={1} opacity={0}>
          <animate attributeName="r" from="5" to="35" dur="0.6s" begin={`${i * 0.15}s`} fill="freeze" />
          <animate attributeName="opacity" values="0;0.6;0" dur="0.6s" begin={`${i * 0.15}s`} fill="freeze" />
        </circle>
      ))}
      {/* Spawn particles */}
      {Array.from({ length: 6 }, (_, i) => {
        const angle = (i / 6) * Math.PI * 2;
        return (
          <circle
            key={`sp-${i}`}
            cx={x}
            cy={y}
            r={2}
            fill="#4ade80"
          >
            <animate attributeName="cx" from={String(x)} to={String(x + Math.cos(angle) * 25)} dur="0.5s" fill="freeze" />
            <animate attributeName="cy" from={String(y)} to={String(y + Math.sin(angle) * 25)} dur="0.5s" fill="freeze" />
            <animate attributeName="opacity" values="1;0" dur="0.5s" fill="freeze" />
          </circle>
        );
      })}
    </g>
  );
});

/* ── Fade-out effect (agent going offline) ── */

export const FadeOutEffect = memo(function FadeOutEffect({
  x,
  y,
  name,
  onDone,
}: {
  x: number;
  y: number;
  name: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, 1500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <g opacity={1}>
      <animate attributeName="opacity" values="1;0" dur="1.5s" fill="freeze" />
      {/* Ghost outline */}
      <circle cx={x} cy={y} r={18} fill="none" stroke="#6b7280" strokeWidth={1.5} strokeDasharray="3 2">
        <animate attributeName="r" from="18" to="30" dur="1.5s" fill="freeze" />
      </circle>
      {/* "Logging off" speech bubble */}
      <foreignObject x={x - 50} y={y - 45} width={100} height={30} style={{ pointerEvents: "none" }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <span
            style={{
              fontSize: "8px",
              color: "#9ca3af",
              backgroundColor: "rgba(10,15,10,0.8)",
              borderRadius: "6px",
              padding: "2px 6px",
              border: "1px solid rgba(107,114,128,0.3)",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {name} logging off...
          </span>
        </div>
      </foreignObject>
    </g>
  );
});

/* ── Huddle offset calculator — agents with links move closer ── */

export function getHuddleOffset(
  agent: VisualAgent,
  allAgents: VisualAgent[],
  links: Array<{ source: string; target: string }>,
): { dx: number; dy: number } {
  // Find agents this one is linked to
  const linkedIds = links
    .filter((l) => l.source === agent.id || l.target === agent.id)
    .map((l) => (l.source === agent.id ? l.target : l.source));

  if (linkedIds.length === 0) return { dx: 0, dy: 0 };

  // Calculate center of linked agents
  let cx = 0;
  let cy = 0;
  let count = 0;
  for (const id of linkedIds) {
    const linked = allAgents.find((a) => a.id === id);
    if (linked) {
      cx += linked.position.x;
      cy += linked.position.y;
      count++;
    }
  }

  if (count === 0) return { dx: 0, dy: 0 };

  cx /= count;
  cy /= count;

  // Move 15% toward the center of linked agents
  const dx = (cx - agent.position.x) * 0.15;
  const dy = (cy - agent.position.y) * 0.15;

  return { dx, dy };
}
