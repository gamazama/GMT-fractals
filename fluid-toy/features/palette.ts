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
import { generateGradientTextureBuffer, hexToRgb } from '../../utils/colorUtils';
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
// Dye blend modes. Owned by the Fluid tab (FluidSimFeature) but the
// enum lives here so apply.ts and other consumers can reach a single
// canonical index ordering without cross-importing feature defs.
export const dyeBlendParam = defineEnumParam(
    ['add', 'screen', 'max', 'over'] as const,
    'Dye blend',
    {
        optionHints: {
            add:    'Linear accumulate — bright strokes build up, can clip.',
            screen: '1−(1−d)(1−i). Glowy, never exceeds 1.',
            max:    'Hold the brightest. Vivid strokes survive over faded.',
            over:   'Alpha-composite: new dye stamps cleanly over old.',
        },
    },
);
export const DYE_BLENDS = dyeBlendParam.values;
export const dyeBlendFromIndex = dyeBlendParam.fromIndex;

// How dye decays over time. Owned by the Fluid tab (FluidSimFeature)
// but the enum lives here so both features can reach the same index
// order without cross-importing feature defs.
export const dyeDecayModeParam = defineEnumParam(
    ['linear', 'perceptual', 'vivid'] as const,
    'Colour space',
    {
        optionHints: {
            linear:     'RGB multiply — fades to black through grey.',
            perceptual: 'OKLab L-decay — hue + chroma stable while dimming.',
            vivid:      'OKLab + chroma boost — colours stay punchy near black.',
        },
    },
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
        optionHints: {
            iterations:     'Smooth escape iter — classic Mandelbrot/Julia colouring.',
            angle:          'Argument of final z. Spirals + radial fans.',
            magnitude:      'Distance from origin at escape. Radial intensity.',
            decomposition:  'Sign of imag(z) — black/white binary split.',
            bands:          'Hard step function on iter — sharp colour bands.',
            'orbit-point':  'Closest approach to a point trap (use Trap shape).',
            'orbit-circle': 'Closest approach to a circle trap.',
            'orbit-cross':  'Closest approach to an axis-cross trap.',
            'orbit-line':   'Signed distance to a line trap.',
            stripe:         'Härkönen sin-stripe average. Smooth banded swirls.',
            distance:       'Hubbard distance estimate. Crisp, edge-aware.',
            derivative:     'log|dz| — highlights chaotic fast-stretching regions.',
            potential:      'Böttcher potential. Like iter but C¹ smooth.',
            'trap-iter':    'Iteration at which the trap minimum was reached.',
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

        colorNormV2: {
            type: 'boolean', default: false,
            label: 'Depth-normalized colour',
            description: 'Normalize every colour mode by its depth driver (iteration cap / pixel scale / log potential) so Density ≈ 1 stays sane at any zoom. Off = the original look. A/B while we tune the new defaults.',
        },

        // Shared "Rate" — gamma for Iterations/Distance/Potential, spiral tightness for Angle.
        iterRate: {
            type: 'float', default: 1, min: 0.001, max: 8, step: 0.01, scale: 'log',
            label: 'Rate',
            description: 'Shapes how bands distribute across iteration depth. Iterations/Distance/Potential: contrast/contour spacing gamma. Angle: spiral tightness.',
            condition: { and: [
                { param: 'colorNormV2', bool: true },
                { or: [
                    { param: 'colorMapping', eq: 0 },   // iterations
                    { param: 'colorMapping', eq: 1 },   // angle
                    { param: 'colorMapping', eq: 10 },  // distance
                    { param: 'colorMapping', eq: 12 },  // potential
                ] },
            ] },
        },
        // Iterations "Fit to view" anchor — set by the Fit button (not a slider). identity =
        // offset 0 / scale 1/LREF (0.125) → absolute log-iteration, colours hold across zoom.
        iterOffset: { type: 'float', default: 0, min: -20, max: 20, step: 0.001, label: 'Iter offset', hidden: true },
        iterScale: { type: 'float', default: 0.125, min: 0.001, max: 10, step: 0.001, label: 'Iter scale', hidden: true },
        // Distance: log contour rings (on) vs linear edge glow (off).
        deLogBands: {
            type: 'boolean', default: true,
            label: 'Distance rings',
            description: 'Distance mode: even log-distance contour rings (on) vs a soft boundary glow (off).',
            condition: { and: [
                { param: 'colorNormV2', bool: true },
                { param: 'colorMapping', eq: 10 },
            ] },
        },

        gradientRepeat: {
            type: 'float', default: 1, min: 0.1, max: 100, step: 0.01, scale: 'log',
            label: 'Density',
            description: 'Colour density along the mapped axis. 1 = one sweep. With depth-normalized colour on, ~1 stays sane at any zoom; raise for more bands.',
        },
        gradientPhase: {
            type: 'float', default: 0, min: 0, max: 1, step: 0.005,
            label: 'Phase',
            description: 'Phase shift — rotates the colors without changing their layout.',
        },

        colorIter: {
            type: 'int', default: 310, min: 1, max: 1024, step: 1,
            label: 'Color iter',
            // Only consulted when Auto iterations is off; with Auto on the
            // colouring accumulators track the auto iteration count, so this
            // knob is a no-op and hidden (matches the maxIter cap behaviour).
            condition: { param: '$deepZoom.autoIter', eq: false },
            description: 'Iterations used for the colouring accumulators (orbit trap, stripe, DE) when Auto iterations is off. Reduce for fresher colours.',
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

        // Interior colour for points that never escape. A `color` param so the
        // shared colour picker (compact swatch + HL strip, expandable) edits it
        // inline instead of three raw 0–1 sliders. Stored as a hex string;
        // syncPaletteToEngine + presets/apply convert to the engine's [r,g,b].
        interiorColor: {
            type: 'color',
            default: '#05050A',          // ≈ the old vec3 (0.02, 0.02, 0.04)
            layout: 'embedded',
            label: 'Interior color',
            description: 'Colour for bounded points (pixels that never escape the iteration).',
        },

        // ── Slope-lighting composite layer (multiplies any mode's colour by an
        // escape-gradient normal shade). Off by default; sliders appear when enabled.
        lightEnabled: {
            type: 'boolean', default: false,
            label: 'Slope lighting',
            description: 'Shade the fractal as a lit surface using the escape-gradient normal (z/dz). Works on any colour mode.',
            condition: { param: 'colorNormV2', bool: true },
        },
        lightAngle: {
            type: 'float', default: Math.PI / 4, min: 0, max: 6.2832, step: 0.01,
            label: 'Light angle',
            description: 'Light azimuth (radians).',
            condition: { and: [ { param: 'colorNormV2', bool: true }, { param: 'lightEnabled', bool: true } ] },
        },
        lightHeight: {
            type: 'float', default: 1.5, min: 0.2, max: 4, step: 0.05,
            label: 'Light elevation',
            description: 'Light elevation factor — higher = flatter / softer relief.',
            condition: { and: [ { param: 'colorNormV2', bool: true }, { param: 'lightEnabled', bool: true } ] },
        },
        lightStrength: {
            type: 'float', default: 0.7, min: 0, max: 1, step: 0.01,
            label: 'Relief',
            description: 'Lighting strength — 0 flat, 1 fully lit.',
            condition: { and: [ { param: 'colorNormV2', bool: true }, { param: 'lightEnabled', bool: true } ] },
        },
        ambient: {
            type: 'float', default: 0.2, min: 0, max: 1, step: 0.01,
            label: 'Ambient',
            description: 'Shadow floor so lit areas never go pure black.',
            condition: { and: [ { param: 'colorNormV2', bool: true }, { param: 'lightEnabled', bool: true } ] },
        },

        // Escape radius / bailout. Below 2 gives decomposition cells; large gives smooth
        // shells — shapes Potential/Distance bands. Global: affects the whole fractal + the
        // fluid forcing (it feeds the motion field via the iteration gradient).
        escapeR: {
            type: 'float', default: 32, min: 1, max: 10, step: 0.01,
            label: 'Escape R', scale: 'log',
            description: 'Bailout radius. Near 1–2 → decomposition cells; toward 10 → smooth shells (≥10 looks identical). Global render param.',
        },

        // (Collision walls moved to CollisionFeature on Tab 7.)
        // (dyeMix moved to CompositeFeature on Tab 8.)
        // (dyeBlend moved to FluidSimFeature — it's a dye-mixing knob,
        // not a colour-mapping one.)
    },
};

/**
 * interiorColor may arrive as a hex string (the `color` param — the live
 * shape), an {x,y,z} vec3 (pre-2026-06 saved scenes), or an [r,g,b]/{r,g,b}
 * object (defensive). Normalize to [r,g,b] floats 0–1, the form
 * FluidEngine.setParams expects.
 */
const interiorToRgb01 = (c: unknown): [number, number, number] => {
    if (typeof c === 'string') {
        const rgb = hexToRgb(c);
        return rgb ? [rgb.r / 255, rgb.g / 255, rgb.b / 255] : [0, 0, 0];
    }
    if (Array.isArray(c)) return [Number(c[0]) || 0, Number(c[1]) || 0, Number(c[2]) || 0];
    if (c && typeof c === 'object') {
        const o = c as Record<string, number>;
        if ('x' in o) return [o.x || 0, o.y || 0, o.z || 0];
        if ('r' in o) {
            const s = Math.max(o.r || 0, o.g || 0, o.b || 0) > 1 ? 1 / 255 : 1;
            return [(o.r || 0) * s, (o.g || 0) * s, (o.b || 0) * s];
        }
    }
    return [0, 0, 0];
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

    const interior = interiorToRgb01(palette.interiorColor as unknown);

    engine.setParams({
        colorMapping:        colorMappingFromIndex(palette.colorMapping),
        colorIter:           palette.colorIter,
        escapeR:             palette.escapeR,
        interiorColor:       interior,
        trapCenter:          [palette.trapCenter.x, palette.trapCenter.y],
        trapRadius:          palette.trapRadius,
        trapNormal,
        trapOffset:          palette.trapOffset,
        stripeFreq:          palette.stripeFreq,
        gradientRepeat:      palette.gradientRepeat,
        gradientPhase:       palette.gradientPhase,
        colorNormV2:         palette.colorNormV2,
        iterRate:            palette.iterRate,
        iterOffset:          palette.iterOffset,
        iterScale:           palette.iterScale,
        deLogBands:          palette.deLogBands,
        lightEnabled:        palette.lightEnabled,
        lightAngle:          palette.lightAngle,
        lightHeight:         palette.lightHeight,
        lightStrength:       palette.lightStrength,
        ambient:             palette.ambient,
    });

    if (palette.gradient) {
        const lut = generateGradientTextureBuffer(palette.gradient);
        engine.setGradientBuffer(lut);
        brushHandles.ref.current.gradientLut = lut;
    }
};
