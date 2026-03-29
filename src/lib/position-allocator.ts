import {
  ZONES,
  SCALE_X_2D_TO_3D,
  SCALE_Z_2D_TO_3D,
  MEETING_SEAT_RADIUS,
} from "./constants";

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash + ch) | 0;
  }
  return Math.abs(hash);
}

/**
 * Allocate a position for an agent in the lounge zone.
 * All agents (main and sub) start in the lounge.
 */
export function allocatePosition(
  agentId: string,
  _isSubAgent: boolean,
  occupied: Set<string>,
): { x: number; y: number } {
  const positions = calculateLoungePositions(12);
  const hash = hashString(agentId);
  const startIdx = hash % positions.length;

  for (let i = 0; i < positions.length; i++) {
    const idx = (startIdx + i) % positions.length;
    const pos = positions[idx];
    if (!occupied.has(posKey(pos))) {
      return pos;
    }
  }

  // All full — offset slightly
  const lz = ZONES.lounge;
  return {
    x: lz.x + 30 + (hash % (lz.width - 60)),
    y: lz.y + 30 + (hash % (lz.height - 60)),
  };
}

function posKey(pos: { x: number; y: number }): string {
  return `${pos.x},${pos.y}`;
}

/** Allocate equi-angular positions around a meeting table center */
export function allocateMeetingPositions(
  agentIds: string[],
  tableCenter: { x: number; y: number },
): Array<{ x: number; y: number }> {
  const count = agentIds.length;
  if (count === 0) {
    return [];
  }

  return agentIds.map((_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: Math.round(tableCenter.x + (Math.cos(angle) * MEETING_SEAT_RADIUS) / SCALE_X_2D_TO_3D),
      y: Math.round(tableCenter.y + (Math.sin(angle) * MEETING_SEAT_RADIUS) / SCALE_Z_2D_TO_3D),
    };
  });
}

/**
 * Pre-defined anchor points in the lounge zone for idle agents.
 * Positioned near sofas and coffee tables, avoiding overlap with decorative elements.
 */
export function calculateLoungePositions(maxCount: number): Array<{ x: number; y: number }> {
  const lz = ZONES.lounge;
  const w = lz.width;
  const h = lz.height;
  const anchors = [
    { x: lz.x + w * 0.15, y: lz.y + h * 0.13 },
    { x: lz.x + w * 0.38, y: lz.y + h * 0.13 },
    { x: lz.x + w * 0.62, y: lz.y + h * 0.13 },
    { x: lz.x + w * 0.85, y: lz.y + h * 0.13 },
    { x: lz.x + w * 0.15, y: lz.y + h * 0.40 },
    { x: lz.x + w * 0.38, y: lz.y + h * 0.40 },
    { x: lz.x + w * 0.62, y: lz.y + h * 0.40 },
    { x: lz.x + w * 0.85, y: lz.y + h * 0.40 },
    { x: lz.x + w * 0.25, y: lz.y + h * 0.65 },
    { x: lz.x + w * 0.75, y: lz.y + h * 0.65 },
    { x: lz.x + w * 0.25, y: lz.y + h * 0.85 },
    { x: lz.x + w * 0.75, y: lz.y + h * 0.85 },
  ];
  return anchors.slice(0, Math.min(maxCount, anchors.length));
}

/**
 * Calculate scattered positions within the chill/rooftop zone.
 */
export function calculateChillPositions(maxCount: number): Array<{ x: number; y: number }> {
  const cz = ZONES.chill;
  const w = cz.width;
  const h = cz.height;
  const anchors = [
    { x: cz.x + w * 0.25, y: cz.y + h * 0.2 },
    { x: cz.x + w * 0.75, y: cz.y + h * 0.2 },
    { x: cz.x + w * 0.3, y: cz.y + h * 0.5 },
    { x: cz.x + w * 0.7, y: cz.y + h * 0.5 },
    { x: cz.x + w * 0.25, y: cz.y + h * 0.8 },
    { x: cz.x + w * 0.75, y: cz.y + h * 0.8 },
  ];
  return anchors.slice(0, Math.min(maxCount, anchors.length));
}

/** Meeting-zone seat positions (SVG coords, circular layout) */
export function calculateMeetingSeatsSvg(
  agentCount: number,
  tableCenter: { x: number; y: number },
  seatRadius: number,
): Array<{ x: number; y: number }> {
  if (agentCount === 0) {
    return [];
  }
  return Array.from({ length: agentCount }, (_, i) => {
    const angle = (2 * Math.PI * i) / agentCount - Math.PI / 2;
    return {
      x: Math.round(tableCenter.x + Math.cos(angle) * seatRadius),
      y: Math.round(tableCenter.y + Math.sin(angle) * seatRadius),
    };
  });
}

/**
 * Cluster positions for collaborating agents around a meeting table.
 * Agents on the same task sit close together.
 */
/**
 * Calculate positions for desk agents.
 */
export function calculateDeskSlots(zone: { x: number; y: number; width: number; height: number }, _occupiedCount: number, maxCount: number): Array<{ unitX: number; unitY: number }> {
  const slots: Array<{ unitX: number; unitY: number }> = [];
  const spacingX = 100; // Horizontal spacing between desks
  const spacingY = 100; // Vertical spacing between desks
  const startX = zone.x + 50; // Offset from zone edge
  const startY = zone.y + 50; // Offset from zone edge

  let currentX = startX;
  let currentY = startY;

  for (let i = 0; i < maxCount; i++) {
    slots.push({ unitX: currentX, unitY: currentY });
    currentX += spacingX;
    if (currentX + 50 > zone.x + zone.width) { // Check if next desk would exceed zone width
      currentX = startX;
      currentY += spacingY;
      if (currentY + 50 > zone.y + zone.height) { // Check if next row would exceed zone height
        break; // No more space in the zone
      }
    }
  }
  return slots;
}

export function calculateMeetingClusterPositions(
  agentIds: string[],
  tableCenter: { x: number; y: number },
  clusterRadius: number,
): Array<{ x: number; y: number }> {
  const count = agentIds.length;
  if (count === 0) return [];
  if (count === 1) return [{ ...tableCenter }];

  return agentIds.map((_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: Math.round(tableCenter.x + Math.cos(angle) * clusterRadius),
      y: Math.round(tableCenter.y + Math.sin(angle) * clusterRadius),
    };
  });
}
