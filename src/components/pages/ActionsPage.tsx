import {
  Power,
  Radio,
  Rocket,
  Send,
  Server,
  ToggleLeft,
  ToggleRight,
  Upload,
  Download,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActionButton } from "@/components/ui/ActionButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { apiPost } from "@/lib/api-actions";
import { toastError, toastSuccess } from "@/store/toast-store";

// ── Types ───────────────────────────────────────────────────────────

interface OllamaModel {
  name: string;
  loaded: boolean;
}

// ── Section wrapper ─────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-[rgba(0,255,65,0.12)] dark:bg-[rgba(0,10,0,0.6)]">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ── Gateway Section ─────────────────────────────────────────────────

function GatewaySection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleRestart = useCallback(async () => {
    await apiPost("/api/gateway/restart");
    toastSuccess("Gateway", "Restart signal sent");
    setConfirmOpen(false);
  }, []);

  return (
    <Section title="Gateway">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
            <Server className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Gateway Service</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Restart the OpenClaw Gateway process</p>
          </div>
        </div>
        <ActionButton
          label="Restart"
          icon={Power}
          variant="danger"
          onClick={() => {
            setConfirmOpen(true);
            return Promise.resolve();
          }}
          successMessage=""
        />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Restart Gateway"
        message="This will restart the Gateway process. All active connections will be temporarily interrupted. Are you sure?"
        confirmLabel="Restart"
        variant="danger"
        onConfirm={handleRestart}
        onCancel={() => setConfirmOpen(false)}
      />
    </Section>
  );
}

// ── Work Mode Section ───────────────────────────────────────────────

function WorkModeSection() {
  const [mode, setMode] = useState<"default" | "recording">("default");
  const [switching, setSwitching] = useState(false);

  const toggle = useCallback(async () => {
    const next = mode === "default" ? "recording" : "default";
    setSwitching(true);
    try {
      await apiPost("/api/workmode", { mode: next });
      setMode(next);
      toastSuccess("Work Mode", `Switched to ${next}`);
    } catch (err) {
      toastError("Work Mode", err instanceof Error ? err.message : String(err));
    } finally {
      setSwitching(false);
    }
  }, [mode]);

  const isRecording = mode === "recording";
  const Icon = isRecording ? ToggleRight : ToggleLeft;

  return (
    <Section title="Work Mode">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${isRecording ? "bg-red-500/10" : "bg-gray-500/10"}`}>
            <Radio className={`h-5 w-5 ${isRecording ? "text-red-500" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isRecording ? "Recording" : "Default"} Mode
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isRecording ? "Session recording is active" : "Normal operation mode"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={switching}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
            isRecording
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>
    </Section>
  );
}

// ── Ollama Section ──────────────────────────────────────────────────

function OllamaSection() {
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelInput, setModelInput] = useState("");

  useEffect(() => {
    async function fetchModels() {
      try {
        const res = await fetch("/mc-api/agents");
        if (res.ok) {
          const data = await res.json() as { agents?: Array<{ model?: string; status?: string }> };
          const agentModels = (data.agents ?? [])
            .filter((a) => a.model)
            .map((a) => ({
              name: a.model as string,
              loaded: a.status === "active",
            }));
          // Deduplicate
          const seen = new Set<string>();
          const unique: OllamaModel[] = [];
          for (const m of agentModels) {
            if (!seen.has(m.name)) {
              seen.add(m.name);
              unique.push(m);
            }
          }
          setModels(unique);
        }
      } catch {
        // ignore
      }
    }
    void fetchModels();
  }, []);

  const handleLoad = useCallback(async (model: string) => {
    await apiPost("/api/ollama/load", { model });
  }, []);

  const handleUnload = useCallback(async (model: string) => {
    await apiPost("/api/ollama/unload", { model });
  }, []);

  const handleLoadCustom = useCallback(async () => {
    const name = modelInput.trim();
    if (!name) return;
    await apiPost("/api/ollama/load", { model: name });
    setModelInput("");
    toastSuccess("Ollama", `Loading ${name}`);
  }, [modelInput]);

  return (
    <Section title="Ollama Models">
      {models.length > 0 && (
        <div className="mb-4 space-y-2">
          {models.map((m) => (
            <div
              key={m.name}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${m.loaded ? "bg-emerald-400" : "bg-gray-400"}`} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{m.name}</span>
              </div>
              <div className="flex gap-2">
                {!m.loaded && (
                  <ActionButton
                    label="Load"
                    icon={Download}
                    size="sm"
                    variant="primary"
                    onClick={() => handleLoad(m.name)}
                    successMessage={`Loading ${m.name}`}
                  />
                )}
                {m.loaded && (
                  <ActionButton
                    label="Unload"
                    icon={Upload}
                    size="sm"
                    variant="secondary"
                    onClick={() => handleUnload(m.name)}
                    successMessage={`Unloading ${m.name}`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={modelInput}
          onChange={(e) => setModelInput(e.target.value)}
          placeholder="Model name (e.g. llama3)"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleLoadCustom();
          }}
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
        />
        <ActionButton
          label="Load"
          icon={Download}
          onClick={handleLoadCustom}
          successMessage="Model load requested"
          disabled={!modelInput.trim()}
        />
      </div>
    </Section>
  );
}

// ── Deploy Section ──────────────────────────────────────────────────

function DeploySection() {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeploy = useCallback(async () => {
    await apiPost("/api/deploy");
    toastSuccess("Deploy", "Deployment started");
    setConfirmOpen(false);
  }, []);

  return (
    <Section title="Deploy">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
            <Rocket className="h-5 w-5 text-blue-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Deploy</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Trigger a production deployment</p>
          </div>
        </div>
        <ActionButton
          label="Deploy"
          icon={Rocket}
          onClick={() => {
            setConfirmOpen(true);
            return Promise.resolve();
          }}
          successMessage=""
        />
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Confirm Deploy"
        message="This will trigger a production deployment. Make sure all changes are committed and tested. Continue?"
        confirmLabel="Deploy"
        onConfirm={handleDeploy}
        onCancel={() => setConfirmOpen(false)}
      />
    </Section>
  );
}

// ── Messaging Section ───────────────────────────────────────────────

function MessagingSection() {
  const [channel, setChannel] = useState("");
  const [to, setTo] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    if (!channel.trim() || !text.trim()) return;
    setSending(true);
    try {
      await apiPost("/api/message/send", {
        channel: channel.trim(),
        to: to.trim(),
        text: text.trim(),
      });
      toastSuccess("Message", "Message sent");
      setText("");
      setTo("");
    } catch (err) {
      toastError("Message", err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [channel, to, text]);

  return (
    <Section title="Messaging">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Channel
            </label>
            <input
              type="text"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              placeholder="e.g. slack, telegram"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Recipient
            </label>
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="User or group"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Message
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="Type your message..."
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-blue-500"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={sending || !channel.trim() || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </button>
        </div>
      </div>
    </Section>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export function ActionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Quick Actions</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          System controls and operational actions
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <GatewaySection />
        <WorkModeSection />
        <OllamaSection />
        <DeploySection />
      </div>

      <MessagingSection />
    </div>
  );
}
