/**
 * AmbientSounds — side-effect component that synthesizes ambient office sounds.
 * Renders nothing. Volume scales with active agent count (max 0.3).
 * Respects localStorage "mc_sound_muted" preference.
 * Mute toggle is in the TopBar (MuteToggle component).
 */
import { useAmbientSounds } from "@/hooks/useAmbientSounds";

export function AmbientSounds() {
  useAmbientSounds();
  return null;
}
