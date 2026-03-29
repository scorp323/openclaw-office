import React, { useMemo, useCallback, useRef, useState } from "react";
import type { VisualAgent } from "@/gateway/types";
import { useTranslation } from "react-i18next";
import { useLiveData } from "@/hooks/useLiveData";
import { useRealAgentSync } from "@/hooks/useRealAgentSync";
import { useResponsive } from "@/hooks/useResponsive";
import {
  SVG_WIDTH,
  SVG_HEIGHT,
  OFFICE,
  ZONES,
  ZONE_COLORS,
  ZONE_COLORS_DARK,
} from "@/lib/constants";
import { calculateMeetingSeatsSvg } from "@/lib/position-allocator";
import { useOfficeStore } from "@/store/office-store";
import { useAmbientSounds } from "@/hooks/useAmbientSounds";
import { useAgentDragDrop, clientToSvg } from "@/hooks/useAgentDragDrop";
import { exportSvgAsPng } from "@/lib/export-utils";
import { AgentAvatar } from "./AgentAvatar";
import { SvgAvatar } from "@/components/shared/SvgAvatar";
import { ConnectionLine } from "./ConnectionLine";
import { MeetingTable, Sofa, Plant, CoffeeCup, Chair } from "./furniture";
import { HeatmapFloor } from "./HeatmapFloor";
import { MatrixRain } from "./MatrixRain";
import { TimeAmbiance } from "./TimeAmbiance";
import { ZoneLabel } from "./ZoneLabel";

type ZoneKey = keyof typeof ZONES;


export function FloorPlan() {
  // Fetch agents from MC API so the office view works independently
  const { agents: realAgents } = useLiveData(30000);
  useRealAgentSync(realAgents);
  useAmbientSounds();
  const { isMobile } = useResponsive();
  const svgRef = useRef<SVGSVGElement>(null);

  const agents = useOfficeStore((s) => s.agents);
  const links = useOfficeStore((s) => s.links);
  const theme = useOfficeStore((s) => s.theme);
  const selectAgent = useOfficeStore((s) => s.selectAgent);
  const [forceSvgOnMobile, setForceSvgOnMobile] = useState(false);

  const {
    dragAgentId,
    dropPreview,
    hasCustomPositions,
    getCustomPosition,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    resetAllPositions,
  } = useAgentDragDrop();

  const handleExportPng = useCallback(() => {
    if (svgRef.current) exportSvgAsPng(svgRef.current, "office-floor-plan.png");
  }, []);

  const handlePointerDown = useCallback(
    (agentId: string, agentPos: { x: number; y: number }, e: React.PointerEvent) => {
      if (!svgRef.current) return;
      e.preventDefault();
      const svgPos = clientToSvg(svgRef.current, e.clientX, e.clientY);
      startDrag(agentId, agentPos, svgPos);
    },
    [startDrag],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragAgentId || !svgRef.current) return;
      const svgPos = clientToSvg(svgRef.current, e.clientX, e.clientY);
      updateDrag(svgPos);
    },
    [dragAgentId, updateDrag],
  );

  const handlePointerUp = useCallback(() => {
    if (dragAgentId) endDrag();
  }, [dragAgentId, endDrag]);

  const agentList = Array.from(agents.values());
  const isDark = theme === "dark";
  const colors = isDark ? ZONE_COLORS_DARK : ZONE_COLORS;

  const loungeAgents = useMemo(
    () => agentList.filter((a) => a.zone === "lounge" && !a.movement && !a.isPlaceholder),
    [agentList],
  );
  const meetingAgents = useMemo(
    () => agentList.filter((a) => a.zone === "meeting" && !a.movement && !a.isPlaceholder),
    [agentList],
  );
  const walkingAgents = useMemo(
    () => agentList.filter((a) => a.movement !== null && !a.isPlaceholder),
    [agentList],
  );
  const chillAgents = useMemo(
    () => agentList.filter((a) => a.zone === "chill" && !a.movement && !a.isPlaceholder),
    [agentList],
  );
  const corridorAgents = useMemo(
    () => agentList.filter((a) => a.zone === "corridor" && !a.movement && !a.isPlaceholder),
    [agentList],
  );

  const meetingCenter = {
    x: ZONES.meeting.x + ZONES.meeting.width / 2,
    y: ZONES.meeting.y + ZONES.meeting.height / 2,
  };

  const meetingTableRadius = Math.min(
    60 + meetingAgents.length * 8,
    Math.min(ZONES.meeting.width, ZONES.meeting.height) / 2 - 40,
  );

  const meetingSeats = useMemo(
    () => calculateMeetingSeatsSvg(meetingAgents.length, meetingCenter, meetingTableRadius + 36),
    [meetingAgents.length, meetingCenter.x, meetingCenter.y, meetingTableRadius],
  );

  const activeCount = agentList.filter((a) => a.status !== "idle" && a.status !== "offline" && !a.isPlaceholder).length;
  const totalCount = agentList.filter((a) => !a.isPlaceholder).length;
  // MatrixRain: very subtle background texture — NOT a visibility blocker
  // Keep max at 0.08 so the floor plan and agents are always clearly readable
  const rainOpacity = totalCount > 0
    ? Math.min(0.08, 0.03 + (activeCount / totalCount) * 0.05)
    : 0.03;

  // Mobile: show the SVG floor plan in a scrollable/zoomable container
  // (removed card list fallback — the 2D office IS the feature)

  /** Apply custom position override for an agent (from drag-drop) */
  const applyCustomPos = useCallback(
    (agent: VisualAgent): VisualAgent => {
      // If this agent is being dragged, show at drop preview position
      if (dragAgentId === agent.id && dropPreview) {
        return { ...agent, position: dropPreview };
      }
      const custom = getCustomPosition(agent.id);
      if (custom) return { ...agent, position: custom };
      return agent;
    },
    [dragAgentId, dropPreview, getCustomPosition],
  );

  return (
    <div className="relative flex h-full w-full flex-col bg-gray-100 dark:bg-black">
      {isMobile && !forceSvgOnMobile ? (
        <MobileOfficeCards
          agents={agentList.filter((a) => !a.isPlaceholder)}
          onSelectAgent={selectAgent}
          onShowMap={() => setForceSvgOnMobile(true)}
          isDark={isDark}
        />
      ) : (
      <div className="relative min-h-0 flex-1 overflow-auto">
        <MatrixRain opacity={rainOpacity} />
        <OfficeStatusOverlay activeCount={activeCount} totalCount={totalCount} isDark={isDark} />
        {/* Toolbar: export + reset buttons */}
        <div className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2">
          <button
            onClick={handleExportPng}
            title="Export as PNG"
            className="pointer-events-auto flex h-7 w-7 items-center justify-center rounded-md border border-gray-300 bg-white/80 text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-100 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.6)] dark:text-[#00ff41] dark:hover:bg-[rgba(0,255,65,0.1)]"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          {hasCustomPositions && (
            <button
              onClick={resetAllPositions}
              title="Reset agent layout"
              className="pointer-events-auto flex h-7 items-center gap-1 rounded-md border border-gray-300 bg-white/80 px-2 text-[10px] font-medium text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-100 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.6)] dark:text-[#00ff41] dark:hover:bg-[rgba(0,255,65,0.1)]"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" />
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
              </svg>
              Reset Layout
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setForceSvgOnMobile(false)}
              title="Switch to card view"
              className="pointer-events-auto flex h-7 items-center gap-1 rounded-md border border-gray-300 bg-white/80 px-2 text-[10px] font-medium text-gray-600 backdrop-blur-sm transition-colors hover:bg-gray-100 dark:border-[rgba(0,255,65,0.2)] dark:bg-[rgba(0,0,0,0.6)] dark:text-[#00ff41] dark:hover:bg-[rgba(0,255,65,0.1)]"
            >
              ← Cards
            </button>
          )}
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMin meet"
          style={{ minHeight: "100%", cursor: dragAgentId ? "grabbing" : undefined }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={cancelDrag}
        >
        <defs>
          <filter id="building-shadow" x="-3%" y="-3%" width="106%" height="106%">
            <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity={isDark ? 0.5 : 0.12} />
          </filter>
          {/* Subtle grid pattern for corridor floor */}
          <pattern id="corridor-tiles" width="28" height="28" patternUnits="userSpaceOnUse">
            <rect width="28" height="28" fill={colors.corridor} />
            <rect
              x="0.5"
              y="0.5"
              width="27"
              height="27"
              fill="none"
              stroke={isDark ? "#0a2a0a" : "#d5dbe3"}
              strokeWidth="0.3"
              rx="1"
            />
          </pattern>
          {/* Subtle carpet texture for lounge */}
          <pattern id="lounge-carpet" width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill={colors.lounge} />
            <circle cx="3" cy="3" r="0.5" fill={isDark ? "#0d2a0d" : "#e5e0ed"} opacity="0.4" />
          </pattern>
        </defs>

        {/* ── Layer 0: Building shell (outer wall) ── */}
        <rect
          x={OFFICE.x}
          y={OFFICE.y}
          width={OFFICE.width}
          height={OFFICE.height}
          rx={OFFICE.cornerRadius}
          fill={colors.corridor}
          stroke={colors.wall}
          strokeWidth={OFFICE.wallThickness}
          filter="url(#building-shadow)"
        />

        {/* ── Layer 1: Corridor floor tiles ── */}
        <CorridorFloor isDark={isDark} />

        {/* ── Layer 2: Zone floor fills ── */}
        {Object.entries(ZONES).map(([key, zone]) => (
          <rect
            key={`floor-${key}`}
            x={zone.x}
            y={zone.y}
            width={zone.width}
            height={zone.height}
            fill={
              key === "lounge" ? "url(#lounge-carpet)" : colors[key as keyof typeof ZONE_COLORS]
            }
          />
        ))}

        {/* ── Layer 2b: Activity heatmap overlay (above floor, below walls) ── */}
        <HeatmapFloor agents={agentList} />

        {/* ── Layer 3: Internal partition walls ── */}
        <PartitionWalls isDark={isDark} />

        {/* ── Layer 4: Door openings (overlaid on partitions) ── */}
        <DoorOpenings isDark={isDark} />

        {/* Zone labels */}
        {Object.entries(ZONES).map(([key, zone]) => (
          <ZoneLabel key={`label-${key}`} zone={zone} zoneKey={key as ZoneKey} />
        ))}

        {/* ── Layer 5: Furniture – Meeting zone ── */}
        <MeetingTable
          x={meetingCenter.x}
          y={meetingCenter.y}
          radius={meetingTableRadius}
          isDark={isDark}
        />
        <MeetingChairs
          seats={meetingSeats}
          meetingAgentCount={meetingAgents.length}
          isDark={isDark}
        />

        {/* ── Layer 5: Furniture – Lounge zone (incl. reception + entrance) ── */}
        <LoungeDecor isDark={isDark} />

        {/* ── Layer 5a: Lounge idle agents ── */}
        {loungeAgents.map((agent) => {
          const positioned = applyCustomPos(agent);
          return (
            <g
              key={`lounge-${agent.id}`}
              style={{ cursor: dragAgentId === agent.id ? "grabbing" : "grab" }}
              onPointerDown={(e) => handlePointerDown(agent.id, positioned.position, e)}
            >
              <AgentAvatar agent={positioned} />
            </g>
          );
        })}

        {/* ── Layer 5: Furniture – Chill zone (The Rooftop) ── */}
        <ChillZoneDecor isDark={isDark} />

        {/* ── Layer 5a: Chill zone agents ── */}
        {chillAgents.map((agent) => {
          const positioned = applyCustomPos(agent);
          return (
            <g
              key={`chill-${agent.id}`}
              style={{ cursor: dragAgentId === agent.id ? "grabbing" : "grab" }}
              onPointerDown={(e) => handlePointerDown(agent.id, positioned.position, e)}
            >
              <AgentAvatar agent={positioned} />
            </g>
          );
        })}

        {/* ── Layer 5b: Main entrance door on outer wall ── */}
        <EntranceDoor isDark={isDark} />

        {/* ── Layer 6: Collaboration glow + lines ── */}
        <CollaborationGlow agents={meetingAgents} seats={meetingSeats} isDark={isDark} />
        {links.map((link) => {
          const source = agents.get(link.sourceId);
          const target = agents.get(link.targetId);
          if (!source || !target) return null;
          return (
            <ConnectionLine
              key={`${link.sourceId}-${link.targetId}`}
              x1={source.position.x}
              y1={source.position.y}
              x2={target.position.x}
              y2={target.position.y}
              strength={link.strength}
            />
          );
        })}

        {/* ── Layer 7: Meeting agents (seated) ── */}
        {meetingAgents.map((agent, i) => {
          const seat = meetingSeats[i];
          if (!seat) return null;
          return <AgentAvatar key={agent.id} agent={{ ...agent, position: seat }} />;
        })}

        {/* ── Layer 7b: Unconfirmed agents at entrance (semi-transparent) ── */}
        {corridorAgents.map((agent) => {
          const positioned = applyCustomPos(agent);
          return (
            <g
              key={`corridor-${agent.id}`}
              style={{ cursor: dragAgentId === agent.id ? "grabbing" : "grab" }}
              onPointerDown={(e) => handlePointerDown(agent.id, positioned.position, e)}
            >
              <AgentAvatar agent={positioned} />
            </g>
          );
        })}

        {/* ── Layer 8: Walking agents (above all zones, in corridor) ── */}
        {walkingAgents.map((agent) => (
          <AgentAvatar key={`walk-${agent.id}`} agent={agent} />
        ))}

        {/* ── Drag-drop preview indicator ── */}
        {dragAgentId && dropPreview && (
          <g>
            <circle
              cx={dropPreview.x}
              cy={dropPreview.y}
              r={24}
              fill={isDark ? "rgba(0,255,65,0.1)" : "rgba(59,130,246,0.1)"}
              stroke={isDark ? "#00ff41" : "#3b82f6"}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            {/* Grid snap crosshair */}
            <line
              x1={dropPreview.x - 8} y1={dropPreview.y}
              x2={dropPreview.x + 8} y2={dropPreview.y}
              stroke={isDark ? "#00ff41" : "#3b82f6"}
              strokeWidth={0.5}
              opacity={0.5}
            />
            <line
              x1={dropPreview.x} y1={dropPreview.y - 8}
              x2={dropPreview.x} y2={dropPreview.y + 8}
              stroke={isDark ? "#00ff41" : "#3b82f6"}
              strokeWidth={0.5}
              opacity={0.5}
            />
          </g>
        )}

        {/* ── Layer 9: Time-of-day ambiance overlay ── */}
        <TimeAmbiance />
        </svg>
      </div>
      )}
    </div>
  );
}

/* ═══ Mobile Card View ═══ */

const ZONE_DISPLAY: Record<string, string> = {
  meeting: "Meeting Room",
  lounge: "Lounge",
  chill: "The Rooftop",
  corridor: "Corridor",
};

const MOBILE_STATUS_COLORS: Record<string, string> = {
  idle: "#22c55e",
  thinking: "#3b82f6",
  tool_calling: "#f97316",
  speaking: "#a855f7",
  spawning: "#06b6d4",
  error: "#ef4444",
  offline: "#6b7280",
};

const ZONE_ORDER = ["meeting", "lounge", "chill", "corridor"] as const;

function MobileOfficeCards({
  agents,
  onSelectAgent,
  onShowMap,
  isDark,
}: {
  agents: import("@/gateway/types").VisualAgent[];
  onSelectAgent: (id: string | null) => void;
  onShowMap: () => void;
  isDark: boolean;
}) {
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set());

  const toggleZone = useCallback((zone: string) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev);
      if (next.has(zone)) next.delete(zone);
      else next.add(zone);
      return next;
    });
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof agents> = {};
    for (const agent of agents) {
      const z = agent.zone || "corridor";
      if (!groups[z]) groups[z] = [];
      groups[z].push(agent);
    }
    return ZONE_ORDER
      .filter((z) => (groups[z]?.length ?? 0) > 0)
      .map((z) => ({ zone: z, agents: groups[z] ?? [] }));
  }, [agents]);

  return (
    <div className={`flex h-full flex-col overflow-hidden ${isDark ? "bg-black" : "bg-gray-50"}`}>
      {/* Header */}
      <div className={`flex shrink-0 items-center justify-between border-b px-4 py-3 ${isDark ? "border-[rgba(0,255,65,0.15)] bg-black" : "border-gray-200 bg-white"}`}>
        <h2 className={`text-sm font-semibold ${isDark ? "text-[#00ff41]" : "text-gray-800"}`}>
          Agents
        </h2>
        <button
          type="button"
          onClick={onShowMap}
          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            isDark
              ? "border-[rgba(0,255,65,0.2)] text-[#00ff41] hover:bg-[rgba(0,255,65,0.1)]"
              : "border-gray-300 text-gray-600 hover:bg-gray-100"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          Floor Plan
        </button>
      </div>

      {/* Zone groups */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {agents.length === 0 ? (
          <div className={`flex flex-col items-center gap-2 py-12 text-center text-sm ${isDark ? "text-[#0a5d0a]" : "text-gray-400"}`}>
            No agents online
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map(({ zone, agents: zoneAgents }) => {
              const isCollapsed = collapsedZones.has(zone);
              return (
                <div key={zone}>
                  <button
                    type="button"
                    onClick={() => toggleZone(zone)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
                      isDark
                        ? "text-[#0a5d0a] hover:bg-[rgba(0,255,65,0.05)] hover:text-[#00ff41]"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-[10px]">{isCollapsed ? "▶" : "▼"}</span>
                    {ZONE_DISPLAY[zone] ?? zone}
                    <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] ${isDark ? "bg-[rgba(0,255,65,0.1)] text-[#00ff41]" : "bg-gray-200 text-gray-500"}`}>
                      {zoneAgents.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div className="mt-1 space-y-1.5 pl-2">
                      {zoneAgents.map((agent) => (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => onSelectAgent(agent.id)}
                          className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all active:scale-[0.98] ${
                            isDark
                              ? "border-[rgba(0,255,65,0.12)] bg-[rgba(0,10,0,0.6)] hover:border-[rgba(0,255,65,0.25)]"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                          }`}
                        >
                          <SvgAvatar agentId={agent.id} size={36} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`truncate text-sm font-medium ${isDark ? "text-[#00ff41]" : "text-gray-800"}`}>
                                {agent.name}
                              </span>
                              <span
                                className="inline-block h-2 w-2 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: MOBILE_STATUS_COLORS[agent.status] ?? "#6b7280",
                                  boxShadow: `0 0 4px ${MOBILE_STATUS_COLORS[agent.status] ?? "#6b7280"}`,
                                }}
                              />
                            </div>
                            {agent.speechBubble && (
                              <p className={`mt-0.5 line-clamp-2 text-xs ${isDark ? "text-[#3d7a3d]" : "text-gray-500"}`}>
                                {agent.speechBubble.text}
                              </p>
                            )}
                            <span className={`mt-1 inline-block text-[9px] font-medium uppercase tracking-wider ${isDark ? "text-[#1a5e1a]" : "text-gray-400"}`}>
                              {ZONE_DISPLAY[agent.zone] ?? agent.zone}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══ Status Overlay ═══ */

function OfficeStatusOverlay({
  activeCount,
  totalCount,
  isDark,
}: {
  activeCount: number;
  totalCount: number;
  isDark: boolean;
}) {
  const { t } = useTranslation("office");

  if (!isDark) return null;

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg border border-[rgba(0,255,65,0.15)] bg-[rgba(0,0,0,0.6)] px-3 py-1.5 backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2 w-2 rounded-full bg-[#00ff41]"
          style={{ boxShadow: "0 0 6px #00ff41" }}
        />
        <span className="font-mono text-xs text-[#00ff41]">
          {activeCount}/{totalCount}
        </span>
      </div>
      <span className="font-mono text-[10px] text-[#0a5d0a]">
        {t("statusOverlay.agents", { defaultValue: "agents online" })}
      </span>
    </div>
  );
}

/* ═══ Sub-components ═══ */

/** Horizontal corridor between Meeting (top) and Lounge/Rooftop (bottom) */
function CorridorFloor({ isDark }: { isDark: boolean }) {
  const cw = OFFICE.corridorWidth;
  // Horizontal corridor sits between meeting zone (top) and bottom zones
  const hCorrX = OFFICE.x;
  const hCorrY = ZONES.meeting.y + ZONES.meeting.height;

  // Vertical divider between Lounge and Rooftop (bottom half only)
  const vDivX = ZONES.lounge.x + ZONES.lounge.width;
  const vDivY = ZONES.lounge.y;
  const vDivH = ZONES.lounge.height;

  return (
    <g>
      {/* Horizontal corridor (full width) */}
      <rect x={hCorrX} y={hCorrY} width={OFFICE.width} height={cw} fill="url(#corridor-tiles)" />
      {/* Vertical divider between Lounge and Rooftop */}
      <rect x={vDivX} y={vDivY} width={cw} height={vDivH} fill="url(#corridor-tiles)" />
      {/* Corridor center guide line */}
      <line
        x1={hCorrX}
        y1={hCorrY + cw / 2}
        x2={hCorrX + OFFICE.width}
        y2={hCorrY + cw / 2}
        stroke={isDark ? "#0a3d0a" : "#c8d0dc"}
        strokeWidth={0.5}
        strokeDasharray="8 6"
        opacity={0.6}
      />
    </g>
  );
}

/** Internal partition walls — horizontal divider + vertical lounge/rooftop divider */
function PartitionWalls({ isDark }: { isDark: boolean }) {
  const wallColor = isDark ? "#0a3d0a" : "#8b9bb0";
  const fillColor = isDark ? "#062806" : "#c8d0dc";
  const wallW = 4;
  const cw = OFFICE.corridorWidth;

  // Horizontal corridor position
  const corrY = ZONES.meeting.y + ZONES.meeting.height;
  // Vertical divider between lounge and rooftop
  const divX = ZONES.lounge.x + ZONES.lounge.width;

  const walls = [
    // Horizontal wall: top of corridor (below meeting zone) — full width
    { x: OFFICE.x, y: corrY - wallW / 2, w: OFFICE.width, h: wallW },
    // Horizontal wall: bottom of corridor (above lounge/rooftop) — full width
    { x: OFFICE.x, y: corrY + cw - wallW / 2, w: OFFICE.width, h: wallW },
    // Vertical wall: left side of lounge/rooftop divider
    { x: divX - wallW / 2, y: corrY + cw, w: wallW, h: ZONES.lounge.height },
    // Vertical wall: right side of lounge/rooftop divider
    { x: divX + cw - wallW / 2, y: corrY + cw, w: wallW, h: ZONES.lounge.height },
  ];

  return (
    <g>
      {walls.map((w, i) => (
        <rect
          key={`wall-${i}`}
          x={w.x}
          y={w.y}
          width={w.w}
          height={w.h}
          fill={fillColor}
          stroke={wallColor}
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

/** Door openings cut into partition walls — 3 zones connected via corridor */
function DoorOpenings({ isDark }: { isDark: boolean }) {
  const cw = OFFICE.corridorWidth;
  const corrY = ZONES.meeting.y + ZONES.meeting.height;
  const divX = ZONES.lounge.x + ZONES.lounge.width;
  const doorWidth = 40;
  const doorColor = isDark ? ZONE_COLORS_DARK.corridor : ZONE_COLORS.corridor;
  const arcColor = isDark ? "#0a5d0a" : "#94a3b8";

  const doors = [
    // Meeting → corridor (top wall, center)
    { cx: ZONES.meeting.x + ZONES.meeting.width / 2, cy: corrY, horizontal: true },
    // Lounge → corridor (bottom wall, center of lounge)
    { cx: ZONES.lounge.x + ZONES.lounge.width / 2, cy: corrY + cw, horizontal: true },
    // Rooftop → corridor (bottom wall, center of rooftop)
    { cx: ZONES.chill.x + ZONES.chill.width / 2, cy: corrY + cw, horizontal: true },
    // Lounge ↔ Rooftop (vertical divider, midpoint)
    { cx: divX, cy: ZONES.lounge.y + ZONES.lounge.height / 2, horizontal: false },
  ];

  return (
    <g>
      {doors.map((d, i) => {
        const half = doorWidth / 2;
        if (d.horizontal) {
          return (
            <g key={`door-${i}`}>
              <rect x={d.cx - half} y={d.cy - 3} width={doorWidth} height={6} fill={doorColor} />
              <path
                d={`M ${d.cx - half} ${d.cy} A ${half} ${half} 0 0 1 ${d.cx + half} ${d.cy}`}
                fill="none"
                stroke={arcColor}
                strokeWidth={0.8}
                strokeDasharray="3 2"
                opacity={0.5}
              />
            </g>
          );
        }
        return (
          <g key={`door-${i}`}>
            <rect x={d.cx - 3} y={d.cy - half} width={6} height={doorWidth} fill={doorColor} />
            <path
              d={`M ${d.cx} ${d.cy - half} A ${half} ${half} 0 0 1 ${d.cx} ${d.cy + half}`}
              fill="none"
              stroke={arcColor}
              strokeWidth={0.8}
              strokeDasharray="3 2"
              opacity={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}

function MeetingChairs({
  seats,
  meetingAgentCount,
  isDark,
}: {
  seats: Array<{ x: number; y: number }>;
  meetingAgentCount: number;
  isDark: boolean;
}) {
  const meetingCenter = {
    x: ZONES.meeting.x + ZONES.meeting.width / 2,
    y: ZONES.meeting.y + ZONES.meeting.height / 2,
  };

  if (meetingAgentCount > 0) {
    return (
      <g>
        {seats.map((s, i) => (
          <Chair key={`mc-${i}`} x={s.x} y={s.y} isDark={isDark} />
        ))}
      </g>
    );
  }

  const emptyCount = 6;
  const emptyRadius = 100;
  return (
    <g>
      {Array.from({ length: emptyCount }, (_, i) => {
        const angle = (2 * Math.PI * i) / emptyCount - Math.PI / 2;
        return (
          <Chair
            key={`mc-empty-${i}`}
            x={Math.round(meetingCenter.x + Math.cos(angle) * emptyRadius)}
            y={Math.round(meetingCenter.y + Math.sin(angle) * emptyRadius)}
            isDark={isDark}
          />
        );
      })}
    </g>
  );
}

function LoungeDecor({ isDark }: { isDark: boolean }) {
  const lz = ZONES.lounge;
  const cx = lz.x + lz.width / 2;

  const wallColor = isDark ? "#062806" : "#5a6878";
  const deskColor = isDark ? "#0a3d0a" : "#8494a7";
  const deskTop = isDark ? "#0d5a0d" : "#a5b4c8";
  const logoTextColor = isDark ? "#00ff41" : "#ffffff";
  const logoBg = isDark ? "#001a00" : "#3b4f6b";

  // Logo backdrop wall — centered horizontally, at ~55% from top
  const bgWallW = 200;
  const bgWallH = 36;
  const bgWallY = lz.y + lz.height * 0.52;

  // Reception desk — arc in front of logo wall
  const deskW = 160;
  const deskH = 24;
  const deskY = bgWallY + bgWallH + 14;

  return (
    <g>
      {/* ── Upper lounge area: sofas & coffee ── */}
      <Sofa x={lz.x + 100} y={lz.y + 60} rotation={0} isDark={isDark} />
      <Sofa x={lz.x + 280} y={lz.y + 60} rotation={0} isDark={isDark} />
      <Sofa x={lz.x + 100} y={lz.y + 140} rotation={180} isDark={isDark} />
      <CoffeeCup x={lz.x + 190} y={lz.y + 100} />
      <CoffeeCup x={lz.x + 100} y={lz.y + 100} />
      <Sofa x={lz.x + 440} y={lz.y + 100} rotation={90} isDark={isDark} />

      {/* ── Logo backdrop wall ── */}
      <rect
        x={cx - bgWallW / 2}
        y={bgWallY}
        width={bgWallW}
        height={bgWallH}
        rx={4}
        fill={logoBg}
      />
      {/* Wall top accent strip */}
      <rect
        x={cx - bgWallW / 2}
        y={bgWallY}
        width={bgWallW}
        height={3}
        rx={1.5}
        fill={isDark ? "#0a5d0a" : "#7a9bc0"}
      />
      {/* "OpenClaw" logo text */}
      <text
        x={cx}
        y={bgWallY + bgWallH / 2 + 5}
        textAnchor="middle"
        fill={logoTextColor}
        fontSize={14}
        fontWeight={700}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.12em"
        style={isDark ? { filter: "drop-shadow(0 0 6px rgba(0,255,65,0.5))" } : undefined}
      >
        OpenClaw
      </text>

      {/* ── Reception desk (rounded front) ── */}
      <rect
        x={cx - deskW / 2}
        y={deskY}
        width={deskW}
        height={deskH}
        rx={12}
        fill={deskColor}
        stroke={wallColor}
        strokeWidth={1}
      />
      {/* Desk surface highlight */}
      <rect
        x={cx - deskW / 2 + 4}
        y={deskY + 3}
        width={deskW - 8}
        height={deskH - 6}
        rx={9}
        fill={deskTop}
        opacity={0.5}
      />

      {/* Decorative plants flanking reception */}
      <Plant x={cx - bgWallW / 2 - 30} y={bgWallY + bgWallH / 2} />
      <Plant x={cx + bgWallW / 2 + 30} y={bgWallY + bgWallH / 2} />

      {/* Side plants near entrance */}
      <Plant x={lz.x + 40} y={lz.y + lz.height - 50} />
      <Plant x={lz.x + lz.width - 40} y={lz.y + lz.height - 50} />
    </g>
  );
}

/** Chill zone — "The Rooftop" — bench, coffee machine, plant, ashtray */
function ChillZoneDecor({ isDark }: { isDark: boolean }) {
  const cz = ZONES.chill;
  const cx = cz.x + cz.width / 2;
  const cy = cz.y + cz.height / 2;

  const benchColor = isDark ? "#0a3d0a" : "#8494a7";
  const benchSeat = isDark ? "#0d5a0d" : "#a5b4c8";
  const machineColor = isDark ? "#062806" : "#5a6878";
  const machineAccent = isDark ? "#00ff41" : "#4ade80";

  return (
    <g>
      {/* Bench / sofa */}
      <Sofa x={cx - 20} y={cz.y + 50} rotation={0} isDark={isDark} />

      {/* Coffee machine (small rectangle with accent light) */}
      <rect x={cz.x + 20} y={cz.y + 30} width={24} height={32} rx={4} fill={machineColor} />
      <rect x={cz.x + 23} y={cz.y + 34} width={18} height={8} rx={2} fill={machineAccent} opacity={0.6} />
      <circle cx={cz.x + 32} cy={cz.y + 52} r={3} fill={benchSeat} />

      {/* Ashtray (small circle on a table) */}
      <rect x={cx + 30} y={cy + 10} width={30} height={20} rx={4} fill={benchColor} />
      <rect x={cx + 33} y={cy + 13} width={24} height={14} rx={3} fill={benchSeat} opacity={0.5} />
      <circle cx={cx + 45} cy={cy + 20} r={5} fill={isDark ? "#1a2a1a" : "#c8d0dc"} />
      <circle cx={cx + 45} cy={cy + 20} r={3} fill={isDark ? "#2a3a2a" : "#b0b8c0"} />

      {/* Plants */}
      <Plant x={cz.x + cz.width - 30} y={cz.y + 30} />
      <Plant x={cx - 10} y={cz.y + cz.height - 40} />

      {/* Second bench for more seating */}
      <Sofa x={cx - 20} y={cy + 50} rotation={180} isDark={isDark} />
    </g>
  );
}

/** Collaboration glow — shared aura under agents working together in meeting zone */
function CollaborationGlow({
  agents: meetingAgents,
  seats,
  isDark,
}: {
  agents: Array<{ id: string; status: string; parentAgentId: string | null; isSubAgent: boolean }>;
  seats: Array<{ x: number; y: number }>;
  isDark: boolean;
}) {
  if (meetingAgents.length < 2) return null;

  // Group agents by shared work context (same parent, or main+its subs)
  const groups = new Map<string, number[]>();
  meetingAgents.forEach((agent, i) => {
    const groupKey = agent.parentAgentId || agent.id;
    if (!groups.has(groupKey)) groups.set(groupKey, []);
    groups.get(groupKey)!.push(i);
  });

  // Also group by matching active status (both thinking, both tool_calling)
  const statusGroups = new Map<string, number[]>();
  meetingAgents.forEach((agent, i) => {
    if (agent.status === "thinking" || agent.status === "tool_calling" || agent.status === "speaking") {
      if (!statusGroups.has(agent.status)) statusGroups.set(agent.status, []);
      statusGroups.get(agent.status)!.push(i);
    }
  });

  const glowColors = ["#3b82f6", "#a855f7", "#06b6d4", "#f97316", "#22c55e"];
  let colorIdx = 0;

  const glowElements: React.ReactElement[] = [];

  // Render glow for parent-child clusters
  for (const [groupKey, indices] of groups) {
    if (indices.length < 2) continue;
    const positions = indices.map((i) => seats[i]).filter(Boolean);
    if (positions.length < 2) continue;

    const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    const maxDist = Math.max(...positions.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)));
    const glowRadius = maxDist + 45;
    const color = glowColors[colorIdx++ % glowColors.length];

    glowElements.push(
      <circle
        key={`glow-${groupKey}`}
        cx={cx}
        cy={cy}
        r={glowRadius}
        fill={color}
        opacity={isDark ? 0.08 : 0.06}
        style={{
          animation: "agent-breathe 3s ease-in-out infinite",
          filter: `drop-shadow(0 0 ${isDark ? 12 : 8}px ${color})`,
        }}
      />,
    );
  }

  // Render glow for status-matched groups (if not already covered by parent-child)
  for (const [status, indices] of statusGroups) {
    if (indices.length < 2) continue;
    const positions = indices.map((i) => seats[i]).filter(Boolean);
    if (positions.length < 2) continue;

    const cx = positions.reduce((s, p) => s + p.x, 0) / positions.length;
    const cy = positions.reduce((s, p) => s + p.y, 0) / positions.length;
    const maxDist = Math.max(...positions.map((p) => Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2)));
    const glowRadius = maxDist + 35;
    const color = status === "thinking" ? "#3b82f6" : status === "tool_calling" ? "#f97316" : "#a855f7";

    glowElements.push(
      <circle
        key={`status-glow-${status}`}
        cx={cx}
        cy={cy}
        r={glowRadius}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="8 4"
        opacity={isDark ? 0.25 : 0.15}
        style={{
          animation: "agent-pulse 2s ease-in-out infinite",
        }}
      />,
    );
  }

  return <g>{glowElements}</g>;
}


/** Main entrance door cut into the bottom outer wall of lounge zone */
function EntranceDoor({ isDark }: { isDark: boolean }) {
  const lz = ZONES.lounge;
  const doorCX = lz.x + lz.width / 2;
  const doorY = OFFICE.y + OFFICE.height;
  const doorW = 70;
  const half = doorW / 2;

  const bgColor = isDark ? ZONE_COLORS_DARK.lounge : ZONE_COLORS.lounge;
  const arcColor = isDark ? "#0a5d0a" : "#8b9bb0";
  const matColor = isDark ? "#0a2a0a" : "#b0a090";
  const textColor = isDark ? "#0a5d0a" : "#94a3b8";

  return (
    <g>
      {/* Erase outer wall segment to create door opening */}
      <rect
        x={doorCX - half - 2}
        y={doorY - OFFICE.wallThickness - 1}
        width={doorW + 4}
        height={OFFICE.wallThickness + 4}
        fill={bgColor}
      />
      {/* Door frame posts */}
      <rect x={doorCX - half - 3} y={doorY - 10} width={3} height={12} rx={1} fill={arcColor} />
      <rect x={doorCX + half} y={doorY - 10} width={3} height={12} rx={1} fill={arcColor} />
      {/* Double-door swing arcs */}
      <path
        d={`M ${doorCX - half} ${doorY} A ${half} ${half} 0 0 0 ${doorCX} ${doorY - half}`}
        fill="none"
        stroke={arcColor}
        strokeWidth={0.8}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      <path
        d={`M ${doorCX + half} ${doorY} A ${half} ${half} 0 0 1 ${doorCX} ${doorY - half}`}
        fill="none"
        stroke={arcColor}
        strokeWidth={0.8}
        strokeDasharray="4 3"
        opacity={0.5}
      />
      {/* Welcome mat */}
      <rect
        x={doorCX - 30}
        y={doorY - 18}
        width={60}
        height={12}
        rx={3}
        fill={matColor}
        opacity={0.5}
      />
      {/* "ENTRANCE" label outside */}
      <text
        x={doorCX}
        y={doorY + 14}
        textAnchor="middle"
        fill={textColor}
        fontSize={9}
        fontWeight={600}
        fontFamily="'JetBrains Mono', monospace"
        letterSpacing="0.15em"
        style={isDark ? { filter: "drop-shadow(0 0 4px rgba(0,255,65,0.4))" } : undefined}
      >
        ENTRANCE
      </text>
    </g>
  );
}
