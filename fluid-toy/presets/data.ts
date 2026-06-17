/**
 * Curated fluid-toy preset pack.
 *
 * Originally authored in the reference toy-fluid/ fork as
 * `toy-fluid/presets.ts`. Copied here when the reference fork was
 * retired (the engine-native fluid-toy has full feature parity).
 *
 * The params shape uses STRING enums (e.g. `forceMode: 'curl'`,
 * `kind: 'julia'`) because these presets were exported from the
 * reference toy, whose FluidParams interface uses string literals.
 * `presets/apply.ts` translates each string to the numeric index
 * DDFS expects when loading — one preset → many setSlice() calls.
 *
 * Adding a new preset: author in the running app, use the Save
 * button to dump GMF/JSON, then copy the feature values back here
 * as string-enum literals. (A future Preset-menu authoring tool
 * would generate data.ts entries directly.)
 */

import type { GradientConfig, GradientStop } from '../../types';
import type { AnimationParams } from '../../types/animation';

/** Structural type — we don't bind to a specific FluidParams interface
 *  so this file stays decoupled from the app's slice shape (which is
 *  what apply.ts translates TO). */
export type PresetParams = Record<string, any>;

export interface Preset {
    id: string;
    name: string;
    desc: string;
    /** Parameter overrides applied on top of DEFAULT_PARAMS (so presets
     *  always start from a clean baseline). */
    params: PresetParams;
    /** Main colour gradient. Omitted ⇒ keep the current gradient. */
    gradient?: GradientConfig;
    /** B&W collision gradient. Omitted ⇒ fall back to DEFAULT_COLLISION_GRADIENT. */
    collisionGradient?: GradientConfig;
    /** LFO modulation rules pushed into store.animations on apply. The
     *  legacy "orbit" subsection in the Coupling tab is gone — presets
     *  that used to orbit c now ship two LFOs at 90° phase on
     *  julia.juliaC_x / _y. AnimationSystem adds the offset to the
     *  authored juliaC, so the orbit is relative (moving c moves the
     *  circle). Apply omits / clears the array if not provided. */
    animations?: AnimationParams[];
}

const orbitLfo = (id: string, axis: 'x' | 'y', period: number, radius: number, phase: number): AnimationParams => ({
    id, target: `julia.juliaC_${axis}`, shape: 'Sine', period, phase,
    amplitude: radius, baseValue: 0, smoothing: 0, enabled: true,
});
const orbitPair = (radius: number, speed: number): AnimationParams[] => {
    const period = 1 / Math.max(0.001, speed);
    return [
        orbitLfo('preset.orbit.juliaC.x', 'x', period, radius, 0),
        orbitLfo('preset.orbit.juliaC.y', 'y', period, radius, 0.25),
    ];
};

const makeStops = (pairs: Array<[number, string]>): GradientStop[] =>
    pairs.map(([pos, color], i) => ({ id: `s${i}`, position: pos, color, bias: 0.5, interpolation: 'linear' }));

export const PRESETS: Preset[] = [
    {
        id: 'bench-julia-only',
        name: 'Bench (Julia only)',
        desc: 'Isolation preset for performance benchmarking. All post-FX, fluid coupling, dye, collision, and palette tricks are off — only the raw Julia/Mandelbrot fractal layer renders. Pair with the Disable-fluid-sim toggle on the Deep Zoom panel and accumulation off (topbar) for a clean GPU-time read.',
        params: {
            juliaC: [-0.36303304426511473, 0.16845183018751916],
            center: [-0.8139175130270945, -0.054649908357858296],
            zoom: 1.2904749020480561,
            maxIter: 310,
            power: 2,
            kind: 'mandelbrot',
            // Coupling: zero-impact settings. ForceMode doesn't matter
            // when sim is paused, but set sane defaults so unpausing
            // doesn't surprise.
            forceMode: 'gradient',
            forceSource: 'smoothPot',
            forceGain: 0,                   // no force injection
            interiorDamp: 1,                // full damp (sim quiet if it runs)
            // Fluid sim — minimal everything. With sim paused (via the
            // deep-zoom debug toggle) these don't run anyway, but keep
            // them sane in case you unpause.
            dissipation: 0,
            dyeDissipation: 0,
            dyeInject: 0,
            vorticity: 0,
            vorticityScale: 1,
            pressureIters: 1,               // minimum if sim runs
            // Display: pure fractal, no dye / velocity overlay.
            show: 'julia',
            juliaMix: 1,
            dyeMix: 0,
            velocityViz: 0,
            // Palette: simple smoothI mapping → no per-iter trap or
            // stripe accumulation in the shader.
            gradientRepeat: 0.1,
            gradientPhase: 0,
            colorMapping: 'iterations',
            colorIter: 310,
            stripeFreq: 4,
            // Dye blend: irrelevant (no dye) but set explicitly so the
            // dye pass cost doesn't sneak in.
            dyeBlend: 'max',
            dyeDecayMode: 'linear',
            dyeChromaDecayHz: 0,
            dyeSaturationBoost: 1,
            // Post-FX: every effect off so the display pass is just
            // gradient lookup → output. No bloom / tone / aberration /
            // refraction / caustics work.
            toneMapping: 'none',
            exposure: 1,
            vibrance: 1,
            bloomAmount: 0,
            bloomThreshold: 1,
            aberration: 0,
            refraction: 0,
            refractSmooth: 1,
            refractRoughness: 0,
            caustics: 0,
            interiorColor: [0, 0, 0],
            edgeMargin: 0,
            forceCap: 1,
            collisionEnabled: false,
            // Pause the fluid sim so the only GPU work is the Julia
            // pass + display. Accumulation stays ON (default) so TSAA
            // progressively converges the fractal — that's the
            // intended look for a deep-zoom preview. The benchmark
            // harness disables TSAA itself when measuring, so the
            // preset doesn't need to.
            paused: true,
        },
        gradient: {
            // Linear black→white. Simple smoothI mapping; max contrast
            // for visually verifying iter counts at a glance.
            stops: makeStops([[0, '#000000'], [1, '#FFFFFF']]),
            colorSpace: 'linear',
            blendSpace: 'rgb',
        },
    },

    {
        id: 'coral-gyre',
        name: 'Coral Gyre',
        desc: 'Orbit-point colouring on a negative curl — teal interior feeds a coral halo, with filmic bloom + aberration.',
        params: {
            juliaC: [-0.8173594132029339, 0.15279058679706603],
            center: [0, 0],
            zoom: 1.5,
            maxIter: 182,
            power: 2,
            kind: 'julia',
            forceMode: 'curl',
            // Orbit-point banding: paletteLuma drives the curl along the
            // visible coral-halo bands so the gyre traces the colour stops.
            forceSource: 'paletteLuma',
            forceGain: -760,
            interiorDamp: 0.9,
            dissipation: 0.1,
            dyeDissipation: 0.63,
            dyeInject: 2.28,
            vorticity: 25.9,
            vorticityScale: 4.2,
            pressureIters: 30,
            show: 'composite',
            juliaMix: 0.55,
            dyeMix: 1,
            velocityViz: 0,
            gradientRepeat: 0.56,
            gradientPhase: 0.09,
            colorMapping: 'orbit-point',
            colorIter: 96,
            trapCenter: [1.17, 0],
            dyeBlend: 'add',
            dyeDecayMode: 'vivid',
            dyeSaturationBoost: 1.01,
            toneMapping: 'filmic',
            exposure: 2.295,
            vibrance: 1.87,
            bloomAmount: 1.35,
            bloomThreshold: 1,
            aberration: 1.12,
            refraction: 0,
            refractSmooth: 1,
            caustics: 3.9,
            interiorColor: [0.02, 0.04, 0.08],
            edgeMargin: 0.04,
            forceCap: 12,
            collisionEnabled: true,
        },
        gradient: {
            stops: makeStops([
                [0,     '#000000'],
                [0.202, '#05233d'],
                [0.362, '#0f6884'],
                [0.521, '#56c6c0'],
                [0.681, '#f0fff1'],
                [0.840, '#e7bd69'],
                [1,     '#8a3f19'],
            ]),
            colorSpace: 'linear',
            blendSpace: 'oklab',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.513, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c2', position: 0.573, color: '#000000', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
    },

    {
        id: 'ink-canyon',
        name: 'Ink Canyon',
        desc: 'Monochrome dye threading between twin collision walls — one at the near edge, one deep in the field.',
        params: {
            juliaC: [-0.7763636363636364, 0.19684858842329547],
            center: [0.019054061889010376, -0.007321977964897804],
            zoom: 1.2904749020480561,
            maxIter: 310,
            power: 2,
            kind: 'julia',
            forceMode: 'curl',
            // Classic curl-on-iterations: smoothPot drives flow along
            // smooth-iter level sets between the two collision walls.
            forceSource: 'smoothPot',
            forceGain: 1200,
            interiorDamp: 0.59,
            dissipation: 0.05,
            dyeDissipation: 1.95,
            dyeInject: 8,
            vorticity: 5.9,
            pressureIters: 50,
            show: 'dye',
            juliaMix: 0.45,
            dyeMix: 1,
            velocityViz: 0,
            gradientRepeat: 1,
            gradientPhase: 0,
            colorMapping: 'iterations',
            colorIter: 310,
            dyeBlend: 'add',
            aberration: 0.27,
            refraction: 0,
            caustics: 0,
            interiorColor: [0.02, 0.02, 0.04],
            edgeMargin: 0.04,
            forceCap: 40,
            collisionEnabled: true,
        },
        gradient: {
            stops: makeStops([[0, '#000000'], [1, '#FFFFFF']]),
            colorSpace: 'linear',
            blendSpace: 'oklab',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.020, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c2', position: 0.070, color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c3', position: 0.833, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c4', position: 0.883, color: '#000000', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
    },

    {
        id: 'plasma-vein',
        name: 'Plasma Vein',
        desc: 'Fractional power (1.5) with 7× repeated blue/red bands. Vivid chroma decay keeps the refracted dye electric.',
        params: {
            juliaC: [-0.1764262149580809, 0.1951288073545453],
            center: [0.21016359187729639, -0.014585098813268887],
            zoom: 0.975889617512663,
            maxIter: 310,
            power: 1.5,
            kind: 'julia',
            forceMode: 'curl',
            // High-repeat banded palette: paletteLuma so the curl threads
            // the bright/dark transitions of the 7× repeated gradient.
            forceSource: 'paletteLuma',
            forceGain: 1200,
            interiorDamp: 0.59,
            dissipation: 0.05,
            dyeDissipation: 1.95,
            dyeInject: 8,
            vorticity: 5.9,
            pressureIters: 50,
            show: 'dye',
            juliaMix: 0.7,
            dyeMix: 1,
            velocityViz: 0,
            gradientRepeat: 7.43,
            gradientPhase: 0,
            colorMapping: 'iterations',
            colorIter: 310,
            dyeBlend: 'add',
            dyeDecayMode: 'vivid',
            toneMapping: 'filmic',
            exposure: 1.86,
            vibrance: 1.645,
            aberration: 0.5,
            refraction: 0.006,
            refractSmooth: 11.8,
            caustics: 0,
            interiorColor: [0.02, 0.02, 0.04],
            edgeMargin: 0.04,
            forceCap: 40,
        },
        gradient: {
            stops: makeStops([
                [0,     '#000000'],
                [0.143, '#001830'],
                [0.286, '#004060'],
                [0.429, '#00BFFF'],
                [0.571, '#006080'],
                [0.714, '#600000'],
                [0.857, '#DC0000'],
                [1,     '#FF4040'],
            ]),
            colorSpace: 'linear',
            blendSpace: 'rgb',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.536, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c2', position: 0.586, color: '#000000', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
    },

    {
        id: 'crater-drift',
        name: 'Crater Drift',
        desc: 'Mandelbrot under inward curl, inferno-magenta palette. Slow auto-orbit carves craters through the bloom.',
        params: {
            juliaC: [0.56053050672182, 0.468459152016546],
            center: [-0.9313160617349564, -0.15288948147190096],
            zoom: 1.1807159194396142,
            maxIter: 604,
            power: 2,
            kind: 'mandelbrot',
            forceMode: 'curl',
            // Mandelbrot iso-flow: smoothPot for curl along the crater rims.
            forceSource: 'smoothPot',
            forceGain: -535.6,
            interiorDamp: 0,
            dissipation: 0.16,
            dyeDissipation: 0.05,
            dyeInject: 3,
            vorticity: 2.9,
            vorticityScale: 1.2,
            pressureIters: 48,
            show: 'composite',
            juliaMix: 0,
            dyeMix: 1.01,
            velocityViz: 0,
            gradientRepeat: 0.66,
            gradientPhase: 0,
            colorMapping: 'iterations',
            colorIter: 263,
            trapCenter: [1.51, -1.37],
            dyeBlend: 'max',
            dyeDecayMode: 'perceptual',
            dyeChromaDecayHz: 0,
            toneMapping: 'filmic',
            exposure: 20.63,
            vibrance: 1.645,
            bloomAmount: 0.63,
            bloomThreshold: 0.76,
            aberration: 0.4,
            refraction: 0,
            caustics: 0,
            interiorColor: [0.02, 0.02, 0.03],
            edgeMargin: 0.04,
            forceCap: 38.5,
            collisionEnabled: true,
        },
        gradient: {
            stops: makeStops([
                [0.084, '#000004'],
                [0.215, '#280B54'],
                [0.346, '#65156E'],
                [0.477, '#9F2A63'],
                [0.607, '#D44842'],
                [0.738, '#F52D15'],
                [0.869, '#FA2727'],
                [1,     '#FF7983'],
            ]),
            colorSpace: 'srgb',
            blendSpace: 'oklab',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.532, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c2', position: 0.659, color: '#000000', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
        animations: orbitPair(0.01, 0.05),
    },

    {
        id: 'quartic-strata',
        name: 'Quartic Strata',
        desc: 'Power-4 Julia drifting on a subtle c-track. Strata of blue/red dye held by a near-edge wall.',
        params: {
            juliaC: [0.7072727272727275, -0.1398788174715911],
            center: [-0.0013928986324417691, -0.010035496866822907],
            zoom: 0.975889617512663,
            maxIter: 310,
            power: 4,
            kind: 'julia',
            forceMode: 'c-track',
            // Temporal-Δ on smoothPot: drift kicks in only when c
            // actually moves, so the strata pulse with the orbit.
            forceSource: 'smoothPot',
            forceGain: 1,
            interiorDamp: 0.59,
            dissipation: 0.05,
            dyeDissipation: 1.95,
            dyeInject: 8,
            vorticity: 1,
            pressureIters: 50,
            show: 'dye',
            juliaMix: 0.45,
            dyeMix: 1,
            velocityViz: 0,
            gradientRepeat: 2,
            gradientPhase: 0,
            colorMapping: 'iterations',
            colorIter: 310,
            dyeBlend: 'add',
            aberration: 0.27,
            refraction: 0.037,
            caustics: 1,
            interiorColor: [0.02, 0.02, 0.04],
            edgeMargin: 0.04,
            forceCap: 40,
            collisionEnabled: true,
        },
        gradient: {
            stops: makeStops([
                [0,     '#000000'],
                [0.143, '#001830'],
                [0.286, '#004060'],
                [0.429, '#00BFFF'],
                [0.571, '#006080'],
                [0.714, '#600000'],
                [0.857, '#DC0000'],
                [1,     '#FF4040'],
            ]),
            colorSpace: 'linear',
            blendSpace: 'rgb',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.113, color: '#FFFFFF', bias: 0.5, interpolation: 'step' },
                { id: 'c2', position: 0.163, color: '#000000', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
        animations: orbitPair(0.01, 0.2),
    },

    {
        id: 'sunset-bands',
        name: 'Sunset Bands',
        desc: 'Force-gradient mode with hard band colouring — sunset strata pushed inward at 1536 sim.',
        params: {
            juliaC: [-0.16545454545454558, 0.6455757279829545],
            center: [-0.1012543995130697, 0.03079433116134145],
            zoom: 1.086757425434934,
            maxIter: 175,
            power: 2,
            kind: 'julia',
            forceMode: 'gradient',
            // Hard-band colour mapping: paletteLuma drives the gradient
            // operator straight off the visible banding, so flow rises
            // and falls with the strata themselves.
            forceSource: 'paletteLuma',
            forceGain: 1500,
            interiorDamp: 5.8,
            dissipation: 0.22,
            dyeDissipation: 0.5,
            dyeInject: 0.55,
            vorticity: 0,
            pressureIters: 30,
            show: 'composite',
            juliaMix: 0.55,
            dyeMix: 2,
            velocityViz: 0,
            gradientRepeat: 1.35,
            gradientPhase: 0.055,
            colorMapping: 'bands',
            colorIter: 175,
            dyeBlend: 'over',
            aberration: 0.27,
            refraction: 0,
            caustics: 1,
            interiorColor: [0.02, 0.02, 0.03],
            edgeMargin: 0.04,
            forceCap: 12,
        },
        gradient: {
            stops: makeStops([
                [0,     '#04001f'],
                [0.167, '#1a1049'],
                [0.333, '#4e2085'],
                [0.500, '#b13a8a'],
                [0.667, '#ff7657'],
                [0.833, '#ffc569'],
                [1,     '#fff9d0'],
            ]),
            colorSpace: 'linear',
            blendSpace: 'oklab',
        },
    },

    {
        id: 'verdant-pulse',
        name: 'Verdant Pulse',
        desc: 'Viridis-to-magenta orbit-circle ring, wide vorticity, slow auto-orbit — the set breathes green and pink.',
        params: {
            juliaC: [-0.7, 0.27015],
            center: [-0.15958346356258324, -0.09244114001481094],
            zoom: 1.3957783246444389,
            maxIter: 160,
            power: 2,
            kind: 'julia',
            forceMode: 'c-track',
            // Temporal-Δ on paletteLuma: as auto-orbit moves c, the
            // breathing colour shift IS the velocity field — the set
            // appears to inhale/exhale green and pink in step with c.
            forceSource: 'paletteLuma',
            forceGain: 10,
            interiorDamp: 0.45,
            dissipation: 0.2,
            dyeDissipation: 0.17,
            dyeInject: 0.9,
            vorticity: 16,
            vorticityScale: 5.8,
            pressureIters: 30,
            show: 'composite',
            juliaMix: 0,
            dyeMix: 3.805,
            velocityViz: 0,
            gradientRepeat: 1,
            gradientPhase: 0.03,
            colorMapping: 'orbit-circle',
            colorIter: 94,
            dyeBlend: 'over',
            dyeDecayMode: 'perceptual',
            exposure: 0.35,
            vibrance: 1.645,
            aberration: 0.27,
            refraction: 0.037,
            caustics: 1,
            interiorColor: [0.02, 0, 0.04],
            edgeMargin: 0.04,
            forceCap: 12,
            collisionEnabled: true,
        },
        gradient: {
            stops: makeStops([
                [0,     '#000000'],
                [0.061, '#440154'],
                [0.143, '#46327F'],
                [0.286, '#365C8D'],
                [0.429, '#277F8E'],
                [0.571, '#1FA187'],
                [0.714, '#4AC26D'],
                [0.857, '#3ADA62'],
                [1,     '#FD25B6'],
            ]),
            colorSpace: 'linear',
            blendSpace: 'oklab',
        },
        collisionGradient: {
            stops: [
                { id: 'c0', position: 0,     color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c1', position: 0.037, color: '#000000', bias: 0.5, interpolation: 'linear' },
                { id: 'c2', position: 0.943, color: '#000000', bias: 0.5, interpolation: 'step' },
                { id: 'c3', position: 1,     color: '#626262', bias: 0.5, interpolation: 'step' },
            ],
            colorSpace: 'srgb',
            blendSpace: 'rgb',
        },
        animations: orbitPair(0.035, 0.02),
    },
];
