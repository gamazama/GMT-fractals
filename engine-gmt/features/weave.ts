/**
 * Weave feature — runtime state for the user-facing weaver (ADR-0089 P3b).
 *
 * Holds the RHYTHM (layered modulo) schedule params. A rhythm weave is one BASE
 * slot plus up to 5 independent rhythm LAYERS; layer k reads
 * `uWeaveInterval<k>` / `uWeaveStartIter<k>` / `uWeaveBeats<k>` — the runtime
 * uniforms the fused weave's layered phase function consumes
 * (emitLayeredModuloGLSL: every Nth iteration from a start offset, optionally
 * capped at `beats` claims; layer order = precedence). Because they are DDFS
 * params they are live AND keyframable by construction — schedule edits never
 * recompile (that is Rhythm's whole point vs the baked counts LUT).
 *
 * Deliberately NO panelConfig / engineConfig / inject: the Weave Editor
 * (components/WeaveEditor) hosts the controls until the P4 panel promotion,
 * and the phase function itself is emitted per-def by emitFusedHybrid — a
 * counts weave (or no weave) carries zero modulo code, so these uniforms are
 * simply unread there (declared-but-unused, like any idle feature uniform).
 *
 * @see docs/adr/0089-weave-core-unification.md
 * @see engine-gmt/engine/weave/schedule.ts (emitLayeredModuloGLSL)
 */
import { FeatureDefinition, ParamConfig } from '../../engine/FeatureSystem';

/** Max rhythm layers = max weave slots (6, the MB3D addon table) minus the base. */
export const WEAVE_MAX_LAYERS = 5;

type LayerIdx = 1 | 2 | 3 | 4 | 5;
export type WeaveState = {
    [K in `weaveInterval${LayerIdx}` | `weaveStartIter${LayerIdx}` | `weaveBeats${LayerIdx}`]: number;
};

const params: Record<string, ParamConfig> = {};
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
    },
};
