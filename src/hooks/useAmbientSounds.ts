/**
 * Ambient Office Sounds — Web Audio API synthesized tones.
 * Toggle via settings. No external audio files.
 */
import { useEffect, useRef, useCallback } from "react";
import { useOfficeStore } from "@/store/office-store";

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

/** Soft click — like a mechanical key press */
function playKeyClick() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 400, ctx.currentTime);
    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch { /* ignore */ }
}

/** Soft chime — task completion */
function playChime() {
  try {
    const ctx = getAudioContext();
    const notes = [523, 659, 784]; // C5, E5, G5

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.04, ctx.currentTime + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.1);
      osc.stop(ctx.currentTime + i * 0.1 + 0.4);
    });
  } catch { /* ignore */ }
}

/** Muted alert — error tone */
function playAlert() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.03, ctx.currentTime);
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

  // Count active thinkers for keyboard click rate
  const thinkingCount = Array.from(agents.values()).filter(
    (a) => a.status === "thinking" || a.status === "tool_calling",
  ).length;

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
      if (Math.random() < 0.6) playKeyClick();
    }, interval);

    return () => {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    };
  }, [soundEnabled, thinkingCount]);

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
          playChime();
        }
        // Error occurred
        if (agent.status === "error" && oldStatus !== "error") {
          playAlert();
        }
      }
    }

    prevStatusesRef.current = next;
  }, [agents, soundEnabled]);

  useEffect(() => {
    checkStatusChanges();
  }, [checkStatusChanges]);
}
