/**
 * Weave animation retargeting (ADR-0089 P4.6) — moves keyframe tracks and LFO
 * modulations WITH their formulas when a weave rebuild (or a live rhythm
 * re-map) relocates the DDFS params they target.
 *
 * Why this exists: a weave slot's params live on a per-slot BANK keyed by row
 * position (`weave.ws<k>ParamA`, ADR-0090), and rhythm timing on a layer index
 * (`weave.weaveInterval<k>`). Structure edits permute those indices. Since
 * 2026-07-05 the live VALUES follow each slot across a rebuild automatically
 * (`mergeWeaveBanks` / `syncRhythm`); this module applies the SAME mapping to
 * the two durable stores of routing strings, so keyframes keep animating the
 * same semantic parameter. Keyframe VALUES never change — only the routing
 * string (track id / LFO target) is renamed.
 *
 * The three stores touched — every DURABLE store of routing strings:
 *  - `useAnimationStore.sequence.tracks` (+ track `id` + selection ids). One
 *    timeline `snapshot()` is taken first, so the rename is undoable in the
 *    timeline's own per-scope history — no parallel undo stack.
 *  - `useEngineStore.animations` (LFO `AnimationParams.target`). LFO edits
 *    carry no history anywhere; the rename doesn't invent one.
 *  - `useEngineStore.modulation.rules` (audio/LFO link `ModulationRule.target`).
 *    Added 2026-07-25: this store was MISSED in the original P4.6 pass, which
 *    counted only two. An audio link is exactly as durable as an LFO — the
 *    "transient consumers need no rename" carve-out below covers
 *    `liveModulations` (recomputed per frame), NOT the rules that produce it.
 *    Symptom of the omission: building a weave off a plain formula emits
 *    `coreMath.paramA → weave.ws0ParamA`; keyframes and LFOs followed while
 *    audio links kept pointing at the retired `coreMath` id and went silently
 *    dead. A reorder was worse — the link survived but drove a DIFFERENT
 *    formula's slot.
 *
 * @assumption Renames are applied as a SIMULTANEOUS permutation (a 0↔1 bank
 * swap must not chain), and a rename DESTINATION occupied by a track/LFO that
 * is not itself being renamed (a stale occupant — its own slot/layer was
 * removed) is displaced: removed and counted, never silently left to drive
 * another formula's param. The timeline snapshot makes displaced tracks
 * recoverable via timeline undo.
 *
 * Transient consumers need no rename: `liveModulations` is recomputed every
 * frame, exports read the live sequence at export time, and the generic dotted
 * DDFS binder resolves the new targets by construction (vec axes via the
 * `_<axis>` convention).
 *
 * @see docs/adr/0090-weave-slot-banks.md ("reorder = a bank-index rename")
 * @see engine-gmt/utils/mb3d/loadMB3DScene.ts (mergeWeaveBanks — the mapping source)
 */
import { useAnimationStore } from '../../store/animationStore';
import { useEngineStore } from '../../store/engineStore';
import type { Track } from '../../types';
import type { FractalDefinition } from '../types/fractal';

/** One routing-string rename, base-id level (`weave.ws0ParamA` → `weave.ws2ParamA`).
 *  Vec-axis variants (`_x/_y/_z/_w`) are expanded by the applier. */
export interface ParamRename {
    from: string;
    to: string;
}

export interface RetargetResult {
    /** Keyframe tracks renamed. */
    tracks: number;
    /** LFO modulations renamed. */
    lfos: number;
    /** Modulation rules (audio links) renamed. */
    rules: number;
    /** Stale occupants removed from a rename destination (their own slot/layer
     *  was removed and another slot's animation moved onto their old lane). */
    displaced: number;
}

const AXES = ['x', 'y', 'z', 'w'] as const;

/** Base renames → exact-id map incl. blind `_<axis>` variants (an axis entry
 *  only ever matches if such a track/LFO actually exists, so over-expansion on
 *  scalar params is harmless). */
function expandRenames(renames: ParamRename[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const { from, to } of renames) {
        if (from === to) continue;
        map.set(from, to);
        for (const a of AXES) map.set(`${from}_${a}`, `${to}_${a}`);
    }
    return map;
}

/** Apply a rename set to both animation stores. No-op (and no undo snapshot)
 *  when nothing matches. */
export function retargetAnimationTargets(renames: ParamRename[]): RetargetResult {
    const map = expandRenames(renames);
    const result: RetargetResult = { tracks: 0, lfos: 0, rules: 0, displaced: 0 };
    if (map.size === 0) return result;
    const dests = new Set(map.values());
    // Stale occupant: sits on a rename destination but is not itself renamed
    // away — after the permutation it would collide with (tracks) or double-
    // drive (LFOs) the incoming animation. Displace it.
    const isStale = (id: string) => dests.has(id) && !map.has(id);

    const anim = useAnimationStore.getState();
    const oldTracks = anim.sequence.tracks;
    const affected = Object.keys(oldTracks).filter((id) => map.has(id));
    const staleTracks = Object.keys(oldTracks).filter(isStale);
    if (affected.length || staleTracks.length) {
        anim.snapshot(); // one timeline-undo step for the whole permutation
        const tracks: Record<string, Track> = {};
        for (const [tid, tr] of Object.entries(oldTracks)) {
            if (isStale(tid)) continue;
            const nid = map.get(tid) ?? tid;
            tracks[nid] = nid === tid ? tr : { ...tr, id: nid };
        }
        const remapTrackId = (tid: string) => (isStale(tid) ? null : map.get(tid) ?? tid);
        useAnimationStore.setState({
            sequence: { ...anim.sequence, tracks },
            selectedTrackIds: anim.selectedTrackIds
                .map(remapTrackId).filter((t): t is string => t !== null),
            selectedKeyframeIds: anim.selectedKeyframeIds
                .map((id) => {
                    const i = id.indexOf('::');
                    if (i < 0) return id;
                    const nid = remapTrackId(id.slice(0, i));
                    return nid === null ? null : `${nid}${id.slice(i)}`;
                })
                .filter((t): t is string => t !== null),
        });
        result.tracks = affected.length;
        result.displaced += staleTracks.length;
    }

    const eng = useEngineStore.getState() as any;
    const lfos = (eng.animations ?? []) as Array<{ target: string }>;
    const lfoAffected = lfos.filter((a) => map.has(a.target)).length;
    const lfoStale = lfos.filter((a) => isStale(a.target)).length;
    if (lfoAffected || lfoStale) {
        eng.setAnimations(
            lfos
                .filter((a) => !isStale(a.target))
                .map((a) => (map.has(a.target) ? { ...a, target: map.get(a.target)! } : a)),
        );
        result.lfos = lfoAffected;
        result.displaced += lfoStale;
    }

    // Modulation rules (audio links). Same permutation + displacement policy as
    // the LFOs above, and the same "no history to invent" note — rule edits go
    // through updateModulation, which carries no undo of its own.
    //
    // Displacement differs in ONE respect and deliberately so: a stale audio
    // link is DISABLED, not deleted. Two links legitimately share a target
    // (that's how you stack bass + treble on one param), so a destination
    // collision is not the double-drive hazard it is for LFOs — but a link left
    // enabled on a lane another formula just moved onto would silently drive the
    // wrong slot mid-set. Disabling keeps the user's freq band, envelope and
    // gain intact to re-point by hand, which matters far more during a live set
    // than during a timeline edit.
    const rules = (eng.modulation?.rules ?? []) as Array<{ target: string; enabled: boolean }>;
    const ruleAffected = rules.filter((r) => map.has(r.target)).length;
    const ruleStale = rules.filter((r) => isStale(r.target)).length;
    if (ruleAffected || ruleStale) {
        eng.setModulation?.({
            rules: rules.map((r) => {
                if (map.has(r.target)) return { ...r, target: map.get(r.target)! };
                if (isStale(r.target)) return { ...r, enabled: false };
                return r;
            }),
        });
        result.rules = ruleAffected;
        result.displaced += ruleStale;
    }
    return result;
}

export interface WeaveOrphans {
    trackIds: string[];
    /** LFO `AnimationParams.id`s (not targets). */
    lfoIds: string[];
    /** Modulation-rule `ModulationRule.id`s (not targets). */
    ruleIds: string[];
}

/** Tracks / LFOs that target a `weave.ws<k>*` bank param the given def no
 *  longer exposes — e.g. a deleted or replaced slot's animation, or an MB3D
 *  option toggled to "fixed" (baked). They drive an idle-but-declared DDFS
 *  param (harmless at runtime) but clutter the timeline; the editor offers a
 *  one-click cleanup. Rhythm (`weave.weave*`) and `coreMath.*` targets are
 *  out of scope: rhythm params are feature-level (always declared) and
 *  standalone coreMath lanes predate the weave editor.  */
export function findWeaveBankOrphans(def: FractalDefinition | undefined): WeaveOrphans {
    const exposed = new Set<string>();
    for (const p of (def?.parameters ?? []) as any[]) {
        if (p.feature !== 'weave') continue;
        const base = `weave.${p.id}`;
        exposed.add(base);
        const n = p.type === 'vec2' ? 2 : p.type === 'vec3' ? 3 : p.type === 'vec4' ? 4 : 0;
        for (let i = 0; i < n; i++) exposed.add(`${base}_${AXES[i]}`);
    }
    const isBankTarget = (id: string) => /^weave\.ws\d/.test(id);

    const tracks = useAnimationStore.getState().sequence.tracks;
    const trackIds = Object.keys(tracks).filter((id) => isBankTarget(id) && !exposed.has(id));
    const eng = useEngineStore.getState() as any;
    const lfoIds = ((eng.animations ?? []) as Array<{ id: string; target: string }>)
        .filter((a) => isBankTarget(a.target) && !exposed.has(a.target))
        .map((a) => a.id);
    const ruleIds = ((eng.modulation?.rules ?? []) as Array<{ id: string; target: string }>)
        .filter((r) => isBankTarget(r.target) && !exposed.has(r.target))
        .map((r) => r.id);
    return { trackIds, lfoIds, ruleIds };
}

/** Remove orphaned tracks (timeline-undoable via removeTracks' snapshot), LFOs
 *  and modulation rules. Returns how many of each were removed. */
export function removeWeaveOrphans(
    orphans: WeaveOrphans,
): { tracks: number; lfos: number; rules: number } {
    if (orphans.trackIds.length) {
        useAnimationStore.getState().removeTracks(orphans.trackIds);
    }
    const eng = useEngineStore.getState() as any;
    if (orphans.lfoIds.length) {
        const drop = new Set(orphans.lfoIds);
        eng.setAnimations((eng.animations ?? []).filter((a: any) => !drop.has(a.id)));
    }
    if (orphans.ruleIds?.length) {
        const drop = new Set(orphans.ruleIds);
        eng.setModulation?.({
            rules: (eng.modulation?.rules ?? []).filter((r: any) => !drop.has(r.id)),
        });
    }
    return {
        tracks: orphans.trackIds.length,
        lfos: orphans.lfoIds.length,
        rules: orphans.ruleIds?.length ?? 0,
    };
}
