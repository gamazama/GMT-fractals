/**
 * Camera-Pair Registry
 * ────────────────────
 * Pairs a set of "pan" tracks with a "zoom" track so they tween
 * coherently. Without this, a deep-zoom flythrough animates pan
 * linearly in time but zoom logarithmically — pan whips across the
 * view at the deep end because world-units-per-frame stays constant
 * while the visible world shrinks exponentially.
 *
 * Formula (linear-in-zoom, the standard fractal-zoomer trick):
 *
 *   For a pan-segment between pan keys at frames f0, f1:
 *     z0  = zoomTrack.value(f0)
 *     z1  = zoomTrack.value(f1)
 *     zT  = zoomTrack.value(frame)
 *     pan = c0 + (c1 − c0) · (zT − z0) / (z1 − z0)
 *
 * This is the closed form of "constant screen-space pan velocity"
 * when integrated against a logarithmic zoom curve. Each pan
 * component (center.x / .y / centerLow.x / .y) gets the same
 * treatment with the same zoom anchors, so the DD pair stays
 * coherent.
 *
 * Easing — two layers:
 *   • Macro: zoom track's Bezier handles shape z(t); pan inherits via
 *     the formula's zoomAt() lookups.
 *   • Per-pan-segment: pan keys' own Bezier handles re-shape the path
 *     progress u(t) within their segment via a "virtual frame" trick —
 *     compute eased u from pan tangents (normalized into u-space so the
 *     graph-editor shape is preserved), advance the frame to fVirt =
 *     f0 + u_eased · Δf, then evaluate linear-in-zoom at fVirt. Linear
 *     pan keys collapse u_eased to t, recovering the un-eased path.
 *
 * Edge cases:
 *   - z0 ≈ z1 (no zoom change in segment): falls back to linear-in-time
 *     pan, so pure-pan-mid-flat-zoom works normally.
 *   - Pan track has no keys, or zoom track has no keys: no override
 *     (caller falls back to standard interpolation).
 *   - Frame outside the pan track's first/last key: returns the clamp
 *     value (matches AnimationEngine's standard out-of-range behaviour).
 */

import type { AnimationSequence, Keyframe } from '../../types';
import { AnimationMath } from '../math/AnimationMath';
import { isLogTrack } from './logTrackRegistry';
import { useAnimationStore } from '../../store/animationStore';

// ── Double-double primitives ────────────────────────────────────────────
//
// At zoom ~1e-15 the visible world width drops below f64 mantissa
// precision (~1e-16 absolute when center magnitudes are O(1)). Lerping
// `center` and `centerLow` as four independent f64 scalars then leaves
// each frame's (hi, lo) pair noisy at the ULP level — visible per-frame
// shake during a tween through the precision boundary. Doing the lerp as
// a DD operation on the pair as a whole gives ~1e-32 absolute precision,
// quiet motion past e-30.

/** Knuth two-sum: returns `[s, err]` with `s + err === a + b` exactly. */
const twoSum = (a: number, b: number): [number, number] => {
    const s = a + b;
    const bb = s - a;
    const err = a - (s - bb) + (b - bb);
    return [s, err];
};

/** DD + DD → DD (Dekker). */
const ddAdd = (ah: number, al: number, bh: number, bl: number): [number, number] => {
    const [s, e] = twoSum(ah, bh);
    return twoSum(s, e + (al + bl));
};

/** DD − DD → DD. */
const ddSub = (ah: number, al: number, bh: number, bl: number): [number, number] =>
    ddAdd(ah, al, -bh, -bl);

/** DD × f64 → DD. Veltkamp split for the two-product, then absorb the
 *  small `al · b` term and renormalise. Sufficient for our `t ∈ [0,1]`
 *  scaling — full triple-double accuracy isn't needed here. */
const SPLITTER = 134217729; // 2^27 + 1
const ddMulD = (ah: number, al: number, b: number): [number, number] => {
    const ahS = SPLITTER * ah;
    const ahHi = ahS - (ahS - ah);
    const ahLo = ah - ahHi;
    const bS = SPLITTER * b;
    const bHi = bS - (bS - b);
    const bLo = b - bHi;
    const p = ah * b;
    const e = ((ahHi * bHi - p) + ahHi * bLo + ahLo * bHi) + ahLo * bLo;
    return twoSum(p, e + al * b);
};

export interface CameraPair {
    /** Track ID of the zoom (or any monotonic 1-D scale param) that
     *  drives the pan path. Typically registered with the log-track
     *  registry too, so its own interpolation is in log-value space. */
    zoom: string;
    /** Pan tracks that should travel with the zoom. Each is interpolated
     *  via the linear-in-zoom formula independently. Visible in the
     *  timeline. */
    pan: readonly string[];
    /** Optional "low word" tracks for DD-precision pan accumulators
     *  (e.g. fluid-toy's `centerLow_x/_y`). Treated identically to
     *  `pan` by the formula but flagged as hidden tracks at
     *  registration so the timeline UI doesn't expose unanimateable
     *  sub-f64 residuals. */
    panLow?: readonly string[];
}

/** Index for O(1) lookup: trackId → CameraPair (the one that owns it
 *  as a pan or panLow). A track can only belong to one pair. */
const trackToPair = new Map<string, CameraPair>();

export function registerCameraPair(pair: CameraPair): void {
    for (const t of pair.pan) trackToPair.set(t, pair);
    if (pair.panLow) for (const t of pair.panLow) trackToPair.set(t, pair);

    // Retroactively hide any panLow tracks that already exist in the
    // store — handles app-boot ordering where the pair registers AFTER
    // an old scene was loaded with these tracks already present and
    // visible. New tracks created via Key Cam pick up `hidden:true` at
    // creation time via cameraKeyRegistry.
    if (pair.panLow && pair.panLow.length > 0) {
        const animState = useAnimationStore.getState() as any;
        const existingTracks = animState.sequence?.tracks ?? {};
        let needsUpdate = false;
        const newTracks = { ...existingTracks };
        for (const tid of pair.panLow) {
            if (newTracks[tid] && !newTracks[tid].hidden) {
                newTracks[tid] = { ...newTracks[tid], hidden: true };
                needsUpdate = true;
            }
        }
        if (needsUpdate) {
            useAnimationStore.setState({
                sequence: { ...animState.sequence, tracks: newTracks },
            });
        }
    }
}

/** Evaluate one channel of the zoom track at `frame`. Standalone
 *  re-implementation of the standard piecewise interpolation so the
 *  pair binder doesn't have to import AnimationEngine (which would
 *  create a cycle). Honours the log-track registry. */
function zoomAt(zoomKeys: readonly Keyframe[], frame: number, isLog: boolean): number {
    if (zoomKeys.length === 0) return 1;
    if (frame <= zoomKeys[0].frame) return zoomKeys[0].value;
    const last = zoomKeys[zoomKeys.length - 1];
    if (frame >= last.frame) return last.value;
    for (let i = 0; i < zoomKeys.length - 1; i++) {
        const k1 = zoomKeys[i];
        const k2 = zoomKeys[i + 1];
        if (frame >= k1.frame && frame <= k2.frame) {
            return AnimationMath.interpolate(frame, k1, k2, false, isLog);
        }
    }
    return last.value;
}

/** Compute the path-progress for a pan segment at `frame`, honoring
 *  pan-key Bezier handles. Returns `[u_eased, k0, k1]` or `null` when
 *  the formula doesn't apply (frame outside segment, zero-length etc).
 *  Pulled out of evaluatePairedTrack so the DD-pair path can re-use the
 *  same easing math without duplicating the segment-search + tangent
 *  normalisation logic. */
function panProgress(
    panKeys: readonly Keyframe[],
    frame: number,
): { u: number; k0: Keyframe; k1: Keyframe } | null {
    if (panKeys.length === 0) return null;
    if (frame <= panKeys[0].frame || frame >= panKeys[panKeys.length - 1].frame) return null;

    let k0: Keyframe | null = null;
    let k1: Keyframe | null = null;
    for (let i = 0; i < panKeys.length - 1; i++) {
        if (frame >= panKeys[i].frame && frame <= panKeys[i + 1].frame) {
            k0 = panKeys[i];
            k1 = panKeys[i + 1];
            break;
        }
    }
    if (!k0 || !k1) return null;

    const dc = k1.value - k0.value;
    const segDur = k1.frame - k0.frame;
    if (segDur < 1e-9) return { u: 0, k0, k1 };

    let u: number;
    if (k0.interpolation === 'Step') {
        u = 0;
    } else if (k0.interpolation === 'Linear' || Math.abs(dc) < 1e-12) {
        u = (frame - k0.frame) / segDur;
    } else {
        // Re-normalise tangent y-values into u-space so the graph-editor
        // shape is preserved as a re-mapping of u(t).
        const k0u: Keyframe = {
            ...k0,
            value: 0,
            rightTangent: k0.rightTangent
                ? { x: k0.rightTangent.x, y: k0.rightTangent.y / dc }
                : undefined,
        };
        const k1u: Keyframe = {
            ...k1,
            value: 1,
            leftTangent: k1.leftTangent
                ? { x: k1.leftTangent.x, y: k1.leftTangent.y / dc }
                : undefined,
        };
        u = AnimationMath.interpolate(frame, k0u, k1u, false, false);
    }
    return { u, k0, k1 };
}

// ── DD-pair cache ───────────────────────────────────────────────────────
//
// AnimationEngine.scrub() iterates every track at a single frame, then
// advances. We use that ordering: the first call into evaluatePairedTrack
// for a given (pair, axis) computes the full DD lerp; later calls within
// the same frame for the matching hi/lo channel hit the cache. Keyed by
// frame so a re-scrub recomputes; entries are tiny (4 floats) so we just
// hold them indefinitely.

interface DDCacheEntry { frame: number; sequence: AnimationSequence; hi: number; lo: number; }
const ddCache = new Map<string, DDCacheEntry>();

const ddCacheKey = (zoomTrackId: string, axis: number) => `${zoomTrackId}::${axis}`;

/** Compute the DD-precise (hi, lo) pair for one axis of a pair at
 *  `frame`. Returns null when the formula can't apply (no pair keys,
 *  outside segment, etc) so the caller can fall back. */
function evaluateDDPairAxis(
    pair: CameraPair,
    axis: number,
    frame: number,
    sequence: AnimationSequence,
): DDCacheEntry | null {
    const key = ddCacheKey(pair.zoom, axis);
    const cached = ddCache.get(key);
    // Both frame AND sequence must match — Zustand swaps the sequence
    // reference on any keyframe edit, so reference equality is the
    // cheapest valid invalidation signal. Without it, editing a key at
    // the current playhead returns stale values until the playhead moves.
    if (cached && cached.frame === frame && cached.sequence === sequence) return cached;

    const hiTrackId = pair.pan[axis];
    const loTrackId = pair.panLow?.[axis];
    const hiTrack = sequence.tracks[hiTrackId];
    const loTrack = loTrackId ? sequence.tracks[loTrackId] : undefined;
    const zoomTrack = sequence.tracks[pair.zoom];
    if (!hiTrack || !zoomTrack) return null;

    const hiKeys = hiTrack.keyframes;
    if (hiKeys.length === 0) return null;

    // Outside the hi track's keyframe range: clamp.
    if (frame <= hiKeys[0].frame) {
        const loVal = loTrack && loTrack.keyframes.length > 0
            ? loTrack.keyframes[0].value : 0;
        const e = { frame, sequence, hi: hiKeys[0].value, lo: loVal };
        ddCache.set(key, e);
        return e;
    }
    const lastHi = hiKeys[hiKeys.length - 1];
    if (frame >= lastHi.frame) {
        const lastLo = loTrack && loTrack.keyframes.length > 0
            ? loTrack.keyframes[loTrack.keyframes.length - 1].value : 0;
        const e = { frame, sequence, hi: lastHi.value, lo: lastLo };
        ddCache.set(key, e);
        return e;
    }

    const prog = panProgress(hiKeys, frame);
    if (!prog) return null;
    const { u: u_eased, k0, k1 } = prog;
    const segDur = k1.frame - k0.frame;
    const fVirt = k0.frame + u_eased * segDur;

    // Pull the matching lo values at the SAME frames as the hi keys, so
    // (hi₀, lo₀) and (hi₁, lo₁) form true DD endpoints. Lo and hi tracks
    // are typically keyed in lockstep by Key Cam; if not, interpolating
    // the lo at k0/k1 frames is the right thing to do.
    const lo0 = loTrack ? evaluateLoAt(loTrack.keyframes, k0.frame) : 0;
    const lo1 = loTrack ? evaluateLoAt(loTrack.keyframes, k1.frame) : 0;

    const isLog = isLogTrack(pair.zoom);
    const zoomKeys = zoomTrack.keyframes;
    const z0 = zoomAt(zoomKeys, k0.frame, isLog);
    const z1 = zoomAt(zoomKeys, k1.frame, isLog);
    const zRatio = (z0 > 0 && z1 > 0) ? Math.abs(Math.log(z1) - Math.log(z0)) : Math.abs(z1 - z0);

    // Path-progress in [0,1] — eased u for flat-zoom, linear-in-zoom otherwise.
    let progress: number;
    if (zRatio < 1e-9) {
        progress = u_eased;
    } else {
        const zT_virt = zoomKeys.length === 0 ? z0 : zoomAt(zoomKeys, fVirt, isLog);
        progress = (zT_virt - z0) / (z1 - z0);
    }

    // DD lerp: result = DD0 + (DD1 - DD0) · progress
    const [dh, dl] = ddSub(k1.value, lo1, k0.value, lo0);
    const [sh, sl] = ddMulD(dh, dl, progress);
    const [rh, rl] = ddAdd(k0.value, lo0, sh, sl);

    const entry = { frame, sequence, hi: rh, lo: rl };
    ddCache.set(key, entry);
    return entry;
}

/** Evaluate a lo track at an arbitrary frame (matches Key-Cam frames in
 *  the typical case). Standalone to avoid cross-importing AnimationEngine. */
function evaluateLoAt(loKeys: readonly Keyframe[], frame: number): number {
    if (loKeys.length === 0) return 0;
    if (frame <= loKeys[0].frame) return loKeys[0].value;
    const last = loKeys[loKeys.length - 1];
    if (frame >= last.frame) return last.value;
    for (let i = 0; i < loKeys.length - 1; i++) {
        const k1 = loKeys[i], k2 = loKeys[i + 1];
        if (frame >= k1.frame && frame <= k2.frame) {
            return AnimationMath.interpolate(frame, k1, k2, false, false);
        }
    }
    return last.value;
}

/** Compute the pan track's value at `frame` using the linear-in-zoom
 *  formula. Returns `undefined` when the formula doesn't apply (no
 *  pair, missing keyframes), so the caller can fall through to the
 *  standard per-track interpolation. */
export function evaluatePairedTrack(
    trackId: string,
    frame: number,
    sequence: AnimationSequence,
): number | undefined {
    const pair = trackToPair.get(trackId);
    if (!pair) return undefined;

    // Determine if this track is a hi (pan) or lo (panLow) channel and
    // which axis it represents. We always route through the DD pair
    // computation so center and centerLow stay coherent at deep zoom.
    const hiAxis = pair.pan.indexOf(trackId);
    const loAxis = pair.panLow?.indexOf(trackId) ?? -1;
    const isLo = loAxis >= 0;
    const axis = isLo ? loAxis : hiAxis;
    if (axis < 0) return undefined;

    const dd = evaluateDDPairAxis(pair, axis, frame, sequence);
    if (!dd) return undefined;
    return isLo ? dd.lo : dd.hi;
}
