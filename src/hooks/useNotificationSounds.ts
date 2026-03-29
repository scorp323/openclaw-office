/**
 * Notification sounds — Web Audio API synthesized tones with volume control.
 *
 * Provides: completion chime, error alert, agent activity clicks.
 * All tones are synthesized — no external audio files.
 */
import { useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { useOfficeStore } from "@/store/office-store";

// ── Volume state (persisted to localStorage) ──

const VOLUME_KEY = "openclaw-notification-volume";
const MUTE_KEY = "openclaw-notification-muted";

let _volume = (() => {
  try {
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "0.5");
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.5;
  } catch { return 0.5; }
})();

let _muted = (() => {
  try { return localStorage.getItem(MUTE_KEY) === "true"; } catch { return false; }
})();

const _listeners = new Set<() => void>();

function notifyListeners() {
  _listeners.forEach((l) => l());
}

interface SoundState {
  volume: number;
  muted: boolean;
}

let _cached: SoundState = { volume: _volume, muted: _muted };
let _cacheKey = `${_volume}-${_muted}`;

function getSnapshot(): SoundState {
  const key = `${_volume}-${_muted}`;
  if (key !== _cacheKey) {
    _cacheKey = key;
    _cached = { volume: _volume, muted: _muted };
  }
  return _cached;
}

function subscribeSoundState(cb: () => void): () => void {
  _listeners.add(cb);
  return () => { _listeners.delete(cb); };
}

export function useSoundState(): SoundState & { setVolume: (v: number) => void; toggleMute: () => void } {
  const state = useSyncExternalStore(subscribeSoundState, getSnapshot);

  const setVolume = useCallback((v: number) => {
    _volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem(VOLUME_KEY, String(_volume)); } catch { /* */ }
    notifyListeners();
  }, []);

  const toggleMute = useCallback(() => {
    _muted = !_muted;
    try { localStorage.setItem(MUTE_KEY, String(_muted)); } catch { /* */ }
    notifyListeners();
  }, []);

  return { ...state, setVolume, toggleMute };
}

// ── Audio engine ──

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function effectiveVolume(): number {
  return _muted ? 0 : _volume;
}

/** Pleasant sine wave chord — task completion */
export function playCompletionChime(): void {
  const vol = effectiveVolume();
  if (vol === 0) return;
  try {
    const ctx = getCtx();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 — major chord
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(vol * 0.06, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      env.gain.setValueAtTime(0, ctx.currentTime + i * 0.08);
      env.gain.linearRampToValueAtTime(1, ctx.currentTime + i * 0.08 + 0.02);
      env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.08 + 0.5);
      osc.connect(env);
      env.connect(masterGain);
      osc.start(ctx.currentTime + i * 0.08);
      osc.stop(ctx.currentTime + i * 0.08 + 0.5);
    });
  } catch { /* AudioContext not available */ }
}

/** Muted lower-frequency alert — error tone */
export function playErrorAlert(): void {
  const vol = effectiveVolume();
  if (vol === 0) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(196, ctx.currentTime); // G3
    osc.frequency.linearRampToValueAtTime(165, ctx.currentTime + 0.35); // E3
    gain.gain.setValueAtTime(vol * 0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch { /* */ }
}

/** Very subtle key click — agent activity */
export function playActivityClick(): void {
  const vol = effectiveVolume();
  if (vol === 0) return;
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(700 + Math.random() * 500, ctx.currentTime);
    gain.gain.setValueAtTime(vol * 0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch { /* */ }
}

// ── React hook — monitors agent status for automatic sound triggers ──

export function useNotificationSounds(): void {
  const agents = useOfficeStore((s) => s.agents);
  const soundEnabled = useOfficeStore((s) => s.soundEnabled);
  const prevStatusesRef = useRef<Map<string, string>>(new Map());
  const clickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const thinkingCount = Array.from(agents.values()).filter(
    (a) => a.status === "thinking" || a.status === "tool_calling",
  ).length;

  // Typing/clicking when agents are active
  useEffect(() => {
    if (!soundEnabled || thinkingCount === 0 || _muted) {
      if (clickTimerRef.current) {
        clearInterval(clickTimerRef.current);
        clickTimerRef.current = null;
      }
      return;
    }

    const interval = Math.max(80, 200 - thinkingCount * 20);
    clickTimerRef.current = setInterval(() => {
      if (Math.random() < 0.5) playActivityClick();
    }, interval);

    return () => {
      if (clickTimerRef.current) clearInterval(clickTimerRef.current);
    };
  }, [soundEnabled, thinkingCount]);

  // Status change detection
  const checkChanges = useCallback(() => {
    if (!soundEnabled) return;

    const prev = prevStatusesRef.current;
    const next = new Map<string, string>();

    for (const [id, agent] of agents.entries()) {
      next.set(id, agent.status);
      const oldStatus = prev.get(id);
      if (oldStatus && oldStatus !== agent.status) {
        if (
          (oldStatus === "thinking" || oldStatus === "tool_calling") &&
          agent.status === "idle"
        ) {
          playCompletionChime();
        }
        if (agent.status === "error" && oldStatus !== "error") {
          playErrorAlert();
        }
      }
    }
    prevStatusesRef.current = next;
  }, [agents, soundEnabled]);

  useEffect(() => {
    checkChanges();
  }, [checkChanges]);
}
