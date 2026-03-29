/**
 * Ambient Office Sounds — Web Audio API synthesized tones.
 * Toggle via settings. No external audio files.
 * Volume scales with active agent count (max 0.3).
 * Respects localStorage "mc_sound_muted" preference.
 */
import { useEffect, useRef, useCallback } from "react";
import { useOfficeStore } from "@/store/office-store";

/** Check both the MC-specific and notification-system mute keys */
function checkMuted(): boolean {
  try {
    return (
      localStorage.getItem("mc_sound_muted") === "true" ||
      localStorage.getItem("openclaw-notification-muted") === "true"
    );
  } catch {
    return false;
  }
}

/** Scale gain by active agent count: 0 → 0.05, 5+ → 0.30 (max) */
function getVolumeScale(activeCount: number): number {
  return Math.min(0.30, 0.05 + activeCount * 0.05);
}

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

/** Soft click — like a mechanical key press */
function playKeyClick(gainScale: number) {
  try {
    if (checkMuted()) return;
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
    gain.gain.setValueAtTime(gainScale * 0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch { /* ignore */ }
}

/** Soft chime — task completion */
function playChime(gainScale: number) {
  try {
    if (checkMuted()) return;
    const ctx = getAudioContext();
    const notes = [523, 659, 784]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(gainScale * 0.13, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  } catch { /* ignore */ }
}

/** Muted alert — error tone */
function playAlert(gainScale: number) {
  try {
    if (checkMuted()) return;
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(gainScale * 0.10, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* ignore */ }
}

export function useAmbientSounds() {
  const agents = useOfficeStore((s) => s.agents);
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const clickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const agentList = Array.from(agents.values());
  const activeCount = agentList.filter((a) => !a.isPlaceholder && a.status !== "offline").length;
  const thinkingCount = agentList.filter(
    (a) => a.status === "thinking" || a.status === "tool_calling",
  ).length;
  const volumeScale = getVolumeScale(activeCount);

  // Keyboard clicking tied to thinking agents
  useEffect(() => {
    if (!soundEnabled || thinkingCount === 0) {
      if (clickTimerRef.current) {
        clearInterval(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      return;
    }

    // More thinkers = faster clicking (200ms → 80ms)
    const interval = Math.max(80, 200 - thinkingCount * 20);
    clickTimerRef.current = setInterval(() => {
      if (Math.random() < 0.6) playKeyClick(volumeScale);
    }, interval);

    return () => {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    };
  }, [soundEnabled, thinkingCount, volumeScale]);

  // Status change detection for chime/alert
  const checkStatusChanges = useCallback(() => {
    if (!soundEnabled) return;

    const prev = prevStatusesRef.current;
    const next = new Map<string, string>();

    for (const [id, agent] of agents.entries()) {
      next.set(id, agent.status);
      const oldStatus = prev.get(id);

      if (oldStatus && oldStatus !== agent.status) {
        // Task completion: was thinking/tool_calling → now idle
        if (
          (oldStatus === "thinking" || oldStatus === "tool_calling") &&
          agent.status === "idle"
        ) {
          playChime(volumeScale);
        }
        // Error occurred
        if (agent.status === "error" && oldStatus !== "error") {
          playAlert(volumeScale);
        }
      }
    }

    prevStatusesRef.current = next;
  }, [agents, soundEnabled, volumeScale]);

  useEffect(() => {
    checkStatusChanges();
  }, [checkStatusChanges]);
}
