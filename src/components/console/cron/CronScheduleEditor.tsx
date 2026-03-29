import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

interface CronScheduleEditorProps {
  value: string;
  onChange: (expr: string) => void;
}

interface Preset {
  label: string;
  expr: string;
}

const PRESETS: Preset[] = [
  { label: "Every 15 min", expr: "*/15 * * * *" },
  { label: "Every hour", expr: "0 * * * *" },
  { label: "Daily at 9am", expr: "0 9 * * *" },
  { label: "Weekdays only", expr: "0 9 * * 1-5" },
  { label: "Weekly Sunday", expr: "0 9 * * 0" },
];

const MINUTE_OPTIONS = [
  { value: "*", label: "Every minute (*)" },
  { value: "0", label: "At :00" },
  { value: "15", label: "At :15" },
  { value: "30", label: "At :30" },
  { value: "45", label: "At :45" },
  { value: "*/5", label: "Every 5 min" },
  { value: "*/10", label: "Every 10 min" },
  { value: "*/15", label: "Every 15 min" },
  { value: "*/30", label: "Every 30 min" },
];

const HOUR_OPTIONS = [
  { value: "*", label: "Every hour (*)" },
  ...Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${i.toString().padStart(2, "0")}:00`,
  })),
];

const DOM_OPTIONS = [
  { value: "*", label: "Every day (*)" },
  ...Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: `Day ${i + 1}`,
  })),
];

const MONTH_OPTIONS = [
  { value: "*", label: "Every month (*)" },
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const DOW_OPTIONS = [
  { value: "*", label: "Every day (*)" },
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
  { value: "1-5", label: "Weekdays (Mon–Fri)" },
  { value: "0,6", label: "Weekends (Sat+Sun)" },
];

// Parse a cron expression into its 5 fields; returns null if invalid
function parseCron(expr: string): [string, string, string, string, string] | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return parts as [string, string, string, string, string];
}

// Compute next N run times for a standard 5-field cron expression (brute-force minute iteration)
function getNextRunTimes(expr: string, count = 5): Date[] {
  const parts = parseCron(expr);
  if (!parts) return [];

  const [minPart, hourPart, domPart, monPart, dowPart] = parts;

  function matches(part: string, value: number): boolean {
    if (part === "*") return true;
    // Handle ranges like "1-5"
    if (part.includes("-")) {
      const [lo, hi] = part.split("-").map(Number);
      return value >= lo && value <= hi;
    }
    // Handle lists like "0,6"
    if (part.includes(",")) {
      return part.split(",").map(Number).includes(value);
    }
    // Handle steps like "*/15"
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (isNaN(step) || step <= 0) return false;
      return value % step === 0;
    }
    const n = parseInt(part, 10);
    if (isNaN(n)) return false;
    return n === value;
  }

  const results: Date[] = [];
  // Start from next minute
  const now = new Date();
  const start = new Date(now.getTime() + 60_000);
  start.setSeconds(0, 0);

  const limit = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  let current = new Date(start);

  while (results.length < count && current < limit) {
    const min = current.getMinutes();
    const hour = current.getHours();
    const dom = current.getDate();
    const mon = current.getMonth() + 1;
    const dow = current.getDay();

    if (
      matches(minPart, min) &&
      matches(hourPart, hour) &&
      matches(domPart, dom) &&
      matches(monPart, mon) &&
      matches(dowPart, dow)
    ) {
      results.push(new Date(current));
    }

    current = new Date(current.getTime() + 60_000);
  }

  return results;
}

function formatRunTime(d: Date): string {
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const dateStr = d.toLocaleDateString([], { month: "short", day: "numeric" });

  if (diffMins < 60) return `${timeStr} (in ${diffMins}m)`;
  if (diffMins < 1440) return `${timeStr} (in ${Math.round(diffMins / 60)}h)`;
  return `${dateStr} ${timeStr}`;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  const isKnown = options.some((o) => o.value === value);
  return (
    <div className="flex-1">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </div>
      <div className="relative">
        <select
          value={isKnown ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-md border border-gray-300 bg-white py-1.5 pl-2.5 pr-6 text-xs text-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
        >
          {!isKnown && (
            <option value="" disabled>
              {value}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-400" />
      </div>
    </div>
  );
}

export function CronScheduleEditor({ value, onChange }: CronScheduleEditorProps) {
  const [advanced, setAdvanced] = useState(false);

  const parts = useMemo(() => parseCron(value), [value]);
  const [minute, hour, dom, month, dow] = parts ?? ["*", "*", "*", "*", "*"];

  const updateField = useCallback(
    (index: number, fieldValue: string) => {
      const current = parseCron(value) ?? ["*", "*", "*", "*", "*"];
      current[index] = fieldValue;
      onChange(current.join(" "));
    },
    [value, onChange],
  );

  const nextRuns = useMemo(() => getNextRunTimes(value, 5), [value]);

  const activePreset = PRESETS.find((p) => p.expr === value) ?? null;

  return (
    <div className="space-y-3">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <button
            key={preset.expr}
            type="button"
            onClick={() => onChange(preset.expr)}
            className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
              activePreset?.expr === preset.expr
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/20 dark:text-blue-400"
                : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            {preset.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className={`ml-auto rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
            advanced
              ? "border-gray-400 bg-gray-100 text-gray-700 dark:border-gray-500 dark:bg-gray-700 dark:text-gray-200"
              : "border-gray-300 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-500 dark:hover:bg-gray-700"
          }`}
        >
          Advanced
        </button>
      </div>

      {advanced ? (
        /* Raw expression input */
        <div>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0 * * * *"
            className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-mono dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
          <p className="mt-1 text-[10px] text-gray-400">
            Format: minute hour day-of-month month day-of-week
          </p>
        </div>
      ) : (
        /* Visual dropdowns */
        <div className="flex gap-2">
          <SelectField
            label="Minute"
            value={minute}
            options={MINUTE_OPTIONS}
            onChange={(v) => updateField(0, v)}
          />
          <SelectField
            label="Hour"
            value={hour}
            options={HOUR_OPTIONS}
            onChange={(v) => updateField(1, v)}
          />
          <SelectField
            label="Day"
            value={dom}
            options={DOM_OPTIONS}
            onChange={(v) => updateField(2, v)}
          />
          <SelectField
            label="Month"
            value={month}
            options={MONTH_OPTIONS}
            onChange={(v) => updateField(3, v)}
          />
          <SelectField
            label="Weekday"
            value={dow}
            options={DOW_OPTIONS}
            onChange={(v) => updateField(4, v)}
          />
        </div>
      )}

      {/* Expression preview */}
      <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 dark:bg-gray-900/50">
        <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{value}</span>
        {parts === null && (
          <span className="text-[10px] text-red-500">Invalid expression</span>
        )}
      </div>

      {/* Next run times */}
      {nextRuns.length > 0 && (
        <div>
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Next 5 runs
          </div>
          <div className="space-y-0.5">
            {nextRuns.map((d, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded px-2 py-0.5 text-xs text-gray-600 dark:text-gray-400"
              >
                <span className="text-gray-300 dark:text-gray-600">{i + 1}.</span>
                {formatRunTime(d)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
