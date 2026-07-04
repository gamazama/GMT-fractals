/**
 * Weave feature — runtime state for the user-facing weaver (ADR-0089 P3b).
 *
 * Holds the RHYTHM (modulo) schedule params: `uWeaveInterval` / `uWeaveStartIter`,
 * the runtime uniforms the fused weave's modulo phase function reads
 * (emitModuloScheduleGLSL — every Nth iteration from a start offset). Because
 * they are DDFS params they are live AND keyframable by construction — schedule
 * edits never recompile (that is Rhythm's whole point vs the baked counts LUT).
 *
 * Deliberately NO panelConfig / engineConfig / inject: the Weave Editor
 * (components/WeaveEditor) hosts the controls until the P4 panel promotion,
 * and the phase function itself is emitted per-def by emitFusedHybrid — a
 * counts weave (or no weave) carries zero modulo code, so these two uniforms
 * are simply unread there (declared-but-unused, like any idle feature uniform).
 *
 * @see docs/adr/0089-weave-core-unification.md
 * @see engine-gmt/engine/weave/schedule.ts (emitModuloScheduleGLSL)
 */
import { FeatureDefinition } from '../../engine/FeatureSystem';

export interface WeaveState {
    weaveInterval: number;
    weaveStartIter: number;
}

export const WeaveFeature: FeatureDefinition = {
    id: 'weave',
    shortId: 'wv',
    name: 'Weave',
    category: 'Formulas',

    params: {
        weaveInterval: {
            type: 'float', default: 2, label: 'Rhythm Interval', shortId: 'wvi',
            uniform: 'uWeaveInterval', min: 1, max: 32, step: 1,
            group: 'weave_rhythm',
            description: 'Rhythm schedule: run the second formula every N iterations. Live — no recompile.',
        },
        weaveStartIter: {
            type: 'float', default: 0, label: 'Rhythm Start', shortId: 'wvs',
            uniform: 'uWeaveStartIter', min: 0, max: 64, step: 1,
            group: 'weave_rhythm',
            description: 'Rhythm schedule: first iteration where the second formula runs. Live — no recompile.',
        },
    },

    groups: {
        weave_rhythm: { label: 'Weave Rhythm' },
    },
};
