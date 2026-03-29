import { AlertTriangle, Loader2, Plus, RefreshCw, X, Zap } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toastError, toastSuccess } from "@/store/toast-store";

interface AgentControlsProps {
  agentId: string;
  agentName: string;
}

interface OllamaModel {
  name: string;
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>
        <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-2 text-sm font-medium text-white transition-colors ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpawnModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [model, setModel] = useState("");
  const [task, setTask] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [spawning, setSpawning] = useState(false);

  useEffect(() => {
    fetch("/mc-api/ollama")
      .then((r) => r.json())
      .then((d: { models?: OllamaModel[] }) => {
        const names = (d.models ?? []).map((m) => m.name);
        setModels(names);
        if (names.length > 0 && !model) setModel(names[0]);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpawn = useCallback(async () => {
    if (!name.trim() || !task.trim()) return;
    setSpawning(true);
    try {
      const res = await fetch("/mc-api/actions/agent-spawn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), model, task: task.trim() }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toastSuccess("Agent Spawned", `${name} is starting up`);
      onClose();
    } catch (err) {
      toastError("Spawn Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setSpawning(false);
    }
  }, [name, model, task, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-emerald-500" />
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              Spawn New Agent
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Agent Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. research-agent"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Model
            </label>
            {models.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              >
                {models.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. llama3.2"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Task Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={task}
              onChange={(e) => setTask(e.target.value)}
              rows={3}
              placeholder="Describe what this agent should do..."
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSpawn}
            disabled={spawning || !name.trim() || !task.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {spawning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Spawn
          </button>
        </div>
      </div>
    </div>
  );
}

export function AgentControls({ agentId, agentName }: AgentControlsProps) {
  const [restarting, setRestarting] = useState(false);
  const [killing, setKilling] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [showSpawn, setShowSpawn] = useState(false);

  const handleRestart = useCallback(async () => {
    setConfirmRestart(false);
    setRestarting(true);
    try {
      const res = await fetch("/mc-api/actions/agent-restart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toastSuccess("Restarting", `${agentName} is restarting`);
    } catch (err) {
      toastError("Restart Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setRestarting(false);
    }
  }, [agentId, agentName]);

  const handleKill = useCallback(async () => {
    setConfirmKill(false);
    setKilling(true);
    try {
      const res = await fetch("/mc-api/actions/agent-kill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toastSuccess("Agent Killed", `${agentName} has been stopped`);
    } catch (err) {
      toastError("Kill Failed", err instanceof Error ? err.message : String(err));
    } finally {
      setKilling(false);
    }
  }, [agentId, agentName]);

  return (
    <>
      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-700">
        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          Controls
        </h4>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setConfirmRestart(true)}
            disabled={restarting}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
          >
            {restarting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            Restart
          </button>

          <button
            type="button"
            onClick={() => setConfirmKill(true)}
            disabled={killing}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {killing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <X className="h-3.5 w-3.5" />
            )}
            Kill
          </button>

          <button
            type="button"
            onClick={() => setShowSpawn(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Spawn New
          </button>
        </div>
      </div>

      {confirmRestart && (
        <ConfirmDialog
          title="Restart Agent"
          message={`Restart ${agentName}? Any in-progress tasks will be interrupted.`}
          confirmLabel="Restart"
          confirmClass="bg-amber-500 hover:bg-amber-600"
          onConfirm={handleRestart}
          onCancel={() => setConfirmRestart(false)}
        />
      )}

      {confirmKill && (
        <ConfirmDialog
          title="Kill Agent"
          message={`Permanently stop ${agentName}? This cannot be undone.`}
          confirmLabel="Kill Agent"
          confirmClass="bg-red-600 hover:bg-red-700"
          onConfirm={handleKill}
          onCancel={() => setConfirmKill(false)}
        />
      )}

      {showSpawn && <SpawnModal onClose={() => setShowSpawn(false)} />}
    </>
  );
}
