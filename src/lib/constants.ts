import type { AgentVisualStatus } from "@/gateway/types";
import i18n from "@/i18n";

export const SVG_WIDTH = 1200;
export const SVG_HEIGHT = 700;

// Unified office floor plan: one building shell with internal partitions
export const OFFICE = {
  x: 30,
  y: 20,
  width: SVG_WIDTH - 60,
  height: SVG_HEIGHT - 40,
  wallThickness: 6,
  cornerRadius: 18,
  corridorWidth: 28,
} as const;

// 5-zone layout: meeting (top), desk (mid-left), hotDesk (mid-right), lounge (bottom-left), chill (bottom-right)
const meetingH = Math.round((OFFICE.height - OFFICE.corridorWidth) * 0.3); // 30% for meeting
const deskHotdeskH = Math.round((OFFICE.height - OFFICE.corridorWidth) * 0.2); // 20% for desk/hotDesk
const bottomH = OFFICE.height - OFFICE.corridorWidth - meetingH - deskHotdeskH; // Remaining for lounge/chill

const meetingY = OFFICE.y;
const deskHotdeskY = OFFICE.y + meetingH;
const corridorY = OFFICE.y + meetingH + deskHotdeskH;
const bottomY = corridorY + OFFICE.corridorWidth;

const deskW = Math.round(OFFICE.width * 0.5);
const hotDeskW = OFFICE.width - deskW;
const loungeW = Math.round(OFFICE.width * 0.6);
const chillW = OFFICE.width - loungeW;

export const ZONES = {
  meeting: { x: OFFICE.x, y: meetingY, width: OFFICE.width, height: meetingH, label: "会议室" },
  desk: { x: OFFICE.x, y: deskHotdeskY, width: deskW, height: deskHotdeskH, label: "工位区" },
  hotDesk: { x: OFFICE.x + deskW, y: deskHotdeskY, width: hotDeskW, height: deskHotdeskH, label: "热区工位" },
  lounge: { x: OFFICE.x, y: bottomY, width: loungeW, height: bottomH, label: "休息区" },
  chill: { x: OFFICE.x + loungeW, y: bottomY, width: chillW, height: bottomH, label: "The Rooftop" },
} as const;

// Corridor entrance point: bottom center of lounge (main entrance door)
export const CORRIDOR_ENTRANCE = {
  x: ZONES.lounge.x + ZONES.lounge.width / 2,
  y: OFFICE.y + OFFICE.height - 30,
} as const;

// Corridor center crossing point (horizontal corridor between top and bottom zones)
export const CORRIDOR_CENTER = {
  x: OFFICE.x + OFFICE.width / 2,
  y: OFFICE.y + meetingH + deskHotdeskH + OFFICE.corridorWidth / 2,
} as const;

export const ZONE_COLORS = {
  meeting: "#fef3c7", // warm amber
  lounge: "#ede9fe", // lavender
  chill: "#ccfbf1", // teal
  corridor: "#e8ecf1",
  wall: "#8b9bb0",
} as const;

export const ZONE_COLORS_DARK = {
  meeting: "#1a1500",
  lounge: "#0d0a1a",
  chill: "#051a15",
  corridor: "#000d00",
  wall: "#0a3d0a",
} as const;

export const STATUS_COLORS: Record<AgentVisualStatus, string> = {
  idle: "#22c55e",
  thinking: "#3b82f6",
  tool_calling: "#f97316",
  speaking: "#a855f7",
  spawning: "#06b6d4",
  error: "#ef4444",
  offline: "#6b7280",
};

export const STATUS_LABELS: Record<AgentVisualStatus, string> = {
  idle: "空闲",
  thinking: "思考中",
  tool_calling: "工具调用",
  speaking: "回复中",
  spawning: "创建中",
  error: "错误",
  offline: "离线",
};

export function getZoneLabel(zone: keyof typeof ZONES): string {
  return i18n.t(`common:zones.${zone}`);
}

export function getStatusLabel(status: AgentVisualStatus): string {
  return i18n.t(`common:agent.statusLabels.${status}`);
}

export const AGENT_COLORS: Record<string, string> = {
  morpheus: "#00ff41",
  neo: "#00cc33",
  trinity: "#00aa44",
  tank: "#009933",
  oracle: "#33ff66",
  link: "#00ffaa",
  niobe: "#66ff99",
  jack: "#00cc33",
  scout: "#00aa44",
  sentinel: "#009933",
  kat: "#66ff99",
};

export const DEFAULT_MAX_SUB_AGENTS = 8;

// 家具尺寸常量 (flat isometric 2D)
export const FURNITURE = {
  chair: { size: 30 },
  meetingTable: { minRadius: 60, maxRadius: 100 },
  sofa: { width: 110, height: 50 },
  plant: { width: 28, height: 36 },
  coffeeCup: { size: 14 },
} as const;

// Agent 头像
export const AVATAR = {
  radius: 20,
  selectedRadius: 24,
  strokeWidth: 3,
  nameLabelMaxChars: 12,
} as const;

// 3D 场景常量
// SVG 1200×700 maps to 3D building 16×12 world units
export const SCALE_X_2D_TO_3D = 16 / SVG_WIDTH;
export const SCALE_Z_2D_TO_3D = 12 / SVG_HEIGHT;
export const SCALE_2D_TO_3D = 0.01; // legacy — kept for tests
export const DESK_HEIGHT = 0.42;
export const CHARACTER_Y = 0;
export const MEETING_TABLE_RADIUS = 1.2;
export const MEETING_SEAT_RADIUS = 1.7;
