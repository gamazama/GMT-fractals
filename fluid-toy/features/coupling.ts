/**
 * CouplingFeature — the force-law tab.
 *
 * Matches the reference toy-fluid "Coupling" tab: the force-mode dropdown
 * (how fractal pixels become velocity), source picker, and the four
 * intensity knobs (gain / interior damp / force cap / edge margin).
 *
 * Auto-orbit (the legacy "circle c around its base" feature) used to
 * live here as orbitEnabled / orbitRadius / orbitSpeed plus a bespoke
 * orbitTick.ts that wrote the store's `animations` array. That's gone —
 * now any user-driven c modulation (auto-orbit, audio-reactive, custom
 * LFO shapes) is set up via the standard "Modulation" tab's LFO list.
 * AnimationSystem already does relative-add for vec2 component targets
 * (julia.juliaC_x / _y), so two LFOs at 90° phase reproduces the orbit
 * exactly with full per-LFO control.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

// 5 force operators, matching FluidEngine.modeToIndex order.
//   gradient  → ∇S
//   curl      → perp(∇S)         (divergence-free swirl)
//   iterate   → normalize(∇S)·S  (Direct — push proportional to S)
//   c-track   → ∇(S_now − S_prev) (Temporal-delta — react to motion)
//   hue       → palette-RGB hue → angular direction (ignores Source)
//
// "iterate" and "c-track" enum values are kept for preset compatibility;
// labels below describe the new behaviour.
const forceModeParam = defineEnumParam(
    ['gradient', 'curl', 'iterate', 'c-track', 'hue'] as const,
    'Operator',
    {
        optionLabels: {
            'iterate':  'Direct',
            'c-track':  'Temporal Δ',
            'gradient': 'Gradient',
            'curl':     'Curl',
            'hue':      'Hue',
        },
    },
);
export const FORCE_MODES = forceModeParam.values;
export const forceModeFromIndex = forceModeParam.fromIndex;

// 5 source channels, matching FluidEngine.forceSourceToIndex order.
const forceSourceParam = defineEnumParam(
    ['smoothPot', 'de', 'stripe', 'paletteLuma', 'mask'] as const,
    'Source',
    {
        optionLabels: {
            'smoothPot':   'Smooth potential',
            'de':          'Distance estimate',
            'stripe':      'Stripe average',
            'paletteLuma': 'Palette luminance',
            'mask':        'Collision mask',
        },
    },
);
export const FORCE_SOURCES = forceSourceParam.values;
export const forceSourceFromIndex = forceSourceParam.fromIndex;

const FORCE_MODE_HINT =
    'How the source field becomes velocity. ' +
    'Gradient pushes along ∇S. Curl swirls along level sets (divergence-free). ' +
    'Direct pushes along ∇S with magnitude ∝ S. Temporal Δ reacts to frame-to-frame change. ' +
    'Hue ignores the Source — it makes the painted palette colour the velocity field.';

const FORCE_SOURCE_HINT =
    'Which scalar field the operator reads. Smooth potential is the classic ' +
    '"outside the set" gradient. Distance estimate is smooth across the boundary. ' +
    'Stripe average gives aesthetic banded flow. Palette luminance follows whatever ' +
    'colour-mapping mode you pick. Collision mask drives flow toward / away from walls. ' +
    'Ignored when Operator = Hue.';

export const CouplingFeature: FeatureDefinition = {
    id: 'coupling',
    name: 'Coupling',
    category: 'Simulation',

    tabConfig: {
        label: 'Coupling',
    },

    params: {
        forceMode:   { ...forceModeParam.config,   description: FORCE_MODE_HINT },
        forceSource: { ...forceSourceParam.config, description: FORCE_SOURCE_HINT },

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
    },
};
