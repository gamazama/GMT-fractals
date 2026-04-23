/**
 * DyeFeature — DDFS bindings for the fluid's colour and dye-decay
 * parameters.
 *
 * First use of DDFS `type: 'gradient'` in fluid-toy. AutoFeaturePanel
 * renders AdvancedGradientEditor for gradient-typed params — no
 * bespoke gradient UI needed on the app side. Proving the "engine
 * already has it better" claim from the Phase 3 filter table.
 *
 * When the user edits a gradient, createFeatureSlice sanitizes + emits
 * a uniform event. FluidEngine has its own pipeline though (not
 * ShaderBuilder), so FluidToyApp subscribes to the dye slice, bakes
 * the gradient to an LUT buffer via utils/colorUtils, and pushes via
 * engine.setGradientBuffer.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { GradientConfig } from '../../types';
import { defineEnumParam } from '../../engine/defineEnumParam';

const DEFAULT_DYE_GRADIENT: GradientConfig = {
    colorSpace: 'srgb',
    blendSpace: 'oklab',
    stops: [
        { id: '0', position: 0.00, color: '#000000', bias: 0.5, interpolation: 'linear' },
        { id: '1', position: 0.15, color: '#1a0a00', bias: 0.5, interpolation: 'linear' },
        { id: '2', position: 0.35, color: '#8b1a00', bias: 0.5, interpolation: 'linear' },
        { id: '3', position: 0.60, color: '#ff6b00', bias: 0.5, interpolation: 'linear' },
        { id: '4', position: 0.85, color: '#ffdd66', bias: 0.5, interpolation: 'linear' },
        { id: '5', position: 1.00, color: '#ffffff', bias: 0.5, interpolation: 'linear' },
    ],
};

// All-black = no collision. User can edit to introduce walls.
const DEFAULT_COLLISION_GRADIENT: GradientConfig = {
    colorSpace: 'srgb',
    blendSpace: 'rgb',
    stops: [
        { id: '0', position: 0, color: '#000000', bias: 0.5, interpolation: 'linear' },
        { id: '1', position: 1, color: '#000000', bias: 0.5, interpolation: 'linear' },
    ],
};

// Brush modes — control what left-drag does on the canvas. All four
// modes reuse FluidEngine's additive splat (see FRAG_SPLAT in shaders.ts);
// the pointer layer picks different (force, color) args per mode rather
// than the engine gaining new primitives. Keeps the engine surface small.
const brushModeParam = defineEnumParam(
    ['paint', 'erase', 'stamp', 'smudge'] as const,
    'Brush Mode',
);
export const BRUSH_MODES = brushModeParam.values;
export type BrushMode = typeof BRUSH_MODES[number];
export const brushModeFromIndex = brushModeParam.fromIndex;

// How NEW dye combines with EXISTING dye when both occupy the same
// texel. 'add' is the classic fluid-sim look; 'screen' keeps overlaps
// glowing; 'max' preserves the brightest layer; 'over' uses alpha from
// the gradient to blend. Indices match FluidEngine.dyeBlendToIndex.
const dyeBlendParam = defineEnumParam(
    ['add', 'screen', 'max', 'over'] as const,
    'Blend',
);
export const DYE_BLENDS = dyeBlendParam.values;
export const dyeBlendFromIndex = dyeBlendParam.fromIndex;

// How dye decays over time. 'linear' is the classic fluid decay
// (full RGB scaled together); 'perceptual' scales LAB chroma
// independently; 'vivid' scales chroma then multiplies by a saturation
// boost so colour stays punchy as luminance fades. Indices match
// FluidEngine.dyeDecayModeToIndex.
const dyeDecayModeParam = defineEnumParam(
    ['linear', 'perceptual', 'vivid'] as const,
    'Dye Decay Mode',
);
export const DYE_DECAY_MODES = dyeDecayModeParam.values;
export const dyeDecayModeFromIndex = dyeDecayModeParam.fromIndex;

export const DyeFeature: FeatureDefinition = {
    id: 'dye',
    name: 'Dye',
    category: 'Look',

    tabConfig: {
        label: 'Dye',
        componentId: 'auto-feature-panel',
        order: 1,
        dock: 'right',
    },

    params: {
        brushMode: brushModeParam.config,
        gradient:          { type: 'gradient', default: DEFAULT_DYE_GRADIENT,       label: 'Palette' },
        collisionGradient: { type: 'gradient', default: DEFAULT_COLLISION_GRADIENT, label: 'Collision Mask' },
        dyeInject:         { type: 'float', default: 8,    min: 0, max: 20,  step: 0.01,  label: 'Dye Inject' },
        dyeBlend:          dyeBlendParam.config,
        dyeMix:            { type: 'float', default: 2,    min: 0, max: 4,   step: 0.01,  label: 'Dye Mix' },
        gradientRepeat:    { type: 'float', default: 1,    min: 0.1, max: 8, step: 0.01,  label: 'Gradient Repeat' },
        gradientPhase:     { type: 'float', default: 0,    min: 0, max: 1,   step: 0.001, label: 'Gradient Phase' },

        // Decay controls — how the dye fades between frames.
        dyeDecayMode:        dyeDecayModeParam.config,
        dyeDissipation:      { type: 'float', default: 1.03, min: 0, max: 5,    step: 0.001, label: 'Luminance Decay' },
        dyeChromaDecayHz:    { type: 'float', default: 1.03, min: 0, max: 5,    step: 0.001, label: 'Chroma Decay',
                               condition: { param: 'dyeDecayMode', neq: 0 } },  // 0 = linear (chroma coupled to luminance)
        dyeSaturationBoost:  { type: 'float', default: 1,    min: 0, max: 3,    step: 0.001, label: 'Saturation Boost',
                               condition: { param: 'dyeDecayMode', eq: 2 } },   // 2 = vivid — only mode that applies the multiplier
    },
};
