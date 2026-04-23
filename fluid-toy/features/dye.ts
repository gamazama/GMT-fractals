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
export const BRUSH_MODES = ['paint', 'erase', 'stamp', 'smudge'] as const;
export type BrushMode = typeof BRUSH_MODES[number];

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
        brushMode: {
            type: 'float',  // numeric index — AutoFeaturePanel dropdown when options are set
            default: 0,     // 'paint'
            label: 'Brush Mode',
            options: [
                { label: 'Paint',  value: 0 },  // inject dye + force (classic)
                { label: 'Erase',  value: 1 },  // subtract dye, no force
                { label: 'Stamp',  value: 2 },  // dye only, no force
                { label: 'Smudge', value: 3 },  // force only, no dye
            ],
        },
        gradient:          { type: 'gradient', default: DEFAULT_DYE_GRADIENT,       label: 'Palette' },
        collisionGradient: { type: 'gradient', default: DEFAULT_COLLISION_GRADIENT, label: 'Collision Mask' },
        dyeInject:         { type: 'float', default: 8,    min: 0, max: 20,  step: 0.01,  label: 'Dye Inject' },
        dyeDissipation:    { type: 'float', default: 1.03, min: 0, max: 5,   step: 0.001, label: 'Dye Decay' },
        dyeMix:            { type: 'float', default: 2,    min: 0, max: 4,   step: 0.01,  label: 'Dye Mix' },
        gradientRepeat:    { type: 'float', default: 1,    min: 0.1, max: 8, step: 0.01,  label: 'Gradient Repeat' },
        gradientPhase:     { type: 'float', default: 0,    min: 0, max: 1,   step: 0.001, label: 'Gradient Phase' },
    },
};
