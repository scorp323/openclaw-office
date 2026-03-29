import { OFFICE, ZONES, CORRIDOR_ENTRANCE } from "./constants";
import type { AgentZone } from "@/gateway/types";

export const WALK_SPEED_SVG = 120;
export const MIN_WALK_DURATION = 1.5;

const corridorW = OFFICE.corridorWidth;
// Horizontal corridor sits between meeting (top) and lounge/chill (bottom)
const corridorY = ZONES.meeting.y + ZONES.meeting.height + corridorW / 2;

const corridorCenter = {
  x: OFFICE.x + OFFICE.width / 2,
  y: corridorY,
};

/**
 * Door points: where each zone connects to the corridor.
 * Meeting zone: bottom edge center
 * Lounge zone: top edge center
 * Chill zone: top edge center
 */
const DOOR_POINTS: Record<AgentZone, { x: number; y: number }> = {
  meeting: {
    x: ZONES.meeting.x + ZONES.meeting.width / 2,
    y: corridorY,
  },
  lounge: {
    x: ZONES.lounge.x + ZONES.lounge.width / 2,
    y: corridorY,
  },
  chill: {
    x: ZONES.chill.x + ZONES.chill.width / 2,
    y: corridorY,
  },
  corridor: { ...CORRIDOR_ENTRANCE },
};

function getZoneDoorPoint(zone: AgentZone): { x: number; y: number } {
  return { ...DOOR_POINTS[zone] };
}

function sameCorridorArm(a: AgentZone, b: AgentZone): boolean {
  if (a === "corridor" || b === "corridor") return false;
  // meeting is top, lounge+chill are bottom — meeting↔lounge and meeting↔chill go through corridor
  // lounge↔chill are adjacent on the same horizontal corridor
  const bottom: AgentZone[] = ["lounge", "chill"];
  if (bottom.includes(a) && bottom.includes(b)) return true;
  return false;
}

/**
 * Generate a waypoint path from `from` to `to` through the office corridor.
 * Path goes: from → fromDoor → (corridor waypoints) → toDoor → to
 */
export function planWalkPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromZone: AgentZone,
  toZone: AgentZone,
): Array<{ x: number; y: number }> {
  if (fromZone === toZone) {
    return [{ ...from }, { ...to }];
  }

  const fromDoor = getZoneDoorPoint(fromZone);
  const toDoor = getZoneDoorPoint(toZone);

  if (sameCorridorArm(fromZone, toZone)) {
    return [{ ...from }, fromDoor, toDoor, { ...to }];
  }

  // Different arms → go through corridor center
  return [{ ...from }, fromDoor, { ...corridorCenter }, toDoor, { ...to }];
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Total length of a polyline path */
export function pathLength(path: Array<{ x: number; y: number }>): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) {
    len += distance(path[i - 1], path[i]);
  }
  return len;
}

/** Calculate walk duration based on path length and speed, with minimum duration guarantee */
export function calculateWalkDuration(path: Array<{ x: number; y: number }>): number {
  const len = pathLength(path);
  const naturalDuration = len / WALK_SPEED_SVG;
  return Math.max(naturalDuration, MIN_WALK_DURATION);
}

/**
 * Interpolate a position along a polyline path given progress [0, 1].
 * Progress is distance-proportional (not segment-proportional).
 */
export function interpolatePathPosition(
  path: Array<{ x: number; y: number }>,
  progress: number,
): { x: number; y: number } {
  if (path.length === 0) return { x: 0, y: 0 };
  if (progress <= 0) return { ...path[0] };
  if (progress >= 1) return { ...path[path.length - 1] };

  const totalLen = pathLength(path);
  if (totalLen === 0) return { ...path[0] };

  const targetDist = progress * totalLen;
  let accumulated = 0;

  for (let i = 1; i < path.length; i++) {
    const segLen = distance(path[i - 1], path[i]);
    if (accumulated + segLen >= targetDist) {
      const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
      return {
        x: path[i - 1].x + (path[i].x - path[i - 1].x) * segProgress,
        y: path[i - 1].y + (path[i].y - path[i - 1].y) * segProgress,
      };
    }
    accumulated += segLen;
  }

  return { ...path[path.length - 1] };
}

// Re-export for tests
export { corridorCenter, getZoneDoorPoint, DOOR_POINTS };
