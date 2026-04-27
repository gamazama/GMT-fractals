/**
 * PaletteFeature — the Palette tab. Colours both the fractal AND the
 * dye injected into the fluid. In Hue-mode (Coupling tab), this gradient
 * IS the velocity field.
 *
 * Absorbs everything the reference toy-fluid's "Palette" tab shows:
 * gradient editor, colour-mapping dropdown with per-mode extras
 * (orbit-trap shape, stripe frequency), a global colour-iter cap,
 * interior colour, and the dye-blend mode chip row.
 *
 * Slice id renamed from 'dye' → 'palette' so the store key reflects the
 * tab. The brushMode chip and collision-wall group that previously
 * lived here move off on Tab 4 (Brush) and Tab 7 (Collision)
 * respectively. The dyeMix composite-balance slider moves to Tab 8
 * (Composite). For now those params keep their home on this slice and
 * are marked hidden:true — the restructure walks tab-by-tab.
 *
 * First use of DDFS `type: 'gradient'` in fluid-toy. AutoFeaturePanel
 * renders AdvancedGradientEditor for gradient-typed params — no bespoke
 * gradient UI needed on the app side. FluidEngine has its own pipeline
 * though (not ShaderBuilder), so FluidToyApp subscribes to the slice,
 * bakes the gradient to an LUT buffer via utils/colorUtils, and pushes
 * via engine.setGradientBuffer.
 */

import type { FeatureDefinition } from '../../engine/FeatureSystem';
import type { GradientConfig } from '../../types';
import { defineEnumParam } from '../../engine/defineEnumParam';
import type { FluidEngine } from '../fluid/FluidEngine';
import type { PaletteSlice } from '../storeTypes';
import { generateGradientTextureBuffer } from '../../utils/colorUtils';
import { brushHandles } from '../engineHandles';

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

// (brushMode + brushModeFromIndex moved to BrushFeature in Tab 4 of the
// restructure pass; FluidEngine now carries the full artist brush API.)

// How NEW dye combines with EXISTING dye when both occupy the same
// texel. 'add' is the classic fluid-sim look; 'screen' keeps overlaps
// glowing; 'max' preserves the brightest layer; 'over' uses alpha from
// the gradient to blend. Indices match FluidEngine.dyeBlendToIndex.
const dyeBlendParam = defineEnumParam(
    ['add', 'screen', 'max', 'over'] as const,
    'Dye blend',
);
export const DYE_BLENDS = dyeBlendParam.values;
export const dyeBlendFromIndex = dyeBlendParam.fromIndex;

// How dye decays over time. Owned by the Fluid tab (FluidSimFeature)
// but the enum lives here so both features can reach the same index
// order without cross-importing feature defs.
export const dyeDecayModeParam = defineEnumParam(
    ['linear', 'perceptual', 'vivid'] as const,
    'Colour space',
);
export const DYE_DECAY_MODES = dyeDecayModeParam.values;
export const dyeDecayModeFromIndex = dyeDecayModeParam.fromIndex;

// 14 colour-mapping modes, index-aligned with FluidEngine.colorMappingToIndex.
const colorMappingParam = defineEnumParam(
    [
        'iterations', 'angle', 'magnitude', 'decomposition', 'bands',
        'orbit-point', 'orbit-circle', 'orbit-cross', 'orbit-line',
        'stripe', 'distance', 'derivative', 'potential', 'trap-iter',
    ] as const,
    'Color mapping',
    {
        optionLabels: {
            decomposition: 'Decomp',
            'orbit-point':  'Trap · Point',
            'orbit-circle': 'Trap · Circle',
            'orbit-cross':  'Trap · Cross',
            'orbit-line':   'Trap · Line',
            'trap-iter':    'Trap Iteration',
            distance: 'Distance Estimate',
            potential: 'Continuous Potential',
            derivative: 'Derivative (log|dz|)',
        },
    },
);
export const COLOR_MAPPINGS = colorMappingParam.values;
export const colorMappingFromIndex = colorMappingParam.fromIndex;

// Indices of the orbit-trap modes — used by conditional visibility on
// the trap-shape params below. Kept in sync with COLOR_MAPPINGS order.
const ORBIT_POINT = 5, ORBIT_CIRCLE = 6, ORBIT_CROSS = 7, ORBIT_LINE = 8, STRIPE = 9, TRAP_ITER = 13;

export const PaletteFeature: FeatureDefinition = {
    id: 'palette',
    name: 'Palette',
    category: 'Look',

    tabConfig: {
        label: 'Palette',
    },

    params: {
        gradient: {
            type: 'gradient', default: DEFAULT_DYE_GRADIENT, label: 'Palette',
            description: 'Colors both the fractal AND the dye injected into the fluid. In Hue-mode (Coupling), this IS the vector field.',
        },

        colorMapping: {
            ...colorMappingParam.config,
            description: 'How the iteration-space scalar becomes a t-value into the gradient. Each mode exposes its own extra controls below.',
        },

        gradientRepeat: {
            type: 'float', default: 1, min: 0.1, max: 8, step: 0.01,
            label: 'Repetition',
            description: 'Tiles the gradient across the mapped axis. 1 = one sweep, 3 = three bands.',
        },
        gradientPhase: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.005,
            label: 'Phase',
            description: 'Phase shift — rotates the colors without changing their layout.',
        },

        colorIter: {
            type: 'int', default: 310, min: 1, max: 1024, step: 1,
            label: 'Color iter',
            description: 'Iterations used for the coloring accumulators (orbit trap, stripe, DE). Separate from escape-test maxIter — reduce for fresher colours.',
        },

        // ── Orbit-trap shape params (conditional on colorMapping) ─────
        trapCenter: {
            type: 'vec2',
            default: { x: 0, y: 0 },
            min: -2, max: 2, step: 0.01,
            label: 'Trap center',
            description: 'Trap centre (complex coord). Move to pick which point in the orbit to trap against.',
            condition: { or: [
                { param: 'colorMapping', eq: ORBIT_POINT },
                { param: 'colorMapping', eq: ORBIT_CIRCLE },
                { param: 'colorMapping', eq: ORBIT_CROSS },
                { param: 'colorMapping', eq: TRAP_ITER },
            ] },
        },
        trapRadius: {
            type: 'float', default: 1, min: 0.01, max: 4, step: 0.01,
            label: 'Trap radius',
            condition: { param: 'colorMapping', eq: ORBIT_CIRCLE },
            description: 'Circle radius for the trap. Orbit pixels are coloured by how close they approach this ring.',
        },
        trapNormal: {
            type: 'vec2',
            default: { x: 1, y: 0 },
            min: -1, max: 1, step: 0.01,
            label: 'Trap normal',
            condition: { param: 'colorMapping', eq: ORBIT_LINE },
            description: 'Line trap: z lies on dot(z, normal) = offset. Normal should be unit-length.',
        },
        trapOffset: {
            type: 'float', default: 0, min: -2, max: 2, step: 0.01,
            label: 'Trap offset',
            condition: { param: 'colorMapping', eq: ORBIT_LINE },
            description: 'Line-trap offset (scalar position along the normal direction).',
        },
        stripeFreq: {
            type: 'float', default: 4, min: 1, max: 16, step: 0.1,
            label: 'Stripe freq',
            condition: { param: 'colorMapping', eq: STRIPE },
            description: 'Stripe frequency — k in ½ + ½·sin(k·arg z). Higher = more stripes per iteration.',
        },

        // Interior colour for points that never escape.
        interiorColor: {
            type: 'vec3',
            default: { x: 0.02, y: 0.02, z: 0.04 },
            min: 0, max: 1, step: 0.001,
            label: 'Interior color',
            description: 'Colour for bounded points (pixels that never escape the iteration).',
        },

        // Escape radius — used by every iteration mode. Hidden from the
        // Palette tab to match reference toy-fluid; still round-trips
        // in presets.
        escapeR: {
            type: 'float', default: 32, min: 2, max: 1024, step: 0.1,
            label: 'Escape R', scale: 'log',
            hidden: true,
        },

        // ── Dye subsection ─────────────────────────────────────────────
        dyeBlend: {
            ...dyeBlendParam.config,
            description: 'How new dye mixes with what the fluid already carries. Gradient stop alpha acts as a per-colour injection mask.',
        },

        // (Collision walls moved to CollisionFeature on Tab 7.)
        // (dyeMix moved to CompositeFeature on Tab 8.)
    },
};

/**
 * Push the palette slice into FluidEngine — display-stage iteration
 * colour knobs + dye-blend mode + the gradient LUT. The trap normal is
 * normalized at the boundary so the shader's distance math stays
 * well-defined for any user input. Also caches the LUT into
 * `brushHandles` so the brush colour pipeline reads the same bytes.
 */
export const syncPaletteToEngine = (engine: FluidEngine, palette: PaletteSlice): void => {
    const rawNx = palette.trapNormal.x;
    const rawNy = palette.trapNormal.y;
    const nLen = Math.hypot(rawNx, rawNy);
    const trapNormal: [number, number] = nLen > 1e-6
        ? [rawNx / nLen, rawNy / nLen]
        : [1, 0];

    const interior = palette.interiorColor;

    engine.setParams({
        colorMapping:        colorMappingFromIndex(palette.colorMapping),
        colorIter:           palette.colorIter,
        escapeR:             palette.escapeR,
        interiorColor:       [interior.x, interior.y, interior.z],
        trapCenter:          [palette.trapCenter.x, palette.trapCenter.y],
        trapRadius:          palette.trapRadius,
        trapNormal,
        trapOffset:          palette.trapOffset,
        stripeFreq:          palette.stripeFreq,
        dyeBlend:            dyeBlendFromIndex(palette.dyeBlend),
        gradientRepeat:      palette.gradientRepeat,
        gradientPhase:       palette.gradientPhase,
    });

    if (palette.gradient) {
        const lut = generateGradientTextureBuffer(palette.gradient);
        engine.setGradientBuffer(lut);
        brushHandles.ref.current.gradientLut = lut;
    }
};
