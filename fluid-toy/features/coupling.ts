/**
 * CouplingFeature — the force-law tab.
 *
 * Matches the reference toy-fluid "Coupling" tab exactly: the force-mode
 * dropdown (how fractal pixels become velocity), the four intensity
 * knobs (gain / interior damp / force cap / edge margin), plus the
 * Auto-orbit c subsection.
 *
 * Previously these params were split across FluidSimFeature (force*)
 * and OrbitFeature (auto-orbit). Reference layout groups them into a
 * single "coupling law" tab between Fractal and Fluid, so we collect
 * them here and delete the split.
 *
 * `enabled` + `radius` + `speed` drive the modulation system via
 * orbitTick.ts — two sine LFOs on julia.juliaC_x/_y compose circular
 * motion around the current c base. Moving c while orbit is on moves
 * the circle with it.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

// 5 force modes, matching FluidEngine.forceModeToIndex order.
const forceModeParam = defineEnumParam(
    ['gradient', 'curl', 'iterate', 'c-track', 'hue'] as const,
    'Force Mode',
    {
        optionLabels: {
            'c-track': 'C-Track',
        },
    },
);
export const FORCE_MODES = forceModeParam.values;
export const forceModeFromIndex = forceModeParam.fromIndex;

// Per-mode hints, keyed by index. AutoFeaturePanel displays param
// descriptions directly; the reference's dynamic chip-hint banner
// is rendered by the single `forceMode.description` on the dropdown
// (DDFS enums only carry one description — we use the tab-level hint
// plus the per-option titles on the dropdown).
const FORCE_MODE_HINT =
    'How fractal pixels become velocity at each cell. ' +
    'Gradient pushes AWAY from the set. Curl swirls along level sets. ' +
    'Iterate follows z\'s orbit grain. C-Track reacts to Δc in real time. ' +
    'Hue makes the picture itself the velocity field.';

export const CouplingFeature: FeatureDefinition = {
    id: 'coupling',
    name: 'Coupling',
    category: 'Simulation',

    tabConfig: {
        label: 'Coupling',
    },

    params: {
        forceMode: { ...forceModeParam.config, description: FORCE_MODE_HINT },

        forceGain: {
            type: 'float',
            default: -1200, min: -2000, max: 2000, step: 0.1,
            label: 'Force gain',
            description: 'Multiplier on the fractal-derived force. How loudly the fractal shouts at the fluid. Negative inverts the force direction.',
        },
        interiorDamp: {
            type: 'float',
            default: 0.59, min: 0, max: 1, step: 0.01,
            label: 'Interior damp',
            description: 'How much to suppress force inside the set. 1 = still lake in the interior, 0 = full bleed.',
        },
        forceCap: {
            type: 'float',
            default: 40, min: 1, max: 40, step: 0.5,
            label: 'Force cap',
            description: 'Per-pixel cap on the fractal force magnitude.',
        },
        edgeMargin: {
            type: 'float',
            default: 0.04, min: 0, max: 0.25, step: 0.005,
            label: 'Edge margin',
            description: 'Fades force / dye injection near the canvas edges. Fixes "gushing from the borders" under fast c-changes.',
        },

        // ── Auto-orbit c ─────────────────────────────────────────────
        // Reference puts these in the same tab under a "Auto-orbit c"
        // group header. DDFS has no group headers yet in AutoFeaturePanel,
        // so the label itself carries the intent. Conditional-on-enabled
        // mimics the reference's collapse behaviour.
        orbitEnabled: {
            type: 'boolean',
            default: false,
            label: 'Auto-orbit c',
            description: 'Circles c automatically around its current value. Pair with C-Track to watch the fluid breathe with the fractal\'s deformation.',
        },
        orbitRadius: {
            type: 'float',
            default: 0.08, min: 0, max: 0.5, step: 0.001,
            label: 'Radius',
            condition: { param: 'orbitEnabled', bool: true },
            description: 'Distance c travels from its base position as the orbit circles.',
        },
        orbitSpeed: {
            type: 'float',
            default: 0.25, min: 0, max: 3, step: 0.01,
            label: 'Speed',
            condition: { param: 'orbitEnabled', bool: true },
            description: 'Orbit rate in Hz. 1 = one full circle per second.',
        },
    },
};
