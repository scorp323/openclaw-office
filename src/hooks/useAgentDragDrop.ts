import { useCallback, useEffect, useState, useRef } from "react";

const STORAGE_KEY = "openclaw-agent-positions";
const GRID_SIZE = 20;

interface Position {
  x: number;
  y: number;
}

type PositionMap = Record<string, Position>;

function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function loadPositions(): PositionMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as PositionMap;
  } catch {
    // corrupt data — ignore
  }
  return {};
}

function savePositions(positions: PositionMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // quota exceeded — silent
  }
}

export function useAgentDragDrop() {
  const [customPositions, setCustomPositions] = useState<PositionMap>(loadPositions);
  const [dragAgentId, setDragAgentId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<Position | null>(null);
  const dragStartOffset = useRef<Position>({ x: 0, y: 0 });

  // Persist on change
  useEffect(() => {
    savePositions(customPositions);
  }, [customPositions]);

  const getCustomPosition = useCallback(
    (agentId: string): Position | null => customPositions[agentId] ?? null,
    [customPositions],
  );

  const startDrag = useCallback(
    (agentId: string, agentPos: Position, mousePos: Position) => {
      setDragAgentId(agentId);
      dragStartOffset.current = {
        x: mousePos.x - agentPos.x,
        y: mousePos.y - agentPos.y,
      };
    },
    [],
  );

  const updateDrag = useCallback(
    (mousePos: Position) => {
      if (!dragAgentId) return;
      const x = snapToGrid(mousePos.x - dragStartOffset.current.x);
      const y = snapToGrid(mousePos.y - dragStartOffset.current.y);
      setDropPreview({ x, y });
    },
    [dragAgentId],
  );

  const endDrag = useCallback(() => {
    if (dragAgentId && dropPreview) {
      setCustomPositions((prev) => ({
        ...prev,
        [dragAgentId]: dropPreview,
      }));
    }
    setDragAgentId(null);
    setDropPreview(null);
  }, [dragAgentId, dropPreview]);

  const cancelDrag = useCallback(() => {
    setDragAgentId(null);
    setDropPreview(null);
  }, []);

  const resetAllPositions = useCallback(() => {
    setCustomPositions({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const hasCustomPositions = Object.keys(customPositions).length > 0;

  return {
    customPositions,
    dragAgentId,
    dropPreview,
    hasCustomPositions,
    getCustomPosition,
    startDrag,
    updateDrag,
    endDrag,
    cancelDrag,
    resetAllPositions,
  };
}

/** Convert mouse/pointer event coords to SVG coords */
export function clientToSvg(
  svgElement: SVGSVGElement,
  clientX: number,
  clientY: number,
): Position {
  const pt = svgElement.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svgElement.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const svgPt = pt.matrixTransform(ctm.inverse());
  return { x: svgPt.x, y: svgPt.y };
}
