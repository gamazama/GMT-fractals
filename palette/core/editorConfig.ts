/**
 * editorConfig — pure helpers for the Stops mode's edited GradientConfig.
 *
 * Kept engine-free (no zustand, no store) so it is unit-testable in node and so
 * BOTH the history provider (undo) and the document provider (scene save/load)
 * can share one validator. The store (paletteEditorStore) wraps these; the
 * untrusted-deserialization surface is `coerceGradientConfig`.
 *
 * The per-stop validation reuses the engine `stopOps.normalizePaste` (the same
 * gate clipboard paste + gradient-file Import already run through) so the hex /
 * bias / interpolation rules can't drift between the two surfaces — this module
 * only adds the config envelope (colorSpace/blendSpace, the ≥2-stops rule, and the
 * RAMP form of ADR-0122 — `stops: []` + a well-formed `ramp`) and an id-uniqueness
 * pass (the editor keys knots by id).
 *
 * @see palette/store/paletteEditorStore.ts (the non-DDFS store that bridges these into undo + scene I/O)
 * @see utils/stopOps.ts (normalizePaste — the shared untrusted-stop validator)
 */

import type { GradientConfig, GradientStop, ColorSpaceMode, BlendColorSpace, JsonValue } from '../../types';
import { stopOps } from '../../utils/stopOps';
import { isRampString, normalizeGradientConfig } from '../../utils/gradientRamp';

const COLOR_SPACES: ColorSpaceMode[] = ['srgb', 'linear', 'aces_inverse'];
/**
 * Every blend space a saved gradient may name. 'hsv-far' is retired from every chooser
 * (owner, 2026-09-08) but stays here so gradients already saved in it survive a load.
 *
 * ADDING A MODE? It must land here too. `coerceGradientConfig` FALLS BACK to 'oklab'
 * for anything not in this list rather than throwing, so a mode missing from it looks
 * like it works in the editor and then silently resets every gradient saved in it.
 * Ordered along the picker's pigment↔tint axis. @see types/graphics.ts
 */
const BLEND_SPACES: BlendColorSpace[] = ['spectral', 'rgb', 'oklab-rect', 'oklab', 'cielch', 'hsv', 'hsv-far'];

/** The Stops mode's starting gradient — a vivid 3-stop ramp so the mode looks
 *  alive on first open (and what "Reset to default" restores). */
export const makeDefaultEditorConfig = (): GradientConfig => ({
    stops: [
        { id: 's1', position: 0, color: '#0B1026', bias: 0.5, interpolation: 'linear' },
        { id: 's2', position: 0.5, color: '#C2185B', bias: 0.5, interpolation: 'linear' },
        { id: 's3', position: 1, color: '#FFD166', bias: 0.5, interpolation: 'linear' },
    ],
    colorSpace: 'srgb',
    blendSpace: 'oklab',
});

/**
 * Give every stop a UNIQUE, non-empty id, minting only where one is missing or repeated.
 * Valid docs (all ids already unique strings) pass through untouched, same objects.
 *
 * Why both halves matter: the editor keys its knots, its bias handles, its selection, its
 * drag and every `stopOps` operation BY id. A repeated id makes those act on the wrong
 * knot. A MISSING one is worse, because `undefined === undefined` — `deleteStops` on a
 * selection of one then removes every stop in the gradient (measured 2026-09-12 on a GX
 * global gradient: 0 of 4 left).
 *
 * Exported because two surfaces need it and they are not the same surface:
 * `coerceGradientConfig` below runs it on anything being deserialized, and
 * `favientsStore.loadFavients` runs it to HEAL shelf entries that were persisted before
 * this existed — a filter can reject a bad entry but it cannot repair one already on disk.
 */
export const ensureStopIds = (stops: GradientStop[]): GradientStop[] => {
    const seen = new Set<string>();
    return stops.map((s, i) => {
        const has = typeof s.id === 'string' && s.id.length > 0;
        if (has && !seen.has(s.id)) { seen.add(s.id); return s; }
        let id: string;
        let n = i;
        do { id = `s${n++}`; } while (seen.has(id));
        seen.add(id);
        return { ...s, id };
    });
};

/**
 * Validate + normalise an untrusted snapshot into a GradientConfig of one of the two
 * forms (ADR-0122), or null when it isn't a usable gradient. The deserialization gate
 * for the document provider (untrusted scene files), the undo provider (our own
 * snapshots, which always pass), the share link, the GX Global parser and the working
 * input. Never throws.
 *
 *   - STOP form: ≥ 2 valid stops. Built from scratch, so a stale `ramp` riding along is
 *     dropped (stops win) and the result is byte-identical to what it was before ramps.
 *   - RAMP form: `stops` is literally `[]` and `ramp` is a well-formed ramp string. Only
 *     `[]` marks it — a stop list that normalised to nothing (every stop malformed) is
 *     garbage, not a ramp gradient, even when a ramp is present.
 *   - Anything else (< 2 valid stops, `stops: []` with no / a malformed ramp, not an
 *     object) → null.
 *
 * @invariant a ramp config coerces to itself and `stops: []` without a well-formed ramp
 *   is refused — proven by: `npx tsx debug/test-palette-editorconfig.mts` ("[7] a ramp
 *   gradient coerces to its own form", "[7] stops: [] without a well-formed ramp → null").
 *   Falsified 2026-09-14, see the harness header.
 */
export const coerceGradientConfig = (snap: unknown): GradientConfig | null => {
    if (!snap || typeof snap !== 'object' || Array.isArray(snap)) return null;
    const s = snap as Record<string, unknown>;
    const colorSpace = COLOR_SPACES.includes(s.colorSpace as ColorSpaceMode) ? (s.colorSpace as ColorSpaceMode) : 'srgb';
    const blendSpace = BLEND_SPACES.includes(s.blendSpace as BlendColorSpace) ? (s.blendSpace as BlendColorSpace) : 'oklab';
    if (Array.isArray(s.stops) && s.stops.length === 0) {
        return isRampString(s.ramp) ? { stops: [], ramp: s.ramp, colorSpace, blendSpace } : null;
    }
    // normalizePaste handles the {stops}-wrapper-or-array shape, drops malformed
    // entries, clamps position/bias, normalises hex, and validates interpolation.
    const stops = stopOps.normalizePaste(s.stops);
    if (!stops || stops.length < 2) return null;
    return { stops: ensureStopIds(stops), colorSpace, blendSpace };
};

/**
 * Snapshot a config as a plain JSON-value (deep clone — stable against later store
 * mutation). A persistence boundary, so a stale `ramp` on a stop gradient is stripped
 * first (`normalizeGradientConfig`): the saved form of a stop gradient stays what it was.
 */
export const serializeEditorConfig = (config: GradientConfig): JsonValue =>
    JSON.parse(JSON.stringify(normalizeGradientConfig(config))) as JsonValue;

/**
 * Normalise an AdvancedGradientEditor `onChange` payload into a full GradientConfig.
 * The editor emits the object form, but tolerates the legacy bare-`GradientStop[]`
 * shape defensively — in which case the caller's current blend/output space is
 * preserved (only the stops change). Shared by every host that mounts the editor
 * (the studio Stops MODE and the Generator's Stops mode) so the rule can't drift.
 */
export const applyEditorChange = (
    prev: GradientConfig,
    val: GradientStop[] | GradientConfig,
): GradientConfig => (Array.isArray(val) ? { ...prev, stops: val } : val);
