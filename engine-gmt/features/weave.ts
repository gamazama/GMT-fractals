/**
 * Weave feature — runtime state for the user-facing weaver (ADR-0089 P3b; per-slot
 * BANKS ADR-0090).
 *
 * Holds TWO param families, both live + keyframable by DDFS construction (schedule
 * and param edits never recompile — that is the weaver's whole point vs the baked
 * counts LUT / baked param literals):
 *
 * 1. **RHYTHM (layered modulo) schedule** — one BASE slot plus up to 5 independent
 *    rhythm LAYERS; layer k reads `uWeaveInterval<k>` / `uWeaveStartIter<k>` /
 *    `uWeaveBeats<k>` (emitLayeredModuloGLSL: every Nth iteration from a start
 *    offset, optionally capped at `beats` claims; layer order = precedence).
 * 2. **Per-slot param BANKS** (ADR-0090) — for each weave slot k (0..5) the full
 *    coreMath slot vocabulary duplicated under a `ws<k>` prefix: state keys
 *    `ws<k>ParamA`… / uniforms `uWs<k>ParamA`… A NATIVE formula woven as slot k
 *    binds its declared params VERBATIM onto bank k (no vec decomposition; identity
 *    pairs verbatim), so a native slot never shares the coreMath dense pool — that
 *    pool is now MB3D-slots-only. Keyframes/undo/preset+GMF persistence arrive by
 *    construction (generic dotted binder: `weave.ws1ParamA` tracks). Labels here
 *    are GENERIC ("Slot 1 Param A"); the Formula panel shows each formula's REAL
 *    labels via the fused def's `parameters` (which carry `feature: 'weave'` +
 *    the state-key id and route reads/writes/trackIds to `weave.*`). A3 measured
 *    the ~90 mostly-idle bank uniforms at ~+2% cold-compile, 0 fps.
 *
 * Deliberately NO panelConfig / engineConfig / inject: the Weave Editor
 * (components/WeaveEditor) hosts the schedule controls and the Formula panel
 * renders the bank params via the fused def; the phase function itself is emitted
 * per-def by emitFusedHybrid — a counts weave (or no weave) carries zero modulo
 * code and any unused bank uniform is simply unread (declared-but-idle, like any
 * idle feature uniform → INACTIVE after link, never synced).
 *
 * @see docs/adr/0089-weave-core-unification.md
 * @see docs/adr/0090-weave-slot-banks.md
 * @see engine-gmt/engine/weave/schedule.ts (emitLayeredModuloGLSL)
 * @see engine-gmt/engine/weave/nativeResolver.ts (verbatim bank binding)
 */
import * as THREE from 'three';
import { FeatureDefinition, ParamConfig } from '../../engine/FeatureSystem';
import {
    WEAVE_BANK_COUNT, weaveBankKey, weaveBankUniform,
    SCALAR_SLOTS, VEC2_SLOTS, VEC3_SLOTS, VEC4_SLOTS, vecKindOf,
} from '../utils/uniformSlots';

/** Max rhythm layers = max weave slots (6, the MB3D addon table) minus the base. */
export const WEAVE_MAX_LAYERS = 5;

type LayerIdx = 1 | 2 | 3 | 4 | 5;
/** One bank param state key (`ws0ParamA` … `ws5Vec4C`). */
export type WeaveBankKey = `ws${number}${string}`;
export type WeaveState = {
    [K in `weaveInterval${LayerIdx}` | `weaveStartIter${LayerIdx}` | `weaveBeats${LayerIdx}`]: number;
} & {
    weaveEnabled: boolean;
} & Partial<Record<WeaveBankKey,
    number | { x: number; y: number } | { x: number; y: number; z: number } | { x: number; y: number; z: number; w: number }>>;

const params: Record<string, ParamConfig> = {};

// ── Per-slot param BANKS (ADR-0090) ─────────────────────────────────────────
// Bank k mirrors the coreMath vocabulary (SCALAR_SLOTS + VEC2/VEC3/VEC4_SLOTS)
// under a `ws<k>` prefix. Ranges are cosmetic (the DDFS setter never clamps —
// createFeatureSlice.ts; the Formula panel uses the formula's REAL ranges via the
// fused def's `parameters`), so a wide generic range is honest. Idle banks cost
// only INACTIVE uniforms (A3: ~+2% cold-compile, 0 fps).
const bankShort = (k: number, slot: string): string =>
    `w${k}${slot.replace('param', 'p').replace('vec', 'v').toLowerCase()}`;
const bankLabel = (k: number, slot: string): string =>
    `Slot ${k} ${slot.replace(/([A-Z])$/, ' $1').replace(/^param/i, 'Param').replace(/^vec/i, 'Vec')}`;
for (let k = 0; k < WEAVE_BANK_COUNT; k++) {
    for (const slot of SCALAR_SLOTS) {
        params[weaveBankKey(k, slot)] = {
            type: 'float', default: 0, label: bankLabel(k, slot), shortId: bankShort(k, slot),
            uniform: weaveBankUniform(k, slot), min: -1e6, max: 1e6, step: 0.001, group: 'weave_banks',
        };
    }
    for (const slot of [...VEC2_SLOTS, ...VEC3_SLOTS, ...VEC4_SLOTS]) {
        const kind = vecKindOf(slot);
        const def = kind === 'vec2' ? { x: 0, y: 0 }
            : kind === 'vec3' ? new THREE.Vector3(0, 0, 0) : new THREE.Vector4(0, 0, 0, 0);
        params[weaveBankKey(k, slot)] = {
            type: kind, default: def, label: bankLabel(k, slot), shortId: bankShort(k, slot),
            uniform: weaveBankUniform(k, slot), min: -1e6, max: 1e6, step: 0.001, group: 'weave_banks',
        };
    }
}

// ── Whole-weave master enable (ADR-0089 P4.4 owner decision 1) ──────────────
// ONE live, keyframable mute-all-layers gate: OFF = base slot only, weave
// dormant (the legacy `interlaceEnabled`/`hybridMode` semantics — required for
// lossless migration of disabled-but-configured legacy scenes). The phase-fn
// gate is OPT-IN per def via `emitFusedHybrid` opts.enableGate (editor builds +
// migrated scenes request it; plain MB3D imports don't, keeping their emit
// byte-identical). UI is deliberately LOW-PROFILE (a compat/migration
// affordance, not a hero control — owner: "it's a weird control"); per-slot
// mute/solo is backlog.
params.weaveEnabled = {
    type: 'boolean', default: true, label: 'Weave Active', shortId: 'wve',
    uniform: 'uWeaveEnabled', group: 'weave_rhythm',
    description: 'Whole-weave enable: off renders the base formula only (all layers dormant). Live — no recompile.',
};

// ── Rhythm (layered modulo) schedule ────────────────────────────────────────
for (let k = 1; k <= WEAVE_MAX_LAYERS; k++) {
    params[`weaveInterval${k}`] = {
        type: 'float', default: 2, label: `Layer ${k} Interval`, shortId: `wvi${k}`,
        uniform: `uWeaveInterval${k}`, min: 1, max: 32, step: 1,
        group: 'weave_rhythm',
        description: `Rhythm layer ${k}: its formula runs every N iterations. Live — no recompile.`,
    };
    params[`weaveStartIter${k}`] = {
        type: 'float', default: 0, label: `Layer ${k} Start`, shortId: `wvs${k}`,
        uniform: `uWeaveStartIter${k}`, min: 0, max: 64, step: 1,
        group: 'weave_rhythm',
        description: `Rhythm layer ${k}: first iteration where its formula runs. Live — no recompile.`,
    };
    params[`weaveBeats${k}`] = {
        type: 'float', default: 0, label: `Layer ${k} Beats`, shortId: `wvb${k}`,
        uniform: `uWeaveBeats${k}`, min: 0, max: 64, step: 1,
        group: 'weave_rhythm',
        description: `Rhythm layer ${k}: stop after this many beats (0 = endless). A dense capped layer works as a sequence-style intro. Live — no recompile.`,
    };
}

export const WeaveFeature: FeatureDefinition = {
    id: 'weave',
    shortId: 'wv',
    name: 'Weave',
    category: 'Formulas',

    params,

    groups: {
        weave_rhythm: { label: 'Weave Rhythm' },
        weave_banks: { label: 'Weave Slot Banks' },
    },
};
