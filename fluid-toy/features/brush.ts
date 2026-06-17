/**
 * BrushFeature — the Brush tab.
 *
 * Maps 1:1 to the reference toy-fluid "Brush" tab: mode chips, shape
 * (size + hardness), intensity (strength / flow / spacing), colour
 * (colorMode + solidColor + hueJitter), and the particle-emitter
 * subsection. Full feature-parity with the reference — the engine
 * port's `FluidEngine.brush()` + `fluid-toy/brush/` module supply the
 * runtime.
 *
 * Slice id stays 'brush'. Ranges and defaults match the reference's
 * ScalarInput bounds. Descriptions come straight from the reference's
 * `<Hint>` components so the Show Hints toggle surfaces the same text.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import { defineEnumParam } from '../../engine/defineEnumParam';

// Brush mode — lives here (not Palette) after Tab 4 of the restructure
// pass. The enum index order must match FluidEngine.brush()'s mode arg.
const brushModeParam = defineEnumParam(
    ['paint', 'erase', 'stamp', 'smudge'] as const,
    'Mode',
);
export const BRUSH_MODES = brushModeParam.values;
export const brushModeFromIndex = brushModeParam.fromIndex;

// Colour mode — where each splat gets its RGB from. Index order and
// names match the reference's BrushColorMode type (rainbow=0, solid=1,
// gradient=2, velocity=3). Default is rainbow.
//   rainbow  — wall-clock-driven hue cycle (~1s period).
//   solid    — one fixed RGB the user picks below.
//   gradient — sample the main palette at the cursor's canvas position.
//   velocity — drag direction → hue, magnitude → lightness.
const brushColorModeParam = defineEnumParam(
    ['rainbow', 'solid', 'gradient', 'velocity'] as const,
    'Colour',
);
export const BRUSH_COLOR_MODES = brushColorModeParam.values;
export const brushColorModeFromIndex = brushColorModeParam.fromIndex;

export const BrushFeature: FeatureDefinition = {
    id: 'brush',
    name: 'Brush',
    category: 'Input',

    tabConfig: {
        label: 'Brush',
    },

    params: {
        mode: {
            ...brushModeParam.config,
            description: 'What left-drag does on the canvas. Paint = dye + force; Erase subtracts dye; Stamp deposits dye only; Smudge pushes velocity without adding dye.',
        },

        // ── Shape ────────────────────────────────────────────────────
        size: {
            type: 'float', default: 0.15, min: 0.003, max: 0.4, step: 0.001,
            label: 'Size (UV)',
            description: 'Radius in UV units (0..1 across the canvas). B+drag the canvas to resize live.',
        },
        hardness: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.01,
            label: 'Hardness',
            description: '0 = soft gaussian edge (airbrush). 1 = hard disc (stamp).',
        },

        // ── Intensity ────────────────────────────────────────────────
        strength: {
            type: 'float', default: 1, min: 0, max: 3, step: 0.01,
            label: 'Strength',
            description: 'Dye amount per splat. 0 = dry brush, 3 = saturated. Erase mode: how much dye each splat removes.',
        },
        flow: {
            type: 'float', default: 50, min: 0, max: 200, step: 0.5,
            label: 'Flow',
            condition: { or: [
                { param: 'mode', eq: 0 },  // paint
                { param: 'mode', eq: 3 },  // smudge
            ] },
            description: 'How much of the pointer\'s velocity is injected into the force field. Low = delicate, 50 = paints, 200 = whip.',
        },
        spacing: {
            type: 'float', default: 0.005, min: 0, max: 0.1, step: 0.001,
            label: 'Spacing (UV)',
            condition: { param: 'particleEmitter', bool: false },
            description: 'Minimum travel between splats along a drag. Low = smooth stroke, high = dotted trail.',
        },

        // ── Colour ──────────────────────────────────────────────────
        colorMode: {
            ...brushColorModeParam.config,
            condition: { or: [
                { param: 'mode', eq: 0 },  // paint
                { param: 'mode', eq: 2 },  // stamp
            ] },
            description: 'Where each splat gets its RGB. Gradient samples the palette; Solid uses the picker below; Rainbow cycles hue on its own clock.',
        },
        solidColor: {
            type: 'vec3',
            default: { x: 1, y: 1, z: 1 },
            min: 0, max: 1, step: 0.001,
            label: 'Solid color',
            condition: { param: 'colorMode', eq: 1 },
            description: 'Explicit colour for Solid mode. Hue jitter still applies.',
        },
        jitter: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.01,
            label: 'Hue jitter',
            condition: { and: [
                // Any colour-depositing mode (not erase, not smudge).
                { param: 'mode', neq: 1 },
                { param: 'mode', neq: 3 },
            ] },
            description: 'Random hue wiggle per splat. 0 = exact colour, 1 = full hue wheel. Builds natural variation in long strokes. Stacks on rainbow/velocity mode too.',
        },

        // ── Particle emitter ────────────────────────────────────────
        particleEmitter: {
            type: 'boolean', default: false,
            label: 'Particle emitter',
            description: 'Dragging spawns independent particles on their own layer. Each live particle flies with its own velocity / lifespan and acts as a mini brush — painting into the fluid with the selected mode at its own position.',
        },
        particleRate: {
            type: 'float', default: 120, min: 1, max: 600, step: 1,
            label: 'Rate /s',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Particles emitted per second while dragging. Hard-capped at 300 live at once.',
        },
        particleVelocity: {
            type: 'float', default: 0.3, min: 0, max: 3, step: 0.01,
            label: 'Velocity',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Initial speed in UV/sec. 0.3 = gentle spray, 2 = shotgun.',
        },
        particleSpread: {
            type: 'float', default: 0.35, min: 0, max: 1, step: 0.01,
            label: 'Spread',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Angular spread around the drag direction. 0 = beam, 1 = full 360° burst.',
        },
        particleGravity: {
            type: 'float', default: 0, min: -3, max: 3, step: 0.01,
            label: 'Gravity',
            condition: { param: 'particleEmitter', bool: true },
            description: 'UV/sec² acceleration. Negative = falls down the canvas, positive = rises.',
        },
        particleDrag: {
            type: 'float', default: 0.6, min: 0, max: 4, step: 0.01,
            label: 'Drag /s',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Air drag — 0 = ballistic (keeps speed), 2 = quickly slows, 4 = fast stop.',
        },
        particleLifetime: {
            type: 'float', default: 1.2, min: 0.1, max: 6, step: 0.05,
            label: 'Lifetime',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Seconds before each particle is culled. Longer = more persistent streaks.',
        },
        particleSizeScale: {
            type: 'float', default: 0.35, min: 0.05, max: 1.5, step: 0.01,
            label: 'Size ×',
            condition: { param: 'particleEmitter', bool: true },
            description: 'Per-particle stamp size as a fraction of the brush size. 0.35 = dabs a third of the brush.',
        },
    },
};
