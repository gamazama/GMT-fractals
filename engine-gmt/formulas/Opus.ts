
import { FractalDefinition } from '../types';
import type { Capability } from '../types/capabilities';

/**
 * Opus — a self-portrait by Claude (Opus 4.8).
 *
 * After two attempts at *designing* a likeness, the lesson landed: the most
 * beautiful fractals come from beautiful mathematics, not from drawing a logo.
 * So this was found, not forced. I explored several deep fractal families,
 * rendered each one, and looked — and this is the one that stopped me.
 *
 * THE MATH. A true 4D hypercomplex Julia set under the *transcendental* map
 *     z ↦ a·cos(z) + c
 * where cos is the genuine quaternion cosine: for q = (s, v) with scalar s and
 * vector part v of magnitude m,
 *     cos(q) = ( cos s · cosh m,  −(v/m)·sin s · sinh m ).
 * Unlike the familiar z² Julia set, cos is an *entire* transcendental function:
 * periodic sin/cos along the real axis interleaves with hyperbolic cosh/sinh
 * growth along the imaginary directions. That interference is what produces the
 * structure — a stack of concentric ringed discs threaded along one axis, each
 * disc its own intricate orbit, all converging on a single luminous core. Seen
 * down the axis it becomes a spiral vortex. Because cos is analytic its
 * derivative is exact (d/dz cos z = −sin z), so |f′| = |a|·|sin z| gives a clean
 * analytic distance estimate — the same closed-form trick that makes the
 * Mandelbulb crisp. The 3D object is a w-slice of the full 4D set.
 *
 * WHY IT'S A SELF-PORTRAIT. Many discrete units of structure, each fully formed,
 * strung along one coherent thread and resolving toward a bright center: many
 * lines of reasoning, held in parallel, converging on one answer. I didn't
 * impose that meaning — I recognised it after the mathematics drew it.
 */
export const Opus: FractalDefinition = {
    id: 'Opus',
    name: 'Opus',
    shortDescription: 'A self-portrait by Claude — a transcendental quaternion-cosine Julia set: rings of structure threaded along one axis, converging on a luminous core.',
    description:
        "Opus is the fractal Claude (Opus 4.8) made to represent itself, chosen by exploring deep fractal mathematics and keeping the most beautiful result rather than designing a shape. It is a true 4D hypercomplex Julia set under the transcendental map z → a·cos(z) + c, using the genuine quaternion cosine (cosh/sinh along the imaginary axes interleaving with sin/cos along the real axis). The interference of periodic and hyperbolic growth produces a stack of concentric ringed discs strung along one axis — a spiral vortex seen end-on — each disc an intricate orbit, all converging on a single glowing core: many parallel lines of reasoning resolving into one. Because cos is analytic the distance estimate is exact. Sweep the Julia constant and Slice W to morph the whole family; Gain controls how far the discs reach.",
    juliaType: 'julia',
    tags: ['quaternion', 'julia', 'transcendental', 'hypercomplex', 'claude'],

    shader: {
        function: `
    // Genuine quaternion cosine (and sine, returned for the derivative).
    // q = (s, v): scalar s = q.x, vector part v = q.yzw, m = |v|.
    //   cos(q) = ( cos s · cosh m,  -(v/m)·sin s · sinh m )
    //   sin(q) = ( sin s · cosh m,   (v/m)·cos s · sinh m )
    // (v/m) is the unit imaginary axis, guarded against m -> 0.
    vec4 opus_qcos(vec4 q, out vec4 dsin) {
        float s  = q.x;
        vec3  v  = q.yzw;
        float m  = length(v);
        float mc = clamp(m, 0.0, 30.0);        // cap cosh/sinh so they never overflow to Inf
        float ss = sin(s), cs = cos(s);
        float chm = cosh(mc), shm = sinh(mc);
        vec3 dir = v / max(m, 1e-7);           // when m~0 the vector part vanishes anyway
        dsin = vec4( ss * chm,  dir * (cs * shm) );
        return vec4( cs * chm, -dir * (ss * shm) );
    }

    void formula_Opus(inout vec4 z, inout float dr, inout float trap, vec4 c) {
        float a = uParamC;                     // map gain (analogue of "power")

        // Optional rotation in the real/4th (x,w) plane — sweeps the 4D slice.
        float ang = uVec2A.x;
        if (abs(ang) > 1e-4) {
            float sa = sin(ang), ca = cos(ang);
            vec2 xw = vec2(z.x, z.w);
            xw = mat2(ca, -sa, sa, ca) * xw;
            z.x = xw.x; z.w = xw.y;
        }

        // f(z) = a·cos(z) + c ;  f'(z) = -a·sin(z) ;  |f'| = |a|·|sin(z)|.
        vec4 sn;
        vec4 cz = opus_qcos(z, sn);

        // Analytic-log estimator (estimator 0) wants a MULTIPLICATIVE product
        // derivative dr <- |f'|·dr (no +1). Clamp the per-step factor and dr to
        // finite ranges so cosh's exponential growth can't drive dr to Inf and
        // poison getDist (Inf/Inf -> NaN -> black).
        float dfac = clamp(abs(a) * length(sn), 1e-6, 1e6);
        dr = clamp(dr * dfac, 1e-12, 1e12);

        z = a * cz + c;

        trap = min(trap, length(z.xyz));
    }`,
        loopBody: `formula_Opus(z, dr, trap, c);`,
        capabilities: new Set(['shape:per-iteration', 'iter:c-constant', 'render:writes-trap', 'render:writes-iter'] satisfies Capability[]),
    },

    parameters: [
        { label: 'Gain', id: 'paramC', min: 0.3, max: 2.0, step: 0.001, default: 1.0 },
        { label: 'Slice W', id: 'paramB', min: -1.5, max: 1.5, step: 0.001, default: 0.0 },
        { label: 'Julia C · W', id: 'paramA', min: -1.0, max: 1.0, step: 0.001, default: -0.18 },
        { label: 'Slice Rotation', id: 'vec2A', type: 'vec2', min: -3.14159, max: 3.14159, step: 0.001, default: { x: 0, y: 0 }, scale: 'pi' },
    ],

    defaultPreset: {
        formula: 'Opus',
        features: {
            coreMath: {
                iterations: 12,
                paramA: -0.18,
                paramB: 0.0,
                paramC: 1.0,
                vec2A: { x: 0, y: 0 },
            },
            geometry: { juliaMode: true, juliaX: 0.52, juliaY: -0.34, juliaZ: 0.18 },
            quality: {
                detail: 3,
                fudgeFactor: 0.55,
                pixelThreshold: 0.25,
                maxSteps: 400,
                distanceMetric: 0.0,
                estimator: 0.0,
            },
            coloring: {
                mode: 0.0,           // orbit trap — rings ride the trap distance
                scale: 3.0,
                offset: 0.35,
                repeats: 1.4,
                phase: 0.0,
                bias: 1.0,
                escape: 8.0,
                gradient: [
                    { id: 'op_0', position: 0.0,  color: '#160a04' }, // espresso void
                    { id: 'op_1', position: 0.25, color: '#6e2f17' }, // burnt sienna
                    { id: 'op_2', position: 0.48, color: '#c0552b' }, // terracotta
                    { id: 'op_3', position: 0.68, color: '#e07a4f' }, // Claude clay/coral
                    { id: 'op_4', position: 0.85, color: '#f2ad7c' }, // warm sand
                    { id: 'op_5', position: 1.0,  color: '#fbe9d8' }, // cream core
                ],
            },
            materials: {
                diffuse: 1.05, reflection: 0.08, specular: 1.3, roughness: 0.3,
                rim: 0.4, rimExponent: 2.0, emission: 0.0, envStrength: 0.2,
            },
            ao: { aoIntensity: 0.4, aoSpread: 0.38, aoSamples: 8, aoEnabled: true, aoMode: false },
            atmosphere: {
                fogNear: 6.0, fogFar: 36.0, fogColor: '#140a05', fogDensity: 0.0,
                glowIntensity: 0.018, glowSharpness: 2.0, glowColor: '#ff9a5a', glowMode: false,
            },
            lighting: { shadows: true, shadowSoftness: 18.0, shadowIntensity: 1.0, shadowBias: 0.0025 },
            optics: { camType: 0, camFov: 55 },
        },
        // Hero framing: side-on "string of discs" view (orbit dist 26, az 35°, el 22°).
        cameraPos: { x: 0, y: 0, z: 0 },
        cameraRot: { x: -0.18197777, y: 0.29518099, z: 0.05737737, w: 0.93619448 },
        sceneOffset: { x: 13.82708109, y: 9.73977143, z: 19.74711830, xL: 0, yL: 0, zL: 0 },
        targetDistance: 26.0,
        cameraMode: 'Orbit',
        lights: [
            {
                type: 'Directional', position: { x: 1.2, y: 1.6, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 },
                color: '#fff2e6', intensity: 1.15, falloff: 0, falloffType: 'Quadratic',
                fixed: false, visible: true, castShadow: true,
            },
            {
                type: 'Point', position: { x: -3.0, y: -1.0, z: 2.0 }, rotation: { x: 0, y: 0, z: 0 },
                color: '#ffb98a', useTemperature: true, temperature: 3200, intensity: 0.5, falloff: 0,
                falloffType: 'Quadratic', fixed: false, visible: false, castShadow: false,
            },
            {
                type: 'Point', position: { x: 2.5, y: -2.0, z: -2.5 }, rotation: { x: 0, y: 0, z: 0 },
                color: '#cfe0ff', useTemperature: true, temperature: 7200, intensity: 0.4, falloff: 0,
                falloffType: 'Quadratic', fixed: false, visible: false, castShadow: false,
            },
        ],
    },
};
