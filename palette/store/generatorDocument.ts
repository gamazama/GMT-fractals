/**
 * generator ⇄ scene document bridge — the Generator's consumer of the engine
 * document-provider registry (store/documentRegistry.ts, W8). Parallel to
 * favientsDocument.ts.
 *
 * The Generator's SCALAR/BOOL dials (mix, slot mods, ColorBox sweeps) live in the
 * `paletteGenerator` DDFS feature slice, which `getPreset()` already serialises into the
 * scene — so they round-trip for free. This provider carries ONLY the non-DDFS state:
 * the two source slots, the channel-curve Track[], curvesOn, detail/smooth, noiseSeed.
 *
 * Slots are stored as their RESOLVED 256-RGB ramps, NOT the in-memory catalog index — the
 * ad-hoc catalog (img2grad sends, slot bakes, drag-drops) isn't persisted, so a saved
 * index would restore the wrong gradient (or none). On load each ramp is re-registered as
 * an ad-hoc catalog entry (content-deduped) and the slot points at the fresh index. This
 * is why serialize can't simply reuse captureGeneratorHistory (which keeps indices, correct
 * only for same-session undo).
 *
 * serialize → { slotA/slotB: RGB[256], slotAName/slotBName, tracks, curvesOn, detail,
 *   smooth, noiseSeed }.
 * restore   → coerce each field from the (untrusted) scene snapshot, re-register the slot
 *   ramps, and write through. A ramp that fails validation leaves that slot as-is; tracks
 *   that aren't a valid {L,C,h} fall back to "no curves" (so a malformed scene can never
 *   throw inside the curve sampler at render time).
 *
 * @see palette/store/generatorStore.ts (slotSnapshot / restoreGeneratorHistory)
 * @see palette/core/presetCatalog.ts (registerCustomRamp — content-deduped)
 * @see store/documentRegistry.ts (the engine registry it plugs into)
 */

import type { JsonValue } from '../../types';
import type { RGB } from '../core/oklab';
import { useGeneratorStore, slotSnapshot, restoreGeneratorHistory } from './generatorStore';
import { registerCustomRamp } from '../core/presetCatalog';
import { coerceGradientConfig, serializeEditorConfig } from '../core/editorConfig';
import { num, bool, str, isPlainObject } from './coerceJson';

export const serializeGeneratorDocument = (): JsonValue => {
  const s = useGeneratorStore.getState();
  const a = slotSnapshot(s.slotA);
  const b = slotSnapshot(s.slotB);
  return {
    slotA: a.ramp as unknown as JsonValue,
    slotAName: a.name,
    slotB: b.ramp as unknown as JsonValue,
    slotBName: b.name,
    tracks: (s.tracks ?? null) as unknown as JsonValue,
    curvesOn: s.curvesOn,
    detail: s.detail,
    smooth: s.smooth,
    noiseSeed: s.noiseSeed,
    // Stops-mode gradient — a portable GradientConfig (serialised through the same
    // editor serialiser the Stops MODE uses, so it round-trips identically).
    stopsConfig: serializeEditorConfig(s.stopsConfig),
  };
};

/** Coerce an untrusted slot snapshot into exactly 256 finite RGB, or null (slot unchanged).
 *  A short / malformed array is rejected wholesale rather than fed to registerCustomRamp
 *  (which indexes ramp[0..255] and would deref undefined). */
const sanitizeRamp = (v: unknown): RGB[] | null => {
  if (!Array.isArray(v) || v.length < 256) return null;
  const out: RGB[] = new Array(256);
  for (let i = 0; i < 256; i++) {
    const e = v[i];
    if (!isPlainObject(e)) return null;
    out[i] = { r: num(e.r, 0), g: num(e.g, 0), b: num(e.b, 0) };
  }
  return out;
};

/**
 * A valid ChannelTracks ({L,C,h}, each a Track with a `keyframes` array), else null
 * (no curves). Checking the keyframes array — not just key presence — is what makes the
 * "malformed scene can never throw inside the curve sampler" guarantee hold: trackToRamp
 * runs at React render time, OUTSIDE the document registry's restore() try/catch, so a
 * shape that fooled a key-only check ({L:5,…}) would crash the Generator view on load.
 */
const sanitizeTracks = (t: unknown): JsonValue => {
  if (!isPlainObject(t)) return null;
  const ok = (k: string): boolean => {
    const tr = t[k];
    return isPlainObject(tr) && Array.isArray((tr as { keyframes?: unknown }).keyframes);
  };
  return ok('L') && ok('C') && ok('h') ? (t as JsonValue) : null;
};

/**
 * Restore the Generator's non-DDFS state from a scene snapshot. Fail-safe against
 * untrusted input: every field is coerced with a default, slot ramps are re-registered
 * (content-deduped), and only the known keys are written (the DDFS dials are restored
 * separately by the preset path). A garbage / absent snapshot leaves the state untouched.
 */
export const restoreGeneratorDocument = (snap: JsonValue): void => {
  if (!isPlainObject(snap)) return;
  const s = snap;
  const cur = useGeneratorStore.getState();

  const rampA = sanitizeRamp(s.slotA);
  const rampB = sanitizeRamp(s.slotB);
  const slotA = rampA ? registerCustomRamp(rampA, str(s.slotAName) ?? 'Slot A') : cur.slotA;
  const slotB = rampB ? registerCustomRamp(rampB, str(s.slotBName) ?? 'Slot B') : cur.slotB;

  const tracks = sanitizeTracks(s.tracks);
  // Coerce the untrusted stops doc (never throws, null on garbage) — keep the current
  // stops gradient if the scene's is missing/malformed rather than blanking it.
  const stopsConfig = coerceGradientConfig(s.stopsConfig) ?? cur.stopsConfig;
  restoreGeneratorHistory({
    slotA,
    slotB,
    tracks,
    // curvesOn only makes sense with tracks to drive — keep them coherent.
    curvesOn: tracks ? bool(s.curvesOn, false) : false,
    detail: num(s.detail, 8),
    smooth: num(s.smooth, 5),
    noiseSeed: num(s.noiseSeed, 1),
    stopsConfig,
  });
};
