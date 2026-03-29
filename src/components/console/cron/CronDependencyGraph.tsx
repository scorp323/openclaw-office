import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CronTask } from "@/gateway/adapter-types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GraphNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  task: CronTask;
}

interface GraphEdge {
  source: string;
  target: string;
  reason: "same-agent" | "schedule-proximity" | "same-model";
}

// ─── Dependency inference ─────────────────────────────────────────────────────

function inferEdges(tasks: CronTask[]): GraphEdge[] {
  const edges: GraphEdge[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < tasks.length; i++) {
    for (let j = i + 1; j < tasks.length; j++) {
      const a = tasks[i];
      const b = tasks[j];
      const key = `${a.id}-${b.id}`;
      if (seen.has(key)) continue;

      // Same agent
      if (a.agentId && b.agentId && a.agentId === b.agentId) {
        edges.push({ source: a.id, target: b.id, reason: "same-agent" });
        seen.add(key);
        continue;
      }

      // Same session key
      if (a.sessionKey && b.sessionKey && a.sessionKey === b.sessionKey) {
        edges.push({ source: a.id, target: b.id, reason: "same-agent" });
        seen.add(key);
        continue;
      }

      // Schedule proximity: both crons have nextRunAtMs within 5 minutes of each other
      const aNext = a.state.nextRunAtMs;
      const bNext = b.state.nextRunAtMs;
      if (aNext && bNext && Math.abs(aNext - bNext) < 5 * 60 * 1000) {
        edges.push({ source: a.id, target: b.id, reason: "schedule-proximity" });
        seen.add(key);
      }
    }
  }
  return edges;
}

// ─── Force simulation ─────────────────────────────────────────────────────────

const REPEL_STRENGTH = 4000;
const SPRING_STRENGTH = 0.04;
const SPRING_LENGTH = 160;
const DAMPING = 0.82;
const MIN_DIST = 60;

function runForceStep(nodes: GraphNode[], edges: GraphEdge[]): GraphNode[] {
  const next = nodes.map((n) => ({ ...n }));

  // Repulsion between all pairs
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const a = next[i];
      const b = next[j];
      const dx = b.x - a.x || 0.01;
      const dy = b.y - a.y || 0.01;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), MIN_DIST);
      const force = REPEL_STRENGTH / (dist * dist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      next[i].vx -= fx;
      next[i].vy -= fy;
      next[j].vx += fx;
      next[j].vy += fy;
    }
  }

  // Spring attraction along edges
  const nodeMap = new Map(next.map((n) => [n.id, n]));
  for (const edge of edges) {
    const a = nodeMap.get(edge.source);
    const b = nodeMap.get(edge.target);
    if (!a || !b) continue;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const force = (dist - SPRING_LENGTH) * SPRING_STRENGTH;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;
    a.vx += fx;
    a.vy += fy;
    b.vx -= fx;
    b.vy -= fy;
  }

  // Integrate + dampen
  for (const node of next) {
    node.vx *= DAMPING;
    node.vy *= DAMPING;
    node.x += node.vx;
    node.y += node.vy;
  }

  return next;
}

// ─── Colour helpers ───────────────────────────────────────────────────────────

function nodeColor(task: CronTask): { fill: string; stroke: string; text: string } {
  if (!task.enabled) return { fill: "#9ca3af", stroke: "#6b7280", text: "#fff" };
  const s = task.state.lastRunStatus;
  if (s === "error") return { fill: "#ef4444", stroke: "#dc2626", text: "#fff" };
  if (s === "ok") return { fill: "#22c55e", stroke: "#16a34a", text: "#fff" };
  return { fill: "#3b82f6", stroke: "#2563eb", text: "#fff" };
}

function edgeColor(reason: GraphEdge["reason"]): string {
  if (reason === "same-agent") return "#6366f1";
  if (reason === "schedule-proximity") return "#f59e0b";
  return "#94a3b8";
}

// ─── CronDependencyGraph ──────────────────────────────────────────────────────

const NODE_RADIUS = 28;
const WIDTH = 800;
const HEIGHT = 500;

export function CronDependencyGraph({ tasks }: { tasks: CronTask[] }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [selected, setSelected] = useState<CronTask | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const isSimRunning = useRef(true);

  // Initialise nodes in a circle layout
  useEffect(() => {
    if (tasks.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const cx = WIDTH / 2;
    const cy = HEIGHT / 2;
    const radius = Math.min(cx, cy) * 0.6;
    const initialNodes: GraphNode[] = tasks.map((task, i) => {
      const angle = (2 * Math.PI * i) / tasks.length;
      return {
        id: task.id,
        x: cx + radius * Math.cos(angle),
        y: cy + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        task,
      };
    });
    setNodes(initialNodes);
    nodesRef.current = initialNodes;
    setEdges(inferEdges(tasks));
    isSimRunning.current = true;
  }, [tasks]);

  // Force simulation loop (runs for a while then stops)
  useEffect(() => {
    let frameCount = 0;
    const maxFrames = 300;

    function tick() {
      if (!isSimRunning.current) return;
      frameCount++;
      if (frameCount > maxFrames) {
        isSimRunning.current = false;
        return;
      }
      nodesRef.current = runForceStep(nodesRef.current, edges);
      setNodes([...nodesRef.current]);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [edges]);

  // Drag handling
  const getSvgPoint = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const handleNodePointerDown = useCallback(
    (e: React.PointerEvent, nodeId: string) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = getSvgPoint(e);
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) return;
      dragOffsetRef.current = { x: pt.x - node.x, y: pt.y - node.y };
      setDragging(nodeId);
      isSimRunning.current = false;
    },
    [getSvgPoint],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const pt = getSvgPoint(e);
      nodesRef.current = nodesRef.current.map((n) =>
        n.id === dragging
          ? { ...n, x: pt.x - dragOffsetRef.current.x, y: pt.y - dragOffsetRef.current.y, vx: 0, vy: 0 }
          : n,
      );
      setNodes([...nodesRef.current]);
    },
    [dragging, getSvgPoint],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      e.currentTarget.releasePointerCapture?.(e.pointerId);
      setDragging(null);
    },
    [dragging],
  );

  const handleNodeClick = useCallback(
    (task: CronTask) => {
      setSelected((prev) => (prev?.id === task.id ? null : task));
    },
    [],
  );

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-400">
        No cron tasks to display
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* SVG graph */}
      <div className="min-h-[500px] flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="h-full w-full touch-none select-none"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Edge legend */}
          <g transform="translate(12, 12)">
            {[
              { color: "#6366f1", label: "Same agent" },
              { color: "#f59e0b", label: "Schedule proximity" },
            ].map((item, i) => (
              <g key={item.label} transform={`translate(0, ${i * 18})`}>
                <line x1="0" y1="7" x2="20" y2="7" stroke={item.color} strokeWidth="2" strokeDasharray="4 2" />
                <text x="26" y="11" fontSize="11" fill="#6b7280">{item.label}</text>
              </g>
            ))}
          </g>

          {/* Edges */}
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;
            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={src.x}
                y1={src.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={edgeColor(edge.reason)}
                strokeWidth="2"
                strokeDasharray="6 3"
                opacity="0.7"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const { fill, stroke, text } = nodeColor(node.task);
            const isSelected = selected?.id === node.id;
            const label = node.task.name.length > 14
              ? node.task.name.slice(0, 13) + "…"
              : node.task.name;
            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                onClick={() => handleNodeClick(node.task)}
                style={{ cursor: dragging === node.id ? "grabbing" : "pointer" }}
              >
                {/* Selection ring */}
                {isSelected && (
                  <circle
                    r={NODE_RADIUS + 5}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    opacity="0.7"
                    strokeDasharray="4 2"
                  />
                )}
                <circle
                  r={NODE_RADIUS}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth="2"
                  filter={isSelected ? "url(#shadow)" : undefined}
                />
                <text
                  textAnchor="middle"
                  dy="-6"
                  fontSize="10"
                  fontWeight="600"
                  fill={text}
                >
                  {label}
                </text>
                <text
                  textAnchor="middle"
                  dy="8"
                  fontSize="9"
                  fill={text}
                  opacity="0.8"
                >
                  {node.task.enabled ? (node.task.state.lastRunStatus ?? "pending") : "disabled"}
                </text>
              </g>
            );
          })}

          <defs>
            <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.3" />
            </filter>
          </defs>
        </svg>
      </div>

      {/* Details sidebar */}
      {selected && (
        <div className="w-64 shrink-0 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {selected.name}
            </h3>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {selected.description && (
            <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{selected.description}</p>
          )}

          <dl className="space-y-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Status</dt>
              <dd>
                <span
                  className={`rounded px-1.5 py-0.5 font-medium ${
                    !selected.enabled
                      ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      : selected.state.lastRunStatus === "error"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                        : selected.state.lastRunStatus === "ok"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
                  }`}
                >
                  {selected.enabled ? (selected.state.lastRunStatus ?? "pending") : "disabled"}
                </span>
              </dd>
            </div>

            <div className="flex justify-between">
              <dt className="text-gray-500 dark:text-gray-400">Schedule</dt>
              <dd className="font-mono text-gray-800 dark:text-gray-200">
                {typeof selected.schedule === "string"
                  ? selected.schedule
                  : (selected.schedule as { expression?: string }).expression ?? "—"}
              </dd>
            </div>

            {selected.agentId && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Agent</dt>
                <dd className="max-w-[120px] truncate text-gray-800 dark:text-gray-200">
                  {selected.agentId}
                </dd>
              </div>
            )}

            {selected.state.lastRunAtMs && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Last run</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {new Date(selected.state.lastRunAtMs).toLocaleString()}
                </dd>
              </div>
            )}

            {selected.state.nextRunAtMs && (
              <div className="flex justify-between">
                <dt className="text-gray-500 dark:text-gray-400">Next run</dt>
                <dd className="text-gray-800 dark:text-gray-200">
                  {new Date(selected.state.nextRunAtMs).toLocaleString()}
                </dd>
              </div>
            )}

            {selected.state.lastError && (
              <div className="mt-2">
                <dt className="mb-1 text-red-500">Last error</dt>
                <dd className="rounded bg-red-50 p-2 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {selected.state.lastError}
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
}
