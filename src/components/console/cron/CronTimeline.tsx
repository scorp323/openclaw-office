import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import type { CronTask } from "@/gateway/adapter-types";

interface CronTimelineProps {
  tasks: CronTask[];
}

const HOUR_WIDTH = 80;
const ROW_HEIGHT = 32;
const LABEL_WIDTH = 140;
const TIMELINE_HOURS = 24;

function getStatusColor(task: CronTask): string {
  if (!task.enabled) return "#6b7280"; // gray
  if (task.state.lastRunStatus === "error") return "#ef4444"; // red
  return "#22c55e"; // green
}

function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function timeToXPosition(ts: number, startMs: number): number {
  const diffMs = ts - startMs;
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours * HOUR_WIDTH;
}

export function CronTimeline({ tasks }: CronTimelineProps) {
  const { t } = useTranslation("console");
  const scrollRef = useRef<HTMLDivElement>(null);

  const now = Date.now();
  const startOfDay = useMemo(() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [now]);

  const endOfDay = startOfDay + TIMELINE_HOURS * 60 * 60 * 1000;
  const nowX = timeToXPosition(now, startOfDay);

  const hours = useMemo(
    () => Array.from({ length: TIMELINE_HOURS + 1 }, (_, i) => i),
    [],
  );

  if (tasks.length === 0) return null;

  const totalWidth = TIMELINE_HOURS * HOUR_WIDTH;
  const totalHeight = tasks.length * ROW_HEIGHT + 40;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-[rgba(0,255,65,0.15)] dark:bg-[rgba(0,0,0,0.4)]">
      <div className="border-b border-gray-200 px-4 py-2 dark:border-[rgba(0,255,65,0.1)]">
        <h3 className="text-sm font-medium text-gray-700 dark:text-[#00ff41]">
          {t("cron.timeline.title", { defaultValue: "24h Timeline" })}
        </h3>
      </div>
      <div className="flex">
        {/* Fixed label column */}
        <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
          <div
            className="border-b border-r border-gray-200 px-3 py-1.5 text-[10px] font-medium text-gray-400 dark:border-[rgba(0,255,65,0.1)] dark:text-[#0a5d0a]"
            style={{ height: 28 }}
          >
            {t("cron.timeline.task", { defaultValue: "Task" })}
          </div>
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-1.5 border-b border-r border-gray-100 px-3 dark:border-[rgba(0,255,65,0.05)]"
              style={{ height: ROW_HEIGHT }}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: getStatusColor(task) }}
              />
              <span className="truncate text-xs text-gray-600 dark:text-gray-300">
                {task.name}
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <div style={{ width: totalWidth, minHeight: totalHeight }}>
            {/* Hour headers */}
            <div className="flex border-b border-gray-200 dark:border-[rgba(0,255,65,0.1)]" style={{ height: 28 }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="shrink-0 border-r border-gray-100 px-1 py-1 text-center text-[10px] tabular-nums text-gray-400 dark:border-[rgba(0,255,65,0.05)] dark:text-[#0a5d0a]"
                  style={{ width: HOUR_WIDTH }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {/* Task rows */}
            {tasks.map((task) => {
              const color = getStatusColor(task);
              const lastRun = task.state.lastRunAtMs;
              const nextRun = task.state.nextRunAtMs;

              return (
                <div
                  key={task.id}
                  className="relative border-b border-gray-50 dark:border-[rgba(0,255,65,0.03)]"
                  style={{ height: ROW_HEIGHT }}
                >
                  {/* Hour grid lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute top-0 h-full border-r border-gray-50 dark:border-[rgba(0,255,65,0.03)]"
                      style={{ left: h * HOUR_WIDTH, width: 0 }}
                    />
                  ))}

                  {/* Span bar between last run and next run */}
                  {lastRun && nextRun && lastRun >= startOfDay && nextRun <= endOfDay && lastRun < nextRun && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{
                        left: timeToXPosition(lastRun, startOfDay),
                        width: Math.max(timeToXPosition(nextRun, startOfDay) - timeToXPosition(lastRun, startOfDay), 2),
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: color,
                        opacity: 0.25,
                      }}
                      title={`${new Date(lastRun).toLocaleTimeString()} → ${new Date(nextRun).toLocaleTimeString()}`}
                    />
                  )}

                  {/* Last run marker */}
                  {lastRun && lastRun >= startOfDay && lastRun <= endOfDay && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: timeToXPosition(lastRun, startOfDay) - 5 }}
                      title={`Last: ${new Date(lastRun).toLocaleTimeString()}`}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: color,
                          boxShadow: `0 0 6px ${color}`,
                        }}
                      />
                    </div>
                  )}

                  {/* Next run marker */}
                  {nextRun && nextRun >= startOfDay && nextRun <= endOfDay && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2"
                      style={{ left: timeToXPosition(nextRun, startOfDay) - 5 }}
                      title={`Next: ${new Date(nextRun).toLocaleTimeString()}`}
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-sm border-2"
                        style={{
                          borderColor: color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Now indicator line */}
            {nowX >= 0 && nowX <= totalWidth && (
              <div
                className="pointer-events-none absolute top-0 z-10 h-full w-px"
                style={{
                  left: LABEL_WIDTH + nowX,
                  backgroundColor: "#f59e0b",
                  boxShadow: "0 0 4px #f59e0b",
                }}
              >
                <div className="absolute -left-1.5 -top-0.5 rounded-sm bg-amber-500 px-1 text-[8px] font-bold text-white">
                  NOW
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 border-t border-gray-200 px-4 py-1.5 dark:border-[rgba(0,255,65,0.1)]">
        <LegendItem color="#22c55e" label={t("cron.timeline.ok", { defaultValue: "OK" })} shape="circle" />
        <LegendItem color="#ef4444" label={t("cron.timeline.error", { defaultValue: "Error" })} shape="circle" />
        <LegendItem color="#6b7280" label={t("cron.timeline.disabled", { defaultValue: "Disabled" })} shape="circle" />
        <LegendItem color="#22c55e" label={t("cron.timeline.nextRun", { defaultValue: "Next run" })} shape="square" />
      </div>
    </div>
  );
}

function LegendItem({ color, label, shape }: { color: string; label: string; shape: "circle" | "square" }) {
  return (
    <div className="flex items-center gap-1">
      {shape === "circle" ? (
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span className="h-2 w-2 rounded-sm border-2" style={{ borderColor: color }} />
      )}
      <span className="text-[10px] text-gray-400 dark:text-[#0a5d0a]">{label}</span>
    </div>
  );
}
