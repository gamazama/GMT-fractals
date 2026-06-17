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
        optionHints: {
            'gradient': 'Push along ∇S — fluid flows from low to high source.',
            'curl':     'Swirl along level sets. Divergence-free.',
            'iterate':  'Push along ∇S with magnitude ∝ S itself.',
            'c-track':  'React to frame-to-frame change in S.',
            'hue':      'Palette colour IS the velocity field. Ignores Source.',
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
        optionHints: {
            'smoothPot':   'Classic outside-the-set gradient.',
            'de':          'Smooth across the set boundary.',
            'stripe':      'Aesthetic banded flow.',
            'paletteLuma': 'Tracks whatever colour-mapping mode is active.',
            'mask':        'Drive flow toward / away from collision walls.',
        },
    },
);
export const FORCE_SOURCES = forceSourceParam.values;
export const forceSourceFromIndex = forceSourceParam.fromIndex;

export const CouplingFeature: FeatureDefinition = {
    id: 'coupling',
    name: 'Coupling',
    category: 'Simulation',

    tabConfig: {
        label: 'Coupling',
    },

    params: {
        forceMode:   forceModeParam.config,
        forceSource: forceSourceParam.config,

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
